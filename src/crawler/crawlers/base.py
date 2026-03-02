from abc import ABC, abstractmethod
from dataclasses import dataclass

from crawler.models.problem import ProblemData


@dataclass
class CrawlResult:
    """Result of a single crawl operation."""

    problems: list[ProblemData]
    total_available: int
    pages_fetched: int
    source_name: str


class BaseCrawler(ABC):
    """Abstract base for all crawlers. Implement this to add a new source."""

    @property
    @abstractmethod
    def source_name(self) -> str: ...

    @property
    @abstractmethod
    def base_url(self) -> str: ...

    @abstractmethod
    async def fetch_problems(
        self,
        *,
        tags: list[str] | None = None,
        tier_min: int = 1,
        tier_max: int = 30,
        max_pages: int = 5,
    ) -> CrawlResult: ...

    @abstractmethod
    async def fetch_problem_detail(self, external_id: int) -> ProblemData | None: ...

    @abstractmethod
    async def fetch_tags(self) -> list[dict]: ...

    async def close(self) -> None:
        """Clean up resources. Override if the crawler holds connections."""
        pass
