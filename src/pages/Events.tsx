import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, X, Calendar, MapPin, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock events data - in production, this would come from an API
const mockEvents = [
  {
    id: 1,
    title: "Children's Science Museum",
    description: "Interactive exhibits and hands-on experiments for all ages",
    location: "Downtown San Francisco",
    date: "March 15, 2024",
    time: "10:00 AM - 2:00 PM",
    price: "$25 per person",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800"
  },
  {
    id: 2,
    title: "Golden Gate Park Picnic",
    description: "Enjoy a beautiful outdoor day with family activities",
    location: "Golden Gate Park",
    date: "March 15, 2024",
    time: "12:00 PM - 4:00 PM",
    price: "Free",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
  },
  {
    id: 3,
    title: "Art Workshop for Kids",
    description: "Creative painting and sculpture session",
    location: "SF Art Center",
    date: "March 16, 2024",
    time: "2:00 PM - 4:00 PM",
    price: "$30 per person",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800"
  },
  {
    id: 4,
    title: "Family Food Festival",
    description: "Sample cuisines from around the world",
    location: "Mission District",
    date: "March 16, 2024",
    time: "5:00 PM - 9:00 PM",
    price: "$15 entry",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800"
  },
  {
    id: 5,
    title: "Ocean Beach Bonfire",
    description: "S'mores and sunset at the beach",
    location: "Ocean Beach",
    date: "March 17, 2024",
    time: "6:00 PM - 9:00 PM",
    price: "Free",
    image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800"
  }
];

const Events = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedEvents, setLikedEvents] = useState<typeof mockEvents>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLike = () => {
    const likedEvent = mockEvents[currentIndex];
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
    if (currentIndex < mockEvents.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Store liked events and navigate to summary
      sessionStorage.setItem("likedEvents", JSON.stringify(likedEvents));
      navigate("/itinerary");
    }
  };

  if (currentIndex >= mockEvents.length) {
    return null;
  }

  const event = mockEvents[currentIndex];
  const progress = ((currentIndex + 1) / mockEvents.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Discover Events</h1>
          <p className="text-muted-foreground">
            Swipe right to add, left to skip
          </p>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {mockEvents.length}
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
