# Laederhub Task List

## 1. Repository & Tooling Setup
- [ ] Install dependencies via Poetry (preferred) or uv and ensure Python 3.11+ interpreter is active.
- [ ] Copy `.env.example` to `.env` and fill in all required environment variables.
- [ ] Create a dedicated virtual environment or rely on Poetry-managed venv for local development.
- [ ] Configure linting/formatting tools (optional but recommended) such as Ruff or Black.

## 2. Secrets & Configuration

### Environment Variables
| Variable | Purpose |
| --- | --- |
| `PROJECT_ID` | Google Cloud project ID used across Firestore, BigQuery, and Storage. |
| `FIREBASE_PROJECT_ID` | Firebase project that issues ID tokens for authentication. |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase Admin SDK service account JSON file. |
| `GCS_BUCKET_RAW` | GCS bucket URI for storing raw Constant Contact payloads. |
| `BIGQUERY_DATASET` | BigQuery dataset for staging and core analytics tables. |
| `MCP_CC_BASE_URL` | Base URL for the Constant Contact MCP server. |
| `MCP_API_KEY` | API key or token for authenticating MCP requests. |
| `DEFAULT_REGION` | Default GCP region for resources (optional helper). |
| `API_HOST` / `API_PORT` / `API_LOG_LEVEL` | FastAPI runtime configuration. |
| `ENABLE_ANALYTICS_PULL` | Feature flag to toggle analytics ingestion route. |
| `GOOGLE_APPLICATION_CREDENTIALS`* | Path to GCP service account JSON (exported outside `.env` if preferred). |

\*Not present in `.env.example` but required by Google client libraries. Set explicitly in shell or deployment environment.

### Firebase / Authentication
- [ ] Set `FIREBASE_PROJECT_ID` in `.env` to the Firebase project hosting Authentication.
- [ ] Download a Firebase Admin SDK service account JSON with `roles/firebaseauth.admin` and save it locally.
- [ ] Set `FIREBASE_CREDENTIALS_PATH` to the service account JSON path.
- [ ] (Optional) Store Firebase service account JSON securely in a secrets manager for deployment.

### Google Cloud Platform
- [ ] Ensure a Google Cloud project exists matching `PROJECT_ID`.
- [ ] Create a service account with permissions: `roles/datastore.user`, `roles/bigquery.admin`, `roles/storage.objectAdmin`.
- [ ] Download the GCP service account key JSON and set/export `GOOGLE_APPLICATION_CREDENTIALS` to its path.
- [ ] Set `GCS_BUCKET_RAW` to a valid GCS bucket URI and create the bucket if it does not exist.
- [ ] Set `BIGQUERY_DATASET` to an existing dataset or create one for staging analytics tables.
- [ ] Enable required APIs: Firestore, BigQuery, Cloud Storage, IAM Service Account Credentials.
- [ ] Optionally provision infrastructure for future data warehouse tables and scheduled jobs.

### MCP / Constant Contact Integration
- [ ] Set `MCP_CC_BASE_URL` to the deployed MCP Constant Contact server URL.
- [ ] Generate or obtain `MCP_API_KEY` to authenticate MCP calls.
- [ ] Capture Constant Contact OAuth Client ID, Client Secret, and redirect URIs; store securely for the MCP server.
- [ ] Define storage for Constant Contact refresh tokens and access tokens (e.g., Firestore, Secret Manager).

### LLM Provider (to be selected)
- [ ] Choose an LLM provider (OpenAI, Vertex AI, Anthropic, etc.).
- [ ] Add corresponding API key(s) to secret storage and expose via new environment variables (e.g., `OPENAI_API_KEY`).
- [ ] Update deployment manifests to inject LLM credentials securely.

### Additional Environment Values
- [ ] Review and set `DEFAULT_REGION`, `API_HOST`, `API_PORT`, and `API_LOG_LEVEL` to match deployment requirements.
- [ ] For local development, consider setting feature flags (e.g., `ENABLE_ANALYTICS_PULL`) explicitly.

## 3. Stub Replacement Tasks

### LLM Orchestration (`services/api/llm/orchestrator.py`)
- [ ] Replace `chat_intake` with real LLM orchestration calling the chosen provider and persisting conversation state.
- [ ] Implement `suggest_kpis` to derive KPIs from actual user context and campaign metrics.
- [ ] Implement `analysis_plan` to return actionable analysis steps from real LLM responses.

### MCP Client (`services/api/mcp/client.py`)
- [ ] Implement `cc_oauth_start` to initiate Constant Contact OAuth via the MCP server.
- [ ] Handle token exchange and persistence within `cc_oauth_callback`.
- [ ] Implement `cc_export_campaign_metrics` to fetch real campaign data from Constant Contact through MCP.

### Data Loaders (`services/api/data/loaders.py`)
- [ ] Replace stubbed `stage_constant_contact_campaigns` logic with production-grade GCS upload (newline-delimited JSON) and BigQuery load jobs.
- [ ] Implement error handling, retries, and idempotency for BigQuery and GCS operations.
- [ ] Confirm schema alignment with `services/api/data/bigquery_schemas.py` and create tables where absent.

### Firestore Helpers (`services/api/store/firestore.py`)
- [ ] Validate Firestore read/write flows for `users`, `connections`, and `runs` collections.
- [ ] Add structured logging/metrics for data operations; ensure quotas and indexes.

## 4. API Surface Validation
- [ ] Secure `/auth/me`, `/intake/chat`, `/connects/*`, and `/analytics/pull` endpoints with Firebase token enforcement (integration tests).
- [ ] Add input validation and error responses for MCP and analytics routes.
- [ ] Create end-to-end tests covering intake → connection → analytics pull workflow.

## 5. Data & Analytics Tasks
- [ ] Finalize SQL DDL in `services/api/data/bigquery_schemas.py` and execute against BigQuery datasets.
- [ ] Design downstream transformations from staging to core tables and orchestrate via preferred ETL tool.
- [ ] Define retention and cleanup strategy for raw GCS objects and staging tables.

## 6. Deployment & Operations
- [ ] Containerize FastAPI service (Dockerfile) or prepare deployment manifests (Cloud Run, GKE, etc.).
- [ ] Integrate secrets management (Google Secret Manager, AWS Secrets Manager, Vault) for all keys.
- [ ] Configure application logging and monitoring (Cloud Logging, Prometheus, etc.).
- [ ] Set up CI/CD pipeline to run pytest suite and future integration tests.
- [ ] Document runbooks for OAuth renewal, LLM provider changes, and analytics pipeline failures.

## 7. Testing & QA
- [ ] Expand pytest coverage for routers, security, Firestore helpers, and data loaders.
- [ ] Add contract or integration tests for MCP interactions once implemented.
- [ ] Simulate failure scenarios (expired tokens, GCS/BQ permissions) and ensure graceful handling.
