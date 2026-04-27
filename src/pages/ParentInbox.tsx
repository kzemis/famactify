import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface KidProposal {
  id: string;
  activityId: string;
  activityName: string;
  activityImage: string | null;
  message: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'declined';
  source?: 'little' | 'planner';
  planId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function loadProposals(): KidProposal[] {
  return JSON.parse(localStorage.getItem('famactify-kid-proposals') || '[]');
}
function saveProposals(proposals: KidProposal[]) {
  localStorage.setItem('famactify-kid-proposals', JSON.stringify(proposals));
  window.dispatchEvent(new Event('storage'));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ParentInbox() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<KidProposal[]>([]);
  const [declinedOpen, setDeclinedOpen] = useState(false);

  useEffect(() => {
    setProposals(loadProposals());
    // Keep in sync if another tab submits
    const refresh = () => setProposals(loadProposals());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const pending = proposals.filter(p => p.status === 'pending');
  const declined = proposals.filter(p => p.status === 'declined');

  // Split pending into: individual asks (source='little' or no planId) vs kid plans (planId set)
  const individualAsks = pending.filter(p => !p.planId);
  const planGroups: Map<string, KidProposal[]> = new Map();
  pending.filter(p => p.planId).forEach(p => {
    const key = p.planId!;
    if (!planGroups.has(key)) planGroups.set(key, []);
    planGroups.get(key)!.push(p);
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const approveSingle = (proposal: KidProposal) => {
    const updated = proposals.map(p =>
      p.id === proposal.id ? { ...p, status: 'approved' as const } : p,
    );
    saveProposals(updated);
    setProposals(updated);
    // Pre-fill the plan builder with this activity
    localStorage.setItem('famactify-pending-plan', JSON.stringify({
      source: 'kid',
      label: `${proposal.activityName} — Kid's Pick 🧒`,
      items: [{ activityId: proposal.activityId, activityName: proposal.activityName, activityImage: proposal.activityImage }],
    }));
    toast.success(`Loading "${proposal.activityName}" into your plan! 🗓️`);
    navigate('/activities?view=plan');
  };

  const declineSingle = (proposal: KidProposal) => {
    const updated = proposals.map(p =>
      p.id === proposal.id ? { ...p, status: 'declined' as const } : p,
    );
    saveProposals(updated);
    setProposals(updated);
    toast('Moved to "Maybe later" 💭');
  };

  const approvePlan = (planId: string) => {
    const planItems = proposals.filter(p => p.planId === planId);
    const updated = proposals.map(p =>
      p.planId === planId ? { ...p, status: 'approved' as const } : p,
    );
    saveProposals(updated);
    setProposals(updated);
    // Pre-fill the plan builder with all activities from the kid's plan, in order
    localStorage.setItem('famactify-pending-plan', JSON.stringify({
      source: 'kid',
      label: `Kid's Day Plan 🧒 (${planItems.length} activities)`,
      items: planItems.map(p => ({
        activityId: p.activityId,
        activityName: p.activityName,
        activityImage: p.activityImage,
      })),
    }));
    toast.success(`Loading your kid's plan into the builder! 🗓️`);
    navigate('/activities?view=plan');
  };

  const declinePlan = (planId: string) => {
    const updated = proposals.map(p =>
      p.planId === planId ? { ...p, status: 'declined' as const } : p,
    );
    saveProposals(updated);
    setProposals(updated);
    toast('Plan moved to "Maybe later" 💭');
  };

  const hasAnything = pending.length > 0 || declined.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Title */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">💌 Kids' Wishlist</h1>
            <p className="text-muted-foreground">Activities and plans your child wants to do</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/kids')}>
            Open Kid Mode 🎪
          </Button>
        </div>

        {/* Empty state */}
        {!hasAnything && (
          <div className="text-center py-16 space-y-4">
            <p className="text-6xl">🎪</p>
            <p className="text-xl font-semibold text-muted-foreground">
              No requests yet!
            </p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Hand your phone to your child and let them pick activities or build a day plan.
            </p>
            <Button onClick={() => navigate('/kids')} className="mt-4 gap-2">
              🧒 Open Kids Mode
            </Button>
          </div>
        )}

        {/* ── Kid Plans (grouped by planId) ── */}
        {planGroups.size > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              🗓️ Kid's Day Plans
            </h2>
            {[...planGroups.entries()].map(([planId, items]) => (
              <div key={planId} className="rounded-2xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
                <div className="p-4 border-b border-blue-200 bg-white/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-blue-700">
                        🗓️ Day plan with {items.length} {items.length === 1 ? 'activity' : 'activities'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {timeAgo(items[0].createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plan items */}
                <div className="divide-y divide-blue-100">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-3">
                      <span className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {item.activityImage ? (
                        <img
                          src={item.activityImage}
                          alt={item.activityName}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center shrink-0 text-lg">
                          🗺️
                        </div>
                      )}
                      <p className="font-medium text-sm flex-1 truncate">{item.activityName}</p>
                    </div>
                  ))}
                </div>

                {/* Plan actions */}
                <div className="flex gap-2 p-4 bg-white/70">
                  <Button
                    className="flex-1 rounded-xl font-bold bg-blue-500 hover:bg-blue-600"
                    onClick={() => approvePlan(planId)}
                  >
                    Open in Plan Builder 🗓️
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-blue-200 text-blue-600"
                    onClick={() => declinePlan(planId)}
                  >
                    Maybe later 💭
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Individual asks (Little Explorer / one-off) ── */}
        {individualAsks.length > 0 && (
          <div className="space-y-3 mb-8">
            {planGroups.size > 0 && (
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                💌 Individual Asks
              </h2>
            )}
            {individualAsks.map(proposal => (
              <div
                key={proposal.id}
                className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4 p-4">
                  {proposal.activityImage ? (
                    <img
                      src={proposal.activityImage}
                      alt={proposal.activityName}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-2xl">
                      🎪
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight truncate">{proposal.activityName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {proposal.source === 'little' ? '🧒 Little Explorer asked' : '👧 Kid wants to go here!'} 🌟
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(proposal.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <Button className="flex-1 rounded-xl font-bold" onClick={() => approveSingle(proposal)}>
                    Add to Plan Builder 🗓️
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => declineSingle(proposal)}>
                    Maybe later 💭
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Declined (collapsible) ── */}
        {declined.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setDeclinedOpen(v => !v)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {declinedOpen ? '▾' : '▸'} Passed on ({declined.length})
            </button>
            {declinedOpen && (
              <div className="mt-3 space-y-2">
                {declined.map(proposal => (
                  <div
                    key={proposal.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 opacity-60"
                  >
                    {proposal.activityImage ? (
                      <img src={proposal.activityImage} alt={proposal.activityName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">🎪</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proposal.activityName}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(proposal.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
