import React, { useState, useEffect, useMemo } from 'react';
import {
  CircleDollarSign,
  Plus,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Receipt,
  IndianRupee,
} from 'lucide-react';
import { tollApi } from '../../services/api';
import type { TollItem } from '../../services/api';

export interface TollViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

export const TollView: React.FC<TollViewProps> = ({
  canWrite = false,
  canDelete = false,
}) => {
  const [tolls, setTolls] = useState<TollItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Exactly 2 fields as requested by user:
  // 1. Toll Name (toal name)
  // 2. Rate per entry (kitna paisa lega pr entry pr)
  const [formData, setFormData] = useState({
    name: '',
    ratePerEntry: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTolls = async () => {
    setIsLoading(true);
    try {
      const res = await tollApi.getAll();
      if (res.success && res.data) {
        setTolls(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch tolls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTolls();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', ratePerEntry: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (toll: TollItem) => {
    setIsEditing(true);
    setEditingId(toll.id);
    setFormData({
      name: toll.name,
      ratePerEntry: String(toll.ratePerEntry),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    if (!name) {
      setFormError('Please enter toll name');
      return;
    }

    const rate = parseFloat(formData.ratePerEntry);
    if (isNaN(rate) || rate < 0) {
      setFormError('Please enter a valid rate per entry');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && editingId) {
        const res = await tollApi.update(editingId, {
          name,
          ratePerEntry: rate,
        });
        if (res.success) {
          setIsModalOpen(false);
          fetchTolls();
        } else {
          setFormError(res.message || 'Failed to update toll');
        }
      } else {
        const res = await tollApi.create({
          name,
          ratePerEntry: rate,
          status: 'ACTIVE',
        });
        if (res.success) {
          setIsModalOpen(false);
          fetchTolls();
        } else {
          setFormError(res.message || 'Failed to add toll');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'?`)) {
      return;
    }

    try {
      const res = await tollApi.delete(id);
      if (res.success) {
        setTolls((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete toll');
    }
  };

  const filteredTolls = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tolls;
    return tolls.filter((t) => t.name.toLowerCase().includes(q));
  }, [tolls, searchQuery]);

  const stats = useMemo(() => {
    const total = tolls.length;
    const active = tolls.filter((t) => t.status === 'ACTIVE').length;
    const totalRate = tolls.reduce((acc, t) => acc + (Number(t.ratePerEntry) || 0), 0);
    const avg = total > 0 ? (totalRate / total).toFixed(2) : '0.00';
    return { total, active, avg };
  }, [tolls]);

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Top Banner / Summary Cards in Light Glass-Panel Theme */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '1rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Toll Plazas</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Plazas</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <Building2 size={20} />
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Active Tolls</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {stats.active}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Operational</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Avg. Fee Per Entry</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
              ₹{stats.avg}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Per Vehicle Entry</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <IndianRupee size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Panel matching other modules */}
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
            <CircleDollarSign size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Toll Management
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
              {filteredTolls.length} Tolls
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchTolls}
              disabled={isLoading}
              title="Refresh Tolls"
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
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={handleOpenAdd}
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
                Add New Toll
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
              placeholder="Search toll by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Table Content matching all module tables */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              minWidth: '650px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 8px', fontWeight: 600, width: '50px' }}>#</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Toll Name</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Fee Per Entry</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '8px 8px', fontWeight: 600 }}>Created Date</th>
                {(canWrite || canDelete) && (
                  <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTolls.length === 0 ? (
                <tr>
                  <td
                    colSpan={canWrite || canDelete ? 6 : 5}
                    style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}
                  >
                    <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div>{isLoading ? 'Loading tolls...' : searchQuery ? 'No tolls match your search.' : 'No toll plazas registered yet.'}</div>
                  </td>
                </tr>
              ) : (
                filteredTolls.map((toll, idx) => (
                  <tr
                    key={toll.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {toll.name}
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#047857',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        ₹{Number(toll.ratePerEntry).toFixed(2)}
                        <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 500, marginLeft: '3px' }}>
                          / entry
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          background: toll.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                          color: toll.status === 'ACTIVE' ? '#059669' : '#64748b',
                          border: toll.status === 'ACTIVE' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {toll.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                      {toll.createdAt ? new Date(toll.createdAt).toLocaleDateString() : '—'}
                    </td>
                    {(canWrite || canDelete) && (
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(toll)}
                              title="Edit Toll"
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#2563eb',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(toll.id, toll.name)}
                              title="Delete Toll"
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
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit Toll (Exactly 2 Fields, Light Glass-Panel Theme) */}
      {isModalOpen && (
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
            if (e.target === e.currentTarget) setIsModalOpen(false);
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
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {isEditing ? 'Edit Toll Plaza' : 'Add New Toll'}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Toll Name &amp; Fee Per Entry (₹)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* FIELD 1: TOLL NAME */}
              <div>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Toll Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yamuna Expressway Toll Plaza"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* FIELD 2: RATE PER ENTRY */}
              <div>
                <label
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    display: 'block',
                  }}
                >
                  Rate Per Entry (₹) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 120"
                    value={formData.ratePerEntry}
                    onChange={(e) => setFormData({ ...formData, ratePerEntry: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 28px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: 'var(--text-primary)',
                      background: '#ffffff',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Enter the vehicle entry toll charge in Rupees (₹)
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '6px 16px',
                    background: 'var(--accent-blue)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSaving ? 'Saving...' : isEditing ? 'Update Toll' : 'Save Toll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
