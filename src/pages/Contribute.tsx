import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Locate, Upload, X, Camera } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

const ACTIVITY_TYPES = ['outdoor', 'indoor', 'museum', 'park', 'playground', 'sports', 'arts', 'educational', 'entertainment'];
const AGE_BUCKETS = ['0-2', '3-5', '6-8', '9-12', '13+'];
const ENVIRONMENTS = ['inside', 'outside', 'both'];

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${rand}` : `spot-${rand}`;
}

export default function Contribute() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activityType: [] as string[],
    ageBuckets: [] as string[],
    minPrice: '',
    maxPrice: '',
    address: '',
    lat: null as number | null,
    lon: null as number | null,
    environment: '',
    wheelchair: false,
    stroller: false,
    restrooms: false,
    changingTable: false,
    imageurlthumb: '',
    urlmoreinfo: '',
  });

  const toggleArrayField = (field: 'activityType' | 'ageBuckets', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate total number of images (max 5)
    if (imageFiles.length + files.length > 5) {
      toast.error('You can upload maximum 5 images');
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Add to existing files
    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Create previews for new files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('activity-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.name.length < 2) {
      toast.error('Name is required (min 2 characters)');
      return;
    }
    
    if (formData.activityType.length === 0) {
      toast.error('Please select at least one activity type');
      return;
    }
    
    if (!formData.address.trim() || formData.address.length < 3) {
      toast.error('Address is required (min 3 characters)');
      return;
    }

    const minP = formData.minPrice ? parseFloat(formData.minPrice) : null;
    const maxP = formData.maxPrice ? parseFloat(formData.maxPrice) : null;
    
    if (minP !== null && maxP !== null && minP > maxP) {
      toast.error('Minimum price cannot be greater than maximum price');
      return;
    }

    try {
      setSubmitting(true);

      // Upload images if selected
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages();
      }

      // Use first image as thumbnail for backward compatibility
      const imageUrl = imageUrls.length > 0 ? imageUrls[0] : formData.imageurlthumb;

      const id = slugify(formData.name);
      
      const json = {
        id,
        name: formData.name,
        description: formData.description || '',
        activityType: formData.activityType,
        ageBuckets: formData.ageBuckets,
        minPrice: minP,
        maxPrice: maxP,
        location: {
          address: formData.address,
          lat: formData.lat,
          lon: formData.lon,
          environment: formData.environment || null
        },
        accessibility: {
          wheelchair: formData.wheelchair || null,
          stroller: formData.stroller || null
        },
        facilities: {
          restrooms: formData.restrooms || null,
          changingTable: formData.changingTable || null
        },
        schedule: {
          openingHours: null
        },
        duration: {
          minutes: null
        },
        trail: {
          lengthKm: null,
          durationMinutes: null,
          routeType: null
        },
        event: {
          startTime: null,
          endTime: null
        },
        imageurlthumb: imageUrl || null,
        images: imageUrls.length > 0 ? imageUrls : null,
        urlmoreinfo: formData.urlmoreinfo || null,
        schemaVersion: '1.0.0'
      };

      const row = {
        id,
        name: formData.name,
        description: formData.description || '',
        activity_type: formData.activityType,
        age_buckets: formData.ageBuckets,
        min_price: minP,
        max_price: maxP,
        location_address: formData.address,
        location_lat: formData.lat,
        location_lon: formData.lon,
        location_environment: formData.environment || null,
        accessibility_wheelchair: formData.wheelchair || null,
        accessibility_stroller: formData.stroller || null,
        facilities_restrooms: formData.restrooms || null,
        facilities_changingtable: formData.changingTable || null,
        schedule_openinghours: null,
        duration_minutes: null,
        imageurlthumb: imageUrl || null,
        urlmoreinfo: formData.urlmoreinfo || null,
        trail_lengthkm: null,
        trail_durationminutes: null,
        trail_routetype: null,
        event_starttime: null,
        event_endtime: null,
        schema_version: '1.0.0',
        json
      };

      const { error } = await supabase
        .from('activityspots')
        .insert(row);

      if (error) {
        console.error('Insert error:', error);
        toast.error(`Failed to submit: ${error.message}`);
        return;
      }

      toast.success('Activity submitted successfully! Thank you for your contribution.');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        activityType: [],
        ageBuckets: [],
        minPrice: '',
        maxPrice: '',
        address: '',
        lat: null,
        lon: null,
        environment: '',
        wheelchair: false,
        stroller: false,
        restrooms: false,
        changingTable: false,
        imageurlthumb: '',
        urlmoreinfo: '',
      });
      setImageFiles([]);
      setImagePreviews([]);

    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude
        }));
        setLocating(false);
        toast.success(`Location set: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      },
      (error) => {
        setLocating(false);
        toast.error(`Failed to get location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };


  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Contribute an Activity</h1>
          <p className="text-muted-foreground">
            Help grow our database of family-friendly activities. Share a spot, event, or activity that families will love.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4 p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            
            <div>
              <Label htmlFor="name">Activity Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Central Park Playground"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what makes this activity special..."
                rows={4}
              />
            </div>

            <div>
              <Label>Activity Type *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ACTIVITY_TYPES.map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.activityType.includes(type) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayField('activityType', type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  className="pl-10"
                  required
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                >
                  <Locate className="w-4 h-4 mr-2" />
                  {locating ? 'Getting location...' : 'Use My Location'}
                </Button>
              </div>
              {formData.lat && formData.lon && (
                <p className="text-xs text-muted-foreground mt-2">
                  Coordinates: {formData.lat.toFixed(6)}, {formData.lon.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <Label>Environment</Label>
              <div className="flex gap-2 mt-2">
                {ENVIRONMENTS.map(env => (
                  <Button
                    key={env}
                    type="button"
                    variant={formData.environment === env ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, environment: env }))}
                  >
                    {env}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4 p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold">Additional Details</h2>

            <div>
              <Label>Suitable Age Groups</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AGE_BUCKETS.map(age => (
                  <Button
                    key={age}
                    type="button"
                    variant={formData.ageBuckets.includes(age) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayField('ageBuckets', age)}
                  >
                    {age} years
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minPrice">Min Price (€)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  step="0.01"
                  value={formData.minPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, minPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice">Max Price (€)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  step="0.01"
                  value={formData.maxPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="10.00"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Accessibility & Facilities</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.wheelchair}
                    onChange={(e) => setFormData(prev => ({ ...prev, wheelchair: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Wheelchair Accessible</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.stroller}
                    onChange={(e) => setFormData(prev => ({ ...prev, stroller: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Stroller Friendly</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.restrooms}
                    onChange={(e) => setFormData(prev => ({ ...prev, restrooms: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Restrooms Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.changingTable}
                    onChange={(e) => setFormData(prev => ({ ...prev, changingTable: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Changing Table</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="imageurlthumb">Image URL (optional)</Label>
              <Input
                id="imageurlthumb"
                type="url"
                value={formData.imageurlthumb}
                onChange={(e) => setFormData(prev => ({ ...prev, imageurlthumb: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label>Upload Photos (up to 5)</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    ref={fileInputRef}
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Input
                    ref={cameraInputRef}
                    id="camera-capture"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || imageFiles.length >= 5}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading || imageFiles.length >= 5}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  {imageFiles.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {imageFiles.length} photo{imageFiles.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Take photos with camera or upload from gallery. Max 5 images, 5MB each.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="urlmoreinfo">More Info URL</Label>
              <Input
                id="urlmoreinfo"
                type="url"
                value={formData.urlmoreinfo}
                onChange={(e) => setFormData(prev => ({ ...prev, urlmoreinfo: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={submitting || uploading}
            className="w-full"
            size="lg"
          >
            {submitting ? 'Submitting...' : uploading ? 'Uploading image...' : 'Submit Activity'}
          </Button>
        </form>
      </main>
    </div>
  );
}
