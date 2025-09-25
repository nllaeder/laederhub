from fastapi import APIRouter

from ..services.core.security import CurrentUser

router = APIRouter()


@router.get("/me")
async def read_current_user(user: CurrentUser) -> dict:
    return user
