# LaederHub Project Overview

LaederHub is a two-service monorepo packaging the LaederData analytics workspace. The goal is to deliver an authenticated, AI-assisted hub that orchestrates intake conversations, manages marketing connectors, and stages data for downstream analytics.

The repository currently contains:

- **Frontend** (`frontend/`): Next.js 15 App Router app deployed to Vercel. Auth is powered by NextAuth with Google OAuth 2.0 and JWT sessions. For now, production exposes a “work in progress” landing page while `/hub` is under development.
- **Backend** (`backend/`): FastAPI 0.110 service intended for Render. It currently verifies Firebase ID tokens, simulates MCP connectors, and stubs data loaders for Firestore, GCS, and BigQuery. Roadmap work includes replacing stubs with Postgres + pgvector, prompt-injection defenses, and real tool integrations.
- **Shared Layer** (`shared/`): Python and TypeScript assets (prompt templates, schemas) consumed by both services.
- **Docs & Scripts**: `docs/blueprint.md` documents UX goals; `TASKS.md` tracks prioritized work; `scripts/dev_bootstrap.sh` bootstraps backend dev environments.

## Monorepo Structure

```
.
├── frontend/           # Next.js + NextAuth + Tailwind hub UI (Vercel)
│   ├── app/            # App router routes (hub, login, WIP page)
│   ├── components/     # Landing + hub UI modules and shadcn/ui primitives
│   ├── hooks/          # Client-side hooks (API proxy stub, toast)
│   ├── lib/            # Auth configuration, utilities
│   ├── middleware.ts   # Host-based rewrites (hub domains → /wip)
│   ├── ai/             # Vercel AI SDK stubs
│   └── package.json    # Next.js dependency graph
├── backend/            # FastAPI app (Render)
│   ├── app/main.py     # Root FastAPI application
│   ├── app/routes/     # REST endpoints (auth, intake, connects, analytics)
│   ├── app/services/   # Auth, MCP, data loader, Firestore helper stubs
│   ├── pyproject.toml  # Poetry project definition
│   └── firestore.rules # Firestore security blueprint
├── shared/             # Shared schemas & prompts
├── docs/               # Blueprint and background docs
├── scripts/            # Utility scripts (e.g., backend bootstrap)
└── TASKS.md            # Live checklist of implementation work
```

## Branch & Deployment Strategy

- **`main`**: production branch, protected. Every push triggers a Vercel production deployment using `frontend/` as the root. The deployed app currently serves the `/wip` page on root and hub hostnames.
- **`develop`**: integration branch used for day-to-day work. Vercel preview deployments should target this branch. Feature branches (`feature/...`) branch from `develop` and open PRs back into `develop`. After validation, merge `develop` into `main` to ship to production.
- **Backend deployments** mirror the frontend: Render service should point at `backend/` and deploy from `main` once ready. Preview deployments can reference `develop`.

## Environment Variables

Set these locally (`frontend/.env.local`, repo-root `.env`) and in hosting platforms (Vercel production/preview, Render service). Values shown with intent:

```
# Frontend (NextAuth + Vercel)
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
NEXTAUTH_SECRET=<Long random string for JWT signing>
NEXTAUTH_URL=https://<vercel-production-domain>
```

Backend (`.env` from `.env.example`):

```
PROJECT_ID=<GCP project id>
FIREBASE_PROJECT_ID=<Firebase project id>
FIREBASE_CREDENTIALS_PATH=./firebase_service_account.json
GCS_BUCKET_RAW=gs://...
BIGQUERY_DATASET=...
MCP_CC_BASE_URL=https://...
MCP_API_KEY=...
DEFAULT_REGION=us-central1
API_HOST=0.0.0.0
API_PORT=8000
API_LOG_LEVEL=info
ENABLE_ANALYTICS_PULL=true
```

Google service-account JSON should never be versioned; store it outside the repo and reference via path or secret manager.

