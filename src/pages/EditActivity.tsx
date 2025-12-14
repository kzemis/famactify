import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Upload, X } from 'lucide-react';
import MapPicker from '@/components/MapPicker';
import MapView from '@/components/MapView';
import { useLanguage } from '@/i18n/LanguageContext';

interface ActivityRow {
  id: string;
  name: string;
  description: string | null;
  activity_type: string[];
  age_buckets: string[];
  min_price: number | null;
  max_price: number | null;
  location_address: string | null;
  location_lat: number | null;
  location_lon: number | null;
  location_environment: string | null;
  imageurlthumb: string | null;
  urlmoreinfo: string | null;
  json: any;
}

const EditActivity: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [row, setRow] = useState<ActivityRow | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<string[]>([]);
  const [ageBuckets, setAgeBuckets] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [environment, setEnvironment] = useState<string>('');
  const [moreInfo, setMoreInfo] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRow = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activityspots')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setRow(data as ActivityRow);
      setName(data.name || '');
      setDescription(data.description || '');
      setActivityType(data.activity_type || []);
      setAgeBuckets(data.age_buckets || []);
      setMinPrice(data.min_price != null ? String(data.min_price) : '');
      setMaxPrice(data.max_price != null ? String(data.max_price) : '');
      setAddress(data.location_address || '');
      setLat(data.location_lat);
      setLon(data.location_lon);
      setEnvironment(data.location_environment || '');
      setMoreInfo(data.urlmoreinfo || '');
      const existingImages: string[] = data.json?.images || [];
      const unique = Array.from(new Set([...(existingImages || []), data.imageurlthumb].filter(Boolean)));
      setImages(unique);
      setLoading(false);
    };
    if (id) fetchRow();
  }, [id]);

  useEffect(() => {
    // Storage health check: try listing bucket root
    (async () => {
      const { data, error } = await supabase.storage.from('famactify-images').list('', { limit: 1 });
      if (error) {
        toast.error(`Storage check failed: ${error.message}. Ensure bucket 'famactify-images' exists and insert/list policies allow your role.`);
      }
    })();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) toast.error('Some files were invalid (non-image or >5MB).');
    setNewImageFiles(prev => [...prev, ...valid]);
    // Generate previews
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeExistingImage = (url: string) => {
    setImages(prev => prev.filter(u => u !== url));
  };

  const removeNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async (): Promise<string[]> => {
    if (newImageFiles.length === 0) return [];
    const uploaded: string[] = [];
    for (const file of newImageFiles) {
      const ext = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${ext}`;
      const filePath = `${fileName}`;
      const { error } = await supabase.storage.from('famactify-images').upload(filePath, file, { contentType: file.type, upsert: true });
      if (error) {
        console.error('Storage upload error', error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from('famactify-images').getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) {
        toast.error('Public URL not available. Ensure bucket is public.');
        continue;
      }
      uploaded.push(publicUrl);
    }
    return uploaded;
  };

  const save = async () => {
    if (!row) return;
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const newUploaded = await uploadNewImages();
      const finalImages = Array.from(new Set([...(images || []), ...newUploaded]));
      const imageurlthumb = finalImages.length > 0 ? finalImages[0] : null;
      const json = {
        ...(row.json || {}),
        images: finalImages.length > 0 ? finalImages : null,
        location: {
          address,
          lat,
          lon,
          environment: environment || null
        }
      };
      const minP = minPrice ? parseFloat(minPrice) : null;
      const maxP = maxPrice ? parseFloat(maxPrice) : null;
      const { error } = await supabase
        .from('activityspots')
        .update({
          name,
          description: description || null,
          activity_type: activityType,
          age_buckets: ageBuckets,
          min_price: minP,
          max_price: maxP,
          location_address: address || null,
          location_lat: lat,
          location_lon: lon,
          location_environment: environment || null,
          urlmoreinfo: moreInfo || null,
          imageurlthumb,
          json
        })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Activity updated');
      navigate('/community');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Edit Activity</h1>
        {loading ? (
          <p>Loading...</p>
        ) : !row ? (
          <p className="text-destructive">Not found</p>
        ) : (
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="space-y-4 p-6 border rounded-lg bg-card">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="description">Notes</Label>
                <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address || ''} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="mt-3">
                <div className="relative w-full h-48">
                  <MapView
                    places={lat && lon ? [{ id: id!, name: name || 'Selected location', lat, lon }] : []}
                    center={lat && lon ? { lat, lon } : undefined}
                    className="h-48 rounded-lg border border-border"
                    overlay={
                      <Button variant="outline" size="sm" type="button" onClick={() => setMapOpen(true)} className="shadow-sm">
                        Edit map location
                      </Button>
                    }
                  />
                </div>
              </div>
              <Dialog open={mapOpen} onOpenChange={setMapOpen}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Edit location</DialogTitle>
                  </DialogHeader>
                  <div className="mt-2">
                    <MapPicker
                      open={mapOpen}
                      onOpenChange={setMapOpen}
                      lat={lat}
                      lon={lon}
                      onPick={(plat, plon, addr) => { setLat(plat); setLon(plon); if (addr) setAddress(addr); }}
                      title={'Edit location'}
                      description={'Click on the map to set the exact location.'}
                      nameForMarker={name || 'Selected location'}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* More info */}
              <div>
                <Label htmlFor="more-info">More info site</Label>
                <Input id="more-info" type="url" value={moreInfo} onChange={(e) => setMoreInfo(e.target.value)} />
              </div>

              {/* Duration and Price */}
              <div>
                <Label>Price range</Label>
                <Slider
                  value={[minPrice ? parseFloat(minPrice) : 0, maxPrice ? parseFloat(maxPrice) : 0]}
                  onValueChange={(vals) => { const [min, max] = vals as number[]; setMinPrice(String(min)); setMaxPrice(String(max)); }}
                  min={0}
                  max={200}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{minPrice || '0'}</span>
                  <span>{maxPrice || '0'}</span>
                </div>
              </div>

              {/* Images */}
              <div>
                <Label>Photos</Label>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {images.map((url) => (
                      <div key={url} className="relative">
                        <img src={url} alt="Activity" className="w-full h-32 object-cover rounded-lg border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => removeExistingImage(url)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {newImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {newImagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => removeNewImage(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                <Input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload from device
                  </Button>
                  <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> Take photo
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/community')}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
              </div>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default EditActivity;

