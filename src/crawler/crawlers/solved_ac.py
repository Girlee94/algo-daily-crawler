import asyncio

import httpx

from crawler.config import settings
from crawler.crawlers.base import BaseCrawler, CrawlResult
from crawler.crawlers.registry import CrawlerRegistry
from crawler.models.problem import ProblemData


@CrawlerRegistry.register
class SolvedAcCrawler(BaseCrawler):
    """Crawler for solved.ac API v3."""

    @property
    def source_name(self) -> str:
        return "solved_ac"

    @property
    def base_url(self) -> str:
        return "https://solved.ac/api/v3"

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            headers={"Accept": "application/json"},
        )

    async def fetch_problems(
        self,
        *,
        tags: list[str] | None = None,
        tier_min: int = 1,
        tier_max: int = 30,
        max_pages: int = 5,
    ) -> CrawlResult:
        query_parts = [f"tier:{tier_min}..{tier_max}"]
        if tags:
            query_parts.extend(f"tag:{tag}" for tag in tags)
        query = " ".join(query_parts)

        all_problems: list[ProblemData] = []
        total = 0

        allowed = set(settings.allowed_languages)

        for page in range(1, max_pages + 1):
            resp = await self._client.get(
                "/search/problem",
                params={"query": query, "sort": "random", "page": page},
            )
            resp.raise_for_status()
            data = resp.json()
            total = data["count"]

            for item in data["items"]:
                problem = self._parse_problem(item, allowed_languages=allowed)
                if problem.languages:
                    all_problems.append(problem)

            if page * settings.crawl_page_size >= total:
                break

            await asyncio.sleep(settings.api_request_delay)

        return CrawlResult(
            problems=all_problems,
            total_available=total,
            pages_fetched=min(max_pages, page),
            source_name=self.source_name,
        )

    async def fetch_problem_detail(self, external_id: int) -> ProblemData | None:
        resp = await self._client.get(
            "/problem/show", params={"problemId": external_id}
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        allowed = set(settings.allowed_languages)
        return self._parse_problem(resp.json(), allowed_languages=allowed)

    async def fetch_tags(self) -> list[dict]:
        all_tags: list[dict] = []
        page = 1
        max_tag_pages = 100
        while page <= max_tag_pages:
            resp = await self._client.get("/tag/list", params={"page": page})
            resp.raise_for_status()
            data = resp.json()
            all_tags.extend(data["items"])
            if len(all_tags) >= data["count"] or not data["items"]:
                break
            page += 1
            await asyncio.sleep(settings.api_request_delay)
        return all_tags

    def _parse_problem(
        self, raw: dict, allowed_languages: set[str] | None = None
    ) -> ProblemData:
        titles = raw.get("titles", [])
        languages = [t["language"] for t in titles if t.get("language")]
        if allowed_languages is not None:
            languages = [lang for lang in languages if lang in allowed_languages]
        return ProblemData(
            external_id=raw["problemId"],
            title_ko=raw.get("titleKo", ""),
            title_en=self._extract_title(titles, "en"),
            tier=raw.get("level", 0),
            accepted_user_count=raw.get("acceptedUserCount", 0),
            average_tries=raw.get("averageTries", 0.0),
            is_solvable=raw.get("isSolvable", True),
            languages=languages,
            tags=[t["key"] for t in raw.get("tags", [])],
            url=f"https://www.acmicpc.net/problem/{raw['problemId']}",
            metadata={
                "votedUserCount": raw.get("votedUserCount", 0),
                "sprout": raw.get("sprout", False),
                "official": raw.get("official", False),
            },
        )

    @staticmethod
    def _extract_title(titles: list[dict], lang: str) -> str:
        for t in titles:
            if t.get("language") == lang:
                return t.get("title", "")
        return ""

    async def close(self) -> None:
        await self._client.aclose()
