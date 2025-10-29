"""Security utilities for NextAuth-backed authentication."""

from __future__ import annotations

import logging
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import ExpiredSignatureError, InvalidTokenError

from .config import settings

logger = logging.getLogger(__name__)
_bearer_scheme = HTTPBearer(auto_error=False)


def _decode_token(raw_token: str) -> dict[str, Any]:
    secret = settings.nextauth_secret
    if not secret:
        logger.error("NEXTAUTH_SECRET is not configured for backend JWT verification")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication backend misconfigured",
        )

    try:
        payload = jwt.decode(
            raw_token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except ExpiredSignatureError as exc:
        logger.info("Expired NextAuth token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except InvalidTokenError as exc:
        logger.warning("Invalid NextAuth token: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    uid = payload.get("sub")
    if not uid:
        logger.error("Decoded token missing subject")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    return {
        "uid": str(uid),
        "email": payload.get("email"),
        "name": payload.get("name"),
        "picture": payload.get("picture"),
        "claims": payload,
    }


def _extract_bearer_token(authorization_header: str | None) -> str:
    if not authorization_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        scheme, token = authorization_header.split(" ", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header") from exc

    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header")

    return token.strip()


def authenticate_request(request: Request) -> None:
    token = _extract_bearer_token(request.headers.get("Authorization"))
    user = _decode_token(token)
    request.state.user = user


async def require_authentication(
    request: Request,
    credentials_payload: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> None:
    if credentials_payload is None:
        authenticate_request(request)
        return

    user = _decode_token(credentials_payload.credentials)
    request.state.user = user


def get_current_user(request: Request) -> dict[str, Any]:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]

__all__ = ["CurrentUser", "require_authentication", "get_current_user", "authenticate_request"]
