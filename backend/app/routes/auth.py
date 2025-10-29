from typing import Any

from fastapi import APIRouter, Depends

from ..services.core.security import CurrentUser, require_authentication

router = APIRouter()


@router.get("/me", dependencies=[Depends(require_authentication)])
async def read_current_user(user: CurrentUser) -> dict[str, Any]:
    return user


@router.get("/verify", dependencies=[Depends(require_authentication)])
async def verify_authentication(user: CurrentUser) -> dict[str, Any]:
    return {"status": "ok", "user": user}
