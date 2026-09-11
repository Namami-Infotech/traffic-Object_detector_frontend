import React from 'react';
import { Car, Bus, Truck, Bike, Users, Activity, ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';

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
      <div className="glass-panel" style={{ padding: '1.2rem', marginTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              📊 Total Traffic Stats (All Cameras)
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
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
            All Cameras Total:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.15rem', fontWeight: 800 }}>
            <span style={{ color: '#059669' }}>{inCount}</span>
            <span style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>/</span>
            <span style={{ color: '#dc2626' }}>{outCount}</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>
              (<span style={{ color: '#059669' }}>IN</span> / <span style={{ color: '#dc2626' }}>OUT</span>)
            </span>
          </div>
        </div>
        {/* Net Occupancy (Prominent Hero Stat) */}
        <div
          style={{
            marginTop: '0.8rem',
            marginBottom: '0.8rem',
            padding: '0.9rem 1.1rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1.5px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <Scale size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Net Occupancy
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Active in premises
              </div>
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
            {inCount - outCount}
          </div>
        </div>

        {/* IN / OUT Compact Counters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem' }}>

          {/* IN Count Card */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.5rem 0.6rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#15803d' }}>
              <ArrowDownRight size={15} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>TOTAL IN</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
              {inCount}
            </div>
          </div>

          {/* OUT Count Card */}
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.5rem 0.6rem',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#b91c1c' }}>
              <ArrowUpRight size={15} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>TOTAL OUT</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
              {outCount}
            </div>
          </div>

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
                  backgroundColor: `${item.color}15`,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2 }}>
                <span style={{ color: '#059669' }}>{item.in}</span>
                <span style={{ color: '#cbd5e1', margin: '0 4px', fontWeight: 400 }}>/</span>
                <span style={{ color: '#dc2626' }}>{item.out}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: '4px', fontWeight: 700 }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                (<span style={{ color: '#059669' }}>IN</span> / <span style={{ color: '#dc2626' }}>OUT</span>)
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
