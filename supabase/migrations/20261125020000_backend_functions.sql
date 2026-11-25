-- ---------------------------------------------------------------------------
-- Backend operations (README §5, §6, §8)
--
-- Everything that must be authorized on the server is exposed as a
-- SECURITY DEFINER function that verifies the caller's role itself. Clients
-- never get write access to the tables directly.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.is_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.account_status = 'active'
  );
$$;

create or replace function private.require_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.log_admin_action(
  p_action text,
  p_target_user_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
  values ((select auth.uid()), p_action, p_target_user_id, p_details);
$$;

revoke all on function private.is_active(uuid) from public;
revoke all on function private.require_admin() from public;
revoke all on function private.log_admin_action(text, uuid, jsonb) from public;
grant execute on function private.is_active(uuid) to anon, authenticated, service_role;
grant execute on function private.require_admin() to authenticated, service_role;
grant execute on function private.log_admin_action(text, uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Suspended accounts lose write access, not just the UI
-- ---------------------------------------------------------------------------
drop policy if exists "members update their own profile" on public.profiles;
create policy "members update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) and private.is_active((select auth.uid())))
  with check (id = (select auth.uid()) and private.is_active((select auth.uid())));

drop policy if exists "members upload their own profile images" on storage.objects;
create policy "members upload their own profile images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active((select auth.uid()))
  );

drop policy if exists "members replace their own profile images" on storage.objects;
create policy "members replace their own profile images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active((select auth.uid()))
  )
  with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active((select auth.uid()))
  );

drop policy if exists "members delete their own profile images" on storage.objects;
create policy "members delete their own profile images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.is_active((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Registration attempt log (used by the auth Edge Function, not by clients)
-- ---------------------------------------------------------------------------
create table public.registration_attempts (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  succeeded  boolean not null default false,
  reason     text
);

create index registration_attempts_created_at_idx
  on public.registration_attempts (created_at desc);

revoke all on public.registration_attempts from anon, authenticated;
alter table public.registration_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- Bootstrap: a fresh database has no accounts, so the first one must be
-- allowed to become the founder (admin) without an invitation code.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles);
$$;

