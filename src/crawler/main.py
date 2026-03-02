import asyncio
from datetime import date, datetime

import click

from crawler.config import settings
from crawler.crawlers.registry import CrawlerRegistry
import crawler.crawlers.solved_ac  # noqa: F401 - register crawler
from crawler.db import get_supabase


@click.group()
def cli():
    """Algorithm problem crawler and daily recommender."""
    pass


@cli.command()
@click.option("--source", default="solved_ac", help="Crawler source name")
@click.option("--tags", default=None, help="Comma-separated tag filters (e.g. dp,greedy)")
@click.option("--tier-min", default=settings.default_tier_min, type=int)
@click.option("--tier-max", default=settings.default_tier_max, type=int)
@click.option("--max-pages", default=5, type=int)
def crawl(source: str, tags: str | None, tier_min: int, tier_max: int, max_pages: int):
    """Run a crawl job for the specified source."""
    asyncio.run(_crawl(source, tags, tier_min, tier_max, max_pages))


async def _crawl(
    source: str, tags: str | None, tier_min: int, tier_max: int, max_pages: int
):
    crawler = CrawlerRegistry.get(source)
    db = get_supabase()

    # Get source_id from DB
    source_row = (
        db.table("crawl_sources").select("id").eq("name", source).single().execute()
    )
    source_id = source_row.data["id"]

    tag_list = [t.strip() for t in tags.split(",")] if tags else None

    # Log start
    log_entry = (
        db.table("crawl_histories")
        .insert(
            {
                "source_id": source_id,
                "status": "running",
                "started_at": datetime.now().isoformat(),
            }
        )
        .execute()
    )
    log_id = log_entry.data[0]["id"]

    try:
        click.echo(f"Crawling {source} (tier {tier_min}-{tier_max}, tags={tag_list})...")
        result = await crawler.fetch_problems(
            tags=tag_list, tier_min=tier_min, tier_max=tier_max, max_pages=max_pages
        )

        inserted = 0
        updated = 0

        for problem in result.problems:
            # Upsert problem
            row = {
                "source_id": source_id,
                "external_id": problem.external_id,
                "title_ko": problem.title_ko,
                "title_en": problem.title_en,
                "tier": problem.tier,
                "accepted_user_count": problem.accepted_user_count,
                "average_tries": problem.average_tries,
                "is_solvable": problem.is_solvable,
                "url": problem.url,
                "metadata": problem.metadata,
                "updated_at": datetime.now().isoformat(),
            }

            existing = (
                db.table("problems")
                .select("id")
                .eq("source_id", source_id)
                .eq("external_id", problem.external_id)
                .execute()
            )

            if existing.data:
                problem_id = existing.data[0]["id"]
                db.table("problems").update(row).eq("id", problem_id).execute()
                updated += 1
            else:
                resp = db.table("problems").insert(row).execute()
                problem_id = resp.data[0]["id"]
                inserted += 1

            # Sync tags for this problem
            await _sync_problem_tags(db, problem_id, problem.tags)

        # Update log
        db.table("crawl_histories").update(
            {
                "status": "completed",
                "items_found": len(result.problems),
                "items_saved": inserted,
                "items_updated": updated,
                "finished_at": datetime.now().isoformat(),
            }
        ).eq("id", log_id).execute()

        click.echo(
            f"Done! Fetched {len(result.problems)} problems "
            f"(inserted={inserted}, updated={updated})"
        )

    except Exception as e:
        db.table("crawl_histories").update(
            {
                "status": "failed",
                "error_message": str(e),
                "finished_at": datetime.now().isoformat(),
            }
        ).eq("id", log_id).execute()
        click.echo(f"Error: {e}", err=True)
        raise
    finally:
        await crawler.close()


async def _sync_problem_tags(db, problem_id: str, tag_keys: list[str]):
    """Sync tags for a problem, creating tag rows if needed."""
    if not tag_keys:
        return

    # Delete existing associations
    db.table("problem_tags").delete().eq("problem_id", problem_id).execute()

    for key in tag_keys:
        # Get or skip tag (tags should be synced separately)
        tag_row = db.table("tags").select("id").eq("key", key).execute()
        if not tag_row.data:
            continue
        tag_id = tag_row.data[0]["id"]

        db.table("problem_tags").insert(
            {"problem_id": problem_id, "tag_id": tag_id}
        ).execute()


@cli.command("sync-tags")
@click.option("--source", default="solved_ac", help="Source to sync tags from")
def sync_tags(source: str):
    """Sync all algorithm tags from the specified source."""
    asyncio.run(_sync_tags(source))


async def _sync_tags(source: str):
    crawler = CrawlerRegistry.get(source)
    db = get_supabase()

    click.echo(f"Syncing tags from {source}...")
    raw_tags = await crawler.fetch_tags()

    count = 0
    for tag in raw_tags:
        key = tag["key"]
        display_ko = ""
        display_en = ""
        for dn in tag.get("displayNames", []):
            if dn.get("language") == "ko":
                display_ko = dn.get("name", "")
            elif dn.get("language") == "en":
                display_en = dn.get("name", "")

        row = {
            "key": key,
            "boj_tag_id": tag.get("bojTagId"),
            "display_name_ko": display_ko,
            "display_name_en": display_en,
            "problem_count": tag.get("problemCount", 0),
            "is_meta": tag.get("isMeta", False),
        }

        existing = db.table("tags").select("id").eq("key", key).execute()
        if existing.data:
            db.table("tags").update(row).eq("key", key).execute()
        else:
            db.table("tags").insert(row).execute()
        count += 1

    click.echo(f"Synced {count} tags.")
    await crawler.close()


@cli.command()
@click.option("--date", "target_date", default=str(date.today()), help="Date (YYYY-MM-DD)")
@click.option("--count", default=settings.problems_per_day, type=int)
@click.option("--strategy", default="balanced_random", help="balanced_random or tag_rotation")
def recommend(target_date: str, count: int, strategy: str):
    """Generate daily recommendations."""
    asyncio.run(_recommend(target_date, count, strategy))


async def _recommend(target_date_str: str, count: int, strategy_name: str):
    from crawler.recommender.daily import DailyRecommender
    from crawler.recommender.strategies import BalancedRandomStrategy, TagRotationStrategy

    target_date = date.fromisoformat(target_date_str)

    strategies = {
        "balanced_random": BalancedRandomStrategy,
        "tag_rotation": TagRotationStrategy,
    }
    strategy_cls = strategies.get(strategy_name)
    if not strategy_cls:
        click.echo(f"Unknown strategy: {strategy_name}. Available: {list(strategies.keys())}")
        return

    recommender = DailyRecommender(strategy=strategy_cls())
    result = await recommender.generate_recommendations(target_date, count=count)

    click.echo(f"\nRecommendations for {target_date} ({strategy_name}):")
    click.echo("-" * 60)
    for rec in result:
        tier = rec.get("tier", "?")
        title = rec.get("title_ko", "Unknown")
        url = rec.get("url", "")
        reason = rec.get("reason", "")
        click.echo(f"  [{tier:>2}] {title}")
        click.echo(f"       {url}")
        if reason:
            click.echo(f"       -> {reason}")


@cli.command()
def scheduler():
    """Start the APScheduler daemon for automated daily crawling."""
    from crawler.scheduler.jobs import start_scheduler

    start_scheduler()


if __name__ == "__main__":
    cli()
