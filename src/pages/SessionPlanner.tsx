import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Plus, ArrowUp, ArrowDown, Trash2, Clock, MapPin } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

// ---------------------------------------------------------------------------
// Provider pattern — export so a future genAI flow can slot in
// ---------------------------------------------------------------------------
export type PlanSource = 'human' | 'ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ActivitySpot {
  id: string;
  name: string;
  imageurlthumb: string | null;
  duration_minutes: number | null;
  min_price: number | null;
  max_price: number | null;
  location_address: string | null;
  age_buckets: string[];
  description: string | null;
}

interface PlanItem {
  activityId: string;
  name: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  durationMinutes: number;
  minPrice: number | null;
  maxPrice: number | null;
  address: string | null;
  imageurlthumb: string | null;
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------
function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function recalcTimes(items: PlanItem[], startTimeHHMM: string): PlanItem[] {
  let cursor = parseTime(startTimeHHMM);
  return items.map((item) => {
    const start = formatMinutes(cursor);
    cursor += item.durationMinutes;
    const end = formatMinutes(cursor);
    return { ...item, startTime: start, endTime: end };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SessionPlanner() {
  const navigate = useNavigate();

  // Plan metadata
  const [planName, setPlanName] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');

  // Activity search
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState<ActivitySpot[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivitySpot[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Plan items
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [saving, setSaving] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch activities on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchActivities = async () => {
      setLoadingActivities(true);
      const { data, error } = await supabase
        .from('activityspots')
        .select('id, name, imageurlthumb, duration_minutes, min_price, max_price, location_address, age_buckets, description')
        .order('name', { ascending: true });
      if (error) {
        toast.error('Failed to load activities');
      } else {
        setActivities(data || []);
        setFilteredActivities(data || []);
      }
      setLoadingActivities(false);
    };
    fetchActivities();
  }, []);

  // ---------------------------------------------------------------------------
  // Filter on search query
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredActivities(activities);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredActivities(
        activities.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.location_address?.toLowerCase().includes(q),
        ),
      );
    }
  }, [searchQuery, activities]);

  // ---------------------------------------------------------------------------
  // Recalculate times when startTime or items change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (planItems.length > 0) {
      setPlanItems((prev) => recalcTimes(prev, startTime));
    }
  }, [startTime]);

  // ---------------------------------------------------------------------------
  // Add activity to plan
  // ---------------------------------------------------------------------------
  const addActivity = (activity: ActivitySpot) => {
    const duration = activity.duration_minutes ?? 60;
    const newItem: PlanItem = {
      activityId: activity.id,
      name: activity.name,
      startTime: '00:00',
      endTime: '00:00',
      durationMinutes: duration,
      minPrice: activity.min_price,
      maxPrice: activity.max_price,
      address: activity.location_address,
      imageurlthumb: activity.imageurlthumb,
    };
    const updated = recalcTimes([...planItems, newItem], startTime);
    setPlanItems(updated);
    toast.success(`Added "${activity.name}" to plan`);
  };

  // ---------------------------------------------------------------------------
  // Reorder
  // ---------------------------------------------------------------------------
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...planItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setPlanItems(recalcTimes(newItems, startTime));
  };

  const moveDown = (index: number) => {
    if (index === planItems.length - 1) return;
    const newItems = [...planItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setPlanItems(recalcTimes(newItems, startTime));
  };

  const removeItem = (index: number) => {
    const newItems = planItems.filter((_, i) => i !== index);
    setPlanItems(recalcTimes(newItems, startTime));
  };

  // ---------------------------------------------------------------------------
  // Save plan
  // ---------------------------------------------------------------------------
  const savePlan = async () => {
    if (!planName.trim()) {
      toast.error('Enter a plan name');
      return;
    }
    if (planItems.length === 0) {
      toast.error('Add at least one activity to the plan');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in to save a plan');
        return;
      }

      const totalCost = planItems.reduce((sum, item) => {
        return sum + (item.minPrice ?? 0);
      }, 0);

      // Attach source metadata to each event
      const eventsWithMeta = planItems.map((item) => ({
        ...item,
        source: 'human' as PlanSource,
        planDate: planDate || null,
      }));

      const { error } = await supabase.from('saved_trips').insert({
        name: planName,
        events: eventsWithMeta,
        total_cost: totalCost,
        total_events: planItems.length,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success('Plan saved!');
      navigate('/saved-trips');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Price display
  // ---------------------------------------------------------------------------
  const formatPrice = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'Free';
    if (min === 0 && max === 0) return 'Free';
    if (min && max) return `$${min}–$${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return 'Price varies';
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Plan a Session</h1>

        {/* ── Top section: plan metadata ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-6 border rounded-lg bg-card">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="plan-name">
              Plan name *
            </label>
            <Input
              id="plan-name"
              placeholder="E.g. Saturday adventure"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="plan-date">
              Date
            </label>
            <Input
              id="plan-date"
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="start-time">
              Start time
            </label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Left: Activity browser ── */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Browse activities</h2>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search activities…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingActivities ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredActivities.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activities found.</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow"
                  >
                    {/* Thumbnail */}
                    {activity.imageurlthumb ? (
                      <img
                        src={activity.imageurlthumb}
                        alt={activity.name}
                        className="w-16 h-16 object-cover rounded-md shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded-md shrink-0 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{activity.name}</p>
                      {activity.location_address && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {activity.location_address}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.duration_minutes ?? 60} min
                        </span>
                        <span>{formatPrice(activity.min_price, activity.max_price)}</span>
                      </div>
                    </div>

                    {/* Add button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addActivity(activity)}
                      className="shrink-0 self-center"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="ml-1 hidden sm:inline">Add</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Current plan ── */}
          <div>
            <h2 className="text-lg font-semibold mb-3">
              Your plan{planItems.length > 0 ? ` (${planItems.length})` : ''}
            </h2>

            {planItems.length === 0 ? (
              <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Add activities from the left to build your plan.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {planItems.map((item, index) => (
                  <Card key={`${item.activityId}-${index}`} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3 items-start">
                        {/* Thumbnail */}
                        {item.imageurlthumb ? (
                          <img
                            src={item.imageurlthumb}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded shrink-0" />
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                          <p className="text-xs text-primary font-semibold mt-0.5">
                            {item.startTime} – {item.endTime}
                          </p>
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{item.durationMinutes} min</span>
                            <span>{formatPrice(item.minPrice, item.maxPrice)}</span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                            aria-label="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === planItems.length - 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                            aria-label="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                            aria-label="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Save button */}
            <div className="mt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={savePlan}
                disabled={saving || planItems.length === 0}
              >
                {saving ? 'Saving…' : 'Save Plan'}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
