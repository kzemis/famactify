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
  // Rich popup card data (optional — falls back to name-only if absent)
  imageurlthumb?: string | null;
  description?: string | null;
  location_address?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  age_buckets?: string[] | null;
  urlmoreinfo?: string | null;
}

interface PathItem {
  id: string;
  lat: number;
  lon: number;
  name?: string;  // shown as label beneath the numbered pin
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
  /** User's GPS location — renders a blue "you are here" dot */
  userLocation?: { lat: number; lon: number } | null;
  /** If set alongside userLocation, draws a radius circle (km) */
  nearbyKm?: number | null;
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
  userLocation,
  nearbyKm,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pathLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const nearbyCircleRef = useRef<L.Circle | null>(null);

  // Keep callback refs stable so the markers effect doesn't re-fire (and re-fitBounds)
  // every time the parent re-renders with a new inline function reference.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const getMarkerIconRef = useRef(getMarkerIcon);
  getMarkerIconRef.current = getMarkerIcon;

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
      const icon = getMarkerIconRef.current ? getMarkerIconRef.current(place) : undefined;
      const marker = L.marker([place.lat, place.lon], icon ? { icon } : undefined);

      // Rich popup card — inline styles (Leaflet popup is plain DOM, no Tailwind)
      const priceHtml = (() => {
        if (place.min_price === 0 || place.min_price === null && place.max_price === null) return 'Free';
        if (place.min_price !== null && place.min_price !== undefined) return `From $${place.min_price}`;
        if (place.max_price !== null && place.max_price !== undefined) return `Up to $${place.max_price}`;
        return null;
      })();

      const popupHtml = `
        <div style="min-width:220px;max-width:280px;font-family:system-ui,sans-serif;line-height:1.4;overflow:hidden;">
          ${place.imageurlthumb
            ? `<div style="margin:-12px -20px 10px;overflow:hidden;height:140px;">
                <img src="${place.imageurlthumb}" alt="" style="width:100%;height:140px;object-fit:cover;display:block;" />
               </div>`
            : ''}
          <strong style="font-size:14px;display:block;margin-bottom:6px;color:#111;">${place.name}</strong>
          ${place.location_address
            ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">📍 ${place.location_address}</div>`
            : ''}
          ${priceHtml
            ? `<div style="font-size:12px;color:#666;margin-bottom:4px;">💰 ${priceHtml}</div>`
            : ''}
          ${place.age_buckets?.length
            ? `<div style="font-size:12px;color:#666;margin-bottom:6px;">👶 ${place.age_buckets.join(', ')} yrs</div>`
            : ''}
          ${place.urlmoreinfo
            ? `<a href="${place.urlmoreinfo}" target="_blank" rel="noopener noreferrer"
                style="font-size:12px;color:#ec4899;text-decoration:none;font-weight:500;">
                More info →
               </a>`
            : ''}
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      // Name tooltip on hover — shows activity name without needing to click
      marker.bindTooltip(place.name, {
        direction: 'right',
        offset: [10, 0],
        className: 'activity-name-tooltip',
      });

      // After popup opens, call invalidateSize so the map tiles don't misalign
      marker.on('popupopen', () => {
        leafletRef.current?.invalidateSize();
      });

      if (onSelectRef.current) {
        marker.on('click', () => onSelectRef.current?.(place.id));
      }

      marker.addTo(markersLayerRef.current!);
      markerBounds.push([place.lat, place.lon]);
    });

    // Auto-fit bounds to markers if no path
    if (markerBounds.length > 1 && !path) {
      leafletRef.current.fitBounds(markerBounds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, path]); // onSelect/getMarkerIcon intentionally omitted — using refs above

  // Update path
  useEffect(() => {
    if (!pathLayerRef.current || !leafletRef.current) return;

    pathLayerRef.current.clearLayers();

    if (!path || path.length < 1) return;

    const validPath = path.filter(p => typeof p.lat === 'number' && typeof p.lon === 'number');
    if (validPath.length < 1) return;

    const latlngs: L.LatLngExpression[] = validPath.map(p => [p.lat, p.lon]);

    // Dashed polyline — only when 2+ stops
    let polyline: L.Polyline | null = null;
    if (validPath.length >= 2) {
      polyline = L.polyline(latlngs, {
        color: '#0ea5e9',
        weight: 4,
        opacity: 0.8,
        dashArray: '6 8',
      });
      polyline.addTo(pathLayerRef.current);
    }

    // Numbered markers with name label beneath
    validPath.forEach((point, idx) => {
      const label = point.name
        ? `<div style="
            margin-top: 3px;
            background: white;
            color: #1e293b;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            box-shadow: 0 1px 4px rgba(0,0,0,0.25);
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            pointer-events: none;
          ">${point.name}</div>`
        : '';

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;">
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
          ">${idx + 1}</div>
          ${label}
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'session-order-marker',
        iconSize: [28, point.name ? 52 : 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([point.lat, point.lon], { icon });

      if (onSelect) {
        marker.on('click', () => onSelect(point.id));
      }

      marker.addTo(pathLayerRef.current!);
    });

    // Fit bounds
    if (polyline) {
      leafletRef.current.fitBounds(polyline.getBounds().pad(0.15));
    } else {
      // Single point — just center on it
      leafletRef.current.setView([validPath[0].lat, validPath[0].lon], 14);
    }
  }, [path, onSelect]);

  // User location marker — blue "you are here" dot
  useEffect(() => {
    if (!leafletRef.current) return;

    // Remove previous marker
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
      userLocationMarkerRef.current = null;
    }

    if (!userLocation) return;

    const icon = L.divIcon({
      html: `
        <div style="
          width: 18px; height: 18px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.35), 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lon], { icon, zIndexOffset: 1000 })
      .bindPopup('<strong>You are here</strong>')
      .addTo(leafletRef.current);
  }, [userLocation?.lat, userLocation?.lon]);

  // Nearby radius circle — drawn when both userLocation and nearbyKm are set
  useEffect(() => {
    if (!leafletRef.current) return;

    // Remove previous circle
    if (nearbyCircleRef.current) {
      nearbyCircleRef.current.remove();
      nearbyCircleRef.current = null;
    }

    if (!userLocation || !nearbyKm) return;

    nearbyCircleRef.current = L.circle([userLocation.lat, userLocation.lon], {
      radius: nearbyKm * 1000, // metres
      color: '#3b82f6',
      weight: 1.5,
      opacity: 0.6,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
    }).addTo(leafletRef.current);
  }, [userLocation?.lat, userLocation?.lon, nearbyKm]);

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
