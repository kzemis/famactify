-- MP-T2: Unified Sessions + Teams engine
-- New tables: hunt_sessions, hunt_session_teams, hunt_session_participants, hunt_session_artifacts
-- Old tables (hunt_races, hunt_race_participants) are kept-but-deprecated — dropped in MP-T4.
-- OPERATOR: Apply this file via Supabase SQL Editor before deploying the MP-T2 frontend.

-- ── hunt_sessions ───────────────────────────────────────────────────────
-- Note: hunt_id is text (not FK) so it can hold both real DB UUIDs and seed hunt IDs
-- (e.g. 'richmond-rosie'). The play page resolves the hunt via huntsService.getHunt(huntId).
CREATE TABLE public.hunt_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hunt_id             text NOT NULL,
  status              text NOT NULL DEFAULT 'waiting'
                      CHECK (status IN ('waiting', 'playing', 'finished')),
  team_mode           text NOT NULL DEFAULT 'solo'
                      CHECK (team_mode IN ('solo', 'team_collab', 'team_vs_team', 'free_for_all')),
  role_config         text NOT NULL DEFAULT 'symmetric'
                      CHECK (role_config IN ('symmetric', 'guide_and_solver')),
  advance_policy      text NOT NULL DEFAULT 'anyone'
                      CHECK (advance_policy IN ('anyone', 'team_leader', 'consensus')),
  artifact_visibility text NOT NULL DEFAULT 'all_after_finish'
                      CHECK (artifact_visibility IN ('team_only', 'all_during_play', 'all_after_finish')),
  max_team_size       int,
  max_teams           int,
  join_code           text NOT NULL UNIQUE,
  created_by          uuid NOT NULL REFERENCES auth.users(id),
  started_at          timestamptz,
  finished_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hunt_sessions_join_code ON public.hunt_sessions(join_code);
CREATE INDEX idx_hunt_sessions_hunt_id   ON public.hunt_sessions(hunt_id);

-- ── hunt_session_teams ──────────────────────────────────────────────────
CREATE TABLE public.hunt_session_teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.hunt_sessions(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Team 1',
  color           text NOT NULL DEFAULT '#ec4899',
  emoji           text NOT NULL DEFAULT '🦁',
  team_leader_id  uuid REFERENCES auth.users(id),
  current_stop    int NOT NULL DEFAULT 0,
  score           int NOT NULL DEFAULT 0,
  finished_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_teams_session ON public.hunt_session_teams(session_id);

-- ── hunt_session_participants ───────────────────────────────────────────
CREATE TABLE public.hunt_session_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.hunt_sessions(id) ON DELETE CASCADE,
  team_id         uuid NOT NULL REFERENCES public.hunt_session_teams(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  display_name    text NOT NULL,
  avatar_emoji    text NOT NULL DEFAULT '🦊',
  avatar_url      text,
  role            text NOT NULL DEFAULT 'solver'
                  CHECK (role IN ('solver', 'guide', 'observer')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
CREATE INDEX idx_session_participants_session ON public.hunt_session_participants(session_id);
CREATE INDEX idx_session_participants_team    ON public.hunt_session_participants(team_id);
CREATE INDEX idx_session_participants_user    ON public.hunt_session_participants(user_id);

-- ── hunt_session_artifacts ──────────────────────────────────────────────
CREATE TABLE public.hunt_session_artifacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.hunt_sessions(id) ON DELETE CASCADE,
  team_id         uuid NOT NULL REFERENCES public.hunt_session_teams(id) ON DELETE CASCADE,
  participant_id  uuid NOT NULL REFERENCES public.hunt_session_participants(id) ON DELETE CASCADE,
  stop_id         text NOT NULL,           -- from hunt.stops[i].id (text in case it's not uuid)
  stop_index      int NOT NULL,
  kind            text NOT NULL
                  CHECK (kind IN ('photo', 'drawing', 'audio', 'mc_pick', 'text_answer', 'observation_ack')),
  storage_url     text,
  text_value      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_artifacts_session ON public.hunt_session_artifacts(session_id);
CREATE INDEX idx_session_artifacts_team    ON public.hunt_session_artifacts(team_id);
CREATE INDEX idx_session_artifacts_stop    ON public.hunt_session_artifacts(session_id, stop_index);

-- ── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.hunt_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_session_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hunt_session_artifacts    ENABLE ROW LEVEL SECURITY;

-- Sessions: any authenticated user can SELECT (needed for join-by-code).
-- Only creator can UPDATE (status, started_at, etc.).
CREATE POLICY sessions_select ON public.hunt_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY sessions_insert ON public.hunt_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY sessions_update ON public.hunt_sessions FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Teams: any participant of the session can SELECT; only the session creator can INSERT/UPDATE
-- (lobby team management). Future MP-T5 may relax to "team_leader can UPDATE own team".
CREATE POLICY teams_select ON public.hunt_session_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_insert ON public.hunt_session_teams FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.hunt_sessions s WHERE s.id = session_id AND s.created_by = auth.uid())
);
CREATE POLICY teams_update ON public.hunt_session_teams FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.hunt_sessions s WHERE s.id = session_id AND s.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.hunt_sessions s WHERE s.id = session_id AND s.created_by = auth.uid())
);

-- Participants: anyone can SELECT (lobby visibility); users can INSERT/UPDATE their own row only.
CREATE POLICY participants_select ON public.hunt_session_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY participants_insert ON public.hunt_session_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY participants_update ON public.hunt_session_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Artifacts: anyone in the same session can SELECT; the participant can INSERT their own.
CREATE POLICY artifacts_select ON public.hunt_session_artifacts FOR SELECT TO authenticated USING (true);
CREATE POLICY artifacts_insert ON public.hunt_session_artifacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hunt_session_participants p
    WHERE p.id = participant_id AND p.user_id = auth.uid()
  )
);

-- ── Realtime publication ────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.hunt_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hunt_session_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hunt_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hunt_session_artifacts;

NOTIFY pgrst, 'reload schema';
