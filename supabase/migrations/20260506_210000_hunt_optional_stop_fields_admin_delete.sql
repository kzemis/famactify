-- SCV-01 — Optional stop location/copy + admin hunt deletion
-- Supports draft/admin hunts where a stop has no map pin yet and where
-- clue/reveal copy is intentionally omitted.

ALTER TABLE public.hunt_stops
  ALTER COLUMN lat DROP NOT NULL,
  ALTER COLUMN lon DROP NOT NULL,
  ALTER COLUMN clue_text DROP NOT NULL,
  ALTER COLUMN reveal_fun_fact DROP NOT NULL;

COMMENT ON COLUMN public.hunt_stops.lat IS
  'Optional latitude for GPS/AR/map features. Null means manual check-in only.';

COMMENT ON COLUMN public.hunt_stops.lon IS
  'Optional longitude for GPS/AR/map features. Null means manual check-in only.';

COMMENT ON COLUMN public.hunt_stops.clue_text IS
  'Optional pre-arrival clue copy. Empty/null stops can still have an action prompt.';

COMMENT ON COLUMN public.hunt_stops.reveal_fun_fact IS
  'Optional post-action fun fact/reveal copy.';

DROP POLICY IF EXISTS "Admins can delete any hunt" ON public.hunts;
CREATE POLICY "Admins can delete any hunt"
  ON public.hunts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_admin
  ));

NOTIFY pgrst, 'reload schema';
