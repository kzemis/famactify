import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, MapPin, Euro, Users, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

interface ActivitySpot {
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
  accessibility_wheelchair: boolean | null;
  accessibility_stroller: boolean | null;
  facilities_restrooms: boolean | null;
  foodvenue_kidamenities: boolean | null;
  foodvenue_kidcorner: boolean | null;
  foodvenue_kidmenu: boolean | null;
  source: string | null;
  created_at: string;
  json: any;
}

export default function CommunityActivities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivitySpot[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivitySpot[]>([]);
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
      .channel('activityspots-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activityspots'
        },
        (payload) => {
          console.log('New activity added:', payload);
          setActivities(prev => [payload.new as ActivitySpot, ...prev]);
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
        .from('activityspots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
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

  const getPriceDisplay = (activity: ActivitySpot) => {
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
            <h1 className="text-4xl font-bold mb-2">Community Activities</h1>
            <p className="text-muted-foreground">
              Discover family-friendly activities contributed by our community
            </p>
          </div>
          <Button onClick={() => navigate('/contribute')} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Contribute Activity
          </Button>
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
          Showing {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
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
            <p className="text-muted-foreground text-lg mb-4">
              No activities found matching your filters
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
              <Card key={activity.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Image or Carousel */}
                {(() => {
                  const images = activity.json?.images || [];
                  const hasMultipleImages = images.length > 1;
                  const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;

                  if (hasMultipleImages) {
                    return (
                      <div className="h-48 relative">
                        <Carousel className="w-full h-full">
                          <CarouselContent>
                            {images.map((imageUrl, idx) => (
                              <CarouselItem key={idx}>
                                <div 
                                  className="h-48 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openLightbox(images, idx)}
                                >
                                  <img 
                                    src={imageUrl} 
                                    alt={`${activity.name} - Image ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </Carousel>
                      </div>
                    );
                  } else if (displayImage) {
                    return (
                      <div 
                        className="h-48 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openLightbox([displayImage], 0)}
                      >
                        <img 
                          src={displayImage} 
                          alt={activity.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="h-48 bg-muted flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground" />
                      </div>
                    );
                  }
                })()}

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

                  {/* Kid Amenities */}
                  {(activity.foodvenue_kidamenities || activity.foodvenue_kidcorner || activity.foodvenue_kidmenu) && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Bērnu ērtības:</span>
                      <div className="flex flex-wrap gap-1">
                        {activity.foodvenue_kidamenities && (
                          <Badge variant="outline" className="text-xs">🎨 Activity Kit</Badge>
                        )}
                        {activity.foodvenue_kidcorner && (
                          <Badge variant="outline" className="text-xs">🧸 Kids Corner</Badge>
                        )}
                        {activity.foodvenue_kidmenu && (
                          <Badge variant="outline" className="text-xs">🎪 Playroom</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accessibility Icons */}
                  <div className="flex gap-2 pt-2">
                    {activity.accessibility_wheelchair && (
                      <Badge variant="outline" className="text-xs">♿ Wheelchair</Badge>
                    )}
                    {activity.accessibility_stroller && (
                      <Badge variant="outline" className="text-xs">🚼 Stroller</Badge>
                    )}
                    {activity.facilities_restrooms && (
                      <Badge variant="outline" className="text-xs">🚻 Restrooms</Badge>
                    )}
                  </div>

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
