import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { curatedListsService, type CuratedList } from '@/services';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AUTHOR_TYPE_LABELS: Record<string, string> = {
  editor: '✏️ Editor',
  municipality: '🏛️ Municipality',
  partner: '🤝 Partner',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CuratedLists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<CuratedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      try {
        const data = await curatedListsService.listPublished();
        setLists(data);
      } catch {
        toast.error('Failed to load lists');
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Curated Lists</h1>
          <p className="text-muted-foreground">
            Hand-picked activity filters from editors and local experts. Open one to browse the main activity view with that list applied.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card animate-pulse overflow-hidden">
                <div className="h-48 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No curated activity filters published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <Card
                key={list.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/activities?list=${list.slug}`)}
              >
                {/* Cover image */}
                {list.cover_image_url ? (
                  <img
                    src={list.cover_image_url}
                    alt={list.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-5xl">📋</span>
                  </div>
                )}

                <CardContent className="p-4">
                  <h3 className="font-semibold text-base mb-1 line-clamp-2">{list.title}</h3>

                  {list.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {list.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    {list.author_name && (
                      <p className="text-xs text-muted-foreground">by {list.author_name}</p>
                    )}
                    {list.author_type && (
                      <Badge variant="secondary" className="text-xs">
                        {AUTHOR_TYPE_LABELS[list.author_type] ?? list.author_type}
                      </Badge>
                    )}
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
