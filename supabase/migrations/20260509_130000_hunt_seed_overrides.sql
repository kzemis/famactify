-- SCV-01 — Admin overrides for code-backed seed CityGames
-- Seed CityGames live in the app bundle, so they do not have database rows to
-- update/delete. This table lets admin persistently disable or delete a seed
-- by slug without removing it from source code.

CREATE TABLE IF NOT EXISTS public.hunt_seed_overrides (
  seed_slug  TEXT PRIMARY KEY,
  disabled   BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.hunt_seed_overrides IS
  'Admin overrides for code-backed seed CityGames. disabled hides from public browsing; deleted_at hides from admin/public lists.';
COMMENT ON COLUMN public.hunt_seed_overrides.seed_slug IS
  'Slug of the code-backed seed CityGame from src/data/hunts.';
COMMENT ON COLUMN public.hunt_seed_overrides.disabled IS
  'When true, the seed CityGame is hidden from public browsing but remains visible to admins as a draft/disabled template.';
COMMENT ON COLUMN public.hunt_seed_overrides.deleted_at IS
  'When set, the seed CityGame is hidden from both public browsing and the admin list.';

ALTER TABLE public.hunt_seed_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read hunt seed overrides" ON public.hunt_seed_overrides;
CREATE POLICY "Anyone can read hunt seed overrides"
  ON public.hunt_seed_overrides FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can manage hunt seed overrides" ON public.hunt_seed_overrides;
CREATE POLICY "Admins can manage hunt seed overrides"
  ON public.hunt_seed_overrides FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_admin
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_admin
  ));

NOTIFY pgrst, 'reload schema';
