import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Clock, DollarSign, Share2, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const Itinerary = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState({ name: "", timeFrom: "", timeTo: "" });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    const price = event.price?.match(/\$(\d+)/);
    return sum + (price ? parseInt(price[1]) : 0);
  }, 0);

  const deleteEvent = (eventIndex: number, date: string) => {
    const updatedEvents = events.filter((event, idx) => 
      !(event.date === date && events.filter(e => e.date === date)[eventIndex] === event)
    );
    setEvents(updatedEvents);
    sessionStorage.setItem("likedEvents", JSON.stringify(updatedEvents));
    toast({
      title: "Activity removed",
      description: "The activity has been removed from your itinerary",
    });
  };

  const moveEvent = (eventIndex: number, date: string, direction: 'up' | 'down') => {
    const dayEvents = events.filter(e => e.date === date);
    if (
      (direction === 'up' && eventIndex === 0) || 
      (direction === 'down' && eventIndex === dayEvents.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? eventIndex - 1 : eventIndex + 1;
    const updatedDayEvents = [...dayEvents];
    [updatedDayEvents[eventIndex], updatedDayEvents[targetIndex]] = 
    [updatedDayEvents[targetIndex], updatedDayEvents[eventIndex]];

    const otherEvents = events.filter(e => e.date !== date);
    const updatedEvents = [...otherEvents, ...updatedDayEvents].sort((a, b) => 
      a.date.localeCompare(b.date)
    );
    
    setEvents(updatedEvents);
    sessionStorage.setItem("likedEvents", JSON.stringify(updatedEvents));
  };

  const addCustomActivity = () => {
    if (!newActivity.name || !newActivity.timeFrom || !newActivity.timeTo) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields for the custom activity",
        variant: "destructive",
      });
      return;
    }

    const customEvent = {
      title: newActivity.name,
      description: "Custom activity",
      location: "To be determined",
      date: Object.keys(groupedEvents)[0] || new Date().toLocaleDateString(),
      time: `${newActivity.timeFrom} - ${newActivity.timeTo}`,
      price: "$0",
      image: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=300",
      isCustom: true
    };

    const updatedEvents = [...events, customEvent];
    setEvents(updatedEvents);
    sessionStorage.setItem("likedEvents", JSON.stringify(updatedEvents));
    setNewActivity({ name: "", timeFrom: "", timeTo: "" });
    setIsAddingActivity(false);
    
    toast({
      title: "Activity added",
      description: "Your custom activity has been added to the itinerary",
    });
  };

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
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveEvent(eventIndex, date, 'up')}
                          disabled={eventIndex === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveEvent(eventIndex, date, 'down')}
                          disabled={eventIndex === dayEvents.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEvent(eventIndex, date)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Add Custom Activity</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingActivity(!isAddingActivity)}
              >
                {isAddingActivity ? "Cancel" : <Plus className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          {isAddingActivity && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Activity Name</label>
                <Input
                  placeholder="e.g. Lunch at favorite restaurant"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From</label>
                  <Input
                    type="time"
                    value={newActivity.timeFrom}
                    onChange={(e) => setNewActivity({ ...newActivity, timeFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To</label>
                  <Input
                    type="time"
                    value={newActivity.timeTo}
                    onChange={(e) => setNewActivity({ ...newActivity, timeTo: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addCustomActivity} className="w-full">
                Add Activity
              </Button>
            </CardContent>
          )}
        </Card>

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
