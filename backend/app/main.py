from fastapi import FastAPI

from .services.core.config import settings
from .services.core.logging import configure_logging
from .routers import analytics, auth, connects, intake

configure_logging()

app = FastAPI(
    title="Laederhub API",
    description="MVP backend for small-business analytics orchestration",
    version="0.1.0",
)


@app.on_event("startup")
async def startup() -> None:
    # Placeholder for future startup hooks (e.g., warm caches, connection pools).
    pass


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "project": settings.project_id}


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(intake.router, prefix="/intake", tags=["intake"])
app.include_router(connects.router, prefix="/connects", tags=["connectors"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
