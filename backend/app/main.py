from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .services.core.config import settings
from .services.core.logging import configure_logging
from .services.core.security import authenticate_request
from .routers import analytics, auth, connects, intake

configure_logging()

app = FastAPI(
    title="Laederhub API",
    description="MVP backend for small-business analytics orchestration",
    version="0.1.0",
)

_PROTECTED_PATH_PREFIXES = ("/intake", "/connects", "/analytics")


@app.on_event("startup")
async def startup() -> None:
    # Placeholder for future startup hooks (e.g., warm caches, connection pools).
    pass


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "project": settings.project_id}


@app.middleware("http")
async def ensure_authenticated_requests(request: Request, call_next):  # type: ignore[override]
    if request.url.path.startswith(_PROTECTED_PATH_PREFIXES):
        try:
            authenticate_request(request)
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    return await call_next(request)


app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(intake.router, prefix="/intake", tags=["intake"])
app.include_router(connects.router, prefix="/connects", tags=["connectors"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
