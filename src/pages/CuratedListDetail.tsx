import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Euro, Globe, ExternalLink } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { cleanDisplayText } from '@/lib/text';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CuratedList {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  author_type: string | null;
  created_by: string | null;
}

interface OrgProfile {
  org_name: string;
  org_type: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  verified: boolean;
}

interface ActivitySpot {
  id: string;
  name: string;
  description: string | null;
  imageurlthumb: string | null;
  min_price: number | null;
  max_price: number | null;
  location_address: string | null;
  age_buckets: string[];
  activity_type: string[];
  urlmoreinfo: string | null;
  urlmoreinfo_status: string | null;
}

interface ListItemWithActivity {
  id: string;
  sort_order: number;
  note: string | null;
  activity: ActivitySpot;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(min: number | null, max: number | null): string {
  if (!min && !max) return 'Free';
  if (min === 0 && max === 0) return 'Free';
  if (min && max) return `$${min}–$${max}`;
  if (min) return `From $${min}`;
  if (max) return `Up to $${max}`;
  return 'Price varies';
}

const AUTHOR_TYPE_LABELS: Record<string, string> = {
  editor: '✏️ Editor',
  municipality: '🏛️ Municipality',
  partner: '🤝 Partner',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CuratedListDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<CuratedList | null>(null);
  const [items, setItems] = useState<ListItemWithActivity[]>([]);
  const [orgProfile, setOrgProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchList = async () => {
      setLoading(true);

      // Fetch the list
      const { data: listData, error: listError } = await supabase
        .from('curated_lists')
        .select('id, slug, title, description, cover_image_url, author_name, author_type, created_by')
        .eq('slug', slug)
        .single();

      if (listError || !listData) {
        toast.error('List not found');
        navigate('/lists');
        return;
      }
      setList(listData as CuratedList);

      // Fetch org profile if list has a creator
      if ((listData as any).created_by) {
        const { data: orgData } = await (supabase as any)
          .from('org_profiles')
          .select('org_name, org_type, description, logo_url, website_url, verified')
          .eq('user_id', (listData as any).created_by)
          .maybeSingle();
        if (orgData) setOrgProfile(orgData);
      }

      // Fetch items with activity data
      const { data: itemsData, error: itemsError } = await supabase
        .from('curated_list_items')
        .select(`
          id,
          sort_order,
          note,
          activity:activity_id (
            id, name, description, imageurlthumb,
            min_price, max_price, location_address,
            age_buckets, activity_type, urlmoreinfo, urlmoreinfo_status
          )
        `)
        .eq('list_id', listData.id)
        .order('sort_order', { ascending: true });

      if (itemsError) {
        toast.error('Failed to load activities in this list');
      } else {
        // Filter out items with no activity (referential integrity edge cases)
        const valid = (itemsData || []).filter(
          (item): item is ListItemWithActivity => item.activity !== null,
        );
        setItems(valid);
      }
      setLoading(false);
    };
    fetchList();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/lists')} className="mb-6 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          All Lists
        </Button>

        {/* List header */}
        <div className="mb-8">
          {list.cover_image_url && (
            <img
              src={list.cover_image_url}
              alt={list.title}
              className="w-full h-56 object-cover rounded-xl mb-6"
            />
          )}
          <h1 className="text-3xl font-bold mb-2">{list.title}</h1>
          {list.description && (
            <p className="text-muted-foreground text-base mb-4">{list.description}</p>
          )}
          <div className="flex items-center gap-3">
            {list.author_name && (
              <p className="text-sm text-muted-foreground">Curated by {list.author_name}</p>
            )}
            {list.author_type && (
              <Badge variant="secondary" className="text-xs">
                {AUTHOR_TYPE_LABELS[list.author_type] ?? list.author_type}
              </Badge>
            )}
          </div>

          {/* Org profile card — shown when list has a registered org creator */}
          {orgProfile && (
            <div className="flex items-start gap-4 mt-5 p-4 border rounded-xl bg-muted/30">
              {orgProfile.logo_url && (
                <img
                  src={orgProfile.logo_url}
                  alt={orgProfile.org_name}
                  className="w-12 h-12 rounded-lg object-contain border bg-white p-0.5 shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{orgProfile.org_name}</p>
                  {orgProfile.verified && (
                    <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600">✅ Verified</Badge>
                  )}
                </div>
                {orgProfile.description && (
                  <p className="text-xs text-muted-foreground mb-1">{orgProfile.description}</p>
                )}
                {orgProfile.website_url && (
                  <a
                    href={orgProfile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline w-fit"
                  >
                    <Globe className="w-3 h-3" />
                    {orgProfile.website_url.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity count */}
        <p className="text-sm text-muted-foreground mb-6">
          {items.length} {items.length === 1 ? 'activity' : 'activities'} in this list
        </p>

        {/* Activity cards */}
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>This list is empty.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const { activity } = item;
              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow"
                >
                  {/* Index */}
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  {activity.imageurlthumb ? (
                    <img
                      src={activity.imageurlthumb}
                      alt={activity.name}
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-lg shrink-0 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 line-clamp-1">{activity.name}</h3>

                    {/* Editor note */}
                    {item.note && (
                      <p className="text-xs text-primary italic mb-1">"{item.note}"</p>
                    )}

                    {cleanDisplayText(activity.description) && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {cleanDisplayText(activity.description)}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 items-center">
                      {activity.location_address && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{activity.location_address}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Euro className="w-3 h-3" />
                        {formatPrice(activity.min_price, activity.max_price)}
                      </span>
                    </div>

                    {/* Activity types */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.activity_type.slice(0, 2).map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>

                    {activity.urlmoreinfo && activity.urlmoreinfo_status === 'ok' && (
                      <a
                        href={activity.urlmoreinfo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        Website →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
