"""SQL schema definitions for Constant Contact data."""

CC_CAMPAIGNS_STAGING = """
CREATE TABLE IF NOT EXISTS `{{ project_id }}.{{ dataset }}.cc_campaigns_staging` (
    campaign_id STRING,
    name STRING,
    status STRING,
    send_time TIMESTAMP,
    metrics JSON,
    raw_payload JSON,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
""".strip()

CC_CAMPAIGNS_CORE = """
CREATE TABLE IF NOT EXISTS `{{ project_id }}.{{ dataset }}.cc_campaigns` (
    campaign_id STRING,
    period DATE,
    sends INT64,
    opens INT64,
    clicks INT64,
    unsubscribes INT64,
    revenue NUMERIC,
    load_id STRING,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
""".strip()
