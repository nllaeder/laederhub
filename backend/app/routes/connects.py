from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.core.security import CurrentUser
from ..services.mcp import client as mcp_client
from ..services.store import firestore
from ..services.store.models import ConnectionRecord

router = APIRouter()


class CallbackPayload(BaseModel):
    code: str = Field(..., description="Authorization code returned by Constant Contact")
    state: str | None = Field(default=None, description="Opaque state string for CSRF protection")


@router.post("/constant-contact/start")
async def start_constant_contact_connect(user: CurrentUser) -> dict[str, Any]:
    auth_url, provisional_id = mcp_client.cc_oauth_start(user_id=user.get("uid", "anonymous"))
    connection = ConnectionRecord(provider="constant_contact", resource_ref=provisional_id)
    firestore.create_connection(uid=user.get("uid", "anonymous"), connection=connection)
    return {"auth_url": auth_url, "connection_id": provisional_id}


@router.post("/constant-contact/callback")
async def constant_contact_callback(payload: CallbackPayload, user: CurrentUser) -> dict[str, Any]:
    resource_ref = mcp_client.cc_oauth_callback(
        user_id=user.get("uid", "anonymous"), code=payload.code, state=payload.state
    )
    connection = ConnectionRecord(provider="constant_contact", resource_ref=resource_ref)
    connection_id = firestore.create_connection(uid=user.get("uid", "anonymous"), connection=connection)
    return {"resource_ref": resource_ref, "connection_id": connection_id}
