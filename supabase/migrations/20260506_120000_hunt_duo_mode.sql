-- ============================================================
-- SCV-01 — Two-phone "Duo" mode
-- Reuses the hunt_races / hunt_race_participants tables but distinguishes
-- collaborative parent+kid sessions from competitive multi-family races.
-- Parent's phone is the "guide" (sees answers, advances stops).
-- Kid's phone is the "solver" (sees clue only).
-- Both phones stay synced via the existing Realtime subscription.
-- Paste this block into the Supabase SQL Editor and run.
-- ============================================================

-- 1. Session mode column on hunt_races
ALTER TABLE public.hunt_races
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'race';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.hunt_races'::regclass
      AND conname  = 'hunt_races_mode_check'
  ) THEN
    ALTER TABLE public.hunt_races
      ADD CONSTRAINT hunt_races_mode_check
      CHECK (mode IN ('race', 'duo'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hunt_races_mode ON public.hunt_races(mode);

-- 2. Participant role column
ALTER TABLE public.hunt_race_participants
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.hunt_race_participants'::regclass
      AND conname  = 'hunt_race_participants_role_check'
  ) THEN
    ALTER TABLE public.hunt_race_participants
      ADD CONSTRAINT hunt_race_participants_role_check
      CHECK (role IN ('player', 'parent_guide', 'kid_solver'));
  END IF;
END $$;

-- 3. In duo mode, parent (guide) needs to update kid (solver)'s current_stop
--    and vice versa to keep both phones in sync. Existing race RLS only allows
--    a participant to update their own row. Add a duo-specific policy that
--    lets any participant of a duo session update any participant in the same
--    session. Race-mode rows are unaffected (mode='race' filter).
DROP POLICY IF EXISTS "Duo participants update co-participant progress" ON public.hunt_race_participants;
CREATE POLICY "Duo participants update co-participant progress"
  ON public.hunt_race_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hunt_races r
      WHERE r.id = race_id
        AND r.mode = 'duo'
        AND EXISTS (
          SELECT 1 FROM public.hunt_race_participants me
          WHERE me.race_id = r.id AND me.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hunt_races r
      WHERE r.id = race_id
        AND r.mode = 'duo'
        AND EXISTS (
          SELECT 1 FROM public.hunt_race_participants me
          WHERE me.race_id = r.id AND me.user_id = auth.uid()
        )
    )
  );

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
