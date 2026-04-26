import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Search, MapPin } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ActivitySpot {
  id: string;
  name: string;
  imageurlthumb: string | null;
  location_address: string | null;
  min_price: number | null;
  max_price: number | null;
}

interface ListItem {
  activity_id: string;
  name: string;
  imageurlthumb: string | null;
  sort_order: number;
  note: string;
}

type AuthorType = 'editor' | 'municipality' | 'partner' | '';

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
  const [authorType, setAuthorType] = useState<AuthorType>('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Items in this list
  const [listItems, setListItems] = useState<ListItem[]>([]);

  // Activity search
  const [activitySearch, setActivitySearch] = useState('');
  const [searchResults, setSearchResults] = useState<ActivitySpot[]>([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: listData, error } = await supabase
        .from('curated_lists')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !listData) {
        toast.error('List not found');
        navigate('/admin/lists');
        return;
      }
      setTitle(listData.title);
      setSlug(listData.slug);
      setDescription(listData.description || '');
      setAuthorName(listData.author_name || '');
      setAuthorType((listData.author_type as AuthorType) || '');
      setCoverImageUrl(listData.cover_image_url || '');
      setIsPublished(listData.is_published ?? false);
      setSlugManual(true); // treat existing slug as manually set

      // Fetch items
      const { data: itemsData } = await supabase
        .from('curated_list_items')
        .select(`
          activity_id,
          sort_order,
          note,
          activity:activity_id (id, name, imageurlthumb, location_address, min_price, max_price)
        `)
        .eq('list_id', id)
        .order('sort_order', { ascending: true });

      if (itemsData) {
        const items: ListItem[] = (itemsData as any[])
          .filter(row => row.activity !== null)
          .map(row => ({
            activity_id: row.activity_id,
            name: row.activity.name,
            imageurlthumb: row.activity.imageurlthumb,
            sort_order: row.sort_order,
            note: row.note || '',
          }));
        setListItems(items);
      }
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
      const { data } = await supabase
        .from('activityspots')
        .select('id, name, imageurlthumb, location_address, min_price, max_price')
        .ilike('name', `%${activitySearch}%`)
        .limit(20);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [activitySearch]);

  // ---------------------------------------------------------------------------
  // Add activity to list
  // ---------------------------------------------------------------------------
  const addActivity = (activity: ActivitySpot) => {
    if (listItems.some(i => i.activity_id === activity.id)) {
      toast.error('Activity already in list');
      return;
    }
    const newItem: ListItem = {
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
      let listId = id;

      if (isNew) {
        const { data, error } = await supabase
          .from('curated_lists')
          .insert({
            slug,
            title,
            description: description || null,
            author_name: authorName || null,
            author_type: authorType || null,
            cover_image_url: coverImageUrl || null,
            is_published: isPublished,
          })
          .select('id')
          .single();
        if (error) throw error;
        listId = data.id;
      } else {
        const { error } = await supabase
          .from('curated_lists')
          .update({
            slug,
            title,
            description: description || null,
            author_name: authorName || null,
            author_type: authorType || null,
            cover_image_url: coverImageUrl || null,
            is_published: isPublished,
          })
          .eq('id', id);
        if (error) throw error;
      }

      // Replace all list items
      if (listId) {
        await supabase.from('curated_list_items').delete().eq('list_id', listId);

        if (listItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('curated_list_items')
            .insert(
              listItems.map(item => ({
                list_id: listId,
                activity_id: item.activity_id,
                sort_order: item.sort_order,
                note: item.note || null,
              })),
            );
          if (itemsError) throw itemsError;
        }
      }

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
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin/lists')} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? 'New List' : 'Edit List'}</h1>
        </div>

        <div className="space-y-6">
          {/* ── List metadata form ── */}
          <div className="p-6 border rounded-lg bg-card space-y-4">
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
                  onChange={(e) => setAuthorType(e.target.value as AuthorType)}
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
          <div className="p-6 border rounded-lg bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Add activities</h2>

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
              <div className="border rounded-lg overflow-hidden divide-y max-h-64 overflow-y-auto">
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
          <div className="p-6 border rounded-lg bg-card space-y-4">
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
      </main>

      <Footer />
    </div>
  );
}
