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

export interface Place {
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
  urlmoreinfo_status?: string | null;
}

export interface PathItem {
  id: string;
  lat: number;
  lon: number;
  name?: string;  // shown as label beneath the numbered pin
}

export interface MapViewProps {
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
  /** If provided, renders an "Add to plan" button inside each popup */
  onAddToPlan?: (id: string) => void;
  /** IDs of activities already in the plan — used to show "✓ In plan" state */
  planItemIds?: string[];
  /** IDs of activities in the kids' wishlist — rendered with an orange heart pin */
  wishlistItemIds?: string[];
  /** Fires on initial load and after each pan/zoom ends — gives current viewport bounds */
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

const MapView: React.FC<MapViewProps> = ({
  places,
  center,
  path,
  onSelect,
  getMarkerIcon,
  onMapClick,
  overlay,
  className,
  userLocation,
  nearbyKm,
  onAddToPlan,
  planItemIds,
  wishlistItemIds,
  onBoundsChange,
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
  const onAddToPlanRef = useRef(onAddToPlan);
  onAddToPlanRef.current = onAddToPlan;
  const planItemIdsRef = useRef(planItemIds);
  planItemIdsRef.current = planItemIds;
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const wishlistItemIdsRef = useRef(wishlistItemIds);
  wishlistItemIdsRef.current = wishlistItemIds;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,
    });
    const initialCenter = center ?? { lat: 56.9496, lon: 24.1052 };
    map.setView([initialCenter.lat, initialCenter.lon], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Viewport bounds reporting — fires on every pan/zoom end + once on init
    const fireBounds = () => {
      if (!onBoundsChangeRef.current) return;
      const b = map.getBounds();
      onBoundsChangeRef.current({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };
    map.on('moveend', fireBounds);
    // Fire once after the initial paint so the host gets the initial viewport bounds
    const boundsTimer = setTimeout(fireBounds, 150);

    markersLayerRef.current = L.layerGroup().addTo(map);
    pathLayerRef.current = L.layerGroup().addTo(map);
    leafletRef.current = map;

    return () => {
      clearTimeout(boundsTimer);
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
      const isInPlan  = planItemIdsRef.current?.includes(place.id) ?? false;
      const isWishlist = !isInPlan && (wishlistItemIdsRef.current?.includes(place.id) ?? false);
      let icon: L.Icon | L.DivIcon | undefined;
      if (isInPlan) {
        // GREEN — already in plan
        icon = L.divIcon({
          html: `<div style="
            background:#10b981;color:white;border-radius:50%;
            width:30px;height:30px;
            display:flex;align-items:center;justify-content:center;
            font-size:15px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.35);
            border:2px solid white;cursor:pointer;
          ">✓</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        });
      } else if (isWishlist) {
        // ORANGE — kid wishlist, not yet in plan
        icon = L.divIcon({
          html: `<div style="
            background:#f97316;color:white;border-radius:50%;
            width:30px;height:30px;
            display:flex;align-items:center;justify-content:center;
            font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.35);
            border:2px solid white;cursor:pointer;
          ">❤️</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        });
      } else if (getMarkerIconRef.current) {
        icon = getMarkerIconRef.current(place);
      } else {
        // BLUE — default (browse / discover)
        icon = L.divIcon({
          html: `<div style="
            background:#3b82f6;border-radius:50%;
            width:18px;height:18px;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            border:3px solid white;cursor:pointer;
          "></div>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -10],
        });
      }
      const marker = L.marker([place.lat, place.lon], icon ? { icon } : undefined);

      // Rich popup card — inline styles (Leaflet popup is plain DOM, no Tailwind)
      const priceHtml = (() => {
        if (place.min_price === 0 || place.min_price === null && place.max_price === null) return 'Free';
        if (place.min_price !== null && place.min_price !== undefined) return `From $${place.min_price}`;
        if (place.max_price !== null && place.max_price !== undefined) return `Up to $${place.max_price}`;
        return null;
      })();

      const hasAddToPlan = !!onAddToPlanRef.current;

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
          ${place.urlmoreinfo && place.urlmoreinfo_status === 'ok'
            ? `<a href="${place.urlmoreinfo}" target="_blank" rel="noopener noreferrer"
                style="font-size:12px;color:#ec4899;text-decoration:none;font-weight:500;">
                More info →
               </a>`
            : ''}
          ${hasAddToPlan
            ? `<button data-plan-id="${place.id}" style="
                display:block;
                margin-top:8px;
                width:100%;
                padding:6px 10px;
                background:#ec4899;
                color:white;
                border:none;
                border-radius:6px;
                font-size:12px;
                font-weight:600;
                cursor:pointer;
                text-align:center;
              ">+ Add to plan</button>`
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

      // After popup opens, call invalidateSize so the map tiles don't misalign.
      // Also wire up the "Add to plan" button with current plan state.
      marker.on('popupopen', () => {
        leafletRef.current?.invalidateSize();
        if (hasAddToPlan) {
          // Use setTimeout to let the popup DOM render before querying it
          setTimeout(() => {
            const btn = document.querySelector<HTMLButtonElement>(`[data-plan-id="${place.id}"]`);
            if (!btn) return;
            // Update button label/colour based on current plan state
            const inPlan = planItemIdsRef.current?.includes(place.id) ?? false;
            btn.textContent = inPlan ? '✓ In plan' : '+ Add to plan';
            btn.style.background = inPlan ? '#6b7280' : '#ec4899';
            // Replace node to clear any stale listener from a previous open
            const fresh = btn.cloneNode(true) as HTMLButtonElement;
            btn.replaceWith(fresh);
            fresh.addEventListener('click', () => {
              onAddToPlanRef.current?.(place.id);
              leafletRef.current?.closePopup();
            });
          }, 0);
        }
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
  }, [places, path, planItemIds?.join(','), wishlistItemIds?.join(',')]); // onSelect/getMarkerIcon intentionally omitted — using refs above

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
      const safeName = (point.name ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      const label = point.name
        ? `<div style="
            margin-top: 3px;
            background: white;
            color: #1e293b;
            padding: 3px 7px;
            border-radius: 8px;
            font-size: 10px;
            line-height: 1.15;
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            max-width: 180px;
            text-align: center;
            white-space: normal;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            pointer-events: none;
          ">${safeName}</div>`
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

      if (point.name) {
        marker.bindPopup(`<strong>${safeName}</strong>`, { maxWidth: 260 });
        marker.bindTooltip(point.name, {
          direction: 'top',
          offset: [0, -12],
          className: 'activity-name-tooltip',
        });
      }

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
    if (center && leafletRef.current && typeof center.lat === 'number' && typeof center.lon === 'number') {
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
