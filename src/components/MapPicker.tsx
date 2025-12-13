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

interface MapPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat: number | null | undefined;
  lon: number | null | undefined;
  onPick: (lat: number, lon: number) => void;
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

  // Sync internal state when props change or dialog opens
  useEffect(() => {
    if (open) {
      setTempLat(lat ?? null);
      setTempLon(lon ?? null);
    }
  }, [open, lat, lon]);

  const hasSelection = typeof tempLat === 'number' && typeof tempLon === 'number';

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
            }}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (typeof tempLat === 'number' && typeof tempLon === 'number') {
                onPick(tempLat, tempLon);
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

