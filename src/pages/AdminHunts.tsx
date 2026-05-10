import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, AlertCircle, Image as ImageIcon, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import { authService } from '@/services';
import { AdminPageShell, adminActionClass, adminPillClass } from '@/components/admin/AdminPageShell';
import { COUNTRIES, type CountryCode } from '@/i18n/CountryContext';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { key: 'all',            label: 'All', color: 'bg-muted text-foreground' },
  { key: 'pending_review', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { key: 'published',      label: 'Published', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'draft',          label: 'Drafts', color: 'bg-muted text-foreground' },
  { key: 'rejected',       label: 'Rejected', color: 'bg-rose-100 text-rose-800' },
] as const;

const REGION_FILTERS = [
  { key: 'all', label: 'All regions', icon: '🌎' },
  { key: 'US', label: COUNTRIES.US.name, icon: COUNTRIES.US.flag },
  { key: 'LV', label: COUNTRIES.LV.name, icon: COUNTRIES.LV.flag },
] as const;

type AdminHunt = Awaited<ReturnType<typeof huntsService.listAllHunts>>[number];
type StatusTab = typeof STATUS_TABS[number]['key'];
type RegionFilter = 'all' | CountryCode;

export default function AdminHunts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<StatusTab>('all');
  const [region, setRegion] = useState<RegionFilter>('all');
  const [hunts, setHunts] = useState<AdminHunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadHunts = useCallback(async () => {
    const u = await authService.getCurrentUser();
    if (!u) { navigate('/auth'); return; }
    setLoading(true);
    const list = await huntsService.listAllHunts({
      status: tab === 'all' ? undefined : tab,
      countryCode: region === 'all' ? undefined : region,
    });
    setHunts(list);
    setLoading(false);
  }, [tab, region, navigate]);

  useEffect(() => {
    loadHunts();
  }, [loadHunts]);

  const refreshAfterAction = async () => {
    await loadHunts();
  };

  const toggleHuntEnabled = async (hunt: AdminHunt) => {
    const isPublished = hunt.status === 'published';
    const verb = isPublished ? 'disable' : 'enable';
    const resultCopy = isPublished
      ? 'This hides it from public City Games but keeps it available in admin.'
      : 'This publishes/restores it in public City Games.';
    if (!window.confirm(`${isPublished ? 'Disable' : 'Enable'} "${hunt.title || 'this city game'}"? ${resultCopy}`)) return;
    setBusyId(hunt.id);
    try {
      if (isPublished) {
        await huntsService.disableHunt(hunt.id);
        toast.success('City game disabled');
      } else {
        await huntsService.enableHunt(hunt.id);
        toast.success('City game enabled');
      }
      await refreshAfterAction();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${verb} city game`);
    } finally {
      setBusyId(null);
    }
  };

  const deleteHunt = async (hunt: AdminHunt) => {
    const seedCopy = hunt.adminSource === 'seed'
      ? 'This hides the code-backed seed template persistently. To restore it later, clear the seed override in Supabase.'
      : 'This removes the database row, steps, sponsors, and attempts.';
    if (!window.confirm(`Delete "${hunt.title || 'this city game'}"? ${seedCopy} This cannot be undone from this page.`)) return;
    setBusyId(hunt.id);
    try {
      await huntsService.deleteHunt(hunt.id);
      toast.success('City game deleted');
      await refreshAfterAction();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete city game');
    } finally {
      setBusyId(null);
    }
  };

  const filters = (
    <div className="space-y-2 border-b bg-background/70 px-4 py-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={adminPillClass(tab === t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {REGION_FILTERS.map(r => (
          <button key={r.key} onClick={() => setRegion(r.key)} className={adminPillClass(region === r.key)}>
            <span className="mr-1">{r.icon}</span>{r.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AdminPageShell
      title="City Games"
      subtitle="All DB city games plus editable seed templates"
      backTo="/admin/lists"
      filters={filters}
      actions={(
        <>
          <button onClick={() => navigate('/admin/activities-demo')} className={adminActionClass('secondary')}>
            Activities
          </button>
          <button onClick={() => navigate('/admin/hunts/photo-review')} className={adminActionClass('secondary')}>
            <ImageIcon className="w-4 h-4" /> Photos
          </button>
          <button onClick={() => navigate('/admin/hunts/new')} className={adminActionClass('primary')}>
            <Plus className="w-4 h-4" /> New
          </button>
        </>
      )}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : hunts.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <span className="text-4xl">{tab === 'pending_review' ? '🌙' : '✨'}</span>
          <p className="text-sm text-muted-foreground">
            No city games for {REGION_FILTERS.find(r => r.key === region)?.label.toLowerCase()} in "{STATUS_TABS.find(t => t.key === tab)?.label}".
          </p>
        </div>
      ) : (
        hunts.map(h => {
          const country = COUNTRIES[h.countryCode as CountryCode];
          const statusMeta = STATUS_TABS.find(t => t.key === h.status);
          return (
            <div
              key={h.id}
              className="w-full rounded-2xl border bg-card p-4 flex items-center gap-3"
            >
              <button
                type="button"
                onClick={() => navigate(`/admin/hunts/${encodeURIComponent(h.id)}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left tap-highlight active:scale-[0.99] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-pink-100 flex items-center justify-center text-2xl shrink-0">{h.coverEmoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-semibold text-sm truncate">{h.title || '(untitled)'}</p>
                    {tab === 'all' && statusMeta && statusMeta.key !== 'all' && (
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0', statusMeta.color)}>
                        {statusMeta.label}
                      </span>
                    )}
                    {h.adminSource === 'seed' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 bg-sky-100 text-sky-800">
                        Seed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {h.hostName} · {country?.flag ?? '🏳️'} {h.city} · {h.countryCode} · {h.stops.length} steps
                  </p>
                  {h.adminSource === 'seed' && (
                    <p className={cn('text-[11px] truncate mt-0.5', h.status === 'draft' ? 'text-amber-700' : 'text-sky-700')}>
                      {h.status === 'draft'
                        ? 'Disabled code-backed template — hidden from public City Games.'
                        : 'Code-backed template — opening it lets admin create an editable DB copy.'}
                    </p>
                  )}
                  {h.reviewNotes && (
                    <p className="text-[11px] text-rose-600 truncate mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {h.reviewNotes}
                    </p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleHuntEnabled(h)}
                  disabled={busyId === h.id}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center tap-highlight disabled:opacity-60',
                    h.status === 'published'
                      ? 'border bg-background text-muted-foreground hover:bg-muted'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
                  )}
                  aria-label={`${h.status === 'published' ? 'Disable' : 'Enable'} ${h.title || 'city game'}`}
                >
                  {busyId === h.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : h.status === 'published'
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => deleteHunt(h)}
                  disabled={busyId === h.id}
                  className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 tap-highlight disabled:opacity-60"
                  aria-label={`Delete ${h.title || 'city game'}`}
                >
                  {busyId === h.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })
      )}
    </AdminPageShell>
  );
}
