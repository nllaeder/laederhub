from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.core.config import settings
from ..services.core.security import CurrentUser
from ..services.data import loaders
from ..services.mcp import client as mcp_client
from ..services.store import firestore
from ..services.store.models import IngestionRun

router = APIRouter()


class AnalyticsPullRequest(BaseModel):
    connection_id: str = Field(..., description="Identifier for the Constant Contact connection")
    since: datetime | None = Field(default=None, description="Only pull campaigns updated after this timestamp")


@router.post("/pull")
async def analytics_pull(payload: AnalyticsPullRequest, user: CurrentUser) -> dict[str, Any]:
    if not settings.enable_analytics_pull:
        return {"status": "disabled", "reason": "Analytics pull feature flag disabled"}

    metrics = mcp_client.cc_export_campaign_metrics(
        user_id=user.get("uid", "anonymous"),
        connection_id=payload.connection_id,
        since=payload.since,
    )

    load_summary = loaders.stage_constant_contact_campaigns(
        project_id=settings.project_id,
        dataset=settings.bigquery_dataset,
        bucket=settings.gcs_bucket_raw,
        rows=metrics,
    )

    run = IngestionRun(
        run_id=load_summary.get("run_id", ""),
        provider="constant_contact",
        status=load_summary.get("status", "completed"),
        payload={"rows_loaded": load_summary.get("rows", 0)},
    )
    firestore.record_run(uid=user.get("uid", "anonymous"), run=run)

    return {
        "status": "ok",
        "rows": load_summary.get("rows", 0),
        "staging_table": load_summary.get("staging_table"),
        "gcs_uri": load_summary.get("gcs_uri"),
    }
