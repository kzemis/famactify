import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, DollarSign, Trash2, Eye, Mail, Share2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";

interface SavedTrip {
  id: string;
  name: string;
  events: any[];
  total_cost: number;
  total_events: number;
  created_at: string;
  recipients: string[] | null;
  share_token: string | null;
  confirmations?: {
    total: number;
    confirmed: number;
  };
}

const SavedTrips = () => {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("saved_trips")
      .select("id, name, events, total_cost, total_events, created_at, recipients, share_token")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading trips",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Fetch confirmation counts for each trip
      const tripsWithConfirmations = await Promise.all(
        (data || []).map(async (trip) => {
          const { data: confirmations } = await supabase
            .from("trip_confirmations")
            .select("confirmed")
            .eq("trip_id", trip.id);

          const total = confirmations?.length || 0;
          const confirmed = confirmations?.filter((c) => c.confirmed).length || 0;

          return {
            ...trip,
            events: Array.isArray(trip.events) ? trip.events : [],
            total_cost: trip.total_cost ?? 0,
            total_events: trip.total_events ?? 0,
            confirmations: { total, confirmed },
          };
        })
      );

      setTrips(tripsWithConfirmations);
    }
    setLoading(false);
  };

  const deleteTrip = async (id: string) => {
    const { error } = await supabase
      .from("saved_trips")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting trip",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTrips(trips.filter(trip => trip.id !== id));
      toast({
        title: "Trip deleted",
        description: "Your trip has been removed.",
      });
    }
  };

  const viewTrip = (trip: SavedTrip) => {
    sessionStorage.setItem("likedEvents", JSON.stringify(trip.events));
    navigate("/itinerary");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const copyShareLink = async (trip: SavedTrip) => {
    if (!trip.share_token) {
      toast({
        title: "Error",
        description: "This trip doesn't have a share link yet.",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/trip/${trip.share_token}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedTripId(trip.id);
      toast({
        title: "Link copied!",
        description: "Share this link with anyone to let them view your trip.",
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedTripId(null), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto space-y-6 p-4 py-8 w-full">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Saved Trips</h1>
          <p className="text-muted-foreground text-lg">
            Your collection of planned family adventures
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : trips.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No saved trips yet</h3>
              <p className="text-muted-foreground mb-6">
                Start planning your family adventures and save them here!
              </p>
              <Button onClick={() => navigate("/events")}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{trip.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(trip.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{trip.total_events} events</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>${trip.total_cost} estimated</span>
                    </div>
                    {trip.recipients && trip.recipients.length > 0 && (
                      <div className="flex items-center gap-2 text-sm w-full">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">
                          Shared with: {trip.recipients.join(", ")}
                        </span>
                      </div>
                    )}
                    {trip.confirmations && trip.confirmations.total > 0 && (
                      <div className="flex items-center gap-2 text-sm w-full">
                        <span className="text-sm font-medium text-primary">
                          ✓ {trip.confirmations.confirmed} of {trip.confirmations.total} confirmed
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => viewTrip(trip)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Trip
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => copyShareLink(trip)}
                      title="Copy shareable link"
                    >
                      {copiedTripId === trip.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteTrip(trip.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default SavedTrips;
