import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Search, RefreshCw, X, Eye, Edit3 } from 'lucide-react';
import { rolesApi } from '../../services/api';

export interface ModulePermissionFormItem {
  id: string;
  name: string;
  desc: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

const SYSTEM_MODULES_CONFIG: ModulePermissionFormItem[] = [
  { id: 'cctv', name: 'CCTV Surveillance', desc: 'Live multi-camera grid & RTSP video streaming', read: true, write: true, delete: false },
  { id: 'detection', name: 'Traffic Detection & ANPR', desc: 'Vehicle classification, IN/OUT direction & plate scanning', read: true, write: true, delete: false },
  { id: 'parking', name: 'Smart Parking Management', desc: 'Parking areas, slot matrix, hourly rates & occupancy', read: true, write: true, delete: false },
  { id: 'booking', name: 'Parking Bookings', desc: 'Vehicle reservations, driver details, start/end dates & schedule', read: true, write: true, delete: false },
  { id: 'toll', name: 'Toll Management', desc: 'Toll plaza name & per entry charge management', read: true, write: true, delete: false },
  { id: 'users', name: 'User Management', desc: 'Public citizens & regular registered user accounts', read: true, write: true, delete: false },
  { id: 'staff', name: 'Staff Management', desc: 'Police officers, admins & parking operator staff', read: true, write: true, delete: false },
  { id: 'roles', name: 'Role & Module Access', desc: 'Role definitions, granular module & action permissions', read: true, write: false, delete: false },
];

export interface RolesViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

export const RolesView: React.FC<RolesViewProps> = ({
  canWrite = false,
}) => {
  const [backendRoles, setBackendRoles] = useState<any[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDisplay, setNewRoleDisplay] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState<ModulePermissionFormItem[]>(SYSTEM_MODULES_CONFIG);
  const [isRoleSaving, setIsRoleSaving] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await rolesApi.getAll();
      if (res.success && res.data) {
        setBackendRoles(res.data);
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenAddRole = () => {
    setEditingRoleId(null);
    setNewRoleDisplay('');
    setNewRoleName('');
    setNewRoleDescription('');
    setRolePermissions(SYSTEM_MODULES_CONFIG);
    setIsAddRoleOpen(true);
  };

  const handleOpenEditRole = (role: any) => {
    setEditingRoleId(role.id);
    setNewRoleDisplay(role.displayName || role.name || '');
    setNewRoleName(role.name || '');
    setNewRoleDescription(role.description || '');

    const accessList: any[] = Array.isArray(role.moduleAccess) ? role.moduleAccess : [];
    const updated = SYSTEM_MODULES_CONFIG.map((sysMod) => {
      const found = accessList.find((m) => {
        const mId = typeof m === 'string' ? m : m?.moduleId;
        return mId === sysMod.id;
      });

      if (!found) {
        return { ...sysMod, read: false, write: false, delete: false };
      }

      if (typeof found === 'string') {
        return { ...sysMod, read: true, write: true, delete: true };
      }

      const actions: string[] = Array.isArray(found.actions) ? found.actions : [];
      const hasAll = actions.includes('all') || actions.includes('*');
      return {
        ...sysMod,
        read: hasAll || actions.includes('read'),
        write: hasAll || actions.includes('write'),
        delete: hasAll || actions.includes('delete'),
      };
    });

    setRolePermissions(updated);
    setIsAddRoleOpen(true);
  };

  const handleTogglePermission = (modId: string, action: 'read' | 'write' | 'delete') => {
    setRolePermissions((prev) =>
      prev.map((mod) => {
        if (mod.id !== modId) return mod;
        const currentVal = mod[action];
        const nextVal = !currentVal;
        const updated = { ...mod, [action]: nextVal };
        if ((action === 'write' || action === 'delete') && nextVal) {
          updated.read = true;
        }
        if (action === 'read' && !nextVal) {
          updated.write = false;
          updated.delete = false;
        }
        return updated;
      })
    );
  };

  const handleSetAllPermissions = (mode: 'FULL' | 'READ' | 'CLEAR') => {
    setRolePermissions((prev) =>
      prev.map((mod) => {
        if (mode === 'FULL') return { ...mod, read: true, write: true, delete: true };
        if (mode === 'READ') return { ...mod, read: true, write: false, delete: false };
        return { ...mod, read: false, write: false, delete: false };
      })
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoleName = (newRoleName.trim() || newRoleDisplay.trim())
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);

    if (!newRoleDisplay.trim() || (!editingRoleId && !finalRoleName)) {
      alert('Role name is required');
      return;
    }

    const moduleAccessPayload = rolePermissions
      .filter((p) => p.read || p.write || p.delete)
      .map((p) => {
        const actions: string[] = [];
        if (p.read) actions.push('read');
        if (p.write) actions.push('write');
        if (p.delete) actions.push('delete');
        return {
          moduleId: p.id,
          moduleName: p.name,
          actions,
        };
      });

    if (moduleAccessPayload.length === 0) {
      alert('Please check at least one module permission (Read, Write, or Delete).');
      return;
    }

    setIsRoleSaving(true);
    try {
      if (editingRoleId) {
        const res = await rolesApi.update(editingRoleId, {
          displayName: newRoleDisplay.trim(),
          description: newRoleDescription.trim() || undefined,
          moduleAccess: moduleAccessPayload,
        });
        if (res.success) {
          setIsAddRoleOpen(false);
          setEditingRoleId(null);
          setNewRoleName('');
          setNewRoleDisplay('');
          setNewRoleDescription('');
          fetchRoles();
        }
      } else {
        const res = await rolesApi.create({
          name: finalRoleName,
          displayName: newRoleDisplay.trim(),
          description: newRoleDescription.trim() || undefined,
          moduleAccess: moduleAccessPayload,
        });
        if (res.success) {
          setIsAddRoleOpen(false);
          setEditingRoleId(null);
          setNewRoleName('');
          setNewRoleDisplay('');
          setNewRoleDescription('');
          fetchRoles();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save role');
    } finally {
      setIsRoleSaving(false);
    }
  };



  const filteredRoles = backendRoles.filter((r) => {
    const q = roleSearch.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.displayName?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Roles Main Panel */}
      <div className="glass-panel" style={{ padding: '0.8rem', overflow: 'hidden' }}>


        {/* Create / Edit Role Modal with Granular Read / Write / Delete Checkboxes Table */}
        {isAddRoleOpen && canWrite && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(4px)',
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAddRoleOpen(false);
                setEditingRoleId(null);
              }
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '680px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#ffffff',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {editingRoleId ? 'Edit Role' : 'Create New Role'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddRoleOpen(false);
                    setEditingRoleId(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Role Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Parking Gate Operator"
                    value={newRoleDisplay}
                    onChange={(e) => {
                      setNewRoleDisplay(e.target.value);
                      setNewRoleName(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').replace(/_+/g, '_'));
                    }}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  />
                </div>

                {/* Matrix Header & Batch Actions */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Module Permission Checkbox Matrix:
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleSetAllPermissions('FULL')}
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Select All Full Access
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllPermissions('READ')}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Select All Read Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetAllPermissions('CLEAR')}
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Granular Permission Table */}
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '7px 8px', color: 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase' }}>Module</th>
                          <th style={{ width: '80px', padding: '7px 4px', color: '#059669', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Eye size={13} /> Read
                            </span>
                          </th>
                          <th style={{ width: '80px', padding: '7px 4px', color: '#d97706', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Edit3 size={13} /> Write
                            </span>
                          </th>
                          <th style={{ width: '80px', padding: '7px 4px', color: '#dc2626', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Trash2 size={13} /> Delete
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rolePermissions.map((mod) => {
                          const hasAny = mod.read || mod.write || mod.delete;

                          return (
                            <tr
                              key={mod.id}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                background: hasAny ? '#f8fafc' : '#ffffff',
                              }}
                            >
                              <td style={{ padding: '7px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      width: '7px',
                                      height: '7px',
                                      borderRadius: '50%',
                                      background: hasAny ? '#10b981' : '#94a3b8',
                                    }}
                                  />
                                  {mod.name}
                                </div>
                              </td>

                              {/* Read Checkbox */}
                              <td style={{ width: '80px', padding: '7px 4px', textAlign: 'center' }}>
                                <label
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    padding: '3px 7px',
                                    borderRadius: '5px',
                                    background: mod.read ? '#ecfdf5' : '#ffffff',
                                    border: mod.read ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={mod.read}
                                    onChange={() => handleTogglePermission(mod.id, 'read')}
                                    style={{ accentColor: '#10b981', cursor: 'pointer', width: '13px', height: '13px' }}
                                  />
                                  <span style={{ fontSize: '0.73rem', fontWeight: 700, color: mod.read ? '#059669' : 'var(--text-muted)' }}>Read</span>
                                </label>
                              </td>

                              {/* Write Checkbox */}
                              <td style={{ width: '80px', padding: '7px 4px', textAlign: 'center' }}>
                                <label
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    padding: '3px 7px',
                                    borderRadius: '5px',
                                    background: mod.write ? '#fffbeb' : '#ffffff',
                                    border: mod.write ? '1px solid #fde68a' : '1px solid var(--border-color)',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={mod.write}
                                    onChange={() => handleTogglePermission(mod.id, 'write')}
                                    style={{ accentColor: '#f59e0b', cursor: 'pointer', width: '13px', height: '13px' }}
                                  />
                                  <span style={{ fontSize: '0.73rem', fontWeight: 700, color: mod.write ? '#d97706' : 'var(--text-muted)' }}>Write</span>
                                </label>
                              </td>

                              {/* Delete Checkbox */}
                              <td style={{ width: '80px', padding: '7px 4px', textAlign: 'center' }}>
                                <label
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    padding: '3px 7px',
                                    borderRadius: '5px',
                                    background: mod.delete ? '#fef2f2' : '#ffffff',
                                    border: mod.delete ? '1px solid #fecaca' : '1px solid var(--border-color)',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={mod.delete}
                                    onChange={() => handleTogglePermission(mod.id, 'delete')}
                                    style={{ accentColor: '#ef4444', cursor: 'pointer', width: '13px', height: '13px' }}
                                  />
                                  <span style={{ fontSize: '0.73rem', fontWeight: 700, color: mod.delete ? '#dc2626' : 'var(--text-muted)' }}>Delete</span>
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddRoleOpen(false);
                      setEditingRoleId(null);
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      padding: '9px 16px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRoleSaving}
                    style={{
                      background: 'var(--accent-blue)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 18px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      cursor: isRoleSaving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isRoleSaving
                      ? 'Saving...'
                      : editingRoleId
                        ? 'Update Role'
                        : 'Save Role '}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Unified Table Controls & Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            background: '#f8fafc',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px 10px',
              minWidth: '220px',
              maxWidth: '320px',
              flex: '1 1 auto',
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search roles by name or description..."
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.8rem',
                width: '100%',
                color: 'var(--text-primary)',
              }}
            />
            {roleSearch && (
              <button
                type="button"
                onClick={() => setRoleSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchRoles}
              title="Refresh Roles"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={handleOpenAddRole}
                style={{
                  background: 'var(--accent-blue)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} />
                + Add New Role
              </button>
            )}
          </div>
        </div>

        {/* Roles Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', background: '#f8fafc' }}>
                <th style={{ padding: '8px 8px', width: '38px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Role Code</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Display Title</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Authorized Modules &amp; Permissions</th>
                <th style={{ padding: '8px 8px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No roles found matching &quot;{roleSearch}&quot;
                  </td>
                </tr>
              ) : (
                filteredRoles.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: r.isSystem ? '#eff6ff' : '#faf5ff',
                            color: r.isSystem ? '#2563eb' : '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Shield size={15} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.3px' }}>{r.name}</div>
                          {r.description && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {r.displayName}
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span
                        style={{
                          background: r.isSystem ? '#eff6ff' : '#faf5ff',
                          color: r.isSystem ? '#1d4ed8' : '#7c3aed',
                          border: r.isSystem ? '1px solid #bfdbfe' : '1px solid #e9d5ff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {r.isSystem ? 'System Core' : 'Custom RBAC'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {r.moduleAccess && r.moduleAccess.length > 0 ? (
                          r.moduleAccess.map((m: any, mIdx: number) => {
                            const modId = typeof m === 'string' ? m : m.moduleId;
                            const actions = typeof m === 'object' && m.actions ? m.actions : ['all'];
                            return (
                              <div
                                key={mIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <span>{modId}</span>
                                <div style={{ display: 'inline-flex', gap: '2px' }}>
                                  {actions.includes('read') && (
                                    <span
                                      style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        background: '#ecfdf5',
                                        color: '#059669',
                                        border: '1px solid #a7f3d0',
                                        padding: '1px 3px',
                                        borderRadius: '3px',
                                      }}
                                    >
                                      R
                                    </span>
                                  )}
                                  {actions.includes('write') && (
                                    <span
                                      style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        background: '#fffbeb',
                                        color: '#d97706',
                                        border: '1px solid #fde68a',
                                        padding: '1px 3px',
                                        borderRadius: '3px',
                                      }}
                                    >
                                      W
                                    </span>
                                  )}
                                  {actions.includes('delete') && (
                                    <span
                                      style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fecaca',
                                        padding: '1px 3px',
                                        borderRadius: '3px',
                                      }}
                                    >
                                      D
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>No modules assigned</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(r)}
                        title="Edit Role & Permissions"
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                        }}
                      >
                        <Edit3 size={13} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
