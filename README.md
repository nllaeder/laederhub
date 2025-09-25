# Laederhub

Laederhub is an MVP backend that helps small businesses unify SaaS data silos and get immediate analytics insights. The monorepo is centered on a FastAPI service that authenticates users via Firebase, captures intake conversations with an LLM orchestrator, connects to Constant Contact via MCP clients, and stages data in Google Cloud for downstream analytics.

## Architecture Overview
- **Authentication**: Incoming requests present Firebase ID tokens that are verified server-side.
- **Intake Chat**: An orchestrated LLM workflow captures user goals and updates their profile.
- **Connections**: The Constant Contact integration is stubbed via an MCP client to demonstrate OAuth handshakes and data pulls.
- **Analytics Pull**: Example route shows how campaign metrics would land in a staging table in BigQuery after persisting raw JSON to GCS.
- **Suggestions**: Hard-coded KPI suggestions illustrate later LLM-driven analysis.

## Services
- `services/api`: FastAPI application with modular routers, configuration, logging, security, data, and LLM orchestration helpers.

## Getting Started
1. Duplicate `.env.example` to `.env` and populate Firebase, GCP, and MCP configuration values.
2. Install dependencies with Poetry (or your preferred tool) and activate the environment.
3. Run `scripts/dev_bootstrap.sh` to export environment variables and start the FastAPI app.
4. Hit `/intake/chat` to simulate an intake conversation, `/connects/constant-contact/start` to initiate a dummy connection, and `/analytics/pull` to walk through the analytics pipeline.

## Testing
Run `pytest` from the repository root. The suite currently includes basic smoke tests to validate application creation.
