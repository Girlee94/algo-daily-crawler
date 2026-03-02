from typing import Type

from crawler.crawlers.base import BaseCrawler


class CrawlerRegistry:
    """Plugin registry for crawlers. Add new sources by registering them."""

    _crawlers: dict[str, Type[BaseCrawler]] = {}

    @classmethod
    def register(cls, crawler_class: Type[BaseCrawler]) -> Type[BaseCrawler]:
        """Decorator to register a crawler class."""
        instance = crawler_class()
        cls._crawlers[instance.source_name] = crawler_class
        return crawler_class

    @classmethod
    def get(cls, source_name: str) -> BaseCrawler:
        if source_name not in cls._crawlers:
            raise KeyError(
                f"No crawler registered for '{source_name}'. "
                f"Available: {cls.list_sources()}"
            )
        return cls._crawlers[source_name]()

    @classmethod
    def list_sources(cls) -> list[str]:
        return list(cls._crawlers.keys())
