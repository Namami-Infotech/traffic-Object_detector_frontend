import React, { useState, useEffect, useRef } from 'react';
import {
  CircleParking,
  Car,
  Bus,
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  X,
  Ban,
  BellRing,
} from 'lucide-react';

export interface ParkingAvailabilityCardProps {
  /**
   * Total parking slot capacity (default: 100 slots)
   */
  totalSlots?: number;
  /**
   * Vehicle in/out counts record (from live detection stream)
   */
  vehicleInOut?: Record<string, { in: number; out: number }>;
}

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  timestamp: string;
}

/**
 * Smart Parking Availability Card
 *
 * Rules:
 * - Total Capacity = 100 slots (configurable)
 * - Car / Bus / Person passes IN  => -1 from Free Slots (+1 Occupied)
 * - Car / Bus / Person passes OUT => +1 to Free Slots (-1 Occupied)
 * - If parking is FULL (0 Free Slots) and an IN event occurs => Pops up alert Toast "Parking Not Available!"
 */
export const ParkingAvailabilityCard: React.FC<ParkingAvailabilityCardProps> = ({
  totalSlots = 100,
  vehicleInOut,
}) => {
  // Counts for Cars, Buses, and Persons
  const carIn = vehicleInOut?.CAR?.in || 0;
  const carOut = vehicleInOut?.CAR?.out || 0;

  const busIn = vehicleInOut?.BUS?.in || 0;
  const busOut = vehicleInOut?.BUS?.out || 0;

  const personIn = vehicleInOut?.PERSON?.in || 0;
  const personOut = vehicleInOut?.PERSON?.out || 0;

  // Total eligible entries and exits (Car + Bus + Person)
  const totalEntered = carIn + busIn + personIn;
  const totalExited = carOut + busOut + personOut;

  // Net occupied slots (bounded between 0 and totalSlots)
  const occupiedSlots = Math.max(0, Math.min(totalSlots, totalEntered - totalExited));

  // Available free slots (100 - occupiedSlots)
  const freeSlots = Math.max(0, totalSlots - occupiedSlots);

  // Occupancy percentage
  const occupancyPercentage = Math.min(100, Math.round((occupiedSlots / totalSlots) * 100));

  // Active Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Ref to track prior totalEntered to detect NEW entries
  const prevEnteredRef = useRef<number>(totalEntered);
  const isInitialMount = useRef<boolean>(true);

  // Play a subtle Web Audio beep on full parking entry attempt
  const playAlertBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const triggerParkingFullToast = (customNote?: string) => {
    playAlertBeep();
    const newToast: ToastMessage = {
      id: Date.now(),
      title: '🚫 Parking Not Available!',
      message: customNote || 'Parking is 100% full (100/100 slots occupied). No free space left!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  };

  // Watch for new IN events when parking is full
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevEnteredRef.current = totalEntered;
      return;
    }

    if (totalEntered > prevEnteredRef.current) {
      // If freeSlots is 0 or occupied is at capacity
      if (freeSlots === 0 || occupiedSlots >= totalSlots) {
        triggerParkingFullToast('New IN entry detected, but Parking is 100% FULL! Entry not available.');
      }
    }

    prevEnteredRef.current = totalEntered;
  }, [totalEntered, freeSlots, occupiedSlots, totalSlots]);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Status configuration for card display
  let statusColor = '#10b981'; // Green
  let statusBg = '#ecfdf5';
  let statusText = 'Available';
  let StatusIcon = CheckCircle2;

  if (freeSlots === 0) {
    statusColor = '#ef4444'; // Red
    statusBg = '#fef2f2';
    statusText = 'PARKING FULL';
    StatusIcon = ShieldAlert;
  } else if (freeSlots <= 20) {
    statusColor = '#f59e0b'; // Amber
    statusBg = '#fffbeb';
    statusText = 'Filling Fast';
    StatusIcon = AlertTriangle;
  }

  return (
    <>
      {/* Floating Alert Toasts Container (Top-Right of Viewport) */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '400px',
            width: 'calc(100vw - 48px)',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                color: '#ffffff',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                padding: '1rem 1.15rem',
                boxShadow: '0 12px 30px rgba(220, 38, 38, 0.4), 0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ban size={22} color="#fecaca" />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#fee2e2',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {t.title}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: '#fca5a5', fontVariantNumeric: 'tabular-nums' }}>
                    {t.timestamp}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#ffffff', lineHeight: 1.35 }}>
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.85,
                  transition: 'opacity 0.2s',
                }}
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Parking Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          marginTop: '1rem',
          borderRadius: '14px',
          border: freeSlots === 0 ? '1.5px solid #ef4444' : '1px solid var(--border-color)',
          boxShadow: freeSlots === 0 ? '0 4px 20px rgba(239, 68, 68, 0.12)' : '0 4px 18px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease',
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
                background: freeSlots === 0 ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: freeSlots === 0 ? '0 2px 8px rgba(220, 38, 38, 0.3)' : '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              <CircleParking size={22} />
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
                Smart Parking Occupancy
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Auto-tracked via Car, Bus & Person IN / OUT Detection
              </p>
            </div>
          </div>

          {/* Right Action: Status Badge + Test Toast Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: statusBg,
                color: statusColor,
                border: `1px solid ${statusColor}33`,
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              <StatusIcon size={14} />
              <span>{statusText}</span>
            </div>

            {/* Test Simulation Button */}
            <button
              type="button"
              onClick={() => triggerParkingFullToast('Simulated Alert: Parking Full! No slots available.')}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '4px 9px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
              title="Test Parking Full Toast Alert"
            >
              <BellRing size={12} />
              Test Toast
            </button>
          </div>
        </div>

        {/* Main Dual Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          {/* Available / Free Slots Card */}
          <div
            style={{
              background: freeSlots === 0 ? 'linear-gradient(135deg, #7f1d1d, #991b1b)' : 'linear-gradient(135deg, #065f46, #047857)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              boxShadow: freeSlots === 0 ? '0 4px 12px rgba(220, 38, 38, 0.2)' : '0 4px 12px rgba(5, 150, 105, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: freeSlots === 0 ? '#fca5a5' : '#a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                FREE SLOTS
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}
              >
                {freeSlots === 0 ? 'NO SPACE' : 'Available'}
              </span>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '2.3rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: freeSlots === 0 ? '#fecaca' : '#ffffff',
                }}
              >
                {freeSlots}
              </span>
              <span style={{ fontSize: '0.85rem', color: freeSlots === 0 ? '#fca5a5' : '#d1fae5', fontWeight: 600 }}>
                / {totalSlots}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: freeSlots === 0 ? '#fca5a5' : '#a7f3d0', margin: '6px 0 0 0' }}>
              -1 when Car, Bus or Person enters
            </p>
          </div>

          {/* Occupied Slots Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                OCCUPIED SLOTS
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                }}
              >
                {occupancyPercentage}% Full
              </span>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '2.3rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  color: occupiedSlots >= totalSlots ? '#f87171' : occupiedSlots > 80 ? '#fbbf24' : '#ffffff',
                }}
              >
                {occupiedSlots}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
                / {totalSlots}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '6px 0 0 0' }}>
              +1 when Car, Bus or Person exits
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)',
              marginBottom: '5px',
              fontWeight: 600,
            }}
          >
            <span>Slot Utilization</span>
            <span>
              {occupiedSlots} Occupied / {freeSlots} Available
            </span>
          </div>
          <div
            style={{
              height: '10px',
              width: '100%',
              backgroundColor: '#e2e8f0',
              borderRadius: '6px',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${occupancyPercentage}%`,
                backgroundColor: occupiedSlots >= totalSlots ? '#ef4444' : occupiedSlots > 75 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s ease, background-color 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Detailed Flow Breakdown (Cars, Buses & Persons) */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            fontSize: '0.78rem',
          }}
        >
          {/* Cars Flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '5px',
                borderRadius: '6px',
                display: 'flex',
              }}
            >
              <Car size={15} />
            </div>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Cars: </span>
              <span style={{ color: '#059669', fontWeight: 600 }}>+{carIn}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{carOut}</span>
            </div>
          </div>

          {/* Buses Flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: '#fffbeb',
                color: '#d97706',
                padding: '5px',
                borderRadius: '6px',
                display: 'flex',
              }}
            >
              <Bus size={15} />
            </div>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Buses: </span>
              <span style={{ color: '#059669', fontWeight: 600 }}>+{busIn}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{busOut}</span>
            </div>
          </div>

          {/* Persons Flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: '#ecfeff',
                color: '#0891b2',
                padding: '5px',
                borderRadius: '6px',
                display: 'flex',
              }}
            >
              <Users size={15} />
            </div>
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Persons: </span>
              <span style={{ color: '#059669', fontWeight: 600 }}>+{personIn}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{personOut}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
