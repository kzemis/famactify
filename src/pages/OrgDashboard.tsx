/**
 * OrgDashboard — Organization's curated lists management hub.
 * Shows only lists created by the current user (created_by = user.id).
 * If no org profile exists yet, prompts to register via OrgSetup.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Eye, EyeOff,
  Building2, Settings, Globe, ExternalLink, ChevronRight,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { authService, curatedListsService, type CuratedList, type OrgProfile } from '@/services';
import type { User } from '@supabase/supabase-js';

const ORG_TYPE_LABELS: Record<string, string> = {
  municipality: '🏛️ Municipality',
  partner: '🤝 Partner',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OrgDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) { navigate('/auth'); return; }
      setUser(currentUser);

      const orgData = await curatedListsService.getCurrentOrgProfile();
      setOrgProfile(orgData);

      const listsData = await curatedListsService.listForCurrentOrg();
      setLists(listsData);

      setLoading(false);
    };
    init();
  }, []);

  const togglePublish = async (list: CuratedList) => {
    const newValue = !list.is_published;
    try {
      await curatedListsService.setPublished(list.id, newValue);
      setLists(prev => prev.map(l => l.id === list.id ? { ...l, is_published: newValue } : l));
      toast.success(newValue ? 'List published' : 'Moved to drafts');
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteList = async (id: string) => {
    if (!confirm('Delete this list? This cannot be undone.')) return;
    try {
      await curatedListsService.deleteList(id);
      setLists(prev => prev.filter(l => l.id !== id));
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-5xl animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-xl" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </main>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // No org profile — onboarding prompt
  // ---------------------------------------------------------------------------
  if (!orgProfile) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="text-center py-20 space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">Register Your Organization</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Municipalities, parks, museums and partner organizations can publish curated activity
                collections visible to all FamActify families.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              {[
                { emoji: '📋', title: 'Create lists', desc: 'Curate themed collections of activities' },
                { emoji: '🌍', title: 'Reach families', desc: 'Lists are public and discoverable' },
                { emoji: '✅', title: 'Get verified', desc: 'Official orgs get a verified badge' },
              ].map(f => (
                <div key={f.title} className="p-4 border rounded-xl bg-card">
                  <div className="text-2xl mb-2">{f.emoji}</div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => navigate('/org/setup')} size="lg">
              <Building2 className="w-4 h-4 mr-2" />
              Set up organization profile
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Dashboard with org profile + lists
  // ---------------------------------------------------------------------------
  const publishedCount = lists.filter(l => l.is_published).length;
  const draftCount = lists.length - publishedCount;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Org profile card */}
        <div className="flex flex-col sm:flex-row items-start gap-4 p-6 border rounded-xl bg-card mb-8">
          {orgProfile.logo_url ? (
            <img
              src={orgProfile.logo_url}
              alt={orgProfile.org_name}
              className="w-16 h-16 rounded-xl object-contain border bg-white p-1 shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold">{orgProfile.org_name}</h1>
              <Badge variant="secondary" className="text-xs">
                {ORG_TYPE_LABELS[orgProfile.org_type] ?? orgProfile.org_type}
              </Badge>
              {orgProfile.verified && (
                <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600">✅ Verified</Badge>
              )}
            </div>
            {orgProfile.description && (
              <p className="text-sm text-muted-foreground mb-2">{orgProfile.description}</p>
            )}
            {orgProfile.website_url && (
              <a
                href={orgProfile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Globe className="w-3 h-3" />
                {orgProfile.website_url.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/org/setup')}
            className="shrink-0"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit profile
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total lists', value: lists.length },
            { label: 'Published', value: publishedCount },
            { label: 'Drafts', value: draftCount },
          ].map(stat => (
            <div key={stat.label} className="p-4 border rounded-xl bg-card text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Hunts entry — quick link to the hunts dashboard */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/org/hunts')}
            className="w-full text-left rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 p-4 flex items-center gap-3 tap-highlight active:scale-[0.99] transition-transform"
          >
            <span className="text-3xl shrink-0">🔍</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-pink-800">City Games</p>
              <p className="text-xs text-pink-700/80 leading-snug">Create city game artifacts for your venue or city — human-authored or AI-assisted, source-backed, reviewed, then published.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-pink-700" />
          </button>
        </div>

        {/* Lists header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your curated lists</h2>
          <Button onClick={() => navigate('/org/lists/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New list
          </Button>
        </div>

        {/* Lists */}
        {lists.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-semibold mb-1">No lists yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first curated collection of family-friendly activities.
            </p>
            <Button onClick={() => navigate('/org/lists/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create first list
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map(list => (
              <Card key={list.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Publish dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      list.is_published ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                    }`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-sm">{list.title}</h3>
                        <Badge
                          variant={list.is_published ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {list.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        /lists/{list.slug}
                        {list.description ? ` · ${list.description.slice(0, 60)}${list.description.length > 60 ? '…' : ''}` : ''}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Preview */}
                      {list.is_published && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/lists/${list.slug}`)}
                          title="View public page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {/* Publish toggle */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePublish(list)}
                        title={list.is_published ? 'Move to drafts' : 'Publish'}
                      >
                        {list.is_published
                          ? <EyeOff className="w-4 h-4" />
                          : <Eye className="w-4 h-4" />
                        }
                      </Button>
                      {/* Edit */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/org/lists/${list.id}`)}
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
