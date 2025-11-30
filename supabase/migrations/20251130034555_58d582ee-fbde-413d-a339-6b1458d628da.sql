-- Create newsletter subscriptions table
CREATE TABLE public.newsletter_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to view subscriptions (for admin purposes)
CREATE POLICY "Authenticated users can view subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create index for faster email lookups
CREATE INDEX idx_newsletter_email ON public.newsletter_subscriptions(email);