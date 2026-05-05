import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Trash2, Plus, Search, MapPin } from 'lucide-react';
import { AdminPageShell, adminActionClass } from '@/components/admin/AdminPageShell';
import { authService, curatedListsService, type AuthorType, type CuratedActivitySearchResult, type EditableListItem } from '@/services';

type AuthorTypeInput = AuthorType | '';

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminListEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorType, setAuthorType] = useState<AuthorTypeInput>('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Items in this list
  const [listItems, setListItems] = useState<EditableListItem[]>([]);

  // Activity search
  const [activitySearch, setActivitySearch] = useState('');
  const [searchResults, setSearchResults] = useState<CuratedActivitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const checkAuth = async () => {
      const user = await authService.getCurrentUser();
      if (!user) navigate('/auth');
    };
    checkAuth();
  }, []);

  // ---------------------------------------------------------------------------
  // Load existing list if editing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isNew || !id) return;
    const fetchList = async () => {
      setLoading(true);
      const result = await curatedListsService.getEditable(id);
      if (!result) {
        toast.error('List not found');
        navigate('/admin/lists');
        return;
      }
      setTitle(result.list.title);
      setSlug(result.list.slug);
      setDescription(result.list.description || '');
      setAuthorName(result.list.author_name || '');
      setAuthorType(result.list.author_type || '');
      setCoverImageUrl(result.list.cover_image_url || '');
      setIsPublished(result.list.is_published ?? false);
      setSlugManual(true); // treat existing slug as manually set
      setListItems(result.items);
      setLoading(false);
    };
    fetchList();
  }, [id]);

  // ---------------------------------------------------------------------------
  // Auto-generate slug from title
  // ---------------------------------------------------------------------------
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManual) {
      setSlug(slugify(val));
    }
  };

  // ---------------------------------------------------------------------------
  // Activity search
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activitySearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const data = await curatedListsService.searchActivities(activitySearch);
      setSearchResults(data);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [activitySearch]);

  // ---------------------------------------------------------------------------
  // Add activity to list
  // ---------------------------------------------------------------------------
  const addActivity = (activity: CuratedActivitySearchResult) => {
    if (listItems.some(i => i.activity_id === activity.id)) {
      toast.error('Activity already in list');
      return;
    }
    const newItem: EditableListItem = {
      activity_id: activity.id,
      name: activity.name,
      imageurlthumb: activity.imageurlthumb,
      sort_order: listItems.length,
      note: '',
    };
    setListItems(prev => [...prev, newItem]);
    setActivitySearch('');
    setSearchResults([]);
  };

  // ---------------------------------------------------------------------------
  // Reorder
  // ---------------------------------------------------------------------------
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...listItems];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setListItems(updated.map((item, i) => ({ ...item, sort_order: i })));
  };

  const moveDown = (index: number) => {
    if (index === listItems.length - 1) return;
    const updated = [...listItems];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setListItems(updated.map((item, i) => ({ ...item, sort_order: i })));
  };

  const removeItem = (activityId: string) => {
    setListItems(prev =>
      prev.filter(i => i.activity_id !== activityId).map((item, i) => ({ ...item, sort_order: i })),
    );
  };

  const updateNote = (activityId: string, note: string) => {
    setListItems(prev =>
      prev.map(i => i.activity_id === activityId ? { ...i, note } : i),
    );
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const save = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    setSaving(true);
    try {
      await curatedListsService.saveList({
        id,
        list: {
          slug,
          title,
          description: description || null,
          author_name: authorName || null,
          author_type: authorType || null,
          cover_image_url: coverImageUrl || null,
          is_published: isPublished,
        },
        items: listItems,
      });

      toast.success(isNew ? 'List created' : 'List updated');
      navigate('/admin/lists');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <AdminPageShell title={isNew ? 'New List' : 'Edit List'} backTo="/admin/lists" contentClassName="max-w-4xl mx-auto w-full py-4">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded-2xl" />)}
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={isNew ? 'New List' : 'Edit List'}
      subtitle={title || 'Curated list builder'}
      backTo="/admin/lists"
      contentClassName="max-w-4xl mx-auto w-full py-4"
      actions={(
        <button onClick={save} disabled={saving} className={adminActionClass('primary')}>
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </button>
      )}
    >
        <div className="space-y-6">
          {/* ── List metadata form ── */}
          <div className="p-6 border rounded-3xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">List details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Best parks for toddlers"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                  placeholder="best-parks-for-toddlers"
                />
                <p className="text-xs text-muted-foreground mt-1">URL: /lists/{slug || '…'}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short description of this collection"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="author-name">Author name</Label>
                <Input
                  id="author-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <Label htmlFor="author-type">Author type</Label>
                <select
                  id="author-type"
                  value={authorType}
                  onChange={(e) => setAuthorType(e.target.value as AuthorTypeInput)}
                  className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— select —</option>
                  <option value="editor">Editor</option>
                  <option value="municipality">Municipality</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="cover-image">Cover image URL</Label>
              <Input
                id="cover-image"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="is-published">Published (visible to public)</Label>
            </div>
          </div>

          {/* ── Activity picker ── */}
          <div className="p-6 border rounded-3xl bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Add activities</h2>
                <p className="text-xs text-muted-foreground mt-1">Search existing activities, or contribute a new one first and then add it here.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/contribute">Contribute new activity</Link>
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search activities to add…"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {searching && (
              <p className="text-sm text-muted-foreground">Searching…</p>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-2xl overflow-hidden divide-y max-h-64 overflow-y-auto">
                {searchResults.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    {activity.imageurlthumb ? (
                      <img
                        src={activity.imageurlthumb}
                        alt={activity.name}
                        className="w-10 h-10 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded shrink-0 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{activity.name}</p>
                      {activity.location_address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{activity.location_address}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addActivity(activity)}
                      disabled={listItems.some(i => i.activity_id === activity.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Current items ── */}
          <div className="p-6 border rounded-3xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              List items ({listItems.length})
            </h2>

            {listItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activities added yet. Search above to add some.
              </p>
            ) : (
              <div className="space-y-3">
                {listItems.map((item, index) => (
                  <Card key={item.activity_id}>
                    <CardContent className="p-3">
                      <div className="flex gap-3 items-start">
                        {/* Thumbnail */}
                        {item.imageurlthumb ? (
                          <img
                            src={item.imageurlthumb}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded shrink-0" />
                        )}

                        {/* Info + note */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1.5 line-clamp-1">
                            <span className="text-muted-foreground mr-2 text-xs">{index + 1}.</span>
                            {item.name}
                          </p>
                          <Input
                            value={item.note}
                            onChange={(e) => updateNote(item.activity_id, e.target.value)}
                            placeholder="Optional editor note…"
                            className="text-xs h-7"
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === listItems.length - 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(item.activity_id)}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── Save button ── */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => navigate('/admin/lists')}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create List' : 'Save Changes'}
            </Button>
          </div>
        </div>
    </AdminPageShell>
  );
}
