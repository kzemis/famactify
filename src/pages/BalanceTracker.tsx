import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { activitiesService, authService, tripsService } from '@/services';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { name: 'Sport',     emoji: '🏃' },
  { name: 'Education', emoji: '📚' },
  { name: 'Culture',   emoji: '🎭' },
  { name: 'Nature',    emoji: '🌿' },
  { name: 'Social',    emoji: '👫' },
  { name: 'Fun',       emoji: '🎉' },
] as const;

type CategoryName = typeof CATEGORIES[number]['name'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildMonthOptions(): Array<{ label: string; year: number; month: number }> {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return options;
}

function horizonKey(year: number, month: number): string {
  return `famactify-horizon-${year}-${month}`;
}

function loadHorizonQuotas(year: number, month: number): Record<string, number> {
  try {
    const raw = localStorage.getItem(horizonKey(year, month));
    if (raw) {
      const plan = JSON.parse(raw);
      return plan.quotas ?? {};
    }
  } catch {
    // ignore
  }
  return {};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BalanceTracker() {
  const monthOptions = buildMonthOptions();
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Counts from saved_trips
  const [doneCounts, setDoneCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const selected = monthOptions[selectedIdx];

  // Load planned quotas from localStorage
  const plannedQuotas = loadHorizonQuotas(selected.year, selected.month);

  // ---------------------------------------------------------------------------
  // Fetch saved_trips → activityspots → count by category
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const session = await authService.getCurrentSession();
        if (!session) {
          setDoneCounts({});
          setLoading(false);
          return;
        }

        const trips = await tripsService.listForUser(session.user.id);

        // Collect all activityIds from all trips
        const activityIds: string[] = [];
        for (const trip of trips) {
          if (Array.isArray(trip.events)) {
            for (const ev of trip.events) {
              if (ev?.activityId) activityIds.push(ev.activityId);
            }
          }
        }

        const counts = await activitiesService.fetchCategoriesForActivityIds(activityIds);
        setDoneCounts(counts);
      } catch {
        // Graceful degradation — show empty state
        setDoneCounts({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const hasSavedTrips = Object.keys(doneCounts).length > 0;
  const hasAnyPlan = Object.values(plannedQuotas).some(v => v > 0);
  const showEmptyState = !loading && !hasSavedTrips && !hasAnyPlan;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Activity Balance</h1>
            <p className="text-muted-foreground mt-1">
              Compare what you've planned vs saved
            </p>
          </div>
          {/* Month picker */}
          <select
            value={selectedIdx}
            onChange={e => setSelectedIdx(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {monthOptions.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {CATEGORIES.map(({ name }) => (
              <div key={name} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && showEmptyState && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-2xl">🗓️</p>
              <p className="font-semibold text-lg">Start planning!</p>
              <p className="text-muted-foreground text-sm">
                Set monthly activity targets to see your balance here.
              </p>
              <Link
                to="/plan/horizon"
                className="inline-block mt-2 text-primary hover:underline text-sm font-medium"
              >
                Go to Monthly Plan →
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Category breakdown */}
        {!loading && !showEmptyState && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selected.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIES.map(({ name, emoji }) => {
                const done = doneCounts[name] ?? 0;
                const planned = plannedQuotas[name] ?? 0;
                const max = Math.max(planned, done, 1);
                const filledPct = Math.min(100, (done / max) * 100);

                // Color coding
                let barColor = 'bg-muted-foreground/30';
                if (planned > 0 && done >= planned) barColor = 'bg-green-500';
                else if (planned > 0 && done > 0) barColor = 'bg-yellow-400';
                else if (done > 0) barColor = 'bg-blue-400';

                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>
                          <span className={done > 0 ? 'text-foreground font-semibold' : ''}>{done}</span>
                          {planned > 0 && <span> / {planned} planned</span>}
                          {planned === 0 && done > 0 && <span> saved</span>}
                        </span>
                        <Link
                          to={`/activities?category=${name}`}
                          className="text-xs text-primary hover:underline shrink-0"
                        >
                          Find more →
                        </Link>
                      </div>
                    </div>
                    {/* Bar */}
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${filledPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  Target met
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                  In progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                  Saved (no target)
                </span>
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Want to change targets?{' '}
                <Link to="/plan/horizon" className="text-primary hover:underline">
                  Monthly Plan →
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
