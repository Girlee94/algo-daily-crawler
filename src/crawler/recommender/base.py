from abc import ABC, abstractmethod
from datetime import date


class RecommendationStrategy(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def select(
        self,
        candidates: list[dict],
        count: int,
        target_date: date,
    ) -> list[dict]: ...
