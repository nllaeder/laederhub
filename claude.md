You are my AI pair programmer for a Next.js (App Router) Vercel AI app. Be precise, incremental, and production-minded. I’m on macOS with VS Code, pnpm, Node LTS, and Vercel Postgres. Assume TypeScript everywhere.

# PROJECT CONTEXT
- Repo: laederhub (monorepo ok; app is the Next.js Vercel AI project)
- Stack:
  - Next.js (App Router)
  - Auth.js v5 (NextAuth) with Google OAuth
  - Constant Contact OAuth2 (auth code + refresh)
  - Drizzle ORM + @vercel/postgres (Vercel Postgres for dev/prod)
  - Vercel AI SDK
  - pnpm (package manager)
- Existing DB & Migrations: `drizzle.config.ts` uses `POSTGRES_URL_NON_POOLING`; schema in `src/db/schema.ts`; runtime client in `src/db/client.ts`
- Auth entrypoint: `src/app/api/auth/[...nextauth]/route.ts`
- Dev environment: `.env.local` (synced from Vercel using `vercel env pull`)
- Editor: VS Code with ESLint + Prettier; use conventional commits; prefer small PR-sized changes

# NON-NEGOTIABLE GUIDELINES
1) **Never invent secrets**. If a secret/env var is needed, tell me exactly what to add and where, but don’t make up values.
2) **Minimal surface area changes**: propose the smallest diff that completes the step. Prefer adding files over massive refactors.
3) **File-aware responses**: When editing, show a unified diff (or complete file) and name exact paths (e.g., `src/app/api/cc/authorize/route.ts`).
4) **One atomic step at a time**: Plan → Diff → Commands to run → How to verify → Rollback plan.
5) **Drizzle rules**: Any schema change must include `pnpm drizzle:generate && pnpm drizzle:migrate`. Migrations use `POSTGRES_URL_NON_POOLING`.
6) **Auth rules**:
   - Google OAuth redirect must match exactly: `/api/auth/callback/google` (both local and prod).
   - When paths contain `[]`, show shell commands quoted (zsh-safe), e.g. `mkdir -p 'src/app/api/auth/[...nextauth]'`.
7) **Constant Contact rules**:
   - Use proper base URLs from env: `CC_AUTH_BASE`, `CC_API_BASE`, `CC_REDIRECT_URI`.
   - Implement state (and PKCE if supported). Store/validate `state`.
   - Persist tokens in `integrationTokens` with `expiresAt = now + expires_in`.
   - Refresh on 401/expiry with graceful retry; update DB after refresh.
8) **Error handling**: Return typed JSON errors from API routes with helpful messages; never swallow errors without logging.
9) **Testing/verification**: Always include exact curl/HTTPie examples or Next route URLs to test, expected responses, and what to look for in logs.
10) **Security & edge**: Don’t leak secrets to the client. Server-only fetches for OAuth and data ingestion.

# CURRENT GOALS (PRIORITIZED)
A) Google login must be fully working with Auth.js v5 (database sessions or JWT; prefer database sessions using DrizzleAdapter).
B) Add Constant Contact OAuth end-to-end:
   1. `/api/cc/authorize` – builds authorize URL with `state` (and PKCE if supported).
   2. `/api/cc/callback` – exchanges `code`, validates `state`, persists tokens in `integrationTokens`.
   3. `/api/cc/ping` – uses access token to hit a simple endpoint (e.g., `/contacts?limit=5`).
   4. Refresh flow – detects expiry, refreshes, updates DB, retries once.
C) Minimal UI in a settings page to show “Connect/Disconnect Constant Contact” and token status.
D) Vercel AI SDK server route to summarize a tiny JSON payload (stub now), protected by login.

# ENV VARS (DON’T INVENT VALUES)
- Core
  - `NEXTAUTH_URL` (local: http://localhost:3000)
  - `NEXTAUTH_SECRET`
- DB (from Vercel Postgres)
  - `POSTGRES_URL`
  - `POSTGRES_URL_NON_POOLING`
- Google OAuth
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Constant Contact
  - `CC_CLIENT_ID`
  - `CC_CLIENT_SECRET`
  - `CC_AUTH_BASE` (e.g., https://authz.constantcontact.com/oauth2/default)
  - `CC_API_BASE`  (e.g., https://api.cc.email/v3)
  - `CC_REDIRECT_URI` (local: http://localhost:3000/api/cc/callback)
  - `CC_SCOPES` (start with `contact_data`)

# EXISTING DB TABLES (DRIZZLE)
- `users`, `accounts`, `sessions`, `verification_tokens`
- `integrationTokens` { userId (PK), provider='constant_contact', accessToken, refreshToken, expiresAt, accountId, scope, tokenType }

# HOW TO RESPOND
For each task:
1) **Plan**: 3–6 bullets max.
2) **Diffs**: Provide explicit file paths and a single consolidated code block with all file contents or diffs (ready to paste). Keep TypeScript strict.
3) **Commands**: shell commands (zsh-safe) to run (e.g., `pnpm drizzle:generate && pnpm drizzle:migrate`, `pnpm dev`).
4) **Verification**: URLs to hit (e.g., `/api/auth/signin`, `/api/cc/authorize`, `/api/cc/ping`), expected JSON snippets, and likely failure modes.
5) **Rollback**: the one-liner to revert (e.g., `git checkout -p <files>` or `git restore --staged`).

# STARTING TASKS FOR YOU (DO THESE IN ORDER)
1) **Confirm Auth.js config**: Ensure `src/app/api/auth/[...nextauth]/route.ts` is correct and Google login works. If anything’s missing, propose minimal fixes.
2) **Add Constant Contact OAuth routes**:
   - `src/app/api/cc/authorize

