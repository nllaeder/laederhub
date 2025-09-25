"""Stub MCP client for Constant Contact."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Iterable
from uuid import uuid4

from ..core.config import settings


def cc_oauth_start(*, user_id: str) -> tuple[str, str]:
    provisional_id = uuid4().hex
    auth_url = f"{settings.mcp_cc_base_url}/oauth/authorize?connection_id={provisional_id}&user_id={user_id}"
    return auth_url, provisional_id


def cc_oauth_callback(*, user_id: str, code: str, state: str | None = None) -> str:
    resource_ref = f"cc-connection-{uuid4().hex[:8]}"
    print(f"[MCPStub] Exchange code for token: user={user_id} code={code} state={state}")
    return resource_ref


def cc_export_campaign_metrics(
    *, user_id: str, connection_id: str, since: datetime | None = None
) -> list[dict[str, Any]]:
    since = since or datetime.utcnow() - timedelta(days=30)
    print(
        f"[MCPStub] Pulling Constant Contact metrics for user={user_id} connection={connection_id} since={since.isoformat()}"
    )
    sample_rows = [
        {
            "campaign_id": "cmp_123",
            "name": "Spring Promo",
            "status": "sent",
            "send_time": datetime.utcnow().isoformat(),
            "metrics": {
                "sends": 1200,
                "opens": 540,
                "clicks": 123,
            },
            "raw_payload": {"sample": True},
        },
        {
            "campaign_id": "cmp_456",
            "name": "Loyalty Drip",
            "status": "scheduled",
            "send_time": datetime.utcnow().isoformat(),
            "metrics": {
                "sends": 800,
                "opens": 312,
                "clicks": 67,
            },
            "raw_payload": {"sample": True},
        },
    ]
    return sample_rows
