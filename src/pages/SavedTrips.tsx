import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, Share2, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { ShareSheet, type ShareSheetTripData } from "@/components/ShareSheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TripEvent {
  id?: string;
  title?: string;       // v02
  image?: string;       // v02
  date?: string;
  time?: string;
  name?: string;        // v03
  imageurlthumb?: string; // v03
  activityId?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  location?: string;
  address?: string;
  lat?: number;
  lon?: number;
  description?: string;
  price?: string;
}

interface SavedTrip {
  id: string;
  name: string;
  events: TripEvent[];
  total_cost: number;
  total_events: number;
  created_at: string;
  recipients: string[] | null;
  share_token: string | null;
  confirmations?: {
    total: number;
    confirmed: number;
    confirmedEmails: string[];
    pendingEmails: string[];
  };
}

// ---------------------------------------------------------------------------
// Field normalizers — handle both v02 {title,image} and v03 {name,imageurlthumb}
// ---------------------------------------------------------------------------
const eventName  = (e: TripEvent) => e.title || e.name || 'Activity';
const eventImage = (e: TripEvent) => e.image || e.imageurlthumb || null;
const eventTime  = (e: TripEvent): string | null => {
  if (e.time) return e.time;
  if (e.startTime && e.endTime) return `${e.startTime}–${e.endTime}`;
  if (e.startTime) return e.startTime;
  return null;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function tripShareUrl(trip: SavedTrip): string {
  if (trip.share_token) return `${window.location.origin}/trip/${trip.share_token}`;
  const payload = {
    n: trip.name,
    i: (trip.events || []).map(e => ({
      id: e.id || e.activityId || '',
      nm: eventName(e), img: eventImage(e),
      dur: e.durationMinutes || 60,
      addr: e.location || e.address || null,
      lat: e.lat || null, lon: e.lon || null,
    })),
  };
  try {
    return `${window.location.origin}/activities?view=plan&kidplan=${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
  } catch { return `${window.location.origin}/activities?view=plan`; }
}

// ---------------------------------------------------------------------------
// Convert a SavedTrip → ShareSheetTripData
// ---------------------------------------------------------------------------
function toShareData(trip: SavedTrip): ShareSheetTripData {
  return {
    id: trip.id,
    name: trip.name,
    shareUrl: tripShareUrl(trip),
    events: (trip.events || []).map(e => ({
      title: eventName(e),
      date: e.date || new Date().toISOString().split('T')[0],
      time: eventTime(e) || '10:00 - 11:00',
      location: e.location || e.address || '',
      description: e.description || '',
    })),
  };
}

// ---------------------------------------------------------------------------
// Main component — styled like the Activities page
// ---------------------------------------------------------------------------
const SavedTrips = () => {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingTrip, setSharingTrip] = useState<ShareSheetTripData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data, error } = await supabase
      .from("saved_trips")
      .select("id, name, events, total_cost, total_events, created_at, recipients, share_token")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading trips", description: error.message, variant: "destructive" });
    } else {
      const tripsWithConfirmations = await Promise.all(
        (data || []).map(async (trip) => {
          const { data: confirmations } = await supabase
            .from("trip_confirmations").select("confirmed, recipient_email").eq("trip_id", trip.id);
          return {
            ...trip,
            events: Array.isArray(trip.events) ? trip.events as TripEvent[] : [],
            total_cost: trip.total_cost ?? 0,
            total_events: trip.total_events ?? 0,
            confirmations: {
              total: confirmations?.length || 0,
              confirmed: confirmations?.filter(c => c.confirmed).length || 0,
              confirmedEmails: confirmations?.filter(c => c.confirmed).map(c => c.recipient_email) || [],
              pendingEmails: confirmations?.filter(c => !c.confirmed).map(c => c.recipient_email) || [],
            },
          };
        })
      );
      setTrips(tripsWithConfirmations);
    }
    setLoading(false);
  };

  const deleteTrip = async (id: string) => {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    const { error } = await supabase.from("saved_trips").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setTrips(trips.filter(t => t.id !== id));
    toast({ title: "Trip deleted" });
  };

  const openInPlanner = (trip: SavedTrip) => {
    const payload = {
      n: trip.name,
      i: (trip.events || []).map(e => ({
        id: e.id || e.activityId || '',
        nm: eventName(e), img: eventImage(e),
        dur: e.durationMinutes || 60,
        addr: e.location || e.address || null,
        lat: e.lat || null, lon: e.lon || null,
      })),
    };
    try {
      navigate(`/activities?view=plan&kidplan=${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`);
    } catch { navigate('/activities?view=plan'); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Page header — same style as Activities */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Saved Trips</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your collection of planned family adventures</p>
          </div>
          <Button onClick={() => navigate('/activities')} variant="default">
            <MapPin className="h-4 w-4 mr-2" />
            Plan new trip
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                <div className="h-36 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar className="h-14 w-14 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No saved trips yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Start planning your family adventures!</p>
            <Button onClick={() => navigate("/activities")}>Browse Activities</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map((trip) => {
              const events = trip.events || [];
              return (
                <div key={trip.id} className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  {/* Thumbnail strip */}
                  {events.length > 0 ? (
                    <div className="flex h-28 overflow-hidden">
                      {events.slice(0, 3).map((event, i) => {
                        const img = eventImage(event);
                        return img ? (
                          <img key={i} src={img} alt={eventName(event)}
                            className="flex-1 object-cover"
                            style={{ maxWidth: `${100 / Math.min(events.length, 3)}%` }}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div key={i} className="flex-1 bg-muted flex items-center justify-center"
                            style={{ maxWidth: `${100 / Math.min(events.length, 3)}%` }}>
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1">
                    {/* Title + date */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base leading-tight line-clamp-1">{trip.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(trip.created_at)}
                          {events.length > 0 && ` · ${events.length} stop${events.length !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {trip.confirmations && trip.confirmations.confirmed > 0 && (
                        <span className="shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          ✓ {trip.confirmations.confirmed}/{trip.confirmations.total}
                        </span>
                      )}
                    </div>

                    {/* Stop list */}
                    {events.length > 0 && (
                      <div className="space-y-1 mb-4">
                        {events.slice(0, 3).map((event, i) => {
                          const t = eventTime(event);
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <span className="truncate flex-1 text-sm">{eventName(event)}</span>
                              {t && (
                                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{t}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {events.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-6">+{events.length - 3} more</p>
                        )}
                      </div>
                    )}

                    {/* Actions — pushed to bottom */}
                    <div className="flex gap-2 mt-auto">
                      <Button variant="default" className="flex-1" size="sm" onClick={() => openInPlanner(trip)}>
                        <MapPin className="h-3.5 w-3.5 mr-1.5" />
                        Open in Planner
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSharingTrip(toShareData(trip))} title="Share">
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteTrip(trip.id)} title="Delete"
                        className="text-destructive hover:text-destructive hover:border-destructive/50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />

      {sharingTrip && <ShareSheet trip={sharingTrip} onClose={() => setSharingTrip(null)} />}
    </div>
  );
};

export default SavedTrips;
