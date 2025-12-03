import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { MapPin, Locate, Upload, X, Camera, Link as LinkIcon, Sparkles, ImageIcon, Plus, Map, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from '@/i18n/LanguageContext';

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
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [autoFillUrl, setAutoFillUrl] = useState('');
  const [autoFillImages, setAutoFillImages] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoLinkDialogOpen, setPhotoLinkDialogOpen] = useState(false);
  const autoFillImageInputRef = useRef<HTMLInputElement>(null);
  const autoFillCameraInputRef = useRef<HTMLInputElement>(null);
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
    kidsActivityKit: false,
    kidsCorner: false,
    playroom: false,
    imageurlthumb: '',
    urlmoreinfo: '',
    durationMinutes: 60,
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

    if (imageFiles.length + files.length > 5) {
      toast.error('You can upload maximum 5 images');
      return;
    }

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

    setImageFiles(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addPhotoFromLink = () => {
    if (formData.imageurlthumb && !imagePreviews.includes(formData.imageurlthumb)) {
      setImagePreviews(prev => [...prev, formData.imageurlthumb]);
    }
    setPhotoLinkDialogOpen(false);
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

      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages();
      }

      // Add photo link URL if provided
      if (formData.imageurlthumb && !imageUrls.includes(formData.imageurlthumb)) {
        imageUrls.push(formData.imageurlthumb);
      }

      const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

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
        kidAmenities: {
          kidsActivityKit: formData.kidsActivityKit || null,
          kidsCorner: formData.kidsCorner || null,
          playroom: formData.playroom || null
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
        imageurlthumb: imageUrl,
        images: imageUrls.length > 0 ? imageUrls : null,
        urlmoreinfo: formData.urlmoreinfo || null,
        schemaVersion: '1.0.0'
      };

      // Determine source based on auth status
      const { data: { session } } = await supabase.auth.getSession();
      const source = session?.user ? 'user' : 'anonymous';

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
        foodvenue_kidamenities: formData.kidsActivityKit || null,
        foodvenue_kidcorner: formData.kidsCorner || null,
        foodvenue_kidmenu: formData.playroom || null,
        schedule_openinghours: null,
        duration_minutes: null,
        imageurlthumb: imageUrl,
        urlmoreinfo: formData.urlmoreinfo || null,
        trail_lengthkm: null,
        trail_durationminutes: null,
        trail_routetype: null,
        event_starttime: null,
        event_endtime: null,
        schema_version: '1.0.0',
        source,
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

      toast.success(t.contribute.successMessage);
      
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
        kidsActivityKit: false,
        kidsCorner: false,
        playroom: false,
        imageurlthumb: '',
        urlmoreinfo: '',
        durationMinutes: 60,
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

  const handleAutoFillImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAutoFillImages(files);
    }
  };

  const handleAutoFill = async () => {
    if (!autoFillUrl && autoFillImages.length === 0) {
      toast.error('Please provide a URL or select images');
      return;
    }

    setParsing(true);
    try {
      let imageUrls: string[] = [];

      if (autoFillImages.length > 0) {
        for (const file of autoFillImages) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          imageUrls.push(await base64Promise);
        }
      }

      const response = await supabase.functions.invoke('parse-activity-info', {
        body: {
          url: autoFillUrl || null,
          images: imageUrls.length > 0 ? imageUrls : null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to parse information');
      }

      const parsedData = response.data?.data;
      if (!parsedData) {
        throw new Error('No data received from parser');
      }

      setFormData(prev => ({
        ...prev,
        name: parsedData.name || prev.name,
        description: parsedData.description || prev.description,
        activityType: parsedData.activityType || prev.activityType,
        ageBuckets: parsedData.ageBuckets || prev.ageBuckets,
        minPrice: parsedData.minPrice !== null ? parsedData.minPrice.toString() : prev.minPrice,
        maxPrice: parsedData.maxPrice !== null ? parsedData.maxPrice.toString() : prev.maxPrice,
        address: parsedData.address || prev.address,
        environment: parsedData.environment || prev.environment,
        wheelchair: parsedData.wheelchair ?? prev.wheelchair,
        stroller: parsedData.stroller ?? prev.stroller,
        restrooms: parsedData.restrooms ?? prev.restrooms,
        changingTable: parsedData.changingTable ?? prev.changingTable,
        urlmoreinfo: parsedData.urlmoreinfo || autoFillUrl || prev.urlmoreinfo,
      }));

      toast.success(t.contribute.successMessage);
      setDialogOpen(false);
      setAutoFillUrl('');
      setAutoFillImages([]);
    } catch (error: any) {
      console.error('Auto-fill error:', error);
      toast.error(error.message || 'Failed to parse information');
    } finally {
      setParsing(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.contribute.title}</h1>
          <p className="text-muted-foreground mb-4">
            {t.contribute.subtitle}
          </p>
          
          {/* Auto-fill buttons */}
          <div className="flex flex-wrap gap-2">
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) {
                setAutoFillUrl('');
                setAutoFillImages([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setAutoFillUrl('');
                  setAutoFillImages([]);
                }}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {t.contribute.autoFillFromLink}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t.contribute.autoFillTitle}</DialogTitle>
                  <DialogDescription>
                    {t.contribute.autoFillDescription}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="autofill-url">{t.contribute.websiteUrl}</Label>
                    <div className="relative mt-2">
                      <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="autofill-url"
                        type="url"
                        placeholder="https://example.com/activity"
                        value={autoFillUrl}
                        onChange={(e) => setAutoFillUrl(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleAutoFill} 
                    disabled={parsing || !autoFillUrl}
                    className="w-full"
                  >
                    {parsing ? t.contribute.parsing : t.contribute.parseInfo}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Input
              ref={autoFillImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAutoFillImageSelect}
              className="hidden"
            />
            <Input
              ref={autoFillCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleAutoFillImageSelect}
              className="hidden"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {t.contribute.autoFillFromPhoto}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => autoFillImageInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  {t.contribute.fromDisk || 'From disk'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => autoFillCameraInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" />
                  {t.contribute.takePhotoCamera || 'Take a photo'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Show selected auto-fill images and parse button */}
          {autoFillImages.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground mb-2">
                {autoFillImages.length} {t.contribute.photosSelected}
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAutoFill} 
                  disabled={parsing}
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {parsing ? t.contribute.parsing : t.contribute.parseInfo}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAutoFillImages([])}
                >
                  {t.common.cancel}
                </Button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Section */}
          <div className="space-y-4 p-6 border rounded-lg bg-card">
            {/* Name */}
            <div>
              <Label htmlFor="name">{t.contribute.activityName} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t.contribute.activityNamePlaceholder}
                required
              />
            </div>

            {/* Address input */}
            <div>
              <Label htmlFor="address">{t.contribute.address} *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={t.contribute.addressPlaceholder}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* GPS and Map buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                disabled={locating}
              >
                <Locate className="w-4 h-4 mr-2" />
                {locating ? t.common.loading : t.contribute.useMyLocation}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleUseMyLocation}
                disabled={locating}
              >
                <Map className="w-4 h-4 mr-2" />
                {t.contribute.openMap}
              </Button>
            </div>
            {formData.lat && formData.lon && (
              <p className="text-xs text-muted-foreground">
                {t.contribute.coordinates}: {formData.lat.toFixed(6)}, {formData.lon.toFixed(6)}
              </p>
            )}

            {/* Add Photo button */}
            <div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading || imagePreviews.length >= 5}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t.contribute.addPhoto}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    {t.contribute.uploadFromDevice}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" />
                    {t.contribute.takePhoto}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPhotoLinkDialogOpen(true)}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    {t.contribute.photoLink}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
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
              <p className="text-xs text-muted-foreground mt-1">
                {t.contribute.maxPhotos}
              </p>
            </div>

            {/* Photo Link Dialog */}
            <Dialog open={photoLinkDialogOpen} onOpenChange={setPhotoLinkDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t.contribute.photoLink}</DialogTitle>
                  <DialogDescription>
                    {t.contribute.photoLinkDescription}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="photo-url">{t.contribute.imageUrl}</Label>
                    <Input
                      id="photo-url"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.imageurlthumb}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageurlthumb: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={addPhotoFromLink}
                    disabled={!formData.imageurlthumb}
                    className="w-full"
                  >
                    {t.contribute.addPhotoFromLink}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Accessibility & Kid Amenities - Two Columns */}
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-3">{t.contribute.accessibilityAndFacilities}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Kid Amenities */}
                <div>
                  <Label className="mb-2 block">{t.contribute.kidAmenities}</Label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.kidsActivityKit}
                        onChange={(e) => setFormData(prev => ({ ...prev, kidsActivityKit: e.target.checked }))}
                        className="w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">{t.contribute.kidsActivityKit}</span>
                        <p className="text-xs text-muted-foreground">{t.contribute.kidsActivityKitDesc}</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.kidsCorner}
                        onChange={(e) => setFormData(prev => ({ ...prev, kidsCorner: e.target.checked }))}
                        className="w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">{t.contribute.kidsCorner}</span>
                        <p className="text-xs text-muted-foreground">{t.contribute.kidsCornerDesc}</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.playroom}
                        onChange={(e) => setFormData(prev => ({ ...prev, playroom: e.target.checked }))}
                        className="w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-medium">{t.contribute.playroom}</span>
                        <p className="text-xs text-muted-foreground">{t.contribute.playroomDesc}</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Right Column: Accessibility & Facilities */}
                <div>
                  <Label className="mb-2 block">{t.contribute.accessibilityFacilities}</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.wheelchair}
                        onChange={(e) => setFormData(prev => ({ ...prev, wheelchair: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t.contribute.wheelchairAccessible}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.stroller}
                        onChange={(e) => setFormData(prev => ({ ...prev, stroller: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t.contribute.strollerFriendly}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.restrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, restrooms: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t.contribute.restrooms}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.changingTable}
                        onChange={(e) => setFormData(prev => ({ ...prev, changingTable: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{t.contribute.changingTable}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Duration Slider */}
            <div>
              <Label>{t.contribute.duration}</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  value={[formData.durationMinutes]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, durationMinutes: value[0] }))}
                  min={15}
                  max={480}
                  step={15}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-[80px]">
                  {formData.durationMinutes} {t.contribute.durationMinutes}
                </span>
              </div>
            </div>

            {/* Notes (3 lines) */}
            <div>
              <Label htmlFor="description">{t.contribute.notes}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t.contribute.notesPlaceholder}
                rows={3}
              />
            </div>

            {/* Detailed Section (Collapsible) - Before Save Button */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" type="button">
                  {t.contribute.detailedInfo}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 p-6 border rounded-lg bg-card">
                {/* Category */}
                <div>
                  <Label>{t.contribute.category}</Label>
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

                {/* Environment */}
                <div>
                  <Label>{t.contribute.environment}</Label>
                  <div className="flex gap-2 mt-2">
                    {ENVIRONMENTS.map(env => (
                      <Button
                        key={env}
                        type="button"
                        variant={formData.environment === env ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, environment: env }))}
                      >
                        {env === 'inside' ? t.contribute.indoor : env === 'outside' ? t.contribute.outdoor : t.contribute.both}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Age Groups */}
                <div>
                  <Label>{t.contribute.ageGroups}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AGE_BUCKETS.map(age => (
                      <Button
                        key={age}
                        type="button"
                        variant={formData.ageBuckets.includes(age) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleArrayField('ageBuckets', age)}
                      >
                        {age}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minPrice">{t.contribute.minPrice}</Label>
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
                    <Label htmlFor="maxPrice">{t.contribute.maxPrice}</Label>
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

                {/* More Info URL */}
                <div>
                  <Label htmlFor="urlmoreinfo">{t.contribute.moreInfo}</Label>
                  <Input
                    id="urlmoreinfo"
                    type="url"
                    value={formData.urlmoreinfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, urlmoreinfo: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Save Button after Detailed Section */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={submitting || uploading}
            >
              {submitting ? t.contribute.submitting : t.contribute.submitActivity}
            </Button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
