from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class UserProfile:
    uid: str
    email: str | None
    traits: dict[str, Any] = field(default_factory=dict)
    last_message: str | None = None
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class ConnectionRecord:
    provider: str
    resource_ref: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class IngestionRun:
    run_id: str
    provider: str
    status: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    payload: dict[str, Any] = field(default_factory=dict)
