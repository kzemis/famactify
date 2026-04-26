-- Extend activityspots table for full DIS-01 to DIS-09 feature support
-- Sprint v3.1 — adds 14 columns required before Bay Area activity seeding
-- All idempotent: uses ADD COLUMN IF NOT EXISTS
-- Run via Supabase dashboard SQL editor before importing Bay Area seed data

-- ─────────────────────────────────────────────────────────────────────────────
-- DIS-01: Rich filter panel — involvement, city, age range, duration range,
--         booking, category taxonomy
-- ─────────────────────────────────────────────────────────────────────────────

-- Primary product category (one per activity) — used for display + balance tracker
-- Values: 'Sport' | 'Education' | 'Culture' | 'Nature' | 'Social' | 'Fun'
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS primary_category TEXT;

-- More specific subtype within primary_category
-- e.g. 'Animal Farm', 'Science Museum', 'Playground', 'Football', 'Art Studio'
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS subtype TEXT;

-- How involved is the parent during the activity?
-- Values: 'active_together' | 'supervise' | 'drop_go'
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS involvement TEXT DEFAULT 'active_together';

-- City for geographic filter (Bay Area rollout — city by city)
-- e.g. 'Berkeley' | 'Oakland' | 'San Francisco' | 'Emeryville' | 'Albany'
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS city TEXT;

-- Precise minimum age in years (age_buckets is coarse text; age_min/max enables queries like "for my 7yo")
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS age_min SMALLINT;

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS age_max SMALLINT;

-- Max duration for range display (duration_minutes = typical; duration_max_minutes = upper bound)
-- e.g. duration_minutes=60, duration_max_minutes=180 → "1–3 hours"
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS duration_max_minutes INT;

-- Does this activity require advance booking?
-- Affects "can I do this today?" filter and planning urgency
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS booking_required BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- DIS-04: Editor's Picks, DIS-05: Search, DIS-08: Interest personalization
-- ─────────────────────────────────────────────────────────────────────────────

-- Keyword tags for search, collections, and interest matching
-- Examples: ['editors-pick', 'rainy-day', 'free', 'stroller-friendly', 'toddler',
--            'animals', 'science', 'art', 'water', 'climbing', 'music', 'cooking']
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Seasonal availability — for Editor's Picks seasonal bundles
-- Values from: 'year-round', 'spring', 'summer', 'fall', 'winter'
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS season TEXT[] DEFAULT '{"year-round"}';

-- ─────────────────────────────────────────────────────────────────────────────
-- DIS-06: Weather filter
-- ─────────────────────────────────────────────────────────────────────────────

-- Is this activity suitable in rainy weather?
-- true = fully indoor OR sheltered outdoor OR "good rainy day pick"
-- false = outdoor only, no shelter, unpleasant in rain
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS rain_suitable BOOLEAN DEFAULT true;

-- ─────────────────────────────────────────────────────────────────────────────
-- DIS-09: Kid Explorer — visual magazine-style browsing
-- ─────────────────────────────────────────────────────────────────────────────

-- 2-3 specific things kids do at this activity — for kid-first visual cards
-- Examples: ["Feed real goats and cows", "Ride the steam train", "Pet baby chicks"]
-- More concrete than description — written FOR kids
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT '{}';

-- Kid appeal rating (curator-set): 1=low, 3=average, 5=kids love this place
-- Used to rank Kid Explorer feed — highest scores surface first
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS excitement_score SMALLINT DEFAULT 3;

-- Additional photo URLs for magazine-style multi-image layout
-- imageurlthumb = hero/thumbnail; image_urls = gallery
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for new filterable columns
-- ─────────────────────────────────────────────────────────────────────────────

-- GIN index for tags array (DIS-04, DIS-05, DIS-08)
CREATE INDEX IF NOT EXISTS idx_activityspots_tags
ON public.activityspots USING GIN(tags);

-- GIN index for season array (DIS-04)
CREATE INDEX IF NOT EXISTS idx_activityspots_season
ON public.activityspots USING GIN(season);

-- B-tree index for primary_category (DIS-01, PLN-08 balance tracker)
CREATE INDEX IF NOT EXISTS idx_activityspots_primary_category
ON public.activityspots(primary_category);

-- B-tree index for involvement (DIS-01, TOG-01)
CREATE INDEX IF NOT EXISTS idx_activityspots_involvement
ON public.activityspots(involvement);

-- B-tree index for city (DIS-01 geographic filter)
CREATE INDEX IF NOT EXISTS idx_activityspots_city
ON public.activityspots(city);

-- Range index for age (DIS-01 age filter)
CREATE INDEX IF NOT EXISTS idx_activityspots_age
ON public.activityspots(age_min, age_max);

-- ─────────────────────────────────────────────────────────────────────────────
-- Update schema_version so we can track which activities have new fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Bay Area seed activities will have schema_version = 'v3.1'
-- Old Latvian activities will have null or older version
COMMENT ON COLUMN public.activityspots.schema_version IS
  'v3.1 = has primary_category, subtype, involvement, city, age_min, age_max, tags, highlights, excitement_score';
