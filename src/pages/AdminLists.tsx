import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff, ListChecks } from 'lucide-react';
import { AdminPageShell, adminActionClass, adminPillClass } from '@/components/admin/AdminPageShell';
import { authService, curatedListsService, type CuratedList } from '@/services';
import { cn } from '@/lib/utils';

const LIST_TABS = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
] as const;

type ListTab = typeof LIST_TABS[number]['key'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminLists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [tab, setTab] = useState<ListTab>('all');
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    const checkAuth = async () => {
      const user = await authService.getCurrentUser();
      if (!user) navigate('/auth');
    };
    checkAuth();
  }, []);

  // Fetch all lists (published + draft)
  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      try {
        const data = await curatedListsService.listAll();
        setLists(data);
      } catch {
        toast.error('Failed to load lists');
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, []);

  // Toggle publish state
  const togglePublish = async (list: CuratedList) => {
    const newValue = !list.is_published;
    try {
      await curatedListsService.setPublished(list.id, newValue);
      setLists(prev =>
        prev.map(l => l.id === list.id ? { ...l, is_published: newValue } : l),
      );
      toast.success(newValue ? 'List published' : 'List unpublished');
    } catch {
      toast.error('Failed to update publish state');
    }
  };

  // Delete list
  const deleteList = async (id: string) => {
    if (!confirm('Delete this list? This cannot be undone.')) return;
    try {
      await curatedListsService.deleteList(id);
      setLists(prev => prev.filter(l => l.id !== id));
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete list');
    }
  };

  const filteredLists = lists.filter(list => {
    if (tab === 'published') return list.is_published;
    if (tab === 'draft') return !list.is_published;
    return true;
  });

  const filters = (
    <div className="flex gap-1.5 border-b bg-background/70 px-4 py-3 overflow-x-auto">
      {LIST_TABS.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)} className={adminPillClass(tab === t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <AdminPageShell
      title="Curated Lists"
      subtitle="Manage published and draft list filters"
      filters={filters}
      actions={(
        <>
          <button onClick={() => navigate('/admin/hunts')} className={adminActionClass('secondary')}>
            Hunts
          </button>
          <button onClick={() => navigate('/admin/lists/new')} className={adminActionClass('primary')}>
            <Plus className="w-4 h-4" /> New
          </button>
        </>
      )}
    >
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <ListChecks className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="font-semibold">{lists.length === 0 ? 'No lists yet' : `No ${LIST_TABS.find(t => t.key === tab)?.label.toLowerCase()} lists`}</p>
          <p className="text-sm text-muted-foreground">Create curated lists as filters for the main Activities page.</p>
          <button onClick={() => navigate('/admin/lists/new')} className={cn(adminActionClass('primary'), 'mx-auto')}>
            <Plus className="w-4 h-4" /> Create list
          </button>
        </div>
      ) : (
        filteredLists.map((list) => (
          <div key={list.id} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-pink-100 flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5 text-primary" />
            </div>
            <button
              type="button"
              onClick={() => navigate(`/admin/lists/${list.id}`)}
              className="flex-1 min-w-0 text-left tap-highlight"
            >
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-semibold text-sm truncate">{list.title}</p>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0',
                  list.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-foreground',
                )}>
                  {list.is_published ? 'Published' : 'Draft'}
                </span>
                {list.author_type && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border border-border">
                    {list.author_type}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                /{list.slug}
                {list.author_name ? ` · by ${list.author_name}` : ''}
              </p>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => togglePublish(list)}
                title={list.is_published ? 'Unpublish' : 'Publish'}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight"
              >
                {list.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/admin/lists/${list.id}`)}
                className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted tap-highlight"
                aria-label={`Edit ${list.title}`}
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteList(list.id)}
                className="w-9 h-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 tap-highlight"
                aria-label={`Delete ${list.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </AdminPageShell>
  );
}
