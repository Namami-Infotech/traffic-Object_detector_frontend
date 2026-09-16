import React from 'react';
import { ArrowLeftRight, ArrowUpDown, Sliders } from 'lucide-react';
import type { LineOrientation } from '../types/camera.types';

export interface VirtualLineControlProps {
  orientation: LineOrientation;
  positionPercent: number;
  onOrientationChange: (orientation: LineOrientation) => void;
  onPositionChange: (percent: number) => void;
  isFullscreen?: boolean;
}

export const VirtualLineControl: React.FC<VirtualLineControlProps> = ({
  orientation,
  positionPercent,
  onOrientationChange,
  onPositionChange,
  isFullscreen = false,
}) => {
  const presets = [
    { label: '30%', val: 30 },
    { label: '50%', val: 50 },
    { label: '70%', val: 70 },
  ];

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: isFullscreen ? '0.5rem 0.8rem' : '0.8rem 1rem',
        marginBottom: isFullscreen ? '0.6rem' : '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: isFullscreen ? '0.6rem' : '1rem',
      }}
    >
      {/* Orientation Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Line Type:</span>
        <button
          type="button"
          onClick={() => onOrientationChange('VERTICAL')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: orientation === 'VERTICAL' ? 600 : 400,
            border: orientation === 'VERTICAL' ? '1px solid #d97706' : '1px solid var(--border-color)',
            background: orientation === 'VERTICAL' ? '#fef3c7' : '#ffffff',
            color: orientation === 'VERTICAL' ? '#b45309' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ArrowLeftRight size={14} /> Vertical (Khadi)
        </button>
        <button
          type="button"
          onClick={() => onOrientationChange('HORIZONTAL')}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: orientation === 'HORIZONTAL' ? 600 : 400,
            border: orientation === 'HORIZONTAL' ? '1px solid #d97706' : '1px solid var(--border-color)',
            background: orientation === 'HORIZONTAL' ? '#fef3c7' : '#ffffff',
            color: orientation === 'HORIZONTAL' ? '#b45309' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ArrowUpDown size={14} /> Horizontal (Padi)
        </button>
      </div>

      {/* Position Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '180px', flexWrap: 'wrap' }}>
        <Sliders size={16} color="#d97706" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {orientation === 'VERTICAL' ? 'X-Pos' : 'Y-Pos'} ({positionPercent}%):
        </span>
        <input
          type="range"
          min="10"
          max="90"
          value={positionPercent}
          onChange={(e) => onPositionChange(Number(e.target.value))}
          style={{ flex: 1, minWidth: '100px', cursor: 'pointer', accentColor: '#d97706' }}
        />
      </div>

      {/* Quick Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Presets:</span>
        {presets.map((preset) => (
          <button
            key={preset.val}
            type="button"
            onClick={() => onPositionChange(preset.val)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              border: positionPercent === preset.val ? '1px solid #d97706' : '1px solid var(--border-color)',
              background: positionPercent === preset.val ? '#fef3c7' : '#ffffff',
              color: positionPercent === preset.val ? '#b45309' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
