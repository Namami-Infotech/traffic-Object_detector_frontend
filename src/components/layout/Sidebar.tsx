import React from 'react';
import {
  Camera,
  Car,
  Users,
  ShieldCheck,
  Shield,
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Lock,
  CalendarCheck,
  CircleDollarSign,
} from 'lucide-react';
import { useAuth } from '../../modules/auth/context/AuthContext';

export interface SidebarProps {
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
  onOpenRoleModal?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  cctv: <Camera size={18} />,
  detection: <Radio size={18} />,
  users: <Users size={18} />,
  parking: <Car size={18} />,
  booking: <CalendarCheck size={18} />,
  toll: <CircleDollarSign size={18} />,
  staff: <Shield size={18} />,
  roles: <ShieldCheck size={18} />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, role, roleDetails, moduleAccess, logout } = useAuth();
  const ACTIVE_MODULE_SET = new Set(['cctv', 'detection', 'users', 'parking', 'booking', 'toll', 'staff', 'roles']);
  const rawPermitted = (moduleAccess || []).filter((m) => m && m.moduleId && ACTIVE_MODULE_SET.has(m.moduleId));
  const permittedModules = role === 'ADMIN'
    ? Array.from(ACTIVE_MODULE_SET).map((id) => {
        const found = rawPermitted.find((m) => m.moduleId === id);
        return (
          found || {
            moduleId: id,
            moduleName:
              id === 'booking'
                ? 'Vehicle Bookings'
                : id === 'parking'
                ? 'Smart Parking'
                : id === 'toll'
                ? 'Toll Management'
                : id.toUpperCase(),
            actions: ['read', 'write', 'delete'],
          }
        );
      })
    : rawPermitted;

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '260px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        flexShrink: 0,
        overflowX: 'hidden',
        color: '#f8fafc',
      }}
    >
      {/* Brand & Collapse Header */}
      <div
        style={{
          padding: isCollapsed ? '12px 12px' : '16px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '68px',
        }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                flexShrink: 0,
              }}
            >
              <Camera size={20} color="#fff" />
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
                TrafficVision AI
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Command Center
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Role Access Label */}
      {!isCollapsed && (
        <div style={{ padding: '14px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.6px' }}>
            Authorized Modules ({permittedModules.length})
          </span>
          <span
            style={{
              background: 'rgba(37, 99, 235, 0.2)',
              color: '#60a5fa',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '6px',
            }}
          >
            {role || 'ADMIN'}
          </span>
        </div>
      )}

      {/* Navigation Modules (Strictly filtered by role permissions JSON) */}
      <nav
        style={{
          flex: 1,
          padding: isCollapsed ? '10px 8px' : '8px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {permittedModules.length === 0 ? (
          <div
            style={{
              padding: '1.5rem 10px',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.8rem',
            }}
          >
            <Lock size={20} style={{ margin: '0 auto 6px' }} />
            {!isCollapsed && <div>No module access assigned to this role</div>}
          </div>
        ) : (
          permittedModules.map((mod) => {
            const isActive = activeModule === mod.moduleId;

            return (
              <button
                key={mod.moduleId}
                type="button"
                onClick={() => onSelectModule(mod.moduleId)}
                title={
                  isCollapsed
                    ? `${mod.moduleName}`
                    : mod.description || mod.moduleName
                }
                style={{
                  width: '100%',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.25), rgba(37, 99, 235, 0.08))'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(59, 130, 246, 0.4)'
                    : '1px solid transparent',
                  borderLeft: isActive
                    ? '3px solid #3b82f6'
                    : '3px solid transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  padding: isCollapsed ? '10px 0' : '10px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: '12px',
                  transition: 'all 0.18s ease',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    color: isActive ? '#38bdf8' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {MODULE_ICONS[mod.moduleId] || <Camera size={18} />}
                </div>

                {!isCollapsed && (
                  <span
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 600 : 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {mod.moduleName}
                  </span>
                )}
              </button>
            );
          })
        )}
      </nav>

      {/* User Footer Profile & Permissions Trigger */}
      <div
        style={{
          padding: isCollapsed ? '12px 8px' : '14px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        {!isCollapsed ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {(user?.firstName?.[0] || 'A').toUpperCase()}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                    {roleDetails?.displayName || role || 'System Admin'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Log out"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={logout}
              title="Logout"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
