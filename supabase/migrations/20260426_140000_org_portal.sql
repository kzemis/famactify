-- ============================================================
-- Org Portal: organization profiles + ownership tracking
-- ============================================================

-- 1. Track who created each curated list (enables org dashboard filtering)
ALTER TABLE public.curated_lists
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Organization profiles (one per user account)
CREATE TABLE IF NOT EXISTS public.org_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_name    TEXT NOT NULL,
  org_type    TEXT CHECK (org_type IN ('municipality', 'partner')) NOT NULL,
  description TEXT,
  logo_url    TEXT,
  website_url TEXT,
  verified    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for org_profiles
ALTER TABLE public.org_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read org profiles"
  ON public.org_profiles FOR SELECT USING (true);

CREATE POLICY "User manages own org profile"
  ON public.org_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_org_profiles_user_id ON public.org_profiles(user_id);
-- Index for fast lookup by created_by on curated_lists
CREATE INDEX IF NOT EXISTS idx_curated_lists_created_by ON public.curated_lists(created_by);
