-- Create activityspots table
CREATE TABLE IF NOT EXISTS public.activityspots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  activity_type TEXT[] NOT NULL DEFAULT '{}',
  age_buckets TEXT[] NOT NULL DEFAULT '{}',
  min_price DOUBLE PRECISION,
  max_price DOUBLE PRECISION,
  location_address TEXT,
  location_lat DOUBLE PRECISION,
  location_lon DOUBLE PRECISION,
  location_environment TEXT,
  accessibility_wheelchair BOOLEAN,
  accessibility_stroller BOOLEAN,
  facilities_restrooms BOOLEAN,
  facilities_changingtable BOOLEAN,
  schedule_openinghours JSONB,
  duration_minutes INT,
  imageurlthumb TEXT,
  urlmoreinfo TEXT,
  trail_lengthkm DOUBLE PRECISION,
  trail_durationminutes INT,
  trail_routetype TEXT,
  event_starttime TIMESTAMPTZ,
  event_endtime TIMESTAMPTZ,
  foodvenue_kidmenu BOOLEAN,
  foodvenue_kidcorner BOOLEAN,
  foodvenue_kidamenities BOOLEAN,
  schema_version TEXT,
  json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activityspots ENABLE ROW LEVEL SECURITY;

-- Create policies - allow anyone to read, only authenticated users to insert
CREATE POLICY "Anyone can view activity spots"
  ON public.activityspots
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert activity spots"
  ON public.activityspots
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_activityspots_updated_at
  BEFORE UPDATE ON public.activityspots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_activityspots_activity_type ON public.activityspots USING GIN(activity_type);
CREATE INDEX idx_activityspots_location ON public.activityspots (location_lat, location_lon);
CREATE INDEX idx_activityspots_name ON public.activityspots (name);