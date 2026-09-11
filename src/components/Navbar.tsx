import React from 'react';
import { Camera } from 'lucide-react';

interface NavbarProps {
  onOpenAddCamera: () => void;
  activeCameraName?: string;
  isAiLoading?: boolean;
  appMode?: 'DASHBOARD' | 'BROADCASTER';
  onToggleAppMode?: (mode: 'DASHBOARD' | 'BROADCASTER') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddCamera,
  appMode = 'DASHBOARD',
}) => {
  return (
    <header className="glass-panel navbar-header">
      <div className="navbar-brand">
        <div style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          padding: '10px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          flexShrink: 0,
        }}>
          <Camera size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
            TrafficVision AI
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
            Real-time CCTV Traffic Monitoring & Object Analytics
          </p>
        </div>
      </div>

      <div className="navbar-actions">
        {appMode === 'DASHBOARD' && (
          <>
            <button
              onClick={onOpenAddCamera}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
              }}
            >
              <Camera size={16} />
              + Connect CCTV
            </button>
          </>
        )}
      </div>
    </header>
  );
};

