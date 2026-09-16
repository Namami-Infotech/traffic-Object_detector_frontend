import React from 'react';
import { VEHICLE_META } from '../../../constants/vehicle.constants';

export interface CameraStatusProps {
  inCount: number;
  outCount: number;
  activeVehicleCount: number;
  liveCounts: Record<string, number>;
  vehicleInOut: Record<string, { in: number; out: number }>;
  hasRemoteFeed?: boolean;
  isFullscreen?: boolean;
}

export const CameraStatus: React.FC<CameraStatusProps> = ({
  inCount,
  outCount,
  activeVehicleCount,
  liveCounts,
  vehicleInOut,
  hasRemoteFeed = false,
  isFullscreen = false,
}) => {
  // Only show vehicle categories that actually have detections (in > 0 or out > 0)
  const activeVehicleKeys = (['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'PERSON'] as const).filter((vKey) => {
    const data = vehicleInOut[vKey];
    return (data?.in || 0) > 0 || (data?.out || 0) > 0;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {/* 1. Primary IN / OUT Badge */}
      <span
        style={{
          background: isFullscreen ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc',
          border: isFullscreen ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-color)',
          padding: '4px 9px',
          borderRadius: '7px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          color: isFullscreen ? '#ffffff' : 'inherit',
        }}
      >
        <span style={{ color: isFullscreen ? '#cbd5e1' : 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
          IN/OUT:
        </span>
        <strong style={{ color: '#059669' }}>{inCount}</strong>
        <span style={{ color: 'var(--text-muted)', margin: '0 1px' }}>/</span>
        <strong style={{ color: '#dc2626' }}>{outCount}</strong>
      </span>

      {/* 2. Net Occupancy Badge */}
      <span
        style={{
          background: isFullscreen ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
          border: isFullscreen ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #a7f3d0',
          color: '#059669',
          padding: '4px 9px',
          borderRadius: '7px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Net Occupancy (Total IN - Total OUT)"
      >
        <span style={{ fontSize: '0.72rem', opacity: 0.85, color: isFullscreen ? '#a7f3d0' : '#065f46', fontWeight: 600 }}>
          Net Occ:
        </span>
        <strong style={{ color: isFullscreen ? '#34d399' : '#059669' }}>
          {Math.max(0, inCount - outCount)}
        </strong>
      </span>

      {/* 3. Active in Frame */}
      <span
        style={{
          background: isFullscreen ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
          border: isFullscreen ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid #bfdbfe',
          color: isFullscreen ? '#93c5fd' : '#1d4ed8',
          padding: '4px 9px',
          borderRadius: '7px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title={
          activeVehicleCount > 0 && Object.values(liveCounts).some((c) => c > 0)
            ? `In Frame: ${Object.entries(liveCounts)
                .filter(([, c]) => c > 0)
                .map(([k, c]) => `${k}:${c}`)
                .join(', ')}`
            : undefined
        }
      >
        <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 600 }}>Active:</span>
        <strong>{activeVehicleCount}</strong>
      </span>

      {/* 4. Active Vehicle Breakdown Badges (Only non-zero counts) */}
      {activeVehicleKeys.map((vKey) => {
        const meta = VEHICLE_META[vKey];
        const data = vehicleInOut[vKey] || { in: 0, out: 0 };
        return (
          <span
            key={vKey}
            style={{
              fontSize: '0.74rem',
              background: isFullscreen ? 'rgba(255, 255, 255, 0.08)' : (meta?.bg || '#f8fafc'),
              border: `1px solid ${isFullscreen ? 'rgba(255, 255, 255, 0.15)' : (meta?.border || 'var(--border-color)')}`,
              color: isFullscreen ? '#ffffff' : (meta?.color || 'inherit'),
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
            title={`${meta?.label || vKey}: IN ${data.in} | OUT ${data.out}`}
          >
            <span>{meta?.emoji || '🚗'}</span>
            <strong style={{ color: '#059669' }}>{data.in}</strong>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <strong style={{ color: '#dc2626' }}>{data.out}</strong>
          </span>
        );
      })}

      {/* 5. Live Feed Pill */}
      {hasRemoteFeed && (
        <span
          style={{
            fontSize: '0.74rem',
            background: isFullscreen ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
            color: '#059669',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid #a7f3d0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#059669',
            }}
          />
          Live
        </span>
      )}
    </div>
  );
};
