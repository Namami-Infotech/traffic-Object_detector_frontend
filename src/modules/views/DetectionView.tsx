import React from 'react';
import { DetectionHistoryTable } from '../detection/components/DetectionHistoryTable';

export interface DetectionViewProps {
  displayInCount?: number;
  displayOutCount?: number;
  displayActiveCount?: number;
  displayTotalDetections?: number;
  liveLogs?: any[];
  onClearLogs?: () => void;
  onOpenPlateScanner?: () => void;
  searchTerm?: string;
}

export const DetectionView: React.FC<DetectionViewProps> = ({
  displayInCount = 0,
  displayOutCount = 0,
  displayActiveCount = 0,
  displayTotalDetections = 0,
  liveLogs = [],
  onClearLogs,
  onOpenPlateScanner,
  searchTerm,
}) => {
  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
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
      <DetectionHistoryTable
        liveLogs={liveLogs}
        onClearLogs={onClearLogs || (() => {})}
        onOpenPlateScanner={onOpenPlateScanner}
        searchTerm={searchTerm}
      />
    </div>
  );
};
