import React, { useState } from 'react';
import {
  X,
  Shield,
  Layers,
  CheckCircle2,
  Code2,
  LogOut,
  Camera,
  Activity,
  AlertTriangle,
  Radio,
  Car,
  FileWarning,
  Users,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RoleAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  dashboard: <Activity size={18} color="#38bdf8" />,
  cctv: <Camera size={18} color="#34d399" />,
  detection: <Radio size={18} color="#a78bfa" />,
  violations: <AlertTriangle size={18} color="#fbbf24" />,
  signals: <Settings size={18} color="#f472b6" />,
  vehicles: <Car size={18} color="#60a5fa" />,
  incidents: <FileWarning size={18} color="#f87171" />,
  users: <Users size={18} color="#818cf8" />,
  roles: <ShieldCheck size={18} color="#4ade80" />,
  audit: <Shield size={18} color="#fb923c" />,
};

export const RoleAccessModal: React.FC<RoleAccessModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const { user, role, roleDetails, moduleAccess, logout, isAuthenticated } = useAuth();
  const [showJson, setShowJson] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(37, 99, 235, 0.2)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.18), transparent)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Shield size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                User Role & Module Access
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Active permissions loaded from database JSON
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {isAuthenticated && user ? (
            <>
              {/* User Profile & Role Card */}
              <div
                style={{
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                      {user.firstName} {user.lastName}
                    </span>
                    <span
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {role || 'ADMIN'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    ID / Email: <strong style={{ color: '#cbd5e1' }}>{user.email}</strong>
                  </div>
                  {roleDetails?.displayName && (
                    <div style={{ fontSize: '0.78rem', color: '#60a5fa', marginTop: '2px' }}>
                      Role Title: {roleDetails.displayName}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>

              {/* Module Access Section Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={17} color="#60a5fa" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Assigned Modules ({moduleAccess.length})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowJson(!showJson)}
                  style={{
                    background: showJson ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Code2 size={13} />
                  {showJson ? 'Show Cards' : 'View Saved JSON'}
                </button>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>
                💡 <em>&quot;Jis role me jo jo module ho wahi save aur show hoga&quot;</em> — Only the authorized modules configured for this role are displayed.
              </p>

              {/* JSON View or Cards View */}
              {showJson ? (
                <div
                  style={{
                    background: '#090d16',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '0.76rem',
                    fontFamily: 'monospace',
                    color: '#a5f3fc',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {JSON.stringify(moduleAccess, null, 2)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {moduleAccess.length === 0 ? (
                    <div
                      style={{
                        padding: '1.5rem',
                        textAlign: 'center',
                        color: '#94a3b8',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '10px',
                      }}
                    >
                      No modules assigned to this role yet.
                    </div>
                  ) : (
                    moduleAccess.map((mod) => (
                      <div
                        key={mod.moduleId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {MODULE_ICONS[mod.moduleId] || <CheckCircle2 size={16} color="#34d399" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                              {mod.moduleName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              Module Key: <code>{mod.moduleId}</code>
                            </div>
                          </div>
                        </div>

                        {/* Allowed Actions */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {mod.actions?.map((act) => (
                            <span
                              key={act}
                              style={{
                                background:
                                  act === 'delete'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : act === 'write'
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(16, 185, 129, 0.2)',
                                color:
                                  act === 'delete'
                                    ? '#fca5a5'
                                    : act === 'write'
                                    ? '#fcd34d'
                                    : '#6ee7b7',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            /* Not Logged In State */
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <ShieldCheck size={48} color="#60a5fa" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
                You are currently in Guest Mode
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                Log in as <strong>Admin</strong> (ID: <code>admin</code> / Password: <code>123456</code>) to verify full module access.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                }}
              >
                Open Admin Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
