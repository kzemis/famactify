-- Demo curation layer for the performance prototype.
-- Keep the full scraped/generated activity database, but only load admin-enabled
-- activities into the public browsing UI.

ALTER TABLE public.activityspots
  ADD COLUMN IF NOT EXISTS demo_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.activityspots
  ADD COLUMN IF NOT EXISTS demo_rank INTEGER;

COMMENT ON COLUMN public.activityspots.demo_enabled IS
  'When true, this activity is visible in the lightweight demo/prototype browsing UI.';

COMMENT ON COLUMN public.activityspots.demo_rank IS
  'Optional admin-controlled ordering within the demo set. Lower numbers appear first.';

CREATE INDEX IF NOT EXISTS idx_activityspots_demo_country_rank
  ON public.activityspots(country_code, demo_enabled, demo_rank, excitement_score DESC, created_at DESC)
  WHERE demo_enabled = true;

-- Initial demo set: top ~15 per supported country, selected by practical quality signals.
-- Admin can change this later from /admin/activities-demo.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY country_code
      ORDER BY
        CASE WHEN imageurlthumb IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN urlmoreinfo_status = 'ok' OR urlmoreinfo_status IS NULL THEN 0 ELSE 1 END,
        COALESCE(excitement_score, 0) DESC,
        created_at DESC
    ) AS demo_pos
  FROM public.activityspots
  WHERE country_code IN ('LV', 'US')
)
UPDATE public.activityspots a
SET
  demo_enabled = ranked.demo_pos <= 15,
  demo_rank = CASE WHEN ranked.demo_pos <= 15 THEN ranked.demo_pos ELSE NULL END
FROM ranked
WHERE a.id = ranked.id;

DROP POLICY IF EXISTS "Admins can update activity demo curation" ON public.activityspots;
CREATE POLICY "Admins can update activity demo curation"
  ON public.activityspots
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_admin
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_admin
  ));
