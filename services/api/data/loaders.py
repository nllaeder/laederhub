"""Data loader utilities for staging Constant Contact data."""

from __future__ import annotations

import json
import uuid
from typing import Any, Iterable

from google.cloud import bigquery, storage

from ..core.logging import get_logger

logger = get_logger(__name__)


def _split_bucket_uri(bucket_uri: str) -> tuple[str, str]:
    if bucket_uri.startswith("gs://"):
        suffix = bucket_uri[len("gs://") :]
    else:
        suffix = bucket_uri
    if "/" in suffix:
        bucket_name, prefix = suffix.split("/", 1)
    else:
        bucket_name, prefix = suffix, ""
    prefix = prefix.rstrip("/")
    return bucket_name, prefix


def stage_constant_contact_campaigns(
    *, project_id: str, dataset: str, bucket: str, rows: Iterable[dict[str, Any]]
) -> dict[str, Any]:
    rows = list(rows)
    run_id = uuid.uuid4().hex
    bucket_name, prefix = _split_bucket_uri(bucket)
    object_path = "/".join(filter(None, [prefix, "cc_campaigns", f"{run_id}.json"]))
    gcs_uri = f"gs://{bucket_name}/{object_path}" if bucket_name else bucket
    staging_table = f"{project_id}.{dataset}.cc_campaigns_staging"

    try:
        storage_client = storage.Client(project=project_id)
        bucket_obj = storage_client.bucket(bucket_name)
        blob = bucket_obj.blob(object_path)
        blob.upload_from_string(json.dumps(rows, default=str), content_type="application/json")
        logger.info("Uploaded %s rows to %s", len(rows), gcs_uri)

        bq_client = bigquery.Client(project=project_id)
        job_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        )
        load_job = bq_client.load_table_from_json(rows, staging_table, job_config=job_config)
        load_job.result()
        status = "completed"
    except Exception as exc:  # pragma: no cover - requires live GCP
        print(f"[BigQueryStub] Would load {len(rows)} rows into {staging_table} via {gcs_uri}: {exc}")
        status = "stubbed"

    return {
        "status": status,
        "rows": len(rows),
        "staging_table": staging_table,
        "gcs_uri": gcs_uri,
        "run_id": run_id,
    }
