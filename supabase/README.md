# Database & Storage (Supabase)

Project: **PhantomCommunityData** — ref `mwtaoliwtnxfetgrrjqx` (region `eu-west-2`, PostgreSQL 17).

All backend data lives in this existing project. No second Supabase project is used.

## Tables (schema `public`)

| Table | Purpose |
|---|---|
| `profiles` | Public member information (never passwords, never auth identifiers) |
| `user_roles` | Authorization source of truth (`member`, `moderator`, `admin`) |
| `site_settings` | Single row: registration toggle, invitation-code hash, Discord invite URL |
| `achievements` | Achievement definitions |
| `user_achievements` | Awards granted to members |
| `updates` | Official announcements (`draft` / `published`) |
| `community_info` | Editable public content blocks |
| `explore_sections` | Thematic sections, ordered and publishable |
| `account_recovery_codes` | Recovery-code hashes (one active code per user) |
| `admin_audit_log` | Append-only record of administrative actions |

Internal helpers live in the `private` schema (`set_updated_at`, `has_role`, `is_admin`,
`handle_new_user`) and are not exposed through the API.

## Migrations

Applied in order:

1. `20261125010000_init_schema.sql` — types, tables, indexes, triggers, auth helpers.
2. `20261125010100_rls_and_grants.sql` — RLS, least-privilege grants, read policies.
3. `20261125010200_storage_buckets.sql` — `avatars` / `banners` buckets and ownership policies.

They were applied on 2026-11-25 to an **empty** database (0 tables in `public`, 0 storage
buckets, 0 users), so no existing data was removed or overwritten.

The files in this directory are the source of truth. If the live database and these files
diverge, the files describe the intended state.

### Using the Supabase CLI from now on

```bash
supabase login
supabase link --project-ref mwtaoliwtnxfetgrrjqx
# historical migrations were applied outside the CLI; mark them as applied once:
supabase migration repair --status applied 20261125010000 20261125010100 20261125010200
supabase db push
```

## Storage

| Bucket | Public read | Max size | Allowed types |
|---|---|---|---|
| `avatars` | yes | 2 MB | `image/webp`, `image/png`, `image/jpeg` |
| `banners` | yes | 5 MB | `image/webp`, `image/png`, `image/jpeg` |

Objects must be written to `{user_id}/{file}`. Policies use
`(storage.foldername(name))[1] = auth.uid()` so a member can only create, replace and
delete their own images. Replacing an image follows the order required by the README:
upload → update the database path → only then delete the previous file.

## Security model

- Supabase's default broad grants on `public` were revoked for `anon` and `authenticated`.
- Every table has RLS enabled; policies grant the minimum required access.
- `profiles`: public read, and members may update **only**
  `display_name`, `bio`, `avatar_path`, `banner_path`, `social_links`, `favorite_games`.
  `username`, `account_status` and roles cannot be changed by clients (column privileges).
- `site_settings`: only `id`, `registration_enabled`, `discord_invite_url`, `updated_at`,
  `updated_by` are selectable — `invitation_code_hash` has no grant.
- `account_recovery_codes` and `admin_audit_log` are not writable through the API.
- Writes that belong to the backend (registration, role changes, awards, publishing,
  password recovery) are executed by Edge Functions with the service role.

Verified against the live API with the publishable key: public reads return `200`,
sensitive columns and unauthenticated writes return `401` / `42501`.
