-- Activityspots provenance + outbound URL health.
-- Keeps crawler/AI imports distinguishable from human/admin records and lets UI
-- hide outbound links unless a URL has been verified.

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'user'
  CHECK (created_by IN ('user', 'admin', 'system', 'crawler_codex', 'chatgpt'));

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS created_by_reference JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS urlmoreinfo_status TEXT DEFAULT 'unknown'
  CHECK (urlmoreinfo_status IN ('unknown', 'ok', 'broken', 'blocked', 'timeout', 'invalid'));

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS urlmoreinfo_checked_at TIMESTAMPTZ;

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS urlmoreinfo_http_status INTEGER;

ALTER TABLE public.activityspots
ADD COLUMN IF NOT EXISTS urlmoreinfo_final_url TEXT;

CREATE INDEX IF NOT EXISTS idx_activityspots_created_by
ON public.activityspots(created_by);

CREATE INDEX IF NOT EXISTS idx_activityspots_urlmoreinfo_status
ON public.activityspots(urlmoreinfo_status)
WHERE urlmoreinfo IS NOT NULL;

COMMENT ON COLUMN public.activityspots.created_by IS
  'Internal creator/provenance actor: user, admin, system, crawler_codex, or chatgpt.';

COMMENT ON COLUMN public.activityspots.created_by_reference IS
  'Structured provenance reference such as crawl/import task id, dataset file, source record id, or AI generation metadata.';

COMMENT ON COLUMN public.activityspots.urlmoreinfo_status IS
  'Outbound URL health. UI should only show urlmoreinfo when status is ok.';