## Frontend Notes

- App Router entry points live in `frontend/app`. Current routing:
  - `/` → work-in-progress page (`frontend/app/page.tsx`).
  - `/wip` → hub “coming soon” page; middleware rewrites hub hostnames here.
  - `/login` → server component gated by `getServerSession`; renders a Google sign-in button (`frontend/app/login/sign-in-buttons.tsx`).
  - `/hub` → server-side protected layout that will render the hub workspace when ready.
  - `/api/auth/[...nextauth]` → NextAuth handler configured in `frontend/lib/auth.ts`.
- `Providers` wraps the app with `SessionProvider` so client components can use `useSession`.
- Hub UI components (Header, ChatPanel, SourceIndicator) currently operate on mock data; they will integrate with backend `/intake` and `/analytics` endpoints.
- `frontend/middleware.ts` rewrites hub hostnames to `/wip` to ensure visitors see the status message while the hub is under construction.

## Backend Notes

- `backend/app/main.py` defines the FastAPI app, mounting routers for `/auth`, `/intake`, `/connects`, and `/analytics`.
- Authentication currently depends on Firebase ID tokens (via Admin SDK). Target architecture is to accept NextAuth-issued JWTs from the frontend; replacing `services/core/security.py` with a NextAuth verifier is a near-term task.
- `services/mcp/client.py` contains stubs for Constant Contact MCP OAuth flows; future versions should call the MCP server using `MCP_API_KEY`.
- `services/data/loaders.py` currently stubs integration with GCS/BigQuery; eventual work pivots toward FAISS/pgvector and Postgres.
- `tests/unit/test_basic.py` includes a simple health-check test and needs updating once module paths are finalized.

## Development Workflow

### Frontend
1. `cd frontend`
2. `npm install`
3. Ensure `frontend/.env.local` contains the Google/NextAuth variables above.
4. `npm run dev` (default port 9002). For hub host rewrites, add `127.0.0.1 hub.localhost` to `/etc/hosts` and browse to `http://hub.localhost:9002/wip`.

### Backend
1. `cp .env.example .env` at repo root and populate values.
2. `cd backend`
3. `poetry install`
4. `poetry run uvicorn app.main:app --reload` or `./scripts/dev_bootstrap.sh`

## Deployment Workflow

- **Frontend**: Vercel project root set to `frontend/`. Production deploys come from `main`. Previews should target `develop`.
- **Backend**: Render (or similar) service targeting `backend/`, deploying from `main` once stable. Use preview deployments or manual promotion from `develop` for testing.

## Roadmap Highlights

From `TASKS.md` (abridged):

1. Replace Firebase-based auth with NextAuth JWT validation in FastAPI.
2. Implement real LLM orchestration (`services/llm/orchestrator.py`) using the chosen provider (OpenAI/Vertex/etc.).
3. Build embedding pipeline (SQLite + FAISS for dev; Postgres + pgvector for production).
4. Replace MCP stubs with live Constant Contact integrations.
5. Harden data loaders or pivot to Postgres-based storage for analytics runs.
6. Expand backend unit/integration tests and future frontend test coverage.
7. Finalize analytics dashboards and streaming chat experience in the hub UI.
8. Establish CI/CD automation and production-ready monitoring.

## Current Status Snapshot

- Production hub displays a work-in-progress page; `/hub` is not yet exposed publicly.
- Frontend authentication flow uses Google OAuth via NextAuth; backend still expects Firebase tokens and needs alignment.
- Firebase client code has been removed from the frontend; `SessionProvider` and NextAuth handlers are in place.
- Branch policies: `main` protected/auto deploy, `develop` for integration, feature branches off `develop`.
- Secrets managed in Vercel (frontend) and local `.env` (backend) per the environment section above.

This document should serve as the canonical context for future collaboration, capturing platform boundaries, deployment workflows, environment setup, and remaining milestones.
