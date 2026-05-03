import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronLeft, Edit3, FileText, Plus, Workflow } from 'lucide-react';
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">Venue Hunt Artifacts</p>
          <p className="text-[11px] text-muted-foreground truncate">Human or AI-assisted drafts → review → publish</p>
        </div>
        <button onClick={() => navigate('/org/hunts/new?mode=ai')} className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold tap-highlight flex items-center gap-1.5">
          <Bot className="w-4 h-4" /> AI draft
        </button>
      </div>

      <div className="px-4 pt-4 space-y-3">
        <div className="rounded-3xl border bg-card p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Scavenger hunts are artifacts</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                A venue can write one manually, or paste official source facts so an AI/agent can create a draft. Every artifact keeps provenance and goes through review before publishing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/org/hunts/new')} className="rounded-2xl border p-3 text-left tap-highlight active:scale-[0.99] transition-transform">
              <FileText className="w-4 h-4 text-primary mb-2" />
              <p className="text-xs font-bold">Create blank artifact</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Best when the venue team writes all clues.</p>
            </button>
            <button onClick={() => navigate('/org/hunts/new?mode=ai')} className="rounded-2xl border border-pink-200 bg-pink-50 p-3 text-left tap-highlight active:scale-[0.99] transition-transform">
              <Bot className="w-4 h-4 text-pink-700 mb-2" />
              <p className="text-xs font-bold text-pink-900">Draft with AI</p>
              <p className="text-[11px] text-pink-800/80 leading-snug mt-0.5">Paste source facts; edit before review.</p>
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hunts.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <span className="text-5xl">🔍</span>
            <p className="font-semibold">No hunts yet</p>
            <p className="text-sm text-muted-foreground">Create a place-based artifact for your venue, neighbourhood, or city.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => navigate('/org/hunts/new')} className="h-11 px-4 rounded-full border border-border font-medium text-sm tap-highlight">
                <Plus className="w-4 h-4 inline mr-1" /> Blank
              </button>
              <button onClick={() => navigate('/org/hunts/new?mode=ai')} className="h-11 px-4 rounded-full bg-primary text-primary-foreground font-medium text-sm tap-highlight">
                <Bot className="w-4 h-4 inline mr-1" /> AI draft
              </button>
            </div>
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
