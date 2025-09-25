from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.core.security import CurrentUser
from ..services.llm import orchestrator
from ..services.store import firestore
from ..services.store.models import UserProfile

router = APIRouter()


class IntakeRequest(BaseModel):
    message: str = Field(..., description="Latest message from the user")
    traits: dict[str, Any] = Field(default_factory=dict, description="Context collected so far")


@router.post("/chat")
async def chat_intake(payload: IntakeRequest, user: CurrentUser) -> dict[str, Any]:
    profile = UserProfile(
        uid=user.get("uid", "anonymous"),
        email=user.get("email"),
        traits=payload.traits,
        last_message=payload.message,
    )

    response = orchestrator.chat_intake(payload.message, payload.traits, user)
    firestore.upsert_user_profile(profile)

    return {"intake": response, "profile": profile.__dict__}
