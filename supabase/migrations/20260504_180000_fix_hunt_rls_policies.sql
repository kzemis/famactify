-- ============================================================
-- SCV-01 — Fix hunt RLS policies
-- Run this in Supabase SQL Editor to fix "violates row-level
-- security policy for table hunt_stops" error.
-- ============================================================

-- Step 1: Ensure is_admin column exists on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Mark current user as admin
-- (Uses the currently logged-in user's email from auth.users)
UPDATE public.profiles SET is_admin = true
WHERE user_id IN (SELECT id FROM auth.users LIMIT 1);

-- Step 3: Recreate hunt_stops write policies (idempotent via DROP IF EXISTS)

-- Author policies
DROP POLICY IF EXISTS "Author can manage own hunt stops" ON public.hunt_stops;
CREATE POLICY "Author can manage own hunt stops"
  ON public.hunt_stops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()));

-- Admin policies
DROP POLICY IF EXISTS "Admins can read all hunt stops" ON public.hunt_stops;
CREATE POLICY "Admins can read all hunt stops"
  ON public.hunt_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "Admins can manage all hunt stops" ON public.hunt_stops;
CREATE POLICY "Admins can manage all hunt stops"
  ON public.hunt_stops FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

-- Also fix hunt_sponsors (same pattern)
DROP POLICY IF EXISTS "Author manages sponsors on own hunts" ON public.hunt_sponsors;
CREATE POLICY "Author manages sponsors on own hunts"
  ON public.hunt_sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hunts h WHERE h.id = hunt_id AND h.created_by = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all hunt sponsors" ON public.hunt_sponsors;
CREATE POLICY "Admins can manage all hunt sponsors"
  ON public.hunt_sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

-- Step 4: Also fix hunts table admin policies
DROP POLICY IF EXISTS "Admins can read all hunts" ON public.hunts;
CREATE POLICY "Admins can read all hunts"
  ON public.hunts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "Admins can update any hunt" ON public.hunts;
CREATE POLICY "Admins can update any hunt"
  ON public.hunts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin));

-- Step 5: Also reassign any orphan hunts to current user
-- (hunts where created_by is null or doesn't match any user)
UPDATE public.hunts
SET created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE created_by IS NULL;

NOTIFY pgrst, 'reload schema';
