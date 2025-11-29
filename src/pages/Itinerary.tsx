import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock, DollarSign, Share2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const Itinerary = () => {
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedEvents = sessionStorage.getItem("likedEvents");
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
  }, []);

  const groupEventsByDay = () => {
    const grouped: Record<string, any[]> = {};
    events.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    return grouped;
  };

  const groupedEvents = groupEventsByDay();

  const totalCost = events.reduce((sum, event) => {
    const price = event.price.match(/\$(\d+)/);
    return sum + (price ? parseInt(price[1]) : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <AppHeader />
      <div className="max-w-4xl mx-auto space-y-6 p-4 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Your One-Day Itinerary</h1>
          <p className="text-muted-foreground text-lg">
            All activities organized for the perfect day
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Day Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold">${totalCost}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">~{events.length * 2}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(groupedEvents).map(([date, dayEvents], dayIndex) => (
          <Card key={dayIndex} className="shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                {date}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {dayEvents.map((event, eventIndex) => (
                  <div key={eventIndex} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex gap-4">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl font-semibold">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{event.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => navigate("/events")}
          >
            Add More Activities
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => navigate("/calendar")}
          >
            <Share2 className="h-5 w-5 mr-2" />
            Share & Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Itinerary;
