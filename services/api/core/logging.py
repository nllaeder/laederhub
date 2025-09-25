"""Minimal logging configuration for the API service."""

import logging
from typing import Literal

from .config import settings

_LOG_FORMAT = "%(levelname)s %(name)s :: %(message)s"


def configure_logging(level: str | int | None = None) -> None:
    """Configure root logging once at import time."""
    target_level: int
    if isinstance(level, str):
        target_level = logging.getLevelName(level.upper())  # type: ignore[arg-type]
    elif isinstance(level, int):
        target_level = level
    else:
        target_level = logging.getLevelName(settings.api_log_level.upper())  # type: ignore[arg-type]

    logging.basicConfig(level=target_level, format=_LOG_FORMAT)

    # Make UVicorn noise manageable in development.
    for noise_logger in ("uvicorn", "uvicorn.access"):
        logging.getLogger(noise_logger).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
