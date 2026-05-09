import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Image as ImageIcon, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services';
import { huntsService, type HuntPhotoReviewItem } from '@/services/huntsService';
import { AdminPageShell, adminPillClass } from '@/components/admin/AdminPageShell';
import { cn } from '@/lib/utils';

type ReviewTab = 'pending' | 'all';

const STATUS_STYLE: Record<HuntPhotoReviewItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

export default function AdminPhotoReviews() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ReviewTab>('pending');
  const [items, setItems] = useState<HuntPhotoReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingKey, setReviewingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const list = await huntsService.listPhotoReviews(tab);
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tab]);

  const review = async (item: HuntPhotoReviewItem, status: 'approved' | 'rejected') => {
    const user = await authService.getCurrentUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    const notes = status === 'rejected'
      ? window.prompt('Reason or note for the rejected photo?') ?? undefined
      : undefined;
    const key = `${item.attemptId}:${item.stopId}`;
    setReviewingKey(key);
    try {
      await huntsService.reviewPhoto({
        attemptId: item.attemptId,
        stopId: item.stopId,
        status,
        reviewerId: user.id,
        notes,
      });
      toast.success(status === 'approved' ? 'Photo approved' : 'Photo rejected');
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'Photo review failed');
    } finally {
      setReviewingKey(null);
    }
  };

  const filters = (
      <div className="flex gap-1.5 border-b bg-background/70 px-4 py-3 overflow-x-auto">
        {(['pending', 'all'] as ReviewTab[]).map(value => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(adminPillClass(tab === value), 'capitalize')}
          >
            {value}
          </button>
        ))}
      </div>
  );

  return (
    <AdminPageShell title="Photo Review" backTo="/admin/hunts" filters={filters}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-semibold">{tab === 'pending' ? 'No pending photos' : 'No photo answers yet'}</p>
            <p className="text-sm text-muted-foreground">Photo prompts from completed city games appear here for manual verification.</p>
          </div>
        ) : (
          items.map(item => {
            const key = `${item.attemptId}:${item.stopId}`;
            const busy = reviewingKey === key;
            return (
              <div key={key} className="rounded-2xl border bg-card overflow-hidden">
                <img src={item.photoDataUrl} alt={item.photoSubject ?? item.stopTitle} className="w-full max-h-72 object-cover bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.huntTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.stopTitle} · profile {item.profileId}</p>
                      {item.photoSubject && <p className="text-xs text-muted-foreground mt-1">Expected: {item.photoSubject}</p>}
                    </div>
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize shrink-0', STATUS_STYLE[item.status])}>
                      {item.status}
                    </span>
                  </div>

                  {item.reviewNotes && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2">{item.reviewNotes}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => review(item, 'rejected')}
                      disabled={busy}
                      className="flex-1 h-11 rounded-2xl bg-rose-100 text-rose-800 font-medium tap-highlight flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => review(item, 'approved')}
                      disabled={busy}
                      className="flex-1 h-11 rounded-2xl bg-emerald-500 text-white font-medium tap-highlight flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
    </AdminPageShell>
  );
}
