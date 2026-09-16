import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface VehicleStatCardProps {
  label: string;
  inCount: number;
  outCount: number;
  total: number;
  icon: LucideIcon;
  color: string;
}

export const VehicleStatCard: React.FC<VehicleStatCardProps> = React.memo(({
  label,
  inCount,
  outCount,
  total,
  icon: Icon,
  color,
}) => {
  const inRatio = total > 0 ? Math.round((inCount / total) * 100) : 50;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '0.85rem 1rem',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        minWidth: 0,
      }}
    >
      {/* Top Row: Icon on Left & Large Total Count on Right */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <div
          style={{
            background: `${color}18`,
            color: color,
            padding: '7px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </div>

        <span
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            marginLeft: '8px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {total}
        </span>
      </div>

      {/* Middle Row: Vehicle Label & Net Occupancy Badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          gap: '6px',
        }}
      >
        <span
          style={{
            fontSize: '0.84rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={label}
        >
          {label}
        </span>
        <span
          style={{
            color: '#0284c7',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            background: 'rgba(2, 132, 199, 0.1)',
            padding: '2px 6px',
            borderRadius: '5px',
            fontSize: '0.7rem',
            flexShrink: 0,
          }}
          title="Net Occupancy (IN - OUT)"
        >
          Net: {Math.max(0, inCount - outCount)}
        </span>
      </div>

      {/* Bottom Row: IN / OUT Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          marginBottom: '6px',
          gap: '6px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>
          ▼ IN: {inCount}
        </span>
        <span style={{ color: '#dc2626', fontWeight: 700, whiteSpace: 'nowrap' }}>
          ▲ OUT: {outCount}
        </span>
      </div>

      {/* Progress Bar visual indicator */}
      <div
        style={{
          width: '100%',
          height: '5px',
          background: '#fee2e2',
          borderRadius: '3px',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, inRatio))}%`,
            height: '100%',
            background: '#059669',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
    </div>
  );
});
