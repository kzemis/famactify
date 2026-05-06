-- ============================================================
-- SCV-01 — Add hunt visibility for "Home Chores" hidden hunts
-- Family-private hunts are created by parents, never appear in the public
-- catalog, skip admin review, and earn passport stamps for the family.
-- Paste this block into the Supabase SQL Editor and run.
-- ============================================================

-- 1. Visibility column
ALTER TABLE public.hunts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.hunts'::regclass
      AND conname  = 'hunts_visibility_check'
  ) THEN
    ALTER TABLE public.hunts
      ADD CONSTRAINT hunts_visibility_check
      CHECK (visibility IN ('public', 'family_private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hunts_visibility ON public.hunts(visibility);

-- 2. Allow authors to update / delete their own family-private hunts
--    regardless of status (skips admin review workflow entirely).
DROP POLICY IF EXISTS "Author updates own family-private hunts" ON public.hunts;
CREATE POLICY "Author updates own family-private hunts"
  ON public.hunts FOR UPDATE
  USING (auth.uid() = created_by AND visibility = 'family_private')
  WITH CHECK (auth.uid() = created_by AND visibility = 'family_private');

DROP POLICY IF EXISTS "Author deletes own family-private hunts" ON public.hunts;
CREATE POLICY "Author deletes own family-private hunts"
  ON public.hunts FOR DELETE
  USING (auth.uid() = created_by AND visibility = 'family_private');

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
