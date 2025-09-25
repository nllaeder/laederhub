"""Security utilities for Firebase-backed authentication."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Annotated

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials

from .config import settings

logger = logging.getLogger(__name__)
_bearer_scheme = HTTPBearer(auto_error=False)


def _ensure_firebase_app() -> None:
    if firebase_admin._apps:
        return

    cred_path = Path(settings.firebase_credentials_path)
    if not cred_path.exists():
        logger.error("Firebase credentials file missing at %s", cred_path)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase credentials not configured",
        )

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id})
    logger.info("Initialized Firebase Admin for project %s", settings.firebase_project_id)


async def get_current_user(
    credentials_payload: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)]
) -> dict:
    if credentials_payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    _ensure_firebase_app()

    token = credentials_payload.credentials
    try:
        decoded = auth.verify_id_token(token)
    except auth.InvalidIdTokenError as exc:
        logger.warning("Invalid Firebase ID token: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid ID token") from exc
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Unexpected error verifying Firebase token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed") from exc

    return {
        "uid": decoded.get("uid"),
        "email": decoded.get("email"),
        "claims": decoded,
    }


CurrentUser = Annotated[dict, Depends(get_current_user)]
