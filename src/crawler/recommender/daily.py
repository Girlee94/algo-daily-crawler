from datetime import date

from crawler.db import get_supabase
from crawler.recommender.base import RecommendationStrategy
from crawler.recommender.strategies import BalancedRandomStrategy


class DailyRecommender:
    """Selects today's recommended problems from the crawled pool."""

    def __init__(self, strategy: RecommendationStrategy | None = None):
        self.strategy = strategy or BalancedRandomStrategy()

    async def generate_recommendations(
        self,
        target_date: date,
        count: int = 5,
    ) -> list[dict]:
        db = get_supabase()

        # Check if recommendations already exist for this date
        existing = (
            db.table("daily_recommendations")
            .select("*, problems(title_ko, tier, url, external_id)")
            .eq("recommended_date", target_date.isoformat())
            .order("display_order")
            .execute()
        )
        if existing.data:
            return [
                {
                    "tier": rec["problems"]["tier"],
                    "title_ko": rec["problems"]["title_ko"],
                    "url": rec["problems"]["url"],
                    "reason": rec.get("reason", ""),
                    "external_id": rec["problems"]["external_id"],
                }
                for rec in existing.data
            ]

        # Get candidate problems from DB
        candidates = (
            db.table("problems")
            .select("*, problem_tags(tag_id, tags(key))")
            .eq("is_solvable", True)
            .execute()
        )

        if not candidates.data:
            return []

        # Apply strategy to select problems
        selected = self.strategy.select(
            candidates=candidates.data,
            count=count,
            target_date=target_date,
        )

        # Insert recommendations
        rows = [
            {
                "recommended_date": target_date.isoformat(),
                "problem_id": p["id"],
                "strategy": self.strategy.name,
                "reason": p.get("_selection_reason", ""),
                "display_order": idx,
            }
            for idx, p in enumerate(selected)
        ]
        db.table("daily_recommendations").insert(rows).execute()

        return [
            {
                "tier": p.get("tier", 0),
                "title_ko": p.get("title_ko", ""),
                "url": p.get("url", ""),
                "reason": p.get("_selection_reason", ""),
                "external_id": p.get("external_id", 0),
            }
            for p in selected
        ]
