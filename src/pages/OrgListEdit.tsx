/**
 * OrgListEdit — Create or edit a curated list as an organization.
 * Similar to AdminListEdit but:
 *  - sets created_by = user.id on insert
 *  - auto-fills author_name / author_type from the org profile
 *  - only allows editing lists owned by the current user
 *  - navigates back to /org/dashboard after save
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Search, MapPin, Globe } from 'lucide-react';
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

interface OrgProfile {
  org_name: string;
  org_type: 'municipality' | 'partner';
  logo_url: string | null;
  website_url: string | null;
  verified: boolean;
}

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
export default function OrgListEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;

  const [user, setUser] = useState<any>(null);
  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Items
  const [listItems, setListItems] = useState<ListItem[]>([]);

  // Activity search
  const [activitySearch, setActivitySearch] = useState('');
  const [searchResults, setSearchResults] = useState<ActivitySpot[]>([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Init: auth + org profile + (if editing) load existing list
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);

      // Check org profile
      const { data: orgData } = await (supabase as any)
        .from('org_profiles')
        .select('org_name, org_type, logo_url, website_url, verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!orgData) {
        toast.error('You need to register an organization profile first.');
        navigate('/org/setup');
        return;
      }
      setOrgProfile(orgData);

      // Load existing list (edit mode)
      if (!isNew && id) {
        const { data: listData, error } = await supabase
          .from('curated_lists')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !listData) {
          toast.error('List not found');
          navigate('/org/dashboard');
          return;
        }

        // Verify ownership
        if ((listData as any).created_by !== user.id) {
          toast.error('You do not have permission to edit this list');
          navigate('/org/dashboard');
          return;
        }

        setTitle(listData.title);
        setSlug(listData.slug);
        setDescription(listData.description || '');
        setCoverImageUrl(listData.cover_image_url || '');
        setIsPublished(listData.is_published ?? false);
        setSlugManual(true);

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
      }

      setLoading(false);
    };
    init();
  }, [id]);

  // ---------------------------------------------------------------------------
  // Auto-generate slug
  // ---------------------------------------------------------------------------
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManual) setSlug(slugify(val));
  };

  // ---------------------------------------------------------------------------
  // Activity search (debounced)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activitySearch.trim()) { setSearchResults([]); return; }
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
  // List item management
  // ---------------------------------------------------------------------------
  const addActivity = (activity: ActivitySpot) => {
    if (listItems.some(i => i.activity_id === activity.id)) {
      toast.error('Already in list');
      return;
    }
    setListItems(prev => [...prev, {
      activity_id: activity.id,
      name: activity.name,
      imageurlthumb: activity.imageurlthumb,
      sort_order: prev.length,
      note: '',
    }]);
    setActivitySearch('');
    setSearchResults([]);
  };

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
      prev.filter(i => i.activity_id !== activityId)
        .map((item, i) => ({ ...item, sort_order: i })),
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
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!slug.trim()) { toast.error('Slug is required'); return; }
    if (!orgProfile) return;

    setSaving(true);
    try {
      let listId = id;

      const listPayload = {
        slug,
        title,
        description: description || null,
        author_name: orgProfile.org_name,
        author_type: orgProfile.org_type,
        cover_image_url: coverImageUrl || null,
        is_published: isPublished,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('curated_lists')
          .insert({ ...listPayload, created_by: user.id } as any)
          .select('id')
          .single();
        if (error) throw error;
        listId = data.id;
      } else {
        const { error } = await supabase
          .from('curated_lists')
          .update(listPayload)
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

      toast.success(isNew ? 'List created!' : 'List updated');
      navigate('/org/dashboard');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-4xl animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
        </main>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/org/dashboard')} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? 'New List' : 'Edit List'}</h1>
            {orgProfile && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {orgProfile.org_name}
                {orgProfile.verified && ' ✅'}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Org context banner */}
          {orgProfile && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm">
              {orgProfile.logo_url && (
                <img
                  src={orgProfile.logo_url}
                  alt={orgProfile.org_name}
                  className="w-8 h-8 rounded object-contain border bg-white p-0.5 shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <p className="text-muted-foreground">
                This list will be published as <span className="font-medium text-foreground">{orgProfile.org_name}</span>.
                Author name and type are set automatically from your org profile.
              </p>
              {orgProfile.website_url && (
                <a
                  href={orgProfile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Globe className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
              )}
            </div>
          )}

          {/* ── List metadata ── */}
          <div className="p-6 border rounded-xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              List details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Best parks for toddlers"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
                  placeholder="best-parks-for-toddlers"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Public URL: /lists/{slug || '…'}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="A short description of this collection"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cover-image">Cover image URL</Label>
              <Input
                id="cover-image"
                type="url"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="mt-1"
              />
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="mt-2 h-24 w-full object-cover rounded-lg"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-published"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="is-published">Publish immediately (visible to all users)</Label>
            </div>
          </div>

          {/* ── Activity picker ── */}
          <div className="p-6 border rounded-xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Add activities
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search activities to add…"
                value={activitySearch}
                onChange={e => setActivitySearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {searching && (
              <p className="text-sm text-muted-foreground">Searching…</p>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg overflow-hidden divide-y max-h-64 overflow-y-auto">
                {searchResults.map(activity => (
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
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {activity.location_address}
                        </p>
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
          <div className="p-6 border rounded-xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              List items ({listItems.length})
            </h2>

            {listItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No activities added yet. Search above to add some.
              </p>
            ) : (
              <div className="space-y-3">
                {listItems.map((item, index) => (
                  <Card key={item.activity_id}>
                    <CardContent className="p-3">
                      <div className="flex gap-3 items-start">
                        {item.imageurlthumb ? (
                          <img
                            src={item.imageurlthumb}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1.5 line-clamp-1">
                            <span className="text-muted-foreground mr-2 text-xs">{index + 1}.</span>
                            {item.name}
                          </p>
                          <Input
                            value={item.note}
                            onChange={e => updateNote(item.activity_id, e.target.value)}
                            placeholder="Optional note (shown on public page)…"
                            className="text-xs h-7"
                          />
                        </div>

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

          {/* ── Save ── */}
          <div className="flex gap-3 justify-end pb-4">
            <Button variant="outline" onClick={() => navigate('/org/dashboard')}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create list' : 'Save changes'}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
