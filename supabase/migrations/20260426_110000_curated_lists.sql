CREATE TABLE IF NOT EXISTS public.curated_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  author_name TEXT,
  author_type TEXT CHECK (author_type IN ('editor', 'municipality', 'partner')),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.curated_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.curated_lists(id) ON DELETE CASCADE,
  activity_id TEXT REFERENCES public.activityspots(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  note TEXT,
  UNIQUE(list_id, activity_id)
);
CREATE INDEX IF NOT EXISTS idx_curated_lists_slug ON public.curated_lists(slug);
CREATE INDEX IF NOT EXISTS idx_curated_list_items_list_id ON public.curated_list_items(list_id);
ALTER TABLE public.curated_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published lists" ON public.curated_lists FOR SELECT USING (is_published = true);
CREATE POLICY "Public read list items" ON public.curated_list_items FOR SELECT USING (true);
CREATE POLICY "Admin full access lists" ON public.curated_lists FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin full access list items" ON public.curated_list_items FOR ALL USING (auth.role() = 'authenticated');
