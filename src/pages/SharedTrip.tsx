import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, Clock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import MapView from "@/components/MapView";

interface SharedTripData {
  id: string;
  name: string;
  events: any[];
  total_cost: number;
  total_events: number;
  created_at: string;
}

const SharedTrip = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<SharedTripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedTrip = async () => {
      if (!shareToken) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("shared_trips_view")
          .select("id, name, events, total_cost, total_events, created_at")
          .eq("share_token", shareToken)
          .single();

        if (error) throw error;

        if (!data) {
          setError("Trip not found");
        } else {
          setTrip({
            ...data,
            events: Array.isArray(data.events) ? data.events : [],
          });
        }
      } catch (error: any) {
        console.error("Error fetching shared trip:", error);
        setError("Failed to load trip. The link may be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedTrip();
  }, [shareToken]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Loading trip...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg">
            <CardContent className="pt-12 pb-8 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Trip Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error || "This trip doesn't exist or is no longer available."}
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto space-y-6 p-4 py-8 w-full">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">{trip.name}</h1>
          <p className="text-muted-foreground text-lg">
            Shared itinerary • Created {formatDate(trip.created_at)}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Trip Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{trip.total_events} activities</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>€{trip.total_cost} estimated cost</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {trip.events.filter(e => e.lat && e.lon).length > 0 && (
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                Trip Map
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                See all activities on an interactive map with the planned route
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <MapView
                places={trip.events
                  .filter(e => e.lat && e.lon)
                  .map(e => ({
                    id: e.id || e.title,
                    name: e.title,
                    lat: e.lat!,
                    lon: e.lon!,
                    activityType: e.description || '',
                  }))}
                path={trip.events
                  .filter(e => e.lat && e.lon)
                  .map(e => ({
                    id: e.id || e.title,
                    lat: e.lat!,
                    lon: e.lon!,
                  }))}
              />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Activities</h2>
          {trip.events.length === 0 ? (
            <Card className="shadow-lg">
              <CardContent className="py-8 text-center text-muted-foreground">
                No activities in this trip
              </CardContent>
            </Card>
          ) : (
            trip.events.map((event, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{event.time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {event.price && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          €{event.price}
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {event.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        <Card className="shadow-lg bg-accent/50">
          <CardContent className="py-6">
            <h3 className="font-semibold mb-2">Want to plan your own family adventure?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create personalized itineraries with FamActify and share them with your family!
            </p>
            <Button onClick={() => navigate("/onboarding/interests")} className="w-full">
              Start Planning
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default SharedTrip;
