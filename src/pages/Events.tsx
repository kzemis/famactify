import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, Calendar, MapPin, DollarSign, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  lat?: number;
  lon?: number;
  date: string;
  time: string;
  price: string;
  image: string;
  urlmoreinfo?: string;
  matchReason?: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedEvents, setLikedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Touch handling for swipe
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // Get user answers from sessionStorage
      const answersStr = sessionStorage.getItem("onboardingAnswers");
      const interestsStr = sessionStorage.getItem("userInterests");
      
      const answers = answersStr ? JSON.parse(answersStr) : null;
      const interests = interestsStr || null;

      console.log('Loading recommendations with:', { answers, interests });

      // Call the edge function to get AI recommendations
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: { answers, interests }
      });

      if (error) {
        console.error('Error getting recommendations:', error);
        throw error;
      }

      console.log('Received recommendations:', data);

      if (data?.recommendations && data.recommendations.length > 0) {
        setEvents(data.recommendations);
      } else {
        toast({
          title: "No recommendations found",
          description: "Using default activities",
          variant: "destructive"
        });
        // Fallback to empty state
        setEvents([]);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast({
        title: "Error loading recommendations",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    const likedEvent = events[currentIndex];
    setLikedEvents([...likedEvents, likedEvent]);
    toast({
      title: "Event added!",
      description: `${likedEvent.title} added to your itinerary`,
    });
    handleNext();
  };

  const handleDislike = () => {
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Store liked events and navigate to itinerary
      sessionStorage.setItem("likedEvents", JSON.stringify(likedEvents));
      navigate("/itinerary");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 100;
    const swipeDistance = touchStartX.current - touchEndX.current;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swiped left - dislike
        handleDislike();
      } else {
        // Swiped right - like
        handleLike();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 flex h-16 items-center">
            <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
              FamActify
            </span>
          </div>
        </header>
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Finding perfect activities for you</h2>
              <p className="text-muted-foreground">Our AI is analyzing your preferences...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 flex h-16 items-center">
            <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
              FamActify
            </span>
          </div>
        </header>
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">No activities found</h2>
            <p className="text-muted-foreground">Please complete the onboarding to get recommendations</p>
            <Button onClick={() => navigate("/onboarding/interests")}>
              Start Onboarding
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentIndex >= events.length) {
    return null;
  }

  const event = events[currentIndex];
  const progress = ((currentIndex + 1) / events.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center">
          <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            FamActify
          </span>
        </div>
      </header>
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Discover Activities</h1>
          {isMobile && (
            <p className="text-muted-foreground">
              Swipe right to add, left to skip
            </p>
          )}
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {events.length}
          </div>
        </div>

        <Card 
          ref={cardRef}
          className="overflow-hidden shadow-2xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative h-[400px]">
            <img
              src={event.image || "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800"}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800";
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
              <p className="text-sm opacity-90">{event.description}</p>
            </div>
          </div>
          <CardContent className="p-6 space-y-4">
            {event.matchReason && (
              <div className="bg-primary/10 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-primary">
                  ✨ {event.matchReason}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{event.price}</span>
              </div>
            </div>

            {event.urlmoreinfo && (
              <div className="pt-2">
                <Button
                  variant="link"
                  className="h-auto p-0 text-primary"
                  asChild
                >
                  <a href={event.urlmoreinfo} target="_blank" rel="noopener noreferrer">
                    Visit Official Website →
                  </a>
                </Button>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-14"
                onClick={handleDislike}
              >
                <X className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                className="flex-1 h-14"
                onClick={handleLike}
              >
                <Heart className="h-6 w-6 mr-2" />
                Add to Itinerary
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="bg-card rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {likedEvents.length} activity{likedEvents.length !== 1 ? 'ies' : 'y'} added
            </p>
          {likedEvents.length > 0 && (
            <Button
              variant="link"
              onClick={() => {
                sessionStorage.setItem("likedEvents", JSON.stringify(likedEvents));
                navigate("/itinerary");
              }}
            >
              View Itinerary
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Events;
