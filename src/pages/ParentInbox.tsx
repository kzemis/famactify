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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
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
  }, []);

  const pending = proposals.filter(p => p.status === 'pending');
  const declined = proposals.filter(p => p.status === 'declined');

  const handleApprove = (proposal: KidProposal) => {
    const updated = proposals.map(p =>
      p.id === proposal.id ? { ...p, status: 'approved' as const } : p,
    );
    saveProposals(updated);
    setProposals(updated);
    toast.success(`Let's plan ${proposal.activityName}! 🗓️`);
    navigate('/plan');
  };

  const handleDecline = (proposal: KidProposal) => {
    const updated = proposals.map(p =>
      p.id === proposal.id ? { ...p, status: 'declined' as const } : p,
    );
    saveProposals(updated);
    setProposals(updated);
    toast.success('Moved to "Maybe later" 💭');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">💌 Your Kid's Wishlist</h1>
          <p className="text-muted-foreground">Activities your child wants to do</p>
        </div>

        {/* Empty state */}
        {pending.length === 0 && declined.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-6xl">🎪</p>
            <p className="text-xl font-semibold text-muted-foreground">
              No requests yet — give your child the app and let them pick something!
            </p>
            <Button onClick={() => navigate('/kids')} className="mt-4">
              Open Kids Mode 🎉
            </Button>
          </div>
        )}

        {/* Pending proposals */}
        {pending.length > 0 && (
          <div className="space-y-4 mb-8">
            {pending.map(proposal => (
              <div
                key={proposal.id}
                className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  {proposal.activityImage ? (
                    <img
                      src={proposal.activityImage}
                      alt={proposal.activityName}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                      <span className="text-3xl">🎪</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight truncate">{proposal.activityName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your kid wants to go here! 🌟
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Asked {timeAgo(proposal.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-4 pb-4">
                  <Button
                    className="flex-1 rounded-xl font-bold"
                    onClick={() => handleApprove(proposal)}
                  >
                    Let's plan it! 🗓️
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => handleDecline(proposal)}
                  >
                    Maybe later 💭
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Declined (collapsible) */}
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
                      <img
                        src={proposal.activityImage}
                        alt={proposal.activityName}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-lg">🎪</span>
                      </div>
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
