import React from 'react';
import { Car, Bus, Truck, Bike, Users, Activity, ArrowDownRight, ArrowUpRight, ShieldCheck, Scale, Database } from 'lucide-react';

interface TrafficAnalyticsProps {
  counts: Record<string, number>;
  vehicleInOut?: Record<string, { in: number; out: number; total?: number }>;
  inCount?: number;
  outCount?: number;
  activeCount?: number;
}

export const TrafficAnalytics: React.FC<TrafficAnalyticsProps> = ({
  counts,
  vehicleInOut,
  inCount = 0,
  outCount = 0,
  activeCount = 0,
}) => {
  const totalVehicles =
    (counts.car || counts.CAR || 0) +
    (counts.bus || counts.BUS || 0) +
    (counts.truck || counts.TRUCK || 0) +
    (counts.motorcycle || counts.MOTORCYCLE || 0);

  const totalInFrame = activeCount || totalVehicles + (counts.person || counts.PERSON || 0);

  // Traffic density calculation
  let densityLabel = 'Low Traffic';
  let densityBadgeClass = 'badge-live';

  if (totalInFrame > 6 && totalInFrame <= 12) {
    densityLabel = 'Moderate Traffic';
    densityBadgeClass = 'badge-warning';
  } else if (totalInFrame > 12) {
    densityLabel = 'Heavy Congestion';
    densityBadgeClass = 'badge-danger';
  }

  const statCards = [
    {
      label: 'Cars',
      in: vehicleInOut?.CAR?.in || 0,
      out: vehicleInOut?.CAR?.out || 0,
      total: counts.CAR || counts.car || (vehicleInOut?.CAR?.in || 0) + (vehicleInOut?.CAR?.out || 0),
      icon: Car,
      color: '#10b981',
    },
    {
      label: 'Buses',
      in: vehicleInOut?.BUS?.in || 0,
      out: vehicleInOut?.BUS?.out || 0,
      total: counts.BUS || counts.bus || (vehicleInOut?.BUS?.in || 0) + (vehicleInOut?.BUS?.out || 0),
      icon: Bus,
      color: '#f59e0b',
    },
    {
      label: 'Trucks',
      in: vehicleInOut?.TRUCK?.in || 0,
      out: vehicleInOut?.TRUCK?.out || 0,
      total: counts.TRUCK || counts.truck || (vehicleInOut?.TRUCK?.in || 0) + (vehicleInOut?.TRUCK?.out || 0),
      icon: Truck,
      color: '#ef4444',
    },
    {
      label: 'Motorcycles',
      in: vehicleInOut?.MOTORCYCLE?.in || 0,
      out: vehicleInOut?.MOTORCYCLE?.out || 0,
      total: counts.MOTORCYCLE || counts.motorcycle || (vehicleInOut?.MOTORCYCLE?.in || 0) + (vehicleInOut?.MOTORCYCLE?.out || 0),
      icon: Bike,
      color: '#8b5cf6',
    },
    {
      label: 'Pedestrians',
      in: vehicleInOut?.PERSON?.in || 0,
      out: vehicleInOut?.PERSON?.out || 0,
      total: counts.PERSON || counts.person || (vehicleInOut?.PERSON?.in || 0) + (vehicleInOut?.PERSON?.out || 0),
      icon: Users,
      color: '#06b6d4',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* 1. VIRTUAL LINE IN / OUT SUMMARY CARDS */}
      <div className="glass-panel" style={{ padding: '1.2rem', marginTop:'3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem'  }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              📊 Total Traffic Stats (All Cameras)
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Database size={11} /> MySQL DB Synced
            </span>
          </div>
          <div className={`badge ${densityBadgeClass}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            <Activity size={14} />
            <span>{densityLabel}</span>
          </div>
        </div>

        {/* Global IN / OUT Combined Ratio Banner */}
        <div
          style={{
            marginBottom: '0.8rem',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            All Cameras Total:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.15rem', fontWeight: 800 }}>
            <span style={{ color: '#10b981' }}>{inCount}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>/</span>
            <span style={{ color: '#ef4444' }}>{outCount}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginLeft: '4px' }}>
              (IN / OUT)
            </span>
          </div>
        </div>

        {/* IN / OUT Big Counters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>

          {/* IN Count Card */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              padding: '0.9rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981' }}>
              <ArrowDownRight size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>TOTAL IN</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {inCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(16, 185, 129, 0.8)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
              <Database size={10} /> Saved in MySQL
            </div>
          </div>

          {/* OUT Count Card */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '0.9rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ef4444' }}>
              <ArrowUpRight size={20} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>TOTAL OUT</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
              {outCount}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(239, 68, 68, 0.8)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
              <Database size={10} /> Saved in MySQL
            </div>
          </div>

        </div>

        {/* Net Flow & In-Frame Sub-stats */}
        <div
          style={{
            marginTop: '0.8rem',
            paddingTop: '0.8rem',
            borderTop: '1px dashed var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Scale size={15} color="#60a5fa" />
            <span>Net Occupancy: <strong style={{ color: '#60a5fa' }}>{inCount - outCount}</strong></span>
          </div>

          <div>
            Active in Frame: <strong style={{ color: 'var(--text-primary)' }}>{totalInFrame}</strong>
          </div>
        </div>

        {/* De-duplication Protection Indicator */}
        <div
          style={{
            marginTop: '0.8rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '0.75rem',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} />
          <span>Anti-Duplicate Tracking Active (Stable objects won't re-trigger)</span>
        </div>
      </div>

      {/* 2. OBJECT CLASS BREAKDOWN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.8rem' }}>
        {statCards.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="glass-panel" style={{ padding: '0.8rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: `${item.color}20`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                <span style={{ color: '#10b981' }}>{item.in}</span>
                <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>/</span>
                <span style={{ color: '#ef4444' }}>{item.out}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                (IN / OUT)
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
