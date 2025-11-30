import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, Euro, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth } from "date-fns";

interface BilesuEvent {
  id: string;
  title: string;
  description: string;
  venue: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  minPrice: number | null;
  maxPrice: number | null;
  image: string | null;
  url: string | null;
  ageRestriction: string | null;
  salesStatus: string;
  category: string;
}

const EventsCalendar = () => {
  const [events, setEvents] = useState<BilesuEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('fetch-bilesu-events');

      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      if (data?.events && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      toast({
        title: "Error loading events",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get events for the selected date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      try {
        const eventDate = parseISO(event.startTime);
        return isSameDay(eventDate, date);
      } catch {
        return false;
      }
    });
  };

  // Get all dates that have events for calendar highlighting
  const getDatesWithEvents = () => {
    const dates: Date[] = [];
    events.forEach(event => {
      try {
        const eventDate = parseISO(event.startTime);
        if (!dates.some(d => isSameDay(d, eventDate))) {
          dates.push(eventDate);
        }
      } catch {
        // Skip invalid dates
      }
    });
    return dates;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const datesWithEvents = getDatesWithEvents();

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
              <h2 className="text-2xl font-bold mb-2">Loading events calendar</h2>
              <p className="text-muted-foreground">Fetching upcoming events...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center">
          <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            FamActify
          </span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2">Events Calendar</h1>
            <p className="text-muted-foreground">
              Browse upcoming family-friendly events and activities in Latvia
            </p>
            <Badge variant="outline" className="mt-2">
              {events.length} events available
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Select a Date</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    hasEvents: datesWithEvents
                  }}
                  modifiersStyles={{
                    hasEvents: {
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      color: 'hsl(var(--primary))'
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Events for selected date */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No events scheduled for this date</p>
                    <p className="text-sm mt-2">Try selecting a date with underlined numbers</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {selectedDateEvents.map((event) => (
                      <Card key={event.id} className="overflow-hidden">
                        {event.image && (
                          <div className="relative h-48">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                            {event.category && (
                              <Badge variant="secondary" className="mb-2">
                                {event.category}
                              </Badge>
                            )}
                          </div>

                          {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="space-y-2 text-sm">
                            {event.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{event.venue}</span>
                              </div>
                            )}

                            {event.startTime && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {format(parseISO(event.startTime), "HH:mm")}
                                  {event.endTime && ` - ${format(parseISO(event.endTime), "HH:mm")}`}
                                </span>
                              </div>
                            )}

                            {(event.minPrice !== null || event.maxPrice !== null) && (
                              <div className="flex items-center gap-2">
                                <Euro className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {event.minPrice !== null && event.maxPrice !== null
                                    ? `€${event.minPrice} - €${event.maxPrice}`
                                    : event.minPrice !== null
                                    ? `From €${event.minPrice}`
                                    : `Up to €${event.maxPrice}`}
                                </span>
                              </div>
                            )}

                            {event.ageRestriction && (
                              <Badge variant="outline" className="text-xs">
                                {event.ageRestriction}+
                              </Badge>
                            )}
                          </div>

                          {event.url && (
                            <Button
                              variant="link"
                              className="h-auto p-0 text-primary"
                              asChild
                            >
                              <a href={event.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View Details & Buy Tickets
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsCalendar;
