import React from 'react';
import { Activity } from 'lucide-react';
import type { TrafficDensityLevel } from '../../../app/config/traffic.config';

export interface TrafficDensityBadgeProps {
  density: TrafficDensityLevel;
}

export const TrafficDensityBadge: React.FC<TrafficDensityBadgeProps> = ({ density }) => {
  let label = 'Low Traffic';
  let badgeClass = 'badge-live';

  if (density === 'MEDIUM') {
    label = 'Moderate Traffic';
    badgeClass = 'badge-warning';
  } else if (density === 'HIGH') {
    label = 'Heavy Congestion';
    badgeClass = 'badge-danger';
  }

  return (
    <div className={`badge ${badgeClass}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
      <Activity size={14} />
      <span>{label}</span>
    </div>
  );
};
