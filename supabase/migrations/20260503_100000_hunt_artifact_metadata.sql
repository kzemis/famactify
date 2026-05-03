-- ============================================================
-- SCV-01 — Hunt artifact metadata
-- Makes scavenger hunts explicitly artifact-based:
-- human-created, AI-assisted, or AI-generated with source provenance.
-- ============================================================

ALTER TABLE public.hunts
  ADD COLUMN IF NOT EXISTS artifact_kind TEXT NOT NULL DEFAULT 'scavenger_hunt',
  ADD COLUMN IF NOT EXISTS artifact_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'human'
    CHECK (created_via IN ('human', 'ai_assisted', 'ai_generated')),
  ADD COLUMN IF NOT EXISTS source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_hunts_artifact_kind ON public.hunts(artifact_kind);
CREATE INDEX IF NOT EXISTS idx_hunts_created_via ON public.hunts(created_via);
