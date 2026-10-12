import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Search, RefreshCw, X } from 'lucide-react';
import { staffApi } from '../../services/api';

export interface StaffViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

export const StaffView: React.FC<StaffViewProps> = ({
  canWrite = false,
  canDelete = false,
}) => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'POLICE' | 'ADMIN' | 'PARKING'>('ALL');
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    badgeNumber: '',
    role: 'POLICE',
    password: '',
  });

  const fetchStaff = async () => {
    setIsStaffLoading(true);
    try {
      const res = await staffApi.getAll();
      if (res.success && res.data) {
        setStaffList(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffData.email || !newStaffData.firstName) return;
    try {
      const res = await staffApi.create(newStaffData);
      if (res.success) {
        setIsAddStaffOpen(false);
        setNewStaffData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          badgeNumber: '',
          role: 'POLICE',
          password: '',
        });
        fetchStaff();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create staff member');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await staffApi.delete(id);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff member');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchRole =
      staffFilter === 'ALL' ||
      (staffFilter === 'POLICE' && (s.role === 'POLICE' || s.role === 'TRAFFIC_POLICE')) ||
      (staffFilter === 'ADMIN' && s.role === 'ADMIN') ||
      (staffFilter === 'PARKING' && s.role === 'PARKING');

    const q = staffSearch.toLowerCase();
    const matchSearch =
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.badgeNumber?.toLowerCase().includes(q);

    return matchRole && matchSearch;
  });

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Staff Table Panel */}
      <div className="glass-panel" style={{ padding: '0.8rem', overflow: 'hidden' }}>
        {/* Header Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Staff Management (Police, Admin, Parking)
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              {filteredStaff.length} Records
            </span>
          </div>

          {/* Action buttons: Refresh, Add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchStaff}
              disabled={isStaffLoading}
              title="Refresh Staff"
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
              <RefreshCw size={13} className={isStaffLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(true)}
                style={{
                  background: 'var(--accent-blue)',
                  border: 'none',
                  color: '#ffffff',
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
                Add Staff Member
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar (Search + Role Pills) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '200px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search staff by badge, name, email..."
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.82rem',
                width: '100%',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Role Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['ALL', 'POLICE', 'ADMIN', 'PARKING'] as const).map((rTab) => {
              const isSelected = staffFilter === rTab;
              return (
                <button
                  key={rTab}
                  type="button"
                  onClick={() => setStaffFilter(rTab)}
                  style={{
                    background: isSelected ? 'var(--accent-blue)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {rTab === 'ALL' ? 'All' : rTab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Staff Table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Badge ID</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Staff Member</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Phone</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Status</th>
                {canDelete && <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {isStaffLoading ? 'Loading staff...' : 'No staff members found matching filter.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '8px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        {s.badgeNumber || '—'}
                      </td>
                      <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.firstName} {s.lastName}
                      </td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{s.email}</td>
                      <td style={{ padding: '8px 8px', color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                      <td style={{ padding: '8px 8px' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td style={{ padding: '8px 8px' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            background: s.isActive !== false ? '#ecfdf5' : '#f1f5f9',
                            color: s.isActive !== false ? '#059669' : '#64748b',
                            border: s.isActive !== false ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {s.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      {canDelete && (
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(s.id)}
                            title="Delete Staff"
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#b91c1c',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddStaffOpen(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Add Staff Member (Police / Admin / Parking)
              </h3>
              <button type="button" onClick={() => setIsAddStaffOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={newStaffData.firstName}
                  onChange={(e) => setNewStaffData({ ...newStaffData, firstName: e.target.value })}
                  required
                  style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newStaffData.lastName}
                  onChange={(e) => setNewStaffData({ ...newStaffData, lastName: e.target.value })}
                  required
                  style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>
              <input
                type="email"
                placeholder="Official Email"
                value={newStaffData.email}
                onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                required
                style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Badge Number (e.g. POL-104)"
                  value={newStaffData.badgeNumber}
                  onChange={(e) => setNewStaffData({ ...newStaffData, badgeNumber: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <select
                  value={newStaffData.role}
                  onChange={(e) => setNewStaffData({ ...newStaffData, role: e.target.value })}
                  style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <option value="POLICE">POLICE (Officer)</option>
                  <option value="ADMIN">ADMIN (Manager)</option>
                  <option value="PARKING">PARKING (Operator)</option>
                </select>
              </div>
              <input
                type="password"
                placeholder="Password (default: 123456)"
                value={newStaffData.password}
                onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
              />

              <button
                type="submit"
                style={{
                  background: 'var(--accent-blue)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
