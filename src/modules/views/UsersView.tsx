import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Search, RefreshCw, X } from 'lucide-react';
import { usersApi } from '../../services/api';

export interface UsersViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({
  canWrite = false,
  canDelete = false,
}) => {
  const [userList, setUserList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'User',
    password: '',
  });

  const fetchUsers = async () => {
    setIsUserLoading(true);
    try {
      const res = await usersApi.getAll({ type: 'user' });
      if (res.success && res.data) {
        setUserList(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsUserLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.name) return;
    try {
      const res = await usersApi.create({
        name: newUserData.name.trim(),
        email: newUserData.email.trim(),
        phone: newUserData.phone.trim() || undefined,
        address: newUserData.address.trim() || undefined,
        role: newUserData.role || 'User',
        password: newUserData.password || '123456',
      });
      if (res.success) {
        setIsAddUserOpen(false);
        setNewUserData({ name: '', email: '', phone: '', address: '', role: 'User', password: '' });
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersApi.delete(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const filteredUsers = userList.filter((u) => {
    const q = userSearch.toLowerCase();
    const fullName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
    return (
      fullName.includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.address?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Users Table Panel */}
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
            <Users size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              User Management (Role: USER)
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
              {filteredUsers.length} Users
            </span>
          </div>

          {/* Action buttons: Refresh, Add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isUserLoading}
              title="Refresh Users"
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
              <RefreshCw size={13} className={isUserLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={() => setIsAddUserOpen(true)}
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
                Add New User
              </button>
            )}
          </div>
        </div>

        {/* Filter / Search Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '200px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search user by name, email, phone..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
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
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Phone</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Address</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Status</th>
                {canDelete && <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {isUserLoading ? 'Loading users...' : 'No users found with USER role.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}
                    </td>
                    <td style={{ padding: '8px 8px', color: '#2563eb' }}>{u.email}</td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.address || ''}>
                      {u.address || '—'}
                    </td>
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
                        {u.role || 'User'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          background: u.isActive !== false ? '#ecfdf5' : '#f1f5f9',
                          color: u.isActive !== false ? '#059669' : '#64748b',
                          border: u.isActive !== false ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {u.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {canDelete && (
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id)}
                          title="Delete User"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
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
            if (e.target === e.currentTarget) setIsAddUserOpen(false);
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
                Add New User (Role: User)
              </h3>
              <button type="button" onClick={() => setIsAddUserOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  required
                  style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  required
                  style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    placeholder="User"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main Street, City"
                  value={newUserData.address}
                  onChange={(e) => setNewUserData({ ...newUserData, address: e.target.value })}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Password (default: 123456)"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

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
                Create User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
