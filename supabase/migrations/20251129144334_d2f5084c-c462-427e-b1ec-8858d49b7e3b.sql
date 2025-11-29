-- Create saved_trips table
CREATE TABLE public.saved_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cost DECIMAL(10,2) DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_trips ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own saved trips" 
ON public.saved_trips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved trips" 
ON public.saved_trips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved trips" 
ON public.saved_trips 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved trips" 
ON public.saved_trips 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_trips_updated_at
BEFORE UPDATE ON public.saved_trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();