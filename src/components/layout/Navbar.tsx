import React from 'react';
import { Camera, LogIn } from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';

export interface NavbarProps {
  onOpenAddCamera?: () => void;
  onOpenPlateScanner?: () => void;
  onOpenLogin?: () => void;
  onOpenRoleAccess?: () => void;
  activeCameraName?: string;
  isAiLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
}) => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="glass-panel navbar-header">
      <div className="navbar-brand">
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
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

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!isAuthenticated && (
          <button
            type="button"
            onClick={onOpenLogin}
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <LogIn size={16} color="#38bdf8" />
            Login (Admin)
          </button>
        )}
      </div>
    </header>
  );
};
