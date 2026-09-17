import React from 'react';
import { Car, Bus, Truck, Bike, Users, ArrowDownRight, ArrowUpRight, Scale, Activity } from 'lucide-react';
import { VehicleStatCard } from './VehicleStatCard';
import { TrafficDensityBadge } from './TrafficDensityBadge';
import { ParkingAvailabilityCard } from './ParkingAvailabilityCard';
import { calculateTrafficDensity } from '../../../app/config/traffic.config';
import type { CameraItem } from '../../camera/types/camera.types';

export interface TrafficAnalyticsProps {
  counts: Record<string, number>;
  vehicleInOut?: Record<string, { in: number; out: number; total?: number }>;
  inCount?: number;
  outCount?: number;
  activeCount?: number;
  cameras?: CameraItem[];
  cameraStats?: Record<string, {
    in: number;
    out: number;
    vehicles?: Record<string, number>;
    vehicleInOut?: Record<string, { in: number; out: number }>;
  }>;
  cameraLiveVehicleInOut?: Record<string, Record<string, { in: number; out: number }>>;
}

export const TrafficAnalytics: React.FC<TrafficAnalyticsProps> = ({
  counts: _counts,
  vehicleInOut,
  inCount = 0,
  outCount = 0,
  activeCount = 0,
  cameras: _cameras = [],
  cameraStats: _cameraStats = {},
  cameraLiveVehicleInOut: _cameraLiveVehicleInOut = {},
}) => {
  const density = calculateTrafficDensity(activeCount);

  const statCards = [
    {
      label: 'Cars',
      in: vehicleInOut?.CAR?.in || 0,
      out: vehicleInOut?.CAR?.out || 0,
      total: vehicleInOut?.CAR?.total ?? ((vehicleInOut?.CAR?.in || 0) + (vehicleInOut?.CAR?.out || 0)),
      icon: Car,
      color: '#10b981',
    },
    {
      label: 'Buses',
      in: vehicleInOut?.BUS?.in || 0,
      out: vehicleInOut?.BUS?.out || 0,
      total: vehicleInOut?.BUS?.total ?? ((vehicleInOut?.BUS?.in || 0) + (vehicleInOut?.BUS?.out || 0)),
      icon: Bus,
      color: '#f59e0b',
    },
    {
      label: 'Trucks',
      in: vehicleInOut?.TRUCK?.in || 0,
      out: vehicleInOut?.TRUCK?.out || 0,
      total: vehicleInOut?.TRUCK?.total ?? ((vehicleInOut?.TRUCK?.in || 0) + (vehicleInOut?.TRUCK?.out || 0)),
      icon: Truck,
      color: '#ef4444',
    },
    {
      label: 'Motorcycles',
      in: vehicleInOut?.MOTORCYCLE?.in || 0,
      out: vehicleInOut?.MOTORCYCLE?.out || 0,
      total: vehicleInOut?.MOTORCYCLE?.total ?? ((vehicleInOut?.MOTORCYCLE?.in || 0) + (vehicleInOut?.MOTORCYCLE?.out || 0)),
      icon: Bike,
      color: '#8b5cf6',
    },
    {
      label: 'Pedestrians',
      in: vehicleInOut?.PERSON?.in || 0,
      out: vehicleInOut?.PERSON?.out || 0,
      total: vehicleInOut?.PERSON?.total ?? ((vehicleInOut?.PERSON?.in || 0) + (vehicleInOut?.PERSON?.out || 0)),
      icon: Users,
      color: '#06b6d4',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 1. Summary Card */}
      <div className="glass-panel" style={{ padding: '1.2rem', marginTop: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              📊 Total Traffic Stats (All Cameras)
            </span>
          </div>
          <TrafficDensityBadge density={density} />
        </div>

        {/* Global IN / OUT Combined Ratio Banner */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              <ArrowDownRight size={16} />
              <span>TOTAL IN (Entry): {inCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              <span>TOTAL OUT (Exit): {outCount}</span>
              <ArrowUpRight size={16} />
            </div>
          </div>

          {/* Ratio bar */}
          <div
            style={{
              height: '8px',
              width: '100%',
              backgroundColor: '#fee2e2',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: inCount + outCount > 0 ? `${(inCount / (inCount + outCount)) * 100}%` : '50%',
                backgroundColor: '#059669',
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>{inCount + outCount > 0 ? Math.round((inCount / (inCount + outCount)) * 100) : 50}% Inflow</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Net Occupancy: {inCount - outCount >= 0 ? `+${inCount - outCount}` : inCount - outCount}
            </span>
            <span>{inCount + outCount > 0 ? Math.round((outCount / (inCount + outCount)) * 100) : 50}% Outflow</span>
          </div>
        </div>

        {/* Key Metrics Banners: Net Occupancy & Total Tracked */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          {/* Card A: Net Occupancy (Prominent Green Banner) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #064e3b, #047857)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#a7f3d0',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Activity size={14} color="#34d399" />
                Net Occupancy
              </p>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: '#ecfdf5',
                }}
              >
                IN - OUT
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <h3
                style={{
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  margin: 0,
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1,
                }}
              >
                {Math.max(0, inCount - outCount)}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#d1fae5' }}>
                {inCount - outCount >= 0 ? `(+${inCount - outCount})` : `(${inCount - outCount})`} inside
              </span>
            </div>
          </div>

          {/* Card B: Total Vehicles Tracked */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                }}
              >
                Total Tracked
              </p>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.68rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <Scale size={11} />
                In-Frame: {activeCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
              <h3
                style={{
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  margin: 0,
                  color: '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1,
                }}
              >
                {inCount + outCount}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>vehicles</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Smart Parking Availability Card (100 Slots) */}
      <ParkingAvailabilityCard totalSlots={100} vehicleInOut={vehicleInOut} />

      {/* 3. Individual Vehicle Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: '0.65rem',
        }}
      >
        {statCards.map((card) => (
          <VehicleStatCard
            key={card.label}
            label={card.label}
            inCount={card.in}
            outCount={card.out}
            total={card.total}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>
    </div>
  );
};
