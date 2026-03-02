from pydantic import BaseModel, Field
from typing import Any


class ProblemData(BaseModel):
    """Validated problem data from any crawler source."""

    external_id: int
    title_ko: str = ""
    title_en: str = ""
    tier: int = Field(ge=0, le=30)
    accepted_user_count: int = 0
    average_tries: float = 0.0
    is_solvable: bool = True
    tags: list[str] = Field(default_factory=list)
    url: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
