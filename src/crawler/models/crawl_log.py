from pydantic import BaseModel
from datetime import datetime
from typing import Any


class CrawlLogData(BaseModel):
    """Crawl execution log entry."""

    source_id: int
    started_at: datetime
    finished_at: datetime | None = None
    status: str = "running"
    items_found: int = 0
    items_saved: int = 0
    items_updated: int = 0
    error_message: str | None = None
    metadata: dict[str, Any] | None = None
