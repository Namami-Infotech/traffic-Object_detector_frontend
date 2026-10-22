import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Compass, Loader2 } from 'lucide-react';

// Fix Leaflet marker icons in Vite / modern bundlers
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface LocationMapPickerProps {
  locationName: string;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (locationName: string, lat: number, lng: number) => void;
  height?: string;
}

const POPULAR_HERITAGE_CITIES = [
  { name: 'Agra', lat: 27.1751, lng: 78.0421, state: 'Uttar Pradesh' },
  { name: 'Delhi', lat: 28.6139, lng: 77.209, state: 'Delhi' },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  { name: 'Varanasi', lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh' },
  { name: 'Amritsar', lat: 31.634, lng: 74.8723, state: 'Punjab' },
  { name: 'Mumbai', lat: 18.922, lng: 72.8347, state: 'Maharashtra' },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867, state: 'Telangana' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
];

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  locationName,
  latitude,
  longitude,
  onChange,
  height = '240px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: latitude || 27.1751,
    lng: longitude || 78.0421,
  }));

  // Reverse Geocode helper
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const country = addr.country || 'India';
            const parts = [city, state, country].filter(Boolean);
            const formatted = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
            onChange(formatted, lat, lng);
            return;
          }
        }
      } catch (err) {
        console.warn('Reverse geocode failed, using coordinates:', err);
      }
      // Fallback: update with coordinates
      onChange(locationName || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`, lat, lng);
    },
    [locationName, onChange]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = latitude || 27.1751;
    const initialLng = longitude || 78.0421;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);

    marker.bindPopup(`<b>${locationName || 'Historical Place Location'}</b><br/>Drag or click anywhere to adjust`).openPopup();

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentCoords({ lat: pos.lat, lng: pos.lng });
      reverseGeocode(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCurrentCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Fix map container size after render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position when prop coordinates change
  useEffect(() => {
    if (latitude && longitude && mapInstanceRef.current && markerRef.current) {
      const cur = markerRef.current.getLatLng();
      if (Math.abs(cur.lat - latitude) > 0.0001 || Math.abs(cur.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], 12);
        setCurrentCoords({ lat: latitude, lng: longitude });
      }
    }
  }, [latitude, longitude]);

  // Search Address / Landmark via OpenStreetMap Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          const displayName = results[0].display_name.split(',').slice(0, 3).join(',').trim();

          setCurrentCoords({ lat, lng });
          onChange(displayName, lat, lng);

          if (mapInstanceRef.current && markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            markerRef.current.bindPopup(`<b>${displayName}</b>`).openPopup();
            mapInstanceRef.current.flyTo([lat, lng], 13);
          }
        }
      }
    } catch (err) {
      console.error('Search location error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Preset city click
  const handleSelectPreset = (city: (typeof POPULAR_HERITAGE_CITIES)[0]) => {
    const formatted = `${city.name}, ${city.state}`;
    setCurrentCoords({ lat: city.lat, lng: city.lng });
    onChange(formatted, city.lat, city.lng);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([city.lat, city.lng]);
      markerRef.current.bindPopup(`<b>${formatted}</b>`).openPopup();
      mapInstanceRef.current.flyTo([city.lat, city.lng], 12);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: '#f8fafc',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '10px',
      }}
    >
      {/* Header & Search Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Search map location (e.g. Taj Mahal, Jaipur, Delhi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            style={{
              width: '100%',
              padding: '6px 30px 6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              outline: 'none',
              background: '#ffffff',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isSearching}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          style={{
            background: 'var(--accent-blue)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <Navigation size={13} />
          Locate
        </button>
      </div>

      {/* Quick City Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {POPULAR_HERITAGE_CITIES.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => handleSelectPreset(c)}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <Compass size={11} color="var(--accent-blue)" />
            {c.name}
          </button>
        ))}
      </div>

      {/* Interactive Leaflet Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />

      {/* Coordinates Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          padding: '0 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={12} color="#059669" />
          <span>
            Pin: {currentCoords.lat.toFixed(4)}° N, {currentCoords.lng.toFixed(4)}° E
          </span>
        </div>
       
      </div>
    </div>
  );
};
