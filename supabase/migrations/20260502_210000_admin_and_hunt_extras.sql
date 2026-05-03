-- ============================================================
-- SCV-01 Phase 3 — Admin role + hunt extras (parent hint, photo verify)
-- ============================================================

-- 1. Admin role on profiles (true → can access /admin/* routes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Tighten admin policies on hunts: admins can read & manage everything
CREATE POLICY "Admins can read all hunts"
  ON public.hunts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can update any hunt"
  ON public.hunts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can delete any hunt"
  ON public.hunts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can read all hunt stops"
  ON public.hunt_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can manage all hunt stops"
  ON public.hunt_stops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can read all hunt sponsors"
  ON public.hunt_sponsors FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can manage all hunt sponsors"
  ON public.hunt_sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can read all hunt attempts"
  ON public.hunt_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

CREATE POLICY "Admins can update hunt attempts"
  ON public.hunt_attempts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

-- 2. Parent hint on each stop (co-pilot mode)
ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS parent_hint TEXT;

-- 3. Photo verification flag on attempt results — stored in JSONB results so no migration
--    needed for the result rows themselves. The HuntStopResult type gets a `verified` field.

-- ============================================================
-- Bootstrap: mark Kaspars as admin (idempotent — only if profile exists)
-- Replace this email if needed before running.
-- ============================================================
-- UPDATE public.profiles SET is_admin = true
--   WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'kaspars@example.com');
