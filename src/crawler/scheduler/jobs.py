import asyncio
from datetime import date

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

from crawler.config import settings


def start_scheduler():
    """Start the APScheduler daemon for automated crawling."""
    scheduler = BlockingScheduler()

    scheduler.add_job(
        _run_daily_pipeline,
        CronTrigger.from_crontab(settings.daily_crawl_cron),
        id="daily_crawl",
        name="Daily problem crawl + recommendation generation",
        misfire_grace_time=3600,
    )

    print(f"Scheduler started. Daily crawl cron: {settings.daily_crawl_cron}")
    print("Press Ctrl+C to stop.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("Scheduler stopped.")


def _run_daily_pipeline():
    """Synchronous wrapper for the async daily pipeline."""
    asyncio.run(_daily_pipeline())


async def _daily_pipeline():
    """Full daily pipeline: sync tags -> crawl problems -> generate recommendations."""
    from crawler.main import _sync_tags, _crawl, _recommend

    print(f"[{date.today()}] Starting daily pipeline...")

    try:
        await _sync_tags("solved_ac")
        await _crawl("solved_ac", tags=None, tier_min=1, tier_max=20, max_pages=3)
        await _recommend(str(date.today()), settings.problems_per_day, "balanced_random")
        print(f"[{date.today()}] Daily pipeline completed.")
    except Exception as e:
        print(f"[{date.today()}] Pipeline failed: {e}")
