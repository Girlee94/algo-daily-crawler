import random
from datetime import date

from crawler.recommender.base import RecommendationStrategy


class BalancedRandomStrategy(RecommendationStrategy):
    """
    Selects problems balanced across difficulty tiers.
    For count=5: 1 Bronze, 1 Silver, 1 Gold, 1 Platinum, 1 wildcard.
    """

    name = "balanced_random"

    TIER_BUCKETS = {
        "bronze": (1, 5),
        "silver": (6, 10),
        "gold": (11, 15),
        "platinum": (16, 20),
        "diamond+": (21, 30),
    }

    def select(
        self,
        candidates: list[dict],
        count: int,
        target_date: date,
    ) -> list[dict]:
        rng = random.Random(target_date.isoformat())

        buckets: dict[str, list[dict]] = {name: [] for name in self.TIER_BUCKETS}
        for p in candidates:
            tier = p.get("tier", 0)
            for bucket_name, (lo, hi) in self.TIER_BUCKETS.items():
                if lo <= tier <= hi:
                    buckets[bucket_name].append(p)
                    break

        selected: list[dict] = []
        selected_ids: set[str] = set()

        # Pick one from each bucket
        for bucket_name in list(self.TIER_BUCKETS.keys())[:count]:
            pool = buckets.get(bucket_name, [])
            available = [p for p in pool if p["id"] not in selected_ids]
            if available:
                pick = rng.choice(available)
                pick["_selection_reason"] = f"Balanced pick from {bucket_name} tier"
                selected.append(pick)
                selected_ids.add(pick["id"])

        # Fill remaining with random picks
        remaining = [c for c in candidates if c["id"] not in selected_ids]
        while len(selected) < count and remaining:
            pick = rng.choice(remaining)
            pick["_selection_reason"] = "Random wildcard pick"
            selected.append(pick)
            selected_ids.add(pick["id"])
            remaining.remove(pick)

        return selected[:count]


class TagRotationStrategy(RecommendationStrategy):
    """Rotates through algorithm tags day by day."""

    name = "tag_rotation"

    CORE_TAGS = [
        "dp",
        "graphs",
        "greedy",
        "math",
        "string",
        "data_structures",
        "geometry",
        "sorting",
        "binary_search",
        "bfs",
        "dfs",
        "implementation",
        "simulation",
    ]

    def select(
        self,
        candidates: list[dict],
        count: int,
        target_date: date,
    ) -> list[dict]:
        day_of_year = target_date.timetuple().tm_yday
        tag_index = day_of_year % len(self.CORE_TAGS)
        today_tag = self.CORE_TAGS[tag_index]

        rng = random.Random(target_date.isoformat())

        tagged = [c for c in candidates if today_tag in self._get_tags(c)]

        if len(tagged) < count:
            tagged = candidates

        picks = rng.sample(tagged, min(count, len(tagged)))
        for p in picks:
            p["_selection_reason"] = f"Tag rotation: today's focus is '{today_tag}'"
        return picks

    @staticmethod
    def _get_tags(problem: dict) -> list[str]:
        tag_relations = problem.get("problem_tags", [])
        return [tr.get("tags", {}).get("key", "") for tr in tag_relations if tr.get("tags")]
