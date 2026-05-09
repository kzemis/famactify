import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, ExternalLink, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { AdminPageShell, adminActionClass, adminPillClass } from '@/components/admin/AdminPageShell';
import { activitiesService, type DemoActivityAdminRow, type DemoActivityEnabledFilter } from '@/services/activitiesService';
import { COUNTRIES, type CountryCode } from '@/i18n/CountryContext';
import { cn } from '@/lib/utils';

const REGION_FILTERS = [
  { key: 'all', label: 'All regions', icon: '🌎' },
  { key: 'US', label: COUNTRIES.US.name, icon: COUNTRIES.US.flag },
  { key: 'LV', label: COUNTRIES.LV.name, icon: COUNTRIES.LV.flag },
] as const;

const ENABLED_FILTERS: Array<{ key: DemoActivityEnabledFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'enabled', label: 'Enabled' },
  { key: 'disabled', label: 'Disabled' },
];

type RegionFilter = 'all' | CountryCode;

function rankDraftValue(activity: DemoActivityAdminRow): string {
  return activity.demo_rank == null ? '' : String(activity.demo_rank);
}

function nextRankForCountry(activities: DemoActivityAdminRow[], countryCode: string | null): number {
  const ranks = activities
    .filter(activity => activity.country_code === countryCode && activity.demo_enabled && typeof activity.demo_rank === 'number')
    .map(activity => activity.demo_rank as number);
  if (ranks.length === 0) {
    return activities.filter(activity => activity.country_code === countryCode && activity.demo_enabled).length + 1;
  }
  return Math.max(...ranks) + 1;
}

