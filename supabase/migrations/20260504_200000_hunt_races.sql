-- SCV-01: Live multi-family race tables
-- Tables: hunt_races, hunt_race_participants
-- Includes RLS policies and Realtime publication

-- ═══════════════════════════════════════════════
-- Table: hunt_races
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.hunt_races (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id     uuid NOT NULL REFERENCES public.hunts(id) ON DELETE CASCADE,
  join_code   text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'waiting_for_players'
              CHECK (status IN ('waiting_for_players', 'racing', 'finished')),
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hunt_races_join_code ON public.hunt_races(join_code);
CREATE INDEX IF NOT EXISTS idx_hunt_races_hunt_id ON public.hunt_races(hunt_id);
CREATE INDEX IF NOT EXISTS idx_hunt_races_status ON public.hunt_races(status);

-- ═══════════════════════════════════════════════
-- Table: hunt_race_participants
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.hunt_race_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id      uuid NOT NULL REFERENCES public.hunt_races(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  family_name  text NOT NULL,
  family_emoji text NOT NULL DEFAULT '👨‍👩‍👧',
  current_stop integer NOT NULL DEFAULT 0,
  score        integer NOT NULL DEFAULT 0,
  total_stops  integer NOT NULL DEFAULT 0,
  finished_at  timestamptz,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(race_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hunt_race_participants_race ON public.hunt_race_participants(race_id);
CREATE INDEX IF NOT EXISTS idx_hunt_race_participants_user ON public.hunt_race_participants(user_id);

-- ═══════════════════════════════════════════════
-- RLS: hunt_races
-- ═══════════════════════════════════════════════
ALTER TABLE public.hunt_races ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view races (needed for join-by-code lookup)
CREATE POLICY "hunt_races_select" ON public.hunt_races
  FOR SELECT TO authenticated
  USING (true);

-- Only creator can insert
CREATE POLICY "hunt_races_insert" ON public.hunt_races
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update (start/finish)
CREATE POLICY "hunt_races_update" ON public.hunt_races
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ═══════════════════════════════════════════════
-- RLS: hunt_race_participants
-- ═══════════════════════════════════════════════
ALTER TABLE public.hunt_race_participants ENABLE ROW LEVEL SECURITY;

-- All participants of a race can see each other
CREATE POLICY "race_participants_select" ON public.hunt_race_participants
  FOR SELECT TO authenticated
  USING (true);

-- Users can join (insert their own row)
CREATE POLICY "race_participants_insert" ON public.hunt_race_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "race_participants_update" ON public.hunt_race_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- Enable Realtime for both tables
-- ═══════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.hunt_races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hunt_race_participants;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
