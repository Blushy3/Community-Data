-- ---------------------------------------------------------------------------
-- Community Data — initial schema (README §9)
-- Target project: PhantomCommunityData (mwtaoliwtnxfetgrrjqx)
--
-- Run once on an empty `public` schema. No data is deleted or overwritten.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum ('member', 'moderator', 'admin');
create type public.account_status as enum ('active', 'suspended');
create type public.publish_status as enum ('draft', 'published');

-- Internal helpers. Not exposed through the API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — public member information (never authentication data)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text not null,
  display_name    text not null,
  bio             text,
  avatar_path     text,
  banner_path     text,
  social_links    jsonb not null default '{}'::jsonb,
  favorite_games  text[] not null default '{}'::text[],
  account_status  public.account_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length
    check (char_length(display_name) between 1 and 40),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 500),
  constraint profiles_social_links_object
    check (jsonb_typeof(social_links) = 'object'),
  constraint profiles_favorite_games_max
    check (coalesce(array_length(favorite_games, 1), 0) <= 20)
);

-- Usernames are unique case-insensitively; they are stored lowercase.
create unique index profiles_username_key on public.profiles (lower(username));
create index profiles_created_at_idx on public.profiles (created_at desc);
create index profiles_username_trgm_idx
  on public.profiles using gin (username extensions.gin_trgm_ops);
create index profiles_display_name_trgm_idx
  on public.profiles using gin (display_name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- user_roles — authorization source of truth, never displayed as a claim
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.user_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- site_settings — single row of global settings
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id                          smallint primary key default 1,
  registration_enabled        boolean not null default false,
  invitation_code_hash        text,
  invitation_code_updated_at  timestamptz,
  discord_invite_url          text,
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid references auth.users (id) on delete set null,
  constraint site_settings_single_row check (id = 1)
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- achievements / user_achievements
-- ---------------------------------------------------------------------------
create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null,
  icon_path   text,
  created_at  timestamptz not null default now(),
  constraint achievements_slug_format check (slug ~ '^[a-z0-9-]{2,48}$'),
  constraint achievements_name_length check (char_length(name) between 1 and 60)
);

create table public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  awarded_by     uuid references auth.users (id) on delete set null,
  awarded_at     timestamptz not null default now(),
  constraint user_achievements_unique unique (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id);
create index user_achievements_achievement_idx on public.user_achievements (achievement_id);

-- ---------------------------------------------------------------------------
-- updates — official announcements (drafts are never public)
-- ---------------------------------------------------------------------------
create table public.updates (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,
  description  text not null,
  content      text not null,
  status       public.publish_status not null default 'draft',
  created_by   uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint updates_slug_format check (slug ~ '^[a-z0-9-]{2,80}$'),
  constraint updates_title_length check (char_length(title) between 1 and 120),
  constraint updates_published_at_consistency
    check (status <> 'published' or published_at is not null)
);

create index updates_status_published_idx on public.updates (status, published_at desc);

-- ---------------------------------------------------------------------------
-- community_info — editable public content blocks
-- ---------------------------------------------------------------------------
create table public.community_info (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  title      text not null,
  content    text not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint community_info_key_format check (key ~ '^[a-z0-9_]{2,40}$')
);

-- ---------------------------------------------------------------------------
-- explore_sections — thematic areas, ordered and published by admins
-- ---------------------------------------------------------------------------
create table public.explore_sections (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text not null,
  content      text,
  sort_order   integer not null default 0,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint explore_sections_slug_format check (slug ~ '^[a-z0-9-]{2,48}$')
);

create index explore_sections_published_order_idx
  on public.explore_sections (is_published, sort_order);

-- ---------------------------------------------------------------------------
-- account_recovery_codes — only hashes, only one active code per user
-- ---------------------------------------------------------------------------
create table public.account_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  code_salt  text not null,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);

create unique index account_recovery_codes_one_active
  on public.account_recovery_codes (user_id)
  where used_at is null;

-- ---------------------------------------------------------------------------
-- admin_audit_log — append-only record of administrative actions
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references auth.users (id) on delete set null,
  action         text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  constraint admin_audit_log_action_format check (action ~ '^[a-z0-9_.]{3,64}$')
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log (target_user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger updates_set_updated_at
  before update on public.updates
  for each row execute function private.set_updated_at();

create trigger community_info_set_updated_at
  before update on public.community_info
  for each row execute function private.set_updated_at();

create trigger explore_sections_set_updated_at
  before update on public.explore_sections
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies; not callable by anon)
-- ---------------------------------------------------------------------------
create or replace function private.has_role(p_user_id uuid, p_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_user_id
      and ur.role = p_role
  );
$$;

create or replace function private.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role(p_user_id, 'admin'::public.user_role);
$$;

revoke all on function private.has_role(uuid, public.user_role) from public;
revoke all on function private.is_admin(uuid) from public;
-- `anon` needs EXECUTE because public read policies call is_admin(); both
-- functions are SECURITY DEFINER and only answer "does this user have a role".
grant execute on function private.has_role(uuid, public.user_role) to anon, authenticated, service_role;
grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Registration safety net: every auth user gets a profile and the member role.
-- Real validation (invitation code, uniqueness, rate limiting) happens in the
-- backend Edge Function; this trigger only guarantees data consistency.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_display  text;
begin
  v_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_display  := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_username);

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    return new;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member'::public.user_role)
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
