import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, MapPin, Euro, Users, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

interface ActivitySpotGenAI {
  id: string;
  name: string;
  description: string;
  activity_type: string[];
  age_buckets: string[];
  location_address: string | null;
  location_lat: number | null;
  location_lon: number | null;
  imageurlthumb: string | null;
  urlmoreinfo: string | null;
  min_price: number | null;
  max_price: number | null;
  location_environment: string | null;
  source: string | null;
  created_at: string;
  json: any;
}

export default function GeneratedActivities() {
  const [activities, setActivities] = useState<ActivitySpotGenAI[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivitySpotGenAI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAge, setSelectedAge] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const activityTypes = ['outdoor', 'indoor', 'museum', 'park', 'playground', 'sports', 'arts', 'educational', 'entertainment'];
  const ageBuckets = ['0-2', '3-5', '6-8', '9-12', '13+'];

  useEffect(() => {
    fetchActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activityspots-genai-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activityspots_genai'
        },
        (payload) => {
          console.log('New AI-generated activity added:', payload);
          setActivities(prev => [payload.new as ActivitySpotGenAI, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, searchQuery, selectedType, selectedAge]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activityspots_genai')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching AI-generated activities:', error);
      toast.error('Failed to load AI-generated activities');
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.location_address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Activity type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(activity =>
        activity.activity_type.includes(selectedType)
      );
    }

    // Age filter
    if (selectedAge !== 'all') {
      filtered = filtered.filter(activity =>
        activity.age_buckets.includes(selectedAge)
      );
    }

    setFilteredActivities(filtered);
  };

  const getPriceDisplay = (activity: ActivitySpotGenAI) => {
    if (!activity.min_price && !activity.max_price) return 'Free';
    if (activity.min_price === 0 && activity.max_price === 0) return 'Free';
    if (activity.min_price && activity.max_price) {
      return `€${activity.min_price} - €${activity.max_price}`;
    }
    if (activity.min_price) return `From €${activity.min_price}`;
    if (activity.max_price) return `Up to €${activity.max_price}`;
    return 'Price varies';
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold">AI-Generated Activities</h1>
            </div>
            <p className="text-muted-foreground">
              Activities discovered and suggested by AI for review and curation
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {activityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAge} onValueChange={setSelectedAge}>
            <SelectTrigger>
              <SelectValue placeholder="Age Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {ageBuckets.map(age => (
                <SelectItem key={age} value={age}>
                  {age} years
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredActivities.length} AI-generated {filteredActivities.length === 1 ? 'activity' : 'activities'}
        </div>

        {/* Activities Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              No AI-generated activities found
            </p>
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedAge('all');
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity) => (
              <Card key={activity.id} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/20">
                {/* AI Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-primary/90">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>

                {/* Image */}
                {activity.imageurlthumb ? (
                  <div 
                    className="h-48 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                    onClick={() => openLightbox([activity.imageurlthumb!], 0)}
                  >
                    <img 
                      src={activity.imageurlthumb} 
                      alt={activity.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center relative">
                    <Sparkles className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="line-clamp-2">{activity.name}</CardTitle>
                  {activity.description && (
                    <CardDescription className="line-clamp-2">
                      {activity.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Location */}
                  {activity.location_address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{activity.location_address}</span>
                    </div>
                  )}

                  {/* Environment */}
                  {activity.location_environment && (
                    <Badge variant="outline" className="text-xs">
                      {activity.location_environment}
                    </Badge>
                  )}

                  {/* Price */}
                  <div className="flex items-center gap-2 text-sm">
                    <Euro className="w-4 h-4 text-muted-foreground" />
                    <span>{getPriceDisplay(activity)}</span>
                  </div>

                  {/* Activity Types */}
                  <div className="flex flex-wrap gap-1">
                    {activity.activity_type.slice(0, 3).map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {activity.activity_type.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{activity.activity_type.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Age Groups */}
                  {activity.age_buckets.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{activity.age_buckets.join(', ')} years</span>
                    </div>
                  )}

                  {/* Official Website Link */}
                  {activity.urlmoreinfo && (
                    <div className="pt-2">
                      <Button
                        variant="link"
                        className="h-auto p-0 text-primary"
                        asChild
                      >
                        <a href={activity.urlmoreinfo} target="_blank" rel="noopener noreferrer">
                          Visit Official Website →
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Image counter */}
            {lightboxImages.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {lightboxImages.length}
              </div>
            )}

            {/* Previous button */}
            {lightboxImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={prevImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Current image */}
            <img
              src={lightboxImages[currentImageIndex]}
              alt={`Full size image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Next button */}
            {lightboxImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={nextImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
