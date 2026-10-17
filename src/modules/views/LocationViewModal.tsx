import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Navigation, Loader2 } from 'lucide-react';
import type { HistoricalPlaceItem } from '../../services/api';

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

export interface LocationViewModalProps {
  place: HistoricalPlaceItem | null;
  onClose: () => void;
}

// Resolve place coordinates with city fallbacks
const resolveCoordinates = (place: HistoricalPlaceItem): { lat: number; lng: number } => {
  if (place.latitude && place.longitude) {
    return { lat: Number(place.latitude), lng: Number(place.longitude) };
  }
  const loc = (place.location || '').toLowerCase();
  const name = (place.name || '').toLowerCase();

  if (loc.includes('agra') || name.includes('taj')) {
    return { lat: 27.1751, lng: 78.0421 };
  } else if (loc.includes('delhi') || name.includes('red fort') || name.includes('qutub') || name.includes('lal qila') || name.includes('lal kila')) {
    if (name.includes('qutub')) return { lat: 28.5245, lng: 77.1855 };
    return { lat: 28.6562, lng: 77.241 };
  } else if (loc.includes('jaipur') || name.includes('hawa')) {
    return { lat: 26.9239, lng: 75.8267 };
  } else if (loc.includes('varanasi')) {
    return { lat: 25.3176, lng: 82.9739 };
  } else if (loc.includes('amritsar')) {
    return { lat: 31.634, lng: 74.8723 };
  } else if (loc.includes('mumbai')) {
    return { lat: 18.922, lng: 72.8347 };
  }
  return { lat: place.latitude || 28.6139, lng: place.longitude || 77.209 };
};

export const LocationViewModal: React.FC<LocationViewModalProps> = ({ place, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!place || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const { lat, lng } = resolveCoordinates(place);

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    marker
      .bindPopup(
        `<div style="text-align:center; padding: 4px;">
          <b style="font-size: 0.9rem; color: #1e293b;">${place.name}</b><br/>
          <span style="font-size: 0.78rem; color: #64748b;">${place.location || 'Heritage Site'}</span>
        </div>`
      )
      .openPopup();

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [place]);

  if (!place) return null;

  const { lat, lng } = resolveCoordinates(place);

  // Open Google Maps using current user GPS location as origin
  const handleOpenGoogleMaps = () => {
    const destCoords = `${lat},${lng}`;

    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destCoords}&travelmode=driving`;
          window.open(dirUrl, '_blank', 'noopener,noreferrer');
        },
        (error) => {
          console.warn('Geolocation access denied or timed out, falling back to My Location:', error);
          setIsLocating(false);
          // Fallback to Google Maps automatic "My Location"
          const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${destCoords}&travelmode=driving`;
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${destCoords}&travelmode=driving`;
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <Navigation size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {place.name}
              </h3>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '2px',
                }}
              >
                <MapPin size={12} color="#059669" />
                {place.location || 'Location Not Specified'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '360px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            marginBottom: '1rem',
          }}
        />

        {/* Modal Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Coordinates: {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              disabled={isLocating}
              title="Get turn-by-turn directions from your current location in Google Maps"
              style={{
                padding: '6px 14px',
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--accent-blue)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isLocating ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLocating) e.currentTarget.style.background = '#eff6ff';
              }}
              onMouseLeave={(e) => {
                if (!isLocating) e.currentTarget.style.background = '#f8fafc';
              }}
            >
              {isLocating ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Getting Location...</span>
                </>
              ) : (
                <>
                  <Navigation size={13} />
                  <span>Open in Google Maps</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                background: 'var(--accent-blue)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
