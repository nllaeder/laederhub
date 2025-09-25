"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_id: str = Field(default="laederhub-local", alias="PROJECT_ID")
    firebase_project_id: str = Field(default="laederhub-firebase", alias="FIREBASE_PROJECT_ID")
    firebase_credentials_path: str = Field(default="firebase_service_account.json", alias="FIREBASE_CREDENTIALS_PATH")
    gcs_bucket_raw: str = Field(default="gs://laederhub-raw", alias="GCS_BUCKET_RAW")
    bigquery_dataset: str = Field(default="laederhub_staging", alias="BIGQUERY_DATASET")
    default_region: str = Field(default="us-central1", alias="DEFAULT_REGION")

    mcp_cc_base_url: str = Field(default="https://mcp-constant-contact.local", alias="MCP_CC_BASE_URL")
    mcp_api_key: str = Field(default="dev-mcp-key", alias="MCP_API_KEY")

    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    api_log_level: str = Field(default="info", alias="API_LOG_LEVEL")

    enable_analytics_pull: bool = Field(default=True, alias="ENABLE_ANALYTICS_PULL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
