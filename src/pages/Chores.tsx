// Chores — parent-facing manager for "home chore" hunts (visibility=family_private).
// Hidden from the public catalog; kids still earn passport stamps when completing them.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, House, Play } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import type { ScavengerHunt } from '@/types/hunt';

export default function Chores() {
  const navigate = useNavigate();
  const [chores, setChores]   = useState<ScavengerHunt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    huntsService.listMyHomeChores().then(list => {
      setChores(list);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-amber-50/60 via-background to-background pb-tab-bar">
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 52 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="tap-highlight w-8 h-8 flex items-center justify-center -ml-1"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black flex-1 flex items-center gap-1.5">
          <House className="w-4 h-4 text-amber-700" />
          Home Chores
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Intro card */}
        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">Hidden hunts for your family</p>
              <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                Build chore-based mini quests at home. Kids complete them like any scavenger hunt and earn stamps in their passport. Only your family sees these.
              </p>
            </div>
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={() => navigate('/chores/new')}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold tap-highlight active:scale-[0.99] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New chore hunt
        </button>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : chores.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border/60 bg-card/60 py-10 px-6 flex flex-col items-center text-center gap-2">
            <span className="text-4xl">🏠</span>
            <p className="font-bold text-sm">No chore hunts yet</p>
            <p className="text-[13px] text-muted-foreground max-w-[280px] leading-snug">
              Create your first one — try "Sunday tidy-up" with stops like "Make your bed" and "Feed the dog".
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Your family's chore hunts ({chores.length})
            </p>
            {chores.map(c => (
              <div key={c.id} className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <button
                  onClick={() => navigate(`/hunts/${c.slug}`)}
                  className="w-full flex items-stretch gap-3 p-3 text-left tap-highlight active:bg-muted/30 transition-colors"
                >
                  {/* Cover */}
                  <div className="shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl shadow-inner">
                    {c.coverImage ? (
                      <img src={c.coverImage} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span>{c.coverEmoji}</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight truncate">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{c.blurb}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                      <span>{c.stops.length} chore{c.stops.length !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                        <House className="w-2.5 h-2.5" /> Home
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 self-center text-muted-foreground">
                    <Play className="w-4 h-4" />
                  </div>
                </button>
                {/* Edit row */}
                <div className="border-t flex">
                  <button
                    onClick={() => navigate(`/chores/edit/${c.slug}`)}
                    className="flex-1 h-9 text-xs font-semibold text-primary tap-highlight active:bg-muted/30 transition-colors"
                  >
                    Edit chores
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
