import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Trash2, Share2, MapPin, Clock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ShareSheet, type ShareSheetTripData } from "@/components/ShareSheet";
import { authService, tripsService, type SavedTrip, type TripEvent } from "@/services";

const eventName  = (e: TripEvent) => e.title || e.name || 'Activity';
const eventImage = (e: TripEvent) => e.image || e.imageurlthumb || null;
const eventTime  = (e: TripEvent): string | null => {
  if (e.time) return e.time;
  if (e.startTime && e.endTime) return `${e.startTime}–${e.endTime}`;
  if (e.startTime) return e.startTime;
  return null;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function tripShareUrl(trip: SavedTrip): string {
  if (trip.share_token) return `${window.location.origin}/trip/${trip.share_token}`;
  const payload = {
    n: trip.name,
    i: (trip.events || []).map(e => ({ id: e.id || e.activityId || '', nm: eventName(e), img: eventImage(e), dur: e.durationMinutes || 60, addr: e.location || e.address || null, lat: e.lat || null, lon: e.lon || null })),
  };
  try { return `${window.location.origin}/activities?view=plan&kidplan=${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`; }
  catch { return `${window.location.origin}/activities?view=plan`; }
}

function toShareData(trip: SavedTrip): ShareSheetTripData {
  return {
    id: trip.id, name: trip.name, shareUrl: tripShareUrl(trip),
    events: (trip.events || []).map(e => ({
      title: eventName(e), date: e.date || new Date().toISOString().split('T')[0],
      time: eventTime(e) || '10:00 - 11:00', location: e.location || e.address || '', description: e.description || '',
    })),
  };
}

const SavedTrips = () => {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingTrip, setSharingTrip] = useState<ShareSheetTripData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) { navigate("/auth"); return; }
      setTrips(await tripsService.listCurrentUserWithConfirmations());
    } catch (error: any) {
      if (error.message?.includes('auth') || error.message?.includes('signed in')) navigate("/auth");
      else toast({ title: "Error loading trips", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const deleteTrip = async (id: string) => {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await tripsService.deleteTrip(id);
      setTrips(trips.filter(t => t.id !== id));
      toast({ title: "Trip deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openInPlanner = (trip: SavedTrip) => {
    const payload = { n: trip.name, i: (trip.events || []).map(e => ({ id: e.id || e.activityId || '', nm: eventName(e), img: eventImage(e), dur: e.durationMinutes || 60, addr: e.location || e.address || null, lat: e.lat || null, lon: e.lon || null })) };
    try { navigate(`/activities?view=plan&kidplan=${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`); }
    catch { navigate('/activities?view=plan'); }
  };

  return (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Saved Trips</h1>
          <button
            onClick={() => navigate('/activities')}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md tap-highlight active:scale-95 transition-transform"
            aria-label="Plan new trip"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {!loading && trips.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{trips.length} saved {trips.length === 1 ? 'trip' : 'trips'}</p>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="px-4 py-3 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden animate-pulse">
              <div className="h-28 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && trips.length === 0 && (
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <span className="text-5xl mb-4">🗓️</span>
          <p className="text-base font-semibold mb-1">No saved trips yet</p>
          <p className="text-sm text-muted-foreground mb-6">Build a plan and save it to find it here</p>
          <button
            onClick={() => navigate("/activities")}
            className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm tap-highlight"
          >
            Browse activities
          </button>
        </div>
      )}

      {/* ── Trip list ── */}
      {!loading && trips.length > 0 && (
        <div className="px-4 py-3 pb-tab-bar space-y-3">
          {trips.map(trip => {
            const events = trip.events || [];
            return (
              <div key={trip.id} className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                {/* Image strip */}
                {events.length > 0 ? (
                  <div className="flex h-24 overflow-hidden">
                    {events.slice(0, 3).map((event, i) => {
                      const img = eventImage(event);
                      return img ? (
                        <img key={i} src={img} alt={eventName(event)} className="flex-1 object-cover" style={{ maxWidth: `${100 / Math.min(events.length, 3)}%` }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div key={i} className="flex-1 bg-muted flex items-center justify-center" style={{ maxWidth: `${100 / Math.min(events.length, 3)}%` }}>
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                <div className="p-4 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base leading-tight line-clamp-1">{trip.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(trip.created_at)}
                        {events.length > 0 && ` · ${events.length} stop${events.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    {trip.confirmations && trip.confirmations.confirmed > 0 && (
                      <span className="shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        ✓ {trip.confirmations.confirmed}/{trip.confirmations.total}
                      </span>
                    )}
                  </div>

                  {/* Stop list */}
                  {events.length > 0 && (
                    <div className="space-y-1.5">
                      {events.slice(0, 3).map((event, i) => {
                        const t = eventTime(event);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                            <span className="flex-1 text-sm truncate">{eventName(event)}</span>
                            {t && <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5"><Clock className="w-3 h-3" />{t}</span>}
                          </div>
                        );
                      })}
                      {events.length > 3 && <p className="text-xs text-muted-foreground pl-7">+{events.length - 3} more stops</p>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openInPlanner(trip)} className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4" /> Open in Planner
                    </button>
                    <button onClick={() => setSharingTrip(toShareData(trip))} className="w-11 h-11 rounded-2xl border border-border bg-background flex items-center justify-center tap-highlight" title="Share">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTrip(trip.id)} className="w-11 h-11 rounded-2xl border border-border bg-background flex items-center justify-center text-destructive tap-highlight" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sharingTrip && <ShareSheet trip={sharingTrip} onClose={() => setSharingTrip(null)} />}
    </div>
  );
};

export default SavedTrips;
