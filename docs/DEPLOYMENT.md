# Deployment

## Hosting model

- **Site:** GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`.
- **Backend:** the existing Supabase project `PhantomCommunityData` (ref `mwtaoliwtnxfetgrrjqx`).
- GitHub stores code and runs the build; it is not the database.

## How the pipeline works

1. `npm ci` → `npm run build` (`tsc --noEmit` + `vite build`).
2. `VITE_BASE=/<repo-name>/` is injected so asset URLs resolve on a project site.
3. `dist/index.html` is copied to `dist/404.html` — GitHub Pages has no SPA rewrites,
   so deep links (e.g. `/Community-Data/members/name`) must load the app shell.
4. `actions/deploy-pages` publishes `dist` to the `github-pages` environment.

Resulting URL: `https://<owner>.github.io/Community-Data/`

## Configuration

Supabase values for the build live in the committed `.env.production`. They are
**public** values (project URL + publishable key) that every browser downloads anyway.
Security is enforced in PostgreSQL: RLS, column privileges and backend-only writes.

Secret keys (`sb_secret_*`, `service_role`) never appear in the repository, the bundle
or the browser. They belong only to server-side Edge Functions.

## Custom domain later

1. Add a `CNAME` file in `public/` with the domain.
2. Point DNS (A/ALIAS or CNAME) at GitHub Pages.
3. Drop `VITE_BASE` from the workflow (or set it to `/`) so assets resolve from the root.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:5173
```

`.env.local` is git-ignored and overrides `.env.production` locally.

## Manual deploy fallback

```bash
npm run build
# upload the contents of dist/ to any static host (Netlify, Vercel, Cloudflare Pages)
```
