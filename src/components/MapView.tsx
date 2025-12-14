import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths for Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type?: string;
  activityType?: string;
}

interface PathItem {
  id: string;
  lat: number;
  lon: number;
}

interface MapViewProps {
  places: Place[];
  center?: { lat: number; lon: number };
  path?: PathItem[];
  onSelect?: (id: string) => void;
  getMarkerIcon?: (place: Place) => L.Icon;
  onMapClick?: (lat: number, lon: number) => void;
  overlay?: React.ReactNode;
  className?: string; // optional style override for wrapper
}

const MapView: React.FC<MapViewProps> = ({
  places,
  center = { lat: 56.9496, lon: 24.1052 },
  path,
  onSelect,
  getMarkerIcon,
  onMapClick,
  overlay,
  className,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pathLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
    }).setView([center.lat, center.lon], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    markersLayerRef.current = L.layerGroup().addTo(map);
    pathLayerRef.current = L.layerGroup().addTo(map);
    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current || !leafletRef.current) return;

    markersLayerRef.current.clearLayers();

    const validPlaces = places.filter(p => typeof p.lat === 'number' && typeof p.lon === 'number');
    const markerBounds: L.LatLngExpression[] = [];

    validPlaces.forEach((place) => {
      const icon = getMarkerIcon ? getMarkerIcon(place) : undefined;
      const marker = L.marker([place.lat, place.lon], icon ? { icon } : undefined);

      marker.bindPopup(`
        <strong>${place.name}</strong><br/>
        ${place.type || place.activityType || ''}
      `);

      if (onSelect) {
        marker.on('click', () => onSelect(place.id));
      }

      marker.addTo(markersLayerRef.current!);
      markerBounds.push([place.lat, place.lon]);
    });

    // Auto-fit bounds to markers if no path
    if (markerBounds.length > 1 && !path) {
      leafletRef.current.fitBounds(markerBounds);
    }
  }, [places, onSelect, getMarkerIcon, path]);

  // Update path
  useEffect(() => {
    if (!pathLayerRef.current || !leafletRef.current) return;

    pathLayerRef.current.clearLayers();

    if (!path || path.length < 2) return;

    const validPath = path.filter(p => typeof p.lat === 'number' && typeof p.lon === 'number');
    if (validPath.length < 2) return;

    const latlngs: L.LatLngExpression[] = validPath.map(p => [p.lat, p.lon]);

    // Create dashed polyline
    const polyline = L.polyline(latlngs, {
      color: '#0ea5e9',
      weight: 4,
      opacity: 0.8,
      dashArray: '6 8',
    });
    polyline.addTo(pathLayerRef.current);

    // Add numbered markers
    validPath.forEach((point, idx) => {
      const html = `
        <div style="
          width: 28px;
          height: 28px;
          background: #0ea5e9;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 0 0 3px white, 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${idx + 1}
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'session-order-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([point.lat, point.lon], { icon });

      if (onSelect) {
        marker.on('click', () => onSelect(point.id));
      }

      marker.addTo(pathLayerRef.current!);
    });

    // Fit bounds to path
    leafletRef.current.fitBounds(polyline.getBounds().pad(0.15));
  }, [path, onSelect]);

  // Recenter map when center prop changes (e.g., after GPS or selecting a point)
  useEffect(() => {
    if (leafletRef.current && typeof center?.lat === 'number' && typeof center?.lon === 'number') {
      leafletRef.current.setView([center.lat, center.lon], leafletRef.current.getZoom() || 12, {
        animate: true,
      });
    }
  }, [center?.lat, center?.lon]);

  return (
    <div className={`relative w-full h-full rounded-lg border border-border overflow-hidden ${className || ''} z-0`}>
      <div ref={mapRef} className="absolute inset-0 z-0" />
      {overlay && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <div className="absolute bottom-2 right-2 pointer-events-auto">
            {overlay}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
