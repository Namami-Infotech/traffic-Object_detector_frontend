import React from 'react';
import { Radio } from 'lucide-react';
import { DetectionHistoryTable } from '../detection/components/DetectionHistoryTable';

export interface DetectionViewProps {
  displayInCount?: number;
  displayOutCount?: number;
  displayActiveCount?: number;
  displayTotalDetections?: number;
  liveLogs?: any[];
  onClearLogs?: () => void;
  onOpenPlateScanner?: () => void;
}

export const DetectionView: React.FC<DetectionViewProps> = ({
  displayInCount = 0,
  displayOutCount = 0,
  displayActiveCount = 0,
  displayTotalDetections = 0,
  liveLogs = [],
  onClearLogs,
  onOpenPlateScanner,
}) => {
  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={22} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Traffic Detection &amp; ANPR Module
            </h2>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Real-time vehicle &amp; pedestrian classifications (Car, Bus, Truck, Pedestrian), entry/exit directions (IN / OUT), timestamps &amp; ANPR number plates
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenPlateScanner && (
            <button
              type="button"
              onClick={onOpenPlateScanner}
              style={{
                background: 'var(--accent-blue)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Scan Plate (ANPR)
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Vehicles IN (↗)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{displayInCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entry Direction Logged</div>
        </div>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Vehicles OUT (↘)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{displayOutCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Exit Direction Logged</div>
        </div>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Active Vehicles</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>{displayActiveCount}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Currently in Motion</div>
        </div>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1.1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Detections</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {Math.max(displayTotalDetections, liveLogs.length, displayInCount + displayOutCount)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Classified Records</div>
        </div>
      </div>

      {/* Live Traffic Detection & Crossing History Table */}
      <DetectionHistoryTable liveLogs={liveLogs} onClearLogs={onClearLogs || (() => {})} />
    </div>
  );
};
