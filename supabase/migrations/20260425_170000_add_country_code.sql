-- Add country_code to activityspots for multi-country support
-- Sprint v3.1 — enables country picker + per-country activity filtering
-- Run AFTER: 20260425_160000_extend_activityspots_for_discovery.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- activityspots: add country_code
-- ─────────────────────────────────────────────────────────────────────────────

-- ISO 3166-1 alpha-2 country codes: 'LV' = Latvia, 'US' = United States
-- Default 'LV' because existing data is Latvian.
-- Bay Area seed data uses 'US' explicitly.
ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'LV';

-- Back-fill existing Latvian data
UPDATE public.activityspots
SET country_code = 'LV'
WHERE country_code IS NULL;

-- Index for country filter (used in every activity fetch)
CREATE INDEX IF NOT EXISTS idx_activityspots_country_code
ON public.activityspots(country_code);

-- Composite index for country + city (most common combined filter)
CREATE INDEX IF NOT EXISTS idx_activityspots_country_city
ON public.activityspots(country_code, city);

COMMENT ON COLUMN public.activityspots.country_code IS
  'ISO 3166-1 alpha-2. LV = Latvia (GDPR applies). US = United States (CCPA/California). Drives activity feed + legal framework.';

-- ─────────────────────────────────────────────────────────────────────────────
-- activityspots_genai: add country_code (same)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.activityspots_genai
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'LV';

UPDATE public.activityspots_genai
SET country_code = 'LV'
WHERE country_code IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- legal_documents: per-country Terms, Privacy Policy, Image Rights
-- ─────────────────────────────────────────────────────────────────────────────

-- Stores versioned legal documents per country + document type.
-- App reads the latest active version for the user's country.
-- Allows updating T&C for one country without touching the other.
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,           -- 'LV', 'US', 'EU', 'ALL'
  doc_type TEXT NOT NULL,               -- 'terms' | 'privacy' | 'image_rights' | 'cookie_policy'
  version TEXT NOT NULL,                -- e.g. '1.0', '1.1', '2025-01'
  title TEXT NOT NULL,
  content TEXT NOT NULL,                -- full markdown content
  summary TEXT,                         -- short user-facing summary (1-3 bullets)
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,       -- only one active version per country+type at a time
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Only one active version per country+type
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_docs_active
ON public.legal_documents(country_code, doc_type)
WHERE is_active = true;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Anyone can read legal documents (they are public)
CREATE POLICY "Anyone can read legal documents"
ON public.legal_documents FOR SELECT
USING (true);

-- Only service role can insert/update (done via admin or migration, not from app)
CREATE POLICY "Service role manages legal documents"
ON public.legal_documents FOR INSERT
WITH CHECK (false); -- explicitly blocked from app; use service role or SQL directly

COMMENT ON TABLE public.legal_documents IS
  'Versioned legal documents per country. Types: terms, privacy, image_rights, cookie_policy.
   LV = Latvia (GDPR). US = United States (CCPA for CA users). EU = any EU country.
   Query pattern: SELECT * FROM legal_documents WHERE country_code = $1 AND doc_type = $2 AND is_active = true';

-- ─────────────────────────────────────────────────────────────────────────────
-- user_legal_consents: track what each user has accepted
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  legal_document_id UUID REFERENCES public.legal_documents(id),
  country_code TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,                      -- for legal audit trail (hash it if storing)
  user_agent TEXT
);

-- One acceptance per user per doc version
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_consents_unique
ON public.user_legal_consents(user_id, legal_document_id);

ALTER TABLE public.user_legal_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents"
ON public.user_legal_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
ON public.user_legal_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_legal_consents IS
  'Audit trail of user acceptance of legal documents. Required for GDPR compliance (Art. 7: demonstrable consent).';

-- ─────────────────────────────────────────────────────────────────────────────
-- contribution_image_rights: tracks rights for each contributed image
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contribution_image_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT REFERENCES public.activityspots(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  rights_type TEXT NOT NULL,            -- 'own_photo' | 'venue_permission' | 'unsplash' | 'ai_generated' | 'public_domain'
  attribution TEXT,                     -- optional credit line
  contributor_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  license_confirmed BOOLEAN DEFAULT false,
  country_code TEXT,                    -- country where rights apply / were granted
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contribution_image_rights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read image rights"
ON public.contribution_image_rights FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert image rights for their contributions"
ON public.contribution_image_rights FOR INSERT
WITH CHECK (auth.uid() = contributor_user_id);

COMMENT ON TABLE public.contribution_image_rights IS
  'Tracks rights status for each contributed image. Rights differ by country (EU moral rights vs US copyright).
   image_url matches activity imageurlthumb or image_urls[]. rights_type must be confirmed before image is shown.';
