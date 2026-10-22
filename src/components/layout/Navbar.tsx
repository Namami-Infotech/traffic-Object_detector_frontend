import React from 'react';
import {
  Camera,
  Radio,
  Users,
  Car,
  CalendarCheck,
  CircleDollarSign,
  Landmark,
  Shield,
  ShieldCheck,
  LogIn,
  Search,
  X,
  Scan,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';

export interface NavbarProps {
  activeModule?: string;
  onOpenAddCamera?: () => void;
  onOpenPlateScanner?: () => void;
  onOpenLogin?: () => void;
  onOpenRoleAccess?: () => void;
  activeCameraName?: string;
  isAiLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

const MODULE_CONFIG: Record<string, { name: string; icon: React.ReactNode }> = {
  cctv: {
    name: 'CCTV Live Surveillance',
    icon: <Camera size={22} color="#fff" />,
  },
  detection: {
    name: 'Traffic Detection & ANPR',
    icon: <Radio size={22} color="#fff" />,
  },
  parking: {
    name: 'Smart Parking',
    icon: <Car size={22} color="#fff" />,
  },
  booking: {
    name: 'Vehicle Bookings',
    icon: <CalendarCheck size={22} color="#fff" />,
  },
  toll: {
    name: 'Toll Management',
    icon: <CircleDollarSign size={22} color="#fff" />,
  },
  historicalPlaces: {
    name: 'Historical Places',
    icon: <Landmark size={22} color="#fff" />,
  },
  users: {
    name: 'User Management',
    icon: <Users size={22} color="#fff" />,
  },
  staff: {
    name: 'Staff Management',
    icon: <Shield size={22} color="#fff" />,
  },
  roles: {
    name: 'Role & Permissions',
    icon: <ShieldCheck size={22} color="#fff" />,
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeModule = 'cctv',
  onOpenAddCamera,
  onOpenPlateScanner,
  onOpenLogin,
  isAiLoading,
  searchTerm = '',
  onSearchChange,
}) => {
  const { isAuthenticated, moduleAccess } = useAuth();

  const currentAccess = moduleAccess?.find((m) => m.moduleId === activeModule);
  const currentConfig = (activeModule && MODULE_CONFIG[activeModule]) || {
    name: 'TrafficVision AI',
    icon: <Camera size={22} color="#fff" />,
  };
  const activeTitle = currentAccess?.moduleName || currentConfig.name;
  const activeIcon = currentConfig.icon;

  const searchPlaceholder =
    activeModule === 'cctv'
      ? 'Search camera, location...'
      : activeModule === 'detection'
      ? 'Search vehicles, plates, cameras...'
      : activeModule === 'parking'
      ? 'Search parking lots, bays...'
      : activeModule === 'booking'
      ? 'Search vehicle number, name...'
      : activeModule === 'toll'
      ? 'Search toll transactions, plates...'
      : activeModule === 'historicalPlaces'
      ? 'Search historical places...'
      : activeModule === 'users'
      ? 'Search users by name, email...'
      : activeModule === 'staff'
      ? 'Search staff members...'
      : activeModule === 'roles'
      ? 'Search role permissions...'
      : 'Search in module...';

  return (
    <header className="glass-panel navbar-header">
      <div className="navbar-brand">
        <div
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
          {activeIcon}
        </div>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)', margin: 0 }}>
            {activeTitle}
          </h1>
        </div>
      </div>

      <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Dynamic Module Actions Slot (teleported from active views) */}
        <div id="navbar-module-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} />

        {/* Module Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 12px',
            gap: '8px',
            minWidth: '220px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.84rem',
              width: '100%',
              color: 'var(--text-primary)',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Scan Plate (ANPR) Button */}
        {onOpenPlateScanner && activeModule === 'cctv' && (
          <button
            type="button"
            onClick={onOpenPlateScanner}
            title="Open ANPR Plate Scanner"
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '7px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <Scan size={15} color="var(--accent-blue)" />
            <span>Scan Plate (ANPR)</span>
          </button>
        )}

        {/* Add CCTV Camera Button */}
        {onOpenAddCamera && activeModule === 'cctv' && (
          <button
            type="button"
            onClick={onOpenAddCamera}
            title="Add CCTV Camera"
            style={{
              background: 'var(--accent-blue)',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Plus size={15} />
            <span>Add Camera</span>
          </button>
        )}

        {/* AI Loading Status Badge */}
        {isAiLoading && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--accent-blue)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#2563eb',
                display: 'inline-block',
                boxShadow: '0 0 8px #2563eb',
              }}
            />
            AI Active
          </div>
        )}

        {/* Login Button for unauthenticated */}
        {!isAuthenticated && (
          <button
            type="button"
            onClick={onOpenLogin}
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <LogIn size={16} color="#38bdf8" />
            Login (Admin)
          </button>
        )}
      </div>
    </header>
  );
};
