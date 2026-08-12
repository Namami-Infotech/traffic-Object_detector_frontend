import React from 'react';
import { Camera, Cpu } from 'lucide-react';

interface NavbarProps {
  onOpenAddCamera: () => void;
  activeCameraName: string;
  isAiLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddCamera,
  activeCameraName,
  isAiLoading,
}) => {
  return (
    <header className="glass-panel navbar-header">
      <div className="navbar-brand">
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
          padding: '10px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
          flexShrink: 0,
        }}>
          <Camera size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            TrafficVision AI
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Real-time CCTV Traffic Monitoring & Object Analytics
          </p>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="badge badge-live">
          <span className="pulse-dot"></span>
          <span>{activeCameraName || 'Live Feed'}</span>
        </div>

        <div className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <Cpu size={14} />
          <span>{isAiLoading ? 'Loading AI Model...' : 'TF.js COCO-SSD Ready'}</span>
        </div>

        <button
          onClick={onOpenAddCamera}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          <Camera size={16} />
          + Connect CCTV Camera
        </button>
      </div>
    </header>
  );
};
