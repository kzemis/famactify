-- ============================================================
-- SCV-01 — Fix hunts artifact columns (Part 2 of 2)
-- Paste this into the Supabase SQL Editor AFTER Part 1 succeeds.
-- ============================================================

ALTER TABLE public.hunts
  ADD COLUMN IF NOT EXISTS artifact_kind TEXT NOT NULL DEFAULT 'scavenger_hunt',
  ADD COLUMN IF NOT EXISTS artifact_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS created_via TEXT NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generation_notes TEXT;

-- Ensure created_via CHECK constraint is correct
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.hunts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%created_via%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hunts DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.hunts
  ADD CONSTRAINT hunts_created_via_check
  CHECK (created_via IN ('human', 'ai_assisted', 'ai_generated'));

NOTIFY pgrst, 'reload schema';