export default function AdminActivityDemoCuration() {
  const navigate = useNavigate();
  const [region, setRegion] = useState<RegionFilter>('all');
  const [enabled, setEnabled] = useState<DemoActivityEnabledFilter>('enabled');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activities, setActivities] = useState<DemoActivityAdminRow[]>([]);
  const [rankDrafts, setRankDrafts] = useState<Record<string, string>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const result = await activitiesService.listDemoCuration({
        countryCode: region,
        enabled,
        searchQuery: appliedSearch,
        limit: 250,
      });
      setActivities(result.activities);
      setRankDrafts(Object.fromEntries(result.activities.map(activity => [activity.id, rankDraftValue(activity)])));
      setTotalCount(result.totalCount);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load demo activities');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, enabled, region]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const visibleEnabledCount = useMemo(
    () => activities.filter(activity => activity.demo_enabled).length,
    [activities],
  );

  const updateLocalActivity = (id: string, patch: Partial<DemoActivityAdminRow>) => {
    setActivities(prev => prev.map(activity => activity.id === id ? { ...activity, ...patch } : activity));
  };

  const toggleEnabled = async (activity: DemoActivityAdminRow, nextEnabled: boolean) => {
    const nextRank = nextEnabled
      ? activity.demo_rank ?? nextRankForCountry(activities, activity.country_code)
      : null;
    setSavingId(activity.id);
    try {
      await activitiesService.updateDemoCuration(activity.id, {
        demo_enabled: nextEnabled,
        demo_rank: nextRank,
      });
      updateLocalActivity(activity.id, { demo_enabled: nextEnabled, demo_rank: nextRank });
      setRankDrafts(prev => ({ ...prev, [activity.id]: nextRank == null ? '' : String(nextRank) }));
      toast.success(nextEnabled ? 'Enabled for demo' : 'Hidden from demo');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update activity');
    } finally {
      setSavingId(null);
    }
  };

  const saveRank = async (activity: DemoActivityAdminRow) => {
    const raw = rankDrafts[activity.id]?.trim() ?? '';
    const nextRank = raw === '' ? null : Number(raw);
    if (nextRank === activity.demo_rank) return;
    if (nextRank !== null && (!Number.isFinite(nextRank) || nextRank < 1)) {
      setRankDrafts(prev => ({ ...prev, [activity.id]: rankDraftValue(activity) }));
      toast.error('Rank must be a positive number');
      return;
    }
    setSavingId(activity.id);
    try {
      await activitiesService.updateDemoCuration(activity.id, { demo_rank: nextRank });
      updateLocalActivity(activity.id, { demo_rank: nextRank });
      toast.success('Rank saved');
    } catch (error: any) {
      setRankDrafts(prev => ({ ...prev, [activity.id]: rankDraftValue(activity) }));
      toast.error(error?.message || 'Failed to save rank');
    } finally {
      setSavingId(null);
    }
  };

  const filters = (
    <div className="space-y-2 border-b bg-background/70 px-4 py-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {REGION_FILTERS.map(r => (
          <button key={r.key} onClick={() => setRegion(r.key)} className={adminPillClass(region === r.key)}>
            <span className="mr-1">{r.icon}</span>{r.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {ENABLED_FILTERS.map(filter => (
          <button key={filter.key} onClick={() => setEnabled(filter.key)} className={adminPillClass(enabled === filter.key)}>
            {filter.label}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(searchQuery.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="Search activities…"
            className="w-full h-10 rounded-full border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button type="submit" className={adminActionClass('secondary')}>
          Search
        </button>
      </form>
    </div>
  );

  return (
    <AdminPageShell
      title="Demo Activities"
      subtitle="Choose the small high-quality set loaded in public Activities UI"
      backTo="/admin/lists"
      filters={filters}
      actions={(
        <>
          <button onClick={() => navigate('/admin/lists')} className={adminActionClass('secondary')}>
            Lists
          </button>
          <button onClick={() => navigate('/admin/hunts')} className={adminActionClass('secondary')}>
            City Games
          </button>
        </>
      )}
    >
      <div className="rounded-2xl border bg-card p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">Performance demo mode</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Public browsing now loads only `demo_enabled` activities. Keep roughly 15 enabled for Latvia and 15 for USA.
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Showing {activities.length} of {totalCount}. Enabled in this view: {visibleEnabledCount}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-24 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <span className="text-4xl">🪶</span>
          <p className="font-semibold">No matching activities</p>
          <p className="text-sm text-muted-foreground">Try another region, status, or search.</p>
        </div>
      ) : (
        activities.map(activity => {
          const country = activity.country_code ? COUNTRIES[activity.country_code as CountryCode] : null;
          const saving = savingId === activity.id;
          return (
            <div key={activity.id} className="rounded-2xl border bg-card p-3 flex gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden shrink-0">
                {activity.imageurlthumb ? (
                  <img src={activity.imageurlthumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">✨</div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{activity.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {country?.flag ?? '🏳️'} {activity.city || activity.country_code || 'Unknown'} · {activity.primary_category || 'activity'}
                    </p>
                  </div>
                  <Switch
                    checked={activity.demo_enabled}
                    disabled={saving}
                    onCheckedChange={checked => toggleEnabled(activity, checked)}
                    aria-label={`Enable ${activity.name} in demo`}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className={cn(
                    'h-9 rounded-full border bg-background flex items-center gap-1.5 px-3 text-xs font-medium',
                    !activity.demo_enabled && 'opacity-60',
                  )}>
                    Rank
                    <input
                      value={rankDrafts[activity.id] ?? ''}
                      onChange={event => setRankDrafts(prev => ({ ...prev, [activity.id]: event.target.value }))}
                      onBlur={() => saveRank(activity)}
                      inputMode="numeric"
                      disabled={saving}
                      className="w-10 bg-transparent text-center font-bold outline-none"
                      placeholder="—"
                    />
                  </label>
                  {activity.excitement_score != null && (
                    <span className="h-8 px-2.5 rounded-full bg-muted text-[11px] font-semibold flex items-center">
                      score {activity.excitement_score}
                    </span>
                  )}
                  {activity.source && (
                    <span className="h-8 px-2.5 rounded-full bg-muted text-[11px] font-semibold flex items-center">
                      {activity.source}
                    </span>
                  )}
                  {activity.urlmoreinfo_status && (
                    <span className={cn(
                      'h-8 px-2.5 rounded-full text-[11px] font-semibold flex items-center',
                      activity.urlmoreinfo_status === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                    )}>
                      link {activity.urlmoreinfo_status}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/activities/${activity.id}/edit`)}
                    className="h-8 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 tap-highlight"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {activity.location_address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 tap-highlight"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Map
                    </a>
                  )}
                  {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
          );
        })
      )}
    </AdminPageShell>
  );
}
