import React from 'react';
import { Maximize2, Minimize2, RefreshCw, SwitchCamera } from 'lucide-react';

export interface CameraControlsProps {
  isFullscreen: boolean;
  isCameraRunning: boolean;
  onToggleFullscreen: () => void;
  onReconnect?: () => void;
  showReconnect?: boolean;
  onToggleFacingMode?: () => void;
  facingMode?: 'environment' | 'user';
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isFullscreen,
  isCameraRunning,
  onToggleFullscreen,
  onReconnect,
  showReconnect = false,
  onToggleFacingMode,
  facingMode,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {onToggleFacingMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFacingMode();
          }}
          title={facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Back Camera (Back Camera)'}
          style={{
            background: facingMode === 'environment' ? '#eff6ff' : '#f8fafc',
            border: facingMode === 'environment' ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
            color: facingMode === 'environment' ? '#1d4ed8' : 'var(--text-secondary)',
            padding: '4px 9px',
            borderRadius: '7px',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
          }}
        >
          <SwitchCamera size={13} />
          <span>{facingMode === 'environment' ? 'Back Cam 📷' : 'Front Cam 🤳'}</span>
        </button>
      )}

      {showReconnect && onReconnect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReconnect();
          }}
          title="Reconnect camera stream"
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            padding: '4px 10px',
            borderRadius: '7px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={12} />
          <span>Reconnect</span>
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFullscreen();
        }}
        disabled={!isCameraRunning}
        title={
          isFullscreen
            ? 'Exit Fullscreen (ESC)'
            : isCameraRunning
            ? 'Click to expand to Fullscreen'
            : 'Camera not streaming'
        }
        style={{
          background: isFullscreen ? '#ef4444' : '#0f172a',
          border: isFullscreen ? '1px solid #dc2626' : '1px solid #0f172a',
          color: '#ffffff',
          padding: '4px 11px',
          borderRadius: '7px',
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: isCameraRunning ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          opacity: isCameraRunning ? 1 : 0.5,
          transition: 'all 0.2s ease',
          boxShadow: isFullscreen ? undefined : '0 1px 3px rgba(15, 23, 42, 0.15)',
        }}
      >
        {isFullscreen ? (
          <>
            <Minimize2 size={13} />
            <span>Exit Fullscreen</span>
          </>
        ) : (
          <>
            <Maximize2 size={13} />
            <span>Full Screen</span>
          </>
        )}
      </button>
    </div>
  );
};
