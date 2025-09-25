# LaederHub Monorepo

LaederHub combines a Next.js front-end experience with a FastAPI backend to power LaederData's landing page and analytics hub. The repository houses everything needed to market the product at `laederdata.com` and run the authenticated chat interface at `hub.laederdata.com`.

## What’s Inside
- **Landing site (`frontend/app/page.tsx`)** &mdash; Public marketing experience with hero, services, and contact sections.
- **Hub app (`frontend/app/hub/*`)** &mdash; Auth-protected workspace with Vercel/NextAuth session checks, chat UI, and source status bar.
- **FastAPI service (`backend/app`)** &mdash; Owns the AI/data orchestration surface, currently stubbed for MCP connectors and analytics ingestion.
- **Shared docs (`docs/`, `TASKS.md`)** &mdash; Product blueprint, backend schemas, and prioritized implementation checklist.

## Repository Structure
```
.
├── frontend/           # Next.js application (landing + hub + shared UI)
├── backend/            # FastAPI backend, routers, data loaders, MCP stubs
├── docs/               # Product and backend blueprints
├── scripts/            # Helper scripts for local development
├── tests/              # Pytest suites (unit + future integration)
├── package.json        # Front-end dependencies and scripts
└── pyproject.toml      # Backend (Poetry) configuration
```

## Prerequisites
- Node.js 18+
- npm (ships with Node) or your preferred package manager
- Python 3.11+
- Poetry (recommended) or another virtual environment manager
- Vercel account (for hosting the frontend) and Render or similar for the backend

## Front-End Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
   The app serves on [http://localhost:9002](http://localhost:9002).
3. Supply auth environment variables (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`) so NextAuth can complete the OAuth flow locally and on Vercel.

## Domain Routing
- Host-based rewrites in `src/middleware.ts` map `hub.laederdata.com` traffic to the `/hub` route while leaving the public marketing site at `/`.
- For local testing, add an entry such as `127.0.0.1 hub.localhost` to `/etc/hosts` (or Windows equivalent) and browse to `http://hub.localhost:9002` to exercise the hub experience without changing paths manually.
- Adjust the host allowlist in `src/middleware.ts` if additional subdomains or environments need to point directly at the hub UI.

## Backend Development
1. Create and populate `.env` using the variables documented in `TASKS.md`.
2. Install dependencies with Poetry:
   ```bash
   poetry install
   ```
3. Start the FastAPI service (includes env bootstrapping and sensible fallbacks when credentials are missing):
   ```bash
   ./scripts/dev_bootstrap.sh
   ```
4. Useful routes while stubs are in place:
   - `GET /health` — Service heartbeat.
   - `POST /intake/chat` — Runs the LLM intake stub and stores a profile.
   - `POST /connects/constant-contact/start` — Simulates an OAuth handshake.
   - `POST /analytics/pull` — Demonstrates staging data to GCS/BigQuery with graceful fallbacks.

## Testing
- Run API unit tests with:
  ```bash
  poetry run pytest
  ```
- Front-end testing will be added as the UI stabilizes; current focus is on API smoke coverage (`tests/unit/test_basic.py`).

## Deployment Notes
- Import the repo into Vercel and set the project root to `frontend/`; Vercel will auto-detect the Next.js app and respect the auth route handlers.
- Deploy the FastAPI service to Render (or another managed host) pointing at the `backend/` directory once environment configuration is in place.

## Roadmap
Active tasks live in `TASKS.md`. Early priorities include wiring real MCP/LLM integrations, hardening data loaders, expanding test coverage, and finalizing environment provisioning.
