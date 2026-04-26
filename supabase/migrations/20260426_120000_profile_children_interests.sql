ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS children JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
COMMENT ON COLUMN public.profiles.children IS 'Array of {age: number, interests: string[], name?: string} objects';
COMMENT ON COLUMN public.profiles.interests IS 'Family-level interests from tags vocabulary';
