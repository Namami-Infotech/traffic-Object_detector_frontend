import React, { useState } from 'react';
import {
  Camera,
  Car,
  Bus,
  Truck,
  Bike,
  Users,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CameraItem } from '../../camera/types/camera.types';

export interface CameraVehicleFlowStats {
  in: number;
  out: number;
  vehicles?: Record<string, number>;
  vehicleInOut?: Record<string, { in: number; out: number }>;
}

export interface CameraBreakdownCardProps {
  cameras: CameraItem[];
  cameraStats?: Record<string, CameraVehicleFlowStats>;
  cameraLiveVehicleInOut?: Record<string, Record<string, { in: number; out: number }>>;
}

const VEHICLE_CONFIGS = [
  { key: 'CAR', label: 'Cars', icon: Car, color: '#10b981', bg: '#ecfdf5' },
  { key: 'BUS', label: 'Buses', icon: Bus, color: '#f59e0b', bg: '#fffbeb' },
  { key: 'TRUCK', label: 'Trucks', icon: Truck, color: '#ef4444', bg: '#fef2f2' },
  { key: 'MOTORCYCLE', label: 'Motorcycles', icon: Bike, color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'PERSON', label: 'Pedestrians', icon: Users, color: '#06b6d4', bg: '#ecfeff' },
];

/**
 * Camera-Wise Vehicle IN / OUT Breakdown Card
 *
 * Displays how many Cars, Buses, Trucks, Motorcycles & Pedestrians
 * entered (IN) and exited (OUT) through each registered camera feed.
 */
export const CameraBreakdownCard: React.FC<CameraBreakdownCardProps> = ({
  cameras,
  cameraStats = {},
  cameraLiveVehicleInOut = {},
}) => {
  const activeCameras = cameras.filter((c) => c.enabled !== false);
  const [expandedCamId, setExpandedCamId] = useState<string | null>(null);

  if (activeCameras.length === 0) {
    return null;
  }

  const toggleExpand = (camId: string) => {
    setExpandedCamId((prev) => (prev === camId ? null : camId));
  };

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem',
        marginTop: '1rem',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            }}
          >
            <Camera size={20} />
          </div>
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Camera-Wise Vehicle Flow
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Per-camera IN / OUT metrics for all detected vehicle types
            </p>
          </div>
        </div>

        <span
          style={{
            background: 'rgba(2, 132, 199, 0.1)',
            color: '#0284c7',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {activeCameras.length} Camera{activeCameras.length > 1 ? 's' : ''} Active
        </span>
      </div>

      {/* List of Cameras with their individual breakdowns */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {activeCameras.map((cam) => {
          const dbStat = cameraStats[cam.id] || { in: 0, out: 0, vehicleInOut: {} };
          const liveStat = cameraLiveVehicleInOut[cam.id] || {};

          // Merge DB counts with live session counts for each vehicle type
          const vehicleBreakdown = VEHICLE_CONFIGS.map((cfg) => {
            const dbV = dbStat.vehicleInOut?.[cfg.key] || { in: 0, out: 0 };
            const liveV = liveStat[cfg.key] || { in: 0, out: 0 };
            const inCount = Math.max(dbV.in || 0, liveV.in || 0);
            const outCount = Math.max(dbV.out || 0, liveV.out || 0);
            return {
              ...cfg,
              inCount,
              outCount,
              net: inCount - outCount,
            };
          });

          // Overall camera IN / OUT
          const totalCamIn = Math.max(
            dbStat.in || 0,
            vehicleBreakdown.reduce((acc, v) => acc + v.inCount, 0)
          );
          const totalCamOut = Math.max(
            dbStat.out || 0,
            vehicleBreakdown.reduce((acc, v) => acc + v.outCount, 0)
          );
          const isExpanded = expandedCamId === cam.id || activeCameras.length <= 2;

          return (
            <div
              key={cam.id}
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '0.9rem 1rem',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Camera Header Bar */}
              <div
                onClick={() => toggleExpand(cam.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: activeCameras.length > 2 ? 'pointer' : 'default',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {cam.cameraName || `Camera ${cam.id.slice(0, 8)}`}
                    </span>
                    {cam.location && (
                      <span
                        style={{
                          background: '#e2e8f0',
                          color: '#475569',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                        }}
                      >
                        {cam.location}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Lane: {cam.lane || 'Lane 1'} • Dir: {cam.direction || 'NORTH'}
                  </span>
                </div>

                {/* Quick Camera IN / OUT Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.78rem',
                      fontVariantNumeric: 'tabular-nums',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <ArrowDownRight size={13} /> IN {totalCamIn}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>|</span>
                    <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <ArrowUpRight size={13} /> OUT {totalCamOut}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>|</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: totalCamIn - totalCamOut >= 0 ? '#0284c7' : '#dc2626',
                      }}
                    >
                      Net {totalCamIn - totalCamOut >= 0 ? `+${totalCamIn - totalCamOut}` : totalCamIn - totalCamOut}
                    </span>
                  </div>

                  {activeCameras.length > 2 && (
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Per-Vehicle Grid for this camera (Cars, Buses, Trucks, Motorcycles, Pedestrians) */}
              {isExpanded && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '6px',
                    marginTop: '0.85rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  {vehicleBreakdown.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.key}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        {/* Vehicle Icon + Label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div
                            style={{
                              background: item.bg,
                              color: item.color,
                              padding: '3px',
                              borderRadius: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconComp size={12} />
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.label}
                          </span>
                        </div>

                        {/* Counts IN / OUT */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.7rem',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <span style={{ color: '#059669', fontWeight: 600 }}>IN: {item.inCount}</span>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>OUT: {item.outCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
