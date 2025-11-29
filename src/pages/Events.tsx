import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, Calendar, MapPin, DollarSign, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  price: string;
  image: string;
  matchReason?: string;
}

const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedEvents, setLikedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Store liked events and navigate to summary
      sessionStorage.setItem("likedEvents", JSON.stringify(likedEvents));
      
      // Check if in presentation mode - redirect back to pitch deck
      const presentationMode = sessionStorage.getItem("presentationMode");
      if (presentationMode === "active") {
        sessionStorage.setItem("presentationMode", "returning");
        navigate("/pitch-deck");
      } else {
        navigate("/itinerary");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <h2 className="text-2xl font-bold mb-2">Finding perfect activities for you</h2>
            <p className="text-muted-foreground">Our AI is analyzing your preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No activities found</h2>
          <p className="text-muted-foreground">Please complete the onboarding to get recommendations</p>
          <Button onClick={() => navigate("/onboarding/interests")}>
            Start Onboarding
          </Button>
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Discover Events</h1>
          <p className="text-muted-foreground">
            Swipe right to add, left to skip
          </p>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {events.length}
          </div>
        </div>

        <Card className="overflow-hidden shadow-2xl">
          <div className="relative h-[400px]">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
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
            {likedEvents.length} event{likedEvents.length !== 1 ? 's' : ''} added
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
  );
};

export default Events;
