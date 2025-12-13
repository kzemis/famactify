import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import MapView from '@/components/MapView';
import { getFunctionsBaseUrl } from '@/lib/utils';

interface MapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number | null | undefined;
  lon: number | null | undefined;
  onPick: (lat: number, lon: number, address?: string) => void;
  title?: string;
  description?: string;
  nameForMarker?: string;
}

const MapPicker: React.FC<MapPickerProps> = ({
  open,
  onOpenChange,
  lat,
  lon,
  onPick,
  title = 'Select location',
  description = 'Click on the map to set the exact location.',
  nameForMarker = 'Selected location',
}) => {
  const [tempLat, setTempLat] = useState<number | null>(lat ?? null);
  const [tempLon, setTempLon] = useState<number | null>(lon ?? null);
  const [tempAddress, setTempAddress] = useState<string | undefined>(undefined);
  const [loadingAddr, setLoadingAddr] = useState(false);

  // Sync internal state when props change or dialog opens
  useEffect(() => {
    if (open) {
      setTempLat(lat ?? null);
      setTempLon(lon ?? null);
      setTempAddress(undefined);
    }
  }, [open, lat, lon]);

  const hasSelection = typeof tempLat === 'number' && typeof tempLon === 'number';

  async function reverseGeocode(lat: number, lon: number) {
    try {
      setLoadingAddr(true);
      const base = getFunctionsBaseUrl();
      const res = await fetch(`${base}/nominatim-proxy?lat=${lat}&lon=${lon}&zoom=18`);
      if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
      const data = await res.json();
      const addr = data?.display_name || data?.address?.road && data?.address?.city
        ? `${data.address.road}, ${data.address.city}`
        : undefined;
      setTempAddress(addr || data?.display_name);
    } catch (_) {
      setTempAddress(undefined);
    } finally {
      setLoadingAddr(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <MapView
            places={hasSelection ? [{ id: 'picked', name: nameForMarker, lat: tempLat!, lon: tempLon! }] : []}
            center={hasSelection ? { lat: tempLat!, lon: tempLon! } : undefined}
            onMapClick={(clat, clon) => {
              setTempLat(clat);
              setTempLon(clon);
              reverseGeocode(clat, clon);
            }}
          />
        </div>
        <div className="mt-2 text-sm text-muted-foreground min-h-[1.25rem]">
          {loadingAddr ? 'Fetching address…' : tempAddress || ''}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (typeof tempLat === 'number' && typeof tempLon === 'number') {
                onPick(tempLat, tempLon, tempAddress);
                onOpenChange(false);
              }
            }}
            disabled={!hasSelection}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapPicker;
