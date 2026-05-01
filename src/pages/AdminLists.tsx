import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { authService, curatedListsService, type CuratedList } from '@/services';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminLists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<CuratedList[]>([]);
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin — Curated Lists</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage all curated lists (published and drafts)
            </p>
          </div>
          <Button onClick={() => navigate('/admin/lists/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New List
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">No lists yet.</p>
            <Button onClick={() => navigate('/admin/lists/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first list
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <Card key={list.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Publish indicator */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${list.is_published ? 'bg-green-500' : 'bg-muted-foreground'}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{list.title}</h3>
                        <Badge variant={list.is_published ? 'default' : 'secondary'} className="text-xs">
                          {list.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        {list.author_type && (
                          <Badge variant="outline" className="text-xs">{list.author_type}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        /{list.slug}
                        {list.author_name ? ` · by ${list.author_name}` : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Publish toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePublish(list)}
                        title={list.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {list.is_published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/lists/${list.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {/* Delete */}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteList(list.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
