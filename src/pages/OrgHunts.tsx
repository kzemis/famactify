import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Edit3 } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import type { ScavengerHunt } from '@/types/hunt';
import { authService } from '@/services';
import { cn } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  draft:          'bg-muted text-foreground',
  pending_review: 'bg-amber-100 text-amber-800',
  published:      'bg-emerald-100 text-emerald-800',
  rejected:       'bg-rose-100 text-rose-800',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', pending_review: 'Pending', published: 'Published', rejected: 'Rejected',
};

export default function OrgHunts() {
  const navigate = useNavigate();
  const [hunts, setHunts] = useState<(ScavengerHunt & { status?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await authService.getCurrentUser();
      if (!u) { navigate('/auth'); return; }
      const list = await huntsService.listMyHunts();
      // Need status — refetch with raw call
      const enriched = await Promise.all(list.map(async h => ({ ...h, status: (await huntsService.getHuntById(h.id))?.status })));
      setHunts(enriched);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 flex items-center gap-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
        <button onClick={() => navigate('/org/dashboard')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold flex-1">My Scavenger Hunts</p>
        <button onClick={() => navigate('/org/hunts/new')} className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold tap-highlight flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hunts.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <span className="text-5xl">🔍</span>
            <p className="font-semibold">No hunts yet</p>
            <p className="text-sm text-muted-foreground">Create a place-based hunt for your venue, neighbourhood, or city.</p>
            <button onClick={() => navigate('/org/hunts/new')} className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-medium text-sm tap-highlight">
              <Plus className="w-4 h-4 inline mr-1" /> Create first hunt
            </button>
          </div>
        ) : (
          hunts.map(h => (
            <button
              key={h.id}
              onClick={() => navigate(`/org/hunts/${h.id}`)}
              className="w-full text-left rounded-2xl border bg-card p-4 flex items-center gap-3 tap-highlight active:scale-[0.99] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-pink-100 flex items-center justify-center text-2xl shrink-0">{h.coverEmoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{h.title || '(untitled)'}</p>
                <p className="text-xs text-muted-foreground truncate">{h.city} · {h.stops.length} stops</p>
              </div>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0', STATUS_COLOR[h.status ?? 'draft'])}>
                {STATUS_LABEL[h.status ?? 'draft']}
              </span>
              <Edit3 className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
