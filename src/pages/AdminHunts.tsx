import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import { authService } from '@/services';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { key: 'published',      label: 'Published', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'draft',          label: 'Drafts', color: 'bg-muted text-foreground' },
  { key: 'rejected',       label: 'Rejected', color: 'bg-rose-100 text-rose-800' },
] as const;

type AdminHunt = Awaited<ReturnType<typeof huntsService.listAllHunts>>[number];

export default function AdminHunts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<typeof STATUS_TABS[number]['key']>('pending_review');
  const [hunts, setHunts] = useState<AdminHunt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await authService.getCurrentUser();
      if (!u) { navigate('/auth'); return; }
      setLoading(true);
      const list = await huntsService.listAllHunts({ status: tab });
      setHunts(list);
      setLoading(false);
    })();
  }, [tab, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 flex items-center gap-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
        <button onClick={() => navigate('/admin/lists')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold flex-1">Admin · Hunts</p>
        <button onClick={() => navigate('/admin/hunts/photo-review')} className="h-9 px-3 rounded-full border border-border text-xs font-semibold tap-highlight flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Photos
        </button>
        <button onClick={() => navigate('/admin/hunts/new')} className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold tap-highlight flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 px-4 pt-3 pb-2 overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn('h-8 px-3 rounded-full text-xs font-medium shrink-0', tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hunts.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <span className="text-4xl">{tab === 'pending_review' ? '🌙' : '✨'}</span>
            <p className="text-sm text-muted-foreground">No hunts in "{STATUS_TABS.find(t => t.key === tab)?.label}".</p>
          </div>
        ) : (
          hunts.map(h => (
            <button
              key={h.id}
              onClick={() => navigate(`/admin/hunts/${h.id}`)}
              className="w-full text-left rounded-2xl border bg-card p-4 flex items-center gap-3 tap-highlight active:scale-[0.99] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-pink-100 flex items-center justify-center text-2xl shrink-0">{h.coverEmoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{h.title || '(untitled)'}</p>
                <p className="text-xs text-muted-foreground truncate">{h.hostName} · {h.city} · {h.stops.length} stops</p>
                {h.reviewNotes && (
                  <p className="text-[11px] text-rose-600 truncate mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {h.reviewNotes}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
