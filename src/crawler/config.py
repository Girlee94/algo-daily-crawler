from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_anon_key: str = ""

    default_tier_min: int = 1
    default_tier_max: int = 30
    problems_per_day: int = 5
    crawl_page_size: int = 50

    allowed_languages: list[str] = ["ko", "en", "ja"]
    api_request_delay: float = 0.5
    daily_crawl_cron: str = "0 6 * * *"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
