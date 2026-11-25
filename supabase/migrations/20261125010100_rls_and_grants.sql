-- ---------------------------------------------------------------------------
-- Row Level Security and least-privilege grants (README §10)
--
-- Supabase grants broad privileges on `public` by default, so every table is
-- revoked first and then granted exactly what each role needs. Writes that
-- belong to the backend (registration, roles, awards, publishing) are performed
-- only by Edge Functions using the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

alter table public.profiles               enable row level security;
alter table public.user_roles             enable row level security;
alter table public.site_settings          enable row level security;
alter table public.achievements           enable row level security;
alter table public.user_achievements       enable row level security;
alter table public.updates                enable row level security;
alter table public.community_info         enable row level security;
alter table public.explore_sections       enable row level security;
alter table public.account_recovery_codes enable row level security;
alter table public.admin_audit_log        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: public read of active members, members edit only their own row.
-- Column grants make role/status/username immutable for clients even when the
-- update policy matches their own row.
-- ---------------------------------------------------------------------------
grant select on public.profiles to anon, authenticated;
grant update (display_name, bio, avatar_path, banner_path, social_links, favorite_games)
  on public.profiles to authenticated;

create policy "profiles are readable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (
    account_status = 'active'
    or id = (select auth.uid())
    or private.is_admin((select auth.uid()))
  );

create policy "members update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_roles: readable (a role is shown on public profiles), never writable by
-- clients — only the backend may change roles.
-- ---------------------------------------------------------------------------
grant select on public.user_roles to anon, authenticated;

create policy "roles are readable by everyone"
  on public.user_roles
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- site_settings: only non-sensitive columns are selectable. The invitation
-- code hash has no grant at all, so it can never be read through the API.
-- ---------------------------------------------------------------------------
grant select (id, registration_enabled, discord_invite_url, updated_at, updated_by)
  on public.site_settings to anon, authenticated;

create policy "site settings are readable"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- achievements and awards: public read, backend-only writes.
-- ---------------------------------------------------------------------------
grant select on public.achievements to anon, authenticated;
grant select on public.user_achievements to anon, authenticated;

create policy "achievements are readable by everyone"
  on public.achievements
  for select
  to anon, authenticated
  using (true);

create policy "user achievements are readable by everyone"
  on public.user_achievements
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- updates: published only; administrators additionally see drafts.
-- ---------------------------------------------------------------------------
grant select on public.updates to anon, authenticated;

create policy "published updates are readable by everyone"
  on public.updates
  for select
  to anon, authenticated
  using (status = 'published' or private.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------------
-- community_info: public content, edited by administrators.
-- ---------------------------------------------------------------------------
grant select on public.community_info to anon, authenticated;

create policy "community info is readable by everyone"
  on public.community_info
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- explore_sections: published sections only; administrators see all.
-- ---------------------------------------------------------------------------
grant select on public.explore_sections to anon, authenticated;

create policy "published explore sections are readable"
  on public.explore_sections
  for select
  to anon, authenticated
  using (is_published or private.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------------
-- account_recovery_codes: no client access at all (no grants above).
-- Verification and password changes happen in a backend Edge Function.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- admin_audit_log: administrators can read the log; nobody can modify or
-- delete it through the API (append-only, written by backend operations).
-- ---------------------------------------------------------------------------
grant select on public.admin_audit_log to authenticated;

create policy "administrators read the audit log"
  on public.admin_audit_log
  for select
  to authenticated
  using (private.is_admin((select auth.uid())));
