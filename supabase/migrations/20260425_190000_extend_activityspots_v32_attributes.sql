-- Extend activityspots for v3.2 family decision attributes + data provenance
-- Informed by: docs/genai/ACTIVITY-DATA-ACQUISITION-STRATEGY.md (Codex research)
-- Sprint v3.2 — adds high-value filter columns + provenance fields for scraped data
-- All idempotent: uses ADD COLUMN IF NOT EXISTS
-- Run AFTER: 20260425_160000_extend_activityspots_for_discovery.sql
-- Run via Supabase dashboard SQL editor

-- ─────────────────────────────────────────────────────────────────────────────
-- Family decision attributes — boolean columns for reliable filtering
-- (Tags cover discovery; booleans drive actual UI filter logic)
-- ─────────────────────────────────────────────────────────────────────────────

-- Sensory-friendly: low-stimulation, predictable, not crowded/loud
-- Major differentiator for neurodivergent kids + noise-sensitive families
-- None of our competitors surface this as a first-class filter
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS sensory_friendly BOOLEAN DEFAULT NULL;

-- Transit-accessible: reachable without a car (BART, bus, ferry, Caltrain, Muni)
-- Broader than close-to-bart tag; important for SF-based families without cars
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS transit_accessible BOOLEAN DEFAULT NULL;

-- Fenced / enclosed play area — crucial for toddlers and families with multiple kids
-- Avoids run-off risk; high-value signal for 0-5 age group
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS fenced BOOLEAN DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Data provenance — required for Codex-scraped activities (anti-hallucination)
-- See ACTIVITY-DATA-ACQUISITION-STRATEGY.md for evidence protocol
-- ─────────────────────────────────────────────────────────────────────────────

-- Top-level source URL for the canonical venue/event page
-- Codex anti-hallucination rule: every record must have a real source URL
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Source confidence score (1–5, from Codex quality scoring)
-- 5 = official venue page with all details
-- 4 = official + secondary directory confirmation
-- 3 = aggregator with official URL but partial details
-- 2 = social/community mention, weak official confirmation
-- 1 = unverified — should NOT be inserted (Codex enforces this)
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS source_confidence SMALLINT DEFAULT NULL
  CHECK (source_confidence IS NULL OR source_confidence BETWEEN 1 AND 5);

-- Family fit score (1–5, from Codex quality scoring)
-- 5 = explicitly for kids/families, strong activity hook
-- 3 = general venue with some kid-friendly features
-- 1 = not suitable — should NOT be inserted
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS family_fit_score SMALLINT DEFAULT NULL
  CHECK (family_fit_score IS NULL OR family_fit_score BETWEEN 1 AND 5);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes for new filterable boolean columns
-- ─────────────────────────────────────────────────────────────────────────────

-- Partial index for sensory-friendly activities (sparse column — only create when needed)
CREATE INDEX IF NOT EXISTS idx_activityspots_sensory_friendly
ON public.activityspots(sensory_friendly)
WHERE sensory_friendly = true;

-- Partial index for transit-accessible activities
CREATE INDEX IF NOT EXISTS idx_activityspots_transit_accessible
ON public.activityspots(transit_accessible)
WHERE transit_accessible = true;

-- Partial index for fenced play areas
CREATE INDEX IF NOT EXISTS idx_activityspots_fenced
ON public.activityspots(fenced)
WHERE fenced = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Schema version update
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.activityspots.schema_version IS
  'v3.1 = primary_category, subtype, involvement, city, age_min/max, tags, highlights, excitement_score | v3.2 = + sensory_friendly, transit_accessible, fenced, source_url, source_confidence, family_fit_score';

-- ─────────────────────────────────────────────────────────────────────────────
-- Tags vocabulary reference (no DDL needed — tags is already TEXT[])
-- These are the new tags added in v3.2. Update CODEX-AGENT.md allowed tags list.
-- ─────────────────────────────────────────────────────────────────────────────

-- New v3.2 tags (add to tags[] for discovery/filter chips):
--   sensory-friendly, transit-friendly, nursing-friendly,
--   food-available, food-nearby, picnic-friendly, shade, fenced,
--   sibling-friendly, carrier-friendly, low-cost,
--   memberships-accepted, drop-in, reservation-required
--
-- High-value tags already in v3.1:
--   free, rainy-day, stroller-friendly, wheelchair-accessible,
--   close-to-bart, parking-easy, booking-needed-advance,
--   toddler, preschool, elementary, editors-pick
