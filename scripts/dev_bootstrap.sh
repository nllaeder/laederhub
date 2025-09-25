#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  echo "Loaded environment variables from .env"
else
  echo "No .env file found, relying on defaults"
fi

if command -v poetry >/dev/null 2>&1; then
  echo "Installing dependencies via Poetry"
  poetry install
  exec poetry run uvicorn services.api.app:app --reload --host "${API_HOST:-0.0.0.0}" --port "${API_PORT:-8000}"
fi

if command -v uv >/dev/null 2>&1; then
  echo "Installing dependencies via uv"
  uv pip install -r <(poetry export -f requirements.txt --without-hashes)
  exec uv run uvicorn services.api.app:app --reload --host "${API_HOST:-0.0.0.0}" --port "${API_PORT:-8000}"
fi

if [[ -f "$ROOT_DIR/.venv/bin/activate" ]]; then
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.venv/bin/activate"
fi

python -m pip install --upgrade pip
pip install -e "$ROOT_DIR" "uvicorn[standard]"
exec uvicorn services.api.app:app --reload --host "${API_HOST:-0.0.0.0}" --port "${API_PORT:-8000}"
