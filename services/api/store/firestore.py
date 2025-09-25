"""Firestore data access helpers for the API."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from google.cloud import firestore
from google.cloud.firestore_v1 import Client

from ..core.config import settings
from ..core.logging import get_logger
from .models import ConnectionRecord, IngestionRun, UserProfile

logger = get_logger(__name__)
_firestore_client: Client | None = None


def _get_client() -> Client | None:
    global _firestore_client
    if _firestore_client is not None:
        return _firestore_client
    try:
        _firestore_client = firestore.Client(project=settings.project_id)
        logger.info("Initialized Firestore client for %s", settings.project_id)
    except Exception as exc:  # pragma: no cover - requires live credentials
        logger.warning("Firestore client unavailable, using stub mode: %s", exc)
        _firestore_client = None
    return _firestore_client


def upsert_user_profile(profile: UserProfile) -> None:
    payload = {
        "email": profile.email,
        "traits": profile.traits,
        "last_message": profile.last_message,
        "updated_at": profile.updated_at,
    }
    client = _get_client()
    if client is None:
        print(f"[FirestoreStub] upsert_user_profile uid={profile.uid} payload={payload}")
        return
    client.collection("users").document(profile.uid).set(payload, merge=True)


def create_connection(uid: str, connection: ConnectionRecord) -> str:
    connection_id = uuid.uuid4().hex
    payload = {
        "provider": connection.provider,
        "resource_ref": connection.resource_ref,
        "created_at": connection.created_at,
        "metadata": connection.metadata,
    }
    client = _get_client()
    if client is None:
        print(f"[FirestoreStub] create_connection uid={uid} id={connection_id} payload={payload}")
        return connection_id

    client.collection("users").document(uid).collection("connections").document(connection_id).set(payload)
    return connection_id


def record_run(uid: str, run: IngestionRun) -> str:
    run_id = run.run_id or uuid.uuid4().hex
    payload = {
        "provider": run.provider,
        "status": run.status,
        "created_at": run.created_at,
        "payload": run.payload,
    }
    client = _get_client()
    if client is None:
        print(f"[FirestoreStub] record_run uid={uid} run_id={run_id} payload={payload}")
        return run_id

    client.collection("users").document(uid).collection("runs").document(run_id).set(payload)
    return run_id