-- ---------------------------------------------------------------------------
-- User administration
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_change_own_role';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'user_not_found';
  end if;

  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles (user_id, role, created_by)
  values (p_user_id, p_role, (select auth.uid()));

  perform private.log_admin_action('role.changed', p_user_id, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_set_account_status(p_user_id uuid, p_status public.account_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_suspend_yourself';
  end if;

  update public.profiles set account_status = p_status where id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;

  perform private.log_admin_action(
    case when p_status = 'suspended' then 'account.suspended' else 'account.restored' end,
    p_user_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Registration settings and invitation code (hash only, never plaintext)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_registration(p_enabled boolean, p_invitation_code text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  if p_invitation_code is not null and char_length(p_invitation_code) < 6 then
    raise exception 'invitation_code_too_short';
  end if;

  update public.site_settings
  set registration_enabled = p_enabled,
      invitation_code_hash = case
        when p_invitation_code is null then invitation_code_hash
        else 'sha256:' || encode(extensions.digest(p_invitation_code, 'sha256'), 'hex')
      end,
      invitation_code_updated_at = case
        when p_invitation_code is null then invitation_code_updated_at
        else now()
      end,
      updated_by = (select auth.uid())
  where id = 1;

  perform private.log_admin_action(
    'registration.updated',
    null,
    jsonb_build_object('enabled', p_enabled, 'code_changed', p_invitation_code is not null)
  );
end;
$$;

create or replace function public.admin_set_discord_url(p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.site_settings set discord_invite_url = nullif(trim(p_url), ''), updated_by = (select auth.uid()) where id = 1;
  perform private.log_admin_action('settings.discord_updated', null, jsonb_build_object('url', p_url));
end;
$$;

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_achievement(
  p_id uuid,
  p_slug text,
  p_name text,
  p_description text,
  p_icon_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin();

  if p_id is null then
    insert into public.achievements (slug, name, description, icon_path)
    values (lower(p_slug), p_name, p_description, p_icon_path)
    returning id into v_id;
    perform private.log_admin_action('achievement.created', null, jsonb_build_object('id', v_id, 'slug', p_slug));
  else
    update public.achievements
    set slug = lower(p_slug), name = p_name, description = p_description, icon_path = p_icon_path
    where id = p_id;

    if not found then
      raise exception 'achievement_not_found';
    end if;

    v_id := p_id;
    perform private.log_admin_action('achievement.updated', null, jsonb_build_object('id', p_id, 'slug', p_slug));
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_delete_achievement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.achievements where id = p_id;

  if not found then
    raise exception 'achievement_not_found';
  end if;

  perform private.log_admin_action('achievement.deleted', null, jsonb_build_object('id', p_id));
end;
$$;

create or replace function public.admin_assign_achievement(p_user_id uuid, p_achievement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  insert into public.user_achievements (user_id, achievement_id, awarded_by)
  values (p_user_id, p_achievement_id, (select auth.uid()))
  on conflict (user_id, achievement_id) do nothing;

  perform private.log_admin_action(
    'achievement.assigned',
    p_user_id,
    jsonb_build_object('achievement_id', p_achievement_id)
  );
end;
$$;

create or replace function public.admin_revoke_achievement(p_user_id uuid, p_achievement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  delete from public.user_achievements
  where user_id = p_user_id and achievement_id = p_achievement_id;

  perform private.log_admin_action(
    'achievement.revoked',
    p_user_id,
    jsonb_build_object('achievement_id', p_achievement_id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Updates (drafts never reach the public site)
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_update(
  p_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_content text,
  p_publish boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_status public.publish_status := case
    when p_publish then 'published'::public.publish_status
    else 'draft'::public.publish_status
  end;
begin
  perform private.require_admin();

  if p_id is null then
    insert into public.updates (title, slug, description, content, status, created_by, published_at)
    values (p_title, lower(p_slug), p_description, p_content, v_status, (select auth.uid()),
            case when p_publish then now() else null end)
    returning id into v_id;
  else
    update public.updates
    set title = p_title,
        slug = lower(p_slug),
        description = p_description,
        content = p_content,
        status = v_status,
        published_at = case when p_publish then coalesce(published_at, now()) else null end
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'update_not_found';
    end if;
  end if;

  perform private.log_admin_action(
    case when p_publish then 'update.published' else 'update.drafted' end,
    null,
    jsonb_build_object('id', v_id, 'slug', p_slug)
  );

  return v_id;
end;
$$;

create or replace function public.admin_delete_update(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.updates where id = p_id;
  perform private.log_admin_action('update.deleted', null, jsonb_build_object('id', p_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Community information blocks
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_community_info(
  p_key text,
  p_title text,
  p_content text,
  p_sort_order integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  insert into public.community_info (key, title, content, sort_order, updated_by)
  values (lower(p_key), p_title, p_content, p_sort_order, (select auth.uid()))
  on conflict (key) do update
    set title = excluded.title,
        content = excluded.content,
        sort_order = excluded.sort_order,
        updated_by = excluded.updated_by;

  perform private.log_admin_action('community_info.saved', null, jsonb_build_object('key', p_key));
end;
$$;

create or replace function public.admin_delete_community_info(p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.community_info where key = p_key;
  perform private.log_admin_action('community_info.deleted', null, jsonb_build_object('key', p_key));
end;
$$;

-- ---------------------------------------------------------------------------
-- Explore sections
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_explore_section(
  p_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_content text,
  p_sort_order integer,
  p_is_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin();

  if p_id is null then
    insert into public.explore_sections (slug, title, description, content, sort_order, is_published)
    values (lower(p_slug), p_title, p_description, p_content, p_sort_order, p_is_published)
    returning id into v_id;
  else
    update public.explore_sections
    set slug = lower(p_slug),
        title = p_title,
        description = p_description,
        content = p_content,
        sort_order = p_sort_order,
        is_published = p_is_published
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'section_not_found';
    end if;
  end if;

  perform private.log_admin_action(
    'explore_section.saved',
    null,
    jsonb_build_object('id', v_id, 'slug', p_slug, 'published', p_is_published)
  );

  return v_id;
end;
$$;

create or replace function public.admin_delete_explore_section(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.explore_sections where id = p_id;
  perform private.log_admin_action('explore_section.deleted', null, jsonb_build_object('id', p_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard counters (one round trip, values come from the database)
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (select count(*) from public.profiles where account_status = 'active'),
    'suspended_users', (select count(*) from public.profiles where account_status = 'suspended'),
    'achievements', (select count(*) from public.achievements),
    'awards', (select count(*) from public.user_achievements),
    'published_updates', (select count(*) from public.updates where status = 'published'),
    'draft_updates', (select count(*) from public.updates where status = 'draft'),
    'explore_sections', (select count(*) from public.explore_sections),
    'registration_enabled', (select registration_enabled from public.site_settings where id = 1)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: only authenticated sessions may call these; every function re-checks
-- the admin role on its own, so hiding the UI is never the protection.
-- ---------------------------------------------------------------------------
revoke all on function public.admin_set_role(uuid, public.user_role) from public;
revoke all on function public.admin_set_account_status(uuid, public.account_status) from public;
revoke all on function public.admin_set_registration(boolean, text) from public;
revoke all on function public.admin_set_discord_url(text) from public;
revoke all on function public.admin_save_achievement(uuid, text, text, text, text) from public;
revoke all on function public.admin_delete_achievement(uuid) from public;
revoke all on function public.admin_assign_achievement(uuid, uuid) from public;
revoke all on function public.admin_revoke_achievement(uuid, uuid) from public;
revoke all on function public.admin_save_update(uuid, text, text, text, text, boolean) from public;
revoke all on function public.admin_delete_update(uuid) from public;
revoke all on function public.admin_save_community_info(text, text, text, integer) from public;
revoke all on function public.admin_delete_community_info(text) from public;
revoke all on function public.admin_save_explore_section(uuid, text, text, text, text, integer, boolean) from public;
revoke all on function public.admin_delete_explore_section(uuid) from public;
revoke all on function public.admin_dashboard_stats() from public;

grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_set_account_status(uuid, public.account_status) to authenticated;
grant execute on function public.admin_set_registration(boolean, text) to authenticated;
grant execute on function public.admin_set_discord_url(text) to authenticated;
grant execute on function public.admin_save_achievement(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_delete_achievement(uuid) to authenticated;
grant execute on function public.admin_assign_achievement(uuid, uuid) to authenticated;
grant execute on function public.admin_revoke_achievement(uuid, uuid) to authenticated;
grant execute on function public.admin_save_update(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_update(uuid) to authenticated;
grant execute on function public.admin_save_community_info(text, text, text, integer) to authenticated;
grant execute on function public.admin_delete_community_info(text) to authenticated;
grant execute on function public.admin_save_explore_section(uuid, text, text, text, text, integer, boolean) to authenticated;
grant execute on function public.admin_delete_explore_section(uuid) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
