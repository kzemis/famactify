-- ============================================================
-- SCV-01 Phase 2 — Scavenger Hunts: hunts, stops, attempts, sponsors
-- See: ~/knowledge/famactify/docs/code/features/SCV-01-scavenger-hunt.md
-- ============================================================

-- 1. Hunts (one row per hunt; published when admin approves)
CREATE TABLE IF NOT EXISTS public.hunts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  blurb            TEXT NOT NULL,
  cover_emoji      TEXT NOT NULL DEFAULT '🔍',
  cover_image      TEXT,
  host_name        TEXT NOT NULL,
  host_logo        TEXT,
  city             TEXT NOT NULL,
  country_code     TEXT NOT NULL DEFAULT 'US',
  primary_theme    TEXT NOT NULL DEFAULT 'history',
  age_min          SMALLINT NOT NULL DEFAULT 6,
  age_max          SMALLINT NOT NULL DEFAULT 14,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  difficulty       TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  est_cost_cents   INTEGER NOT NULL DEFAULT 0,
  distance_meters  INTEGER NOT NULL DEFAULT 0,
  credits          TEXT,
  -- Workflow
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected')),
  review_notes     TEXT,
  reviewed_by      UUID REFERENCES auth.users(id),
  reviewed_at      TIMESTAMPTZ,
  -- Ownership
  created_by       UUID REFERENCES auth.users(id),
  org_id           UUID REFERENCES public.org_profiles(id) ON DELETE SET NULL,
  -- Timestamps
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  published_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hunts_slug         ON public.hunts(slug);
CREATE INDEX IF NOT EXISTS idx_hunts_status       ON public.hunts(status);
CREATE INDEX IF NOT EXISTS idx_hunts_country      ON public.hunts(country_code);
CREATE INDEX IF NOT EXISTS idx_hunts_created_by   ON public.hunts(created_by);
CREATE INDEX IF NOT EXISTS idx_hunts_org_id       ON public.hunts(org_id);

-- 2. Hunt stops (ordered children of a hunt)
CREATE TABLE IF NOT EXISTS public.hunt_stops (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id          UUID REFERENCES public.hunts(id) ON DELETE CASCADE NOT NULL,
  stop_order       SMALLINT NOT NULL,
  title            TEXT NOT NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lon              DOUBLE PRECISION NOT NULL,
  address          TEXT,
  clue_text        TEXT NOT NULL,
  clue_image       TEXT,
  clue_audio       TEXT,
  prompt_kind      TEXT NOT NULL CHECK (prompt_kind IN ('text', 'multiple_choice', 'photo', 'observation')),
  prompt_question  TEXT NOT NULL,
  prompt_options   JSONB,
  prompt_correct   JSONB,
  prompt_photo_subject TEXT,
  reveal_fun_fact  TEXT NOT NULL,
  reveal_image     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(hunt_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_hunt_stops_hunt_id ON public.hunt_stops(hunt_id);

-- 3. Hunt sponsors (Music-Map-of-Dallas-style corner sponsors)
CREATE TABLE IF NOT EXISTS public.hunt_sponsors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id     UUID REFERENCES public.hunts(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  logo        TEXT,
  url         TEXT,
  sort_order  SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hunt_sponsors_hunt_id ON public.hunt_sponsors(hunt_id);

-- 4. Hunt attempts (one row per user/profile per hunt)
CREATE TABLE IF NOT EXISTS public.hunt_attempts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id             UUID REFERENCES public.hunts(id) ON DELETE CASCADE NOT NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id          TEXT NOT NULL, -- family profile id from FamilyModeContext
  current_stop_order  SMALLINT NOT NULL DEFAULT 0,
  results             JSONB NOT NULL DEFAULT '[]'::jsonb, -- HuntStopResult[]
  trip_id             UUID REFERENCES public.saved_trips(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hunt_attempts_user_id  ON public.hunt_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_hunt_attempts_hunt_id  ON public.hunt_attempts(hunt_id);

-- 5. Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hunts_updated_at ON public.hunts;
CREATE TRIGGER hunts_updated_at
  BEFORE UPDATE ON public.hunts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. RLS
ALTER TABLE public.hunts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_stops     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_sponsors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_attempts  ENABLE ROW LEVEL SECURITY;

-- Hunts policies
CREATE POLICY "Public can read published hunts"
  ON public.hunts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Author can read own hunts"
  ON public.hunts FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Author can insert own hunts"
  ON public.hunts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Author can update own draft / pending hunts"
  ON public.hunts FOR UPDATE
  USING (auth.uid() = created_by AND status IN ('draft', 'pending_review', 'rejected'))
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Author can delete own draft hunts"
  ON public.hunts FOR DELETE
  USING (auth.uid() = created_by AND status = 'draft');

-- Hunt stops policies (mirror hunt access via hunt_id)
CREATE POLICY "Public can read stops of published hunts"
  ON public.hunt_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.status = 'published'));

CREATE POLICY "Author can read own hunt stops"
  ON public.hunt_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()));

CREATE POLICY "Author can manage own hunt stops"
  ON public.hunt_stops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()));

-- Sponsor policies
CREATE POLICY "Public can read sponsors of published hunts"
  ON public.hunt_sponsors FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.status = 'published'));

CREATE POLICY "Author manages sponsors on own hunts"
  ON public.hunt_sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()));

-- Attempts policies — owner only
CREATE POLICY "User reads own attempts"
  ON public.hunt_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User inserts own attempts"
  ON public.hunt_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User updates own attempts"
  ON public.hunt_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User deletes own attempts"
  ON public.hunt_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Storage bucket for sponsor logos / cover images
-- (Run this once in the Supabase dashboard if it doesn't already exist:)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('hunt-assets', 'hunt-assets', true)
-- ON CONFLICT DO NOTHING;
