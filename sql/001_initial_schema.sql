-- ==============================================
-- Algorithm Crawler Schema
-- ==============================================

-- Crawl sources (e.g. solved.ac)
CREATE TABLE IF NOT EXISTS crawl_sources (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    source_type TEXT DEFAULT 'API',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crawl history log
CREATE TABLE IF NOT EXISTS crawl_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id BIGINT NOT NULL REFERENCES crawl_sources(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running',
    started_at TIMESTAMPTZ DEFAULT now(),
    finished_at TIMESTAMPTZ,
    total_count INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_histories_source_id ON crawl_histories(source_id);

-- Algorithm tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    boj_tag_id INTEGER,
    display_name_ko TEXT,
    display_name_en TEXT,
    problem_count INTEGER DEFAULT 0,
    is_meta BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Problems (algorithm problems from solved.ac / baekjoon)
CREATE TABLE IF NOT EXISTS problems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_id BIGINT NOT NULL REFERENCES crawl_sources(id),
    external_id INTEGER NOT NULL,
    title_ko TEXT,
    title_en TEXT,
    tier INTEGER,
    accepted_user_count INTEGER DEFAULT 0,
    average_tries NUMERIC(6,2),
    is_solvable BOOLEAN DEFAULT true,
    languages TEXT[] DEFAULT '{}',
    url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_id, external_id)
);

-- Problem-Tag many-to-many
CREATE TABLE IF NOT EXISTS problem_tags (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, tag_id)
);

-- Daily recommendations
CREATE TABLE IF NOT EXISTS daily_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recommended_date DATE NOT NULL,
    problem_id UUID NOT NULL REFERENCES problems(id),
    strategy TEXT NOT NULL,
    reason TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(recommended_date, problem_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_recommendations_date ON daily_recommendations(recommended_date DESC);
CREATE INDEX IF NOT EXISTS idx_problems_tier ON problems(tier);
CREATE INDEX IF NOT EXISTS idx_problems_external_id ON problems(external_id);
CREATE INDEX IF NOT EXISTS idx_problems_created_at ON problems(created_at);

-- Row Level Security
ALTER TABLE crawl_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recommendations ENABLE ROW LEVEL SECURITY;

-- Read-only policies for dashboard (anon key)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_crawl_sources') THEN
        CREATE POLICY anon_read_crawl_sources ON crawl_sources FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_crawl_histories') THEN
        CREATE POLICY anon_read_crawl_histories ON crawl_histories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_tags') THEN
        CREATE POLICY anon_read_tags ON tags FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_problems') THEN
        CREATE POLICY anon_read_problems ON problems FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_problem_tags') THEN
        CREATE POLICY anon_read_problem_tags ON problem_tags FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_recommendations') THEN
        CREATE POLICY anon_read_recommendations ON daily_recommendations FOR SELECT USING (true);
    END IF;
END $$;

-- Seed: solved_ac source (using existing crawl_sources table format)
INSERT INTO crawl_sources (name, url, source_type, config)
VALUES ('solved_ac', 'https://solved.ac/api/v3', 'API', '{"rate_limit_delay": 0.5}')
ON CONFLICT (name) DO NOTHING;
