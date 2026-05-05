-- SCV-01: Safe live-race auto-finish helper
-- Lets any participant mark the race finished only after every participant is done.

CREATE OR REPLACE FUNCTION public.finish_hunt_race_if_done(p_race_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_participant boolean;
  has_unfinished boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.hunt_race_participants
    WHERE race_id = p_race_id
      AND user_id = auth.uid()
  )
  INTO is_participant;

  IF NOT is_participant THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.hunt_race_participants
    WHERE race_id = p_race_id
      AND finished_at IS NULL
  )
  INTO has_unfinished;

  IF has_unfinished THEN
    RETURN false;
  END IF;

  UPDATE public.hunt_races
  SET
    status = 'finished',
    finished_at = COALESCE(finished_at, now())
  WHERE id = p_race_id
    AND status <> 'finished';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_hunt_race_if_done(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finish_hunt_race_if_done(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
