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
  QrCode,
  Car,
  ArrowRight,
  Printer,
  Clock,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { tollApi } from '../../services/api';
import type {
  TollItem,
  TollBookingItem,
  TollBookingInput,
  TollEntryLogItem,
  DeductTollData,
} from '../../services/api';

export interface TollViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
  searchTerm?: string;
}

export const TollView: React.FC<TollViewProps> = ({
  canWrite = true,
  canDelete = true,
  searchTerm,
}) => {
  // Mode: 'bookings' | 'deduct' | 'plazas'
  const [activeTab, setActiveTab] = useState<'bookings' | 'deduct' | 'plazas'>('bookings');

  // Toll Plazas state
  const [tolls, setTolls] = useState<TollItem[]>([]);
  const [isPlazaModalOpen, setIsPlazaModalOpen] = useState(false);
  const [editingPlazaId, setEditingPlazaId] = useState<string | null>(null);
  const [plazaFormData, setPlazaFormData] = useState({ name: '', ratePerEntry: '' });

  // Toll Bookings state
  const [bookings, setBookings] = useState<TollBookingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (searchTerm !== undefined) {
      setSearchQuery(searchTerm);
    }
  }, [searchTerm]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'>('ALL');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<TollBookingInput>({
    userName: '',
    phoneNumber: '',
    vehicleNumber: '',
    tollId: '',
    bookedCount: 1, // Kitane time ke liye booking kr rha h: 1, 2, 3, 4...
    ratePerEntry: 150,
    validDays: 30,
    notes: '',
  });

  // Gadi IN & Deduct 1 Trip state
  const [deductPlate, setDeductPlate] = useState('');
  const [isDeducting, setIsDeducting] = useState(false);
  const [lastDeductResult, setLastDeductResult] = useState<{
    success: boolean;
    message: string;
    data?: DeductTollData;
  } | null>(null);
  const [entryLogs, setEntryLogs] = useState<TollEntryLogItem[]>([]);

  // QR Modal
  const [qrModalBooking, setQrModalBooking] = useState<TollBookingItem | null>(null);

  // Status & loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resTolls, resBookings, resLogs] = await Promise.all([
        tollApi.getAll(),
        tollApi.getAllBookings(),
        tollApi.getEntryLogs(50),
      ]);

      if (resTolls.success && resTolls.data) {
        setTolls(resTolls.data);
      }
      if (resBookings.success && resBookings.data) {
        setBookings(resBookings.data);
      }
      if (resLogs.success && resLogs.data) {
        setEntryLogs(resLogs.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch toll data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (actionSuccessMsg) {
      const timer = setTimeout(() => setActionSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMsg]);

  // Statistics calculation in the exact old style
  const stats = useMemo(() => {
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b) => b.status === 'ACTIVE').length;
    const totalRemainingTrips = bookings.reduce((sum, b) => sum + (Number(b.remainingCount) || 0), 0);
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalPlazas = tolls.length;
    return { totalBookings, activeBookings, totalRemainingTrips, totalRevenue, totalPlazas };
  }, [bookings, tolls]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return bookings.filter((b) => {
      const matchesSearch =
        !q ||
        b.vehicleNumber.toLowerCase().includes(q) ||
        b.userName.toLowerCase().includes(q) ||
        b.phoneNumber.toLowerCase().includes(q) ||
        b.tollName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  // Filtered Plazas
  const filteredTolls = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tolls;
    return tolls.filter((t) => t.name.toLowerCase().includes(q));
  }, [tolls, searchQuery]);

  // Handlers for Toll Booking
  const handleOpenAddBooking = () => {
    const defaultToll = tolls[0];
    setBookingFormData({
      userName: '',
      phoneNumber: '',
      vehicleNumber: '',
      tollId: defaultToll ? defaultToll.id : '',
      bookedCount: 1,
      ratePerEntry: defaultToll ? Number(defaultToll.ratePerEntry) : 150,
      validDays: 30,
      notes: '',
    });
    setFormError(null);
    setIsBookingModalOpen(true);
  };

  const handleBookingTollChange = (tollId: string) => {
    const selected = tolls.find((t) => t.id === tollId);
    setBookingFormData((prev) => ({
      ...prev,
      tollId,
      ratePerEntry: selected ? Number(selected.ratePerEntry) : prev.ratePerEntry,
    }));
  };

  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const userName = bookingFormData.userName.trim();
    if (!userName) {
      setFormError('Please enter user name');
      return;
    }

    const phoneNumber = bookingFormData.phoneNumber.trim();
    if (!phoneNumber) {
      setFormError('Please enter contact phone number');
      return;
    }

    const vehicleNumber = bookingFormData.vehicleNumber.trim().toUpperCase();
    if (!vehicleNumber || vehicleNumber.length < 4) {
      setFormError('Please enter a valid vehicle plate (e.g. UP 32 AB 1234)');
      return;
    }

    const bookedCount = parseInt(String(bookingFormData.bookedCount), 10);
    if (isNaN(bookedCount) || bookedCount < 1) {
      setFormError('Please enter a valid trip count (1, 2, 3, 4...)');
      return;
    }

    setIsSaving(true);
    try {
      const res = await tollApi.createBooking({
        userName,
        phoneNumber,
        vehicleNumber,
        tollId: bookingFormData.tollId || undefined,
        bookedCount,
        ratePerEntry: Number(bookingFormData.ratePerEntry) || 150,
        validDays: Number(bookingFormData.validDays) || 30,
        notes: bookingFormData.notes,
      });

      if (res.success && res.data) {
        setIsBookingModalOpen(false);
        setActionSuccessMsg(`Toll booking created for ${res.data.vehicleNumber} (${bookedCount} trips)!`);
        fetchData();
        setQrModalBooking(res.data);
      } else {
        setFormError(res.message || 'Failed to create toll booking');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while booking toll');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBooking = async (id: string, vehicleNo: string) => {
    if (!confirm(`Are you sure you want to delete toll booking for '${vehicleNo}'?`)) {
      return;
    }

    try {
      const res = await tollApi.deleteBooking(id);
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setActionSuccessMsg(`Booking for ${vehicleNo} deleted successfully.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete booking');
    }
  };

  // Handlers for Gadi IN & Deduct 1 Trip (-1)
  const handleDeductTrip = async (plateToDeduct?: string) => {
    const plate = (plateToDeduct || deductPlate).trim().toUpperCase();
    if (!plate) {
      alert('Please enter or select a vehicle plate number');
      return;
    }

    setIsDeducting(true);
    setLastDeductResult(null);

    try {
      const res = await tollApi.deductToll({
        vehicleNumber: plate,
        source: 'MANUAL',
        notes: 'Operator manual gate entry trigger',
      });

      setLastDeductResult({
        success: res.success,
        message: res.message || (res.success ? 'Trip deducted successfully' : 'Deduction failed'),
        data: res.data,
      });

      if (res.success && res.data) {
        setActionSuccessMsg(`Vehicle IN verified! 1 trip deducted from ${plate}. Remaining trips: ${res.data.remainingCount}`);
        fetchData();
      }
    } catch (err: any) {
      setLastDeductResult({
        success: false,
        message: err.message || 'Failed to process vehicle entry deduction',
      });
    } finally {
      setIsDeducting(false);
    }
  };

  // Handlers for Toll Plazas (Old)
  const handleOpenAddPlaza = () => {
    setEditingPlazaId(null);
    setPlazaFormData({ name: '', ratePerEntry: '' });
    setFormError(null);
    setIsPlazaModalOpen(true);
  };

  const handleOpenEditPlaza = (toll: TollItem) => {
    setEditingPlazaId(toll.id);
    setPlazaFormData({
      name: toll.name,
      ratePerEntry: String(toll.ratePerEntry),
    });
    setFormError(null);
    setIsPlazaModalOpen(true);
  };

  const handlePlazaFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = plazaFormData.name.trim();
    if (!name) {
      setFormError('Please enter toll plaza name');
      return;
    }

    const rate = parseFloat(plazaFormData.ratePerEntry);
    if (isNaN(rate) || rate < 0) {
      setFormError('Please enter a valid rate per entry');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPlazaId) {
        const res = await tollApi.update(editingPlazaId, { name, ratePerEntry: rate });
        if (res.success) {
          setIsPlazaModalOpen(false);
          fetchData();
        } else {
          setFormError(res.message || 'Failed to update toll plaza');
        }
      } else {
        const res = await tollApi.create({ name, ratePerEntry: rate, status: 'ACTIVE' });
        if (res.success) {
          setIsPlazaModalOpen(false);
          fetchData();
        } else {
          setFormError(res.message || 'Failed to add toll plaza');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving plaza');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlaza = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'?`)) return;
    try {
      const res = await tollApi.delete(id);
      if (res.success) {
        setTolls((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete plaza');
    }
  };

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Action Notification Alert (Clean Light Style) */}
      {actionSuccessMsg && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', padding: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Banner / Summary Cards in Exact Old Glass-Panel Theme */}
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Toll Bookings</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {stats.totalBookings}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Passes</div>
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
            <Receipt size={20} />
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Active Toll Passes</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {stats.activeBookings}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Valid &amp; Usable</div>
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
            <ShieldCheck size={20} />
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Remaining Trips (-1)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
              {stats.totalRemainingTrips}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Deducts on Gadi IN</div>
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
            <Layers size={20} />
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Toll Revenue</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stats.totalPlazas} Plazas Registered</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5',
            }}
          >
            <CircleDollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Glass-Panel Container (Matching Old Table Structure Exactly) */}
      <div className="glass-panel" style={{ padding: '1rem', overflow: 'hidden' }}>
        {/* Modern Two-Tier Table Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '1rem',
          }}
        >
          {/* Tier 1: View Mode Switcher (Left) & Action Buttons (Right) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {/* View Mode Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: '#ffffff',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                style={{
                  background: activeTab === 'bookings' ? 'var(--accent-blue)' : 'transparent',
                  color: activeTab === 'bookings' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Receipt size={14} />
                Toll Bookings
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deduct')}
                style={{
                  background: activeTab === 'deduct' ? '#059669' : 'transparent',
                  color: activeTab === 'deduct' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowRight size={14} />
                Vehicle IN (-1 Deduct)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('plazas')}
                style={{
                  background: activeTab === 'plazas' ? 'var(--accent-blue)' : 'transparent',
                  color: activeTab === 'plazas' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Building2 size={14} />
                Toll Plazas
              </button>
            </div>

            {/* Action buttons (Refresh + Add New) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={fetchData}
                disabled={isLoading}
                title="Refresh Data"
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>

              {canWrite && activeTab === 'bookings' && (
                <button
                  type="button"
                  onClick={handleOpenAddBooking}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '7px 14px',
                    borderRadius: '7px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 99, 235, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={14} />
                  New Toll Booking
                </button>
              )}

              {canWrite && activeTab === 'plazas' && (
                <button
                  type="button"
                  onClick={handleOpenAddPlaza}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '7px 14px',
                    borderRadius: '7px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 99, 235, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={14} />
                  Add New Toll
                </button>
              )}
            </div>
          </div>

          {/* Tier 2: Search Bar & Filters Ribbon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Left: Search Input + Record Count Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: '240px', maxWidth: '420px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  width: '100%',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'bookings'
                      ? 'Search vehicle number, name, phone...'
                      : activeTab === 'plazas'
                      ? 'Search toll plaza by name...'
                      : 'Filter vehicle entry logs...'
                  }
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
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              
            </div>

            {/* Right: Status Filter & Reset (for bookings) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeTab === 'bookings' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
                  <div style={{ display: 'flex', background: '#ffffff', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {(['ALL', 'ACTIVE', 'COMPLETED', 'EXPIRED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        style={{
                          background: statusFilter === st ? 'var(--accent-blue)' : 'transparent',
                          color: statusFilter === st ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '5px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(searchQuery || (activeTab === 'bookings' && statusFilter !== 'ALL')) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (activeTab === 'bookings') setStatusFilter('ALL');
                  }}
                  title="Reset filters"
                  style={{
                    height: '30px',
                    padding: '0 9px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: TOLL BOOKINGS TABLE (Matching Old Table Layout) */}
        {/* ========================================================================= */}
        {activeTab === 'bookings' && (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <table
              style={{
                width: '100%',
                minWidth: '850px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 12px', width: '40px' }}>#</th>
                  <th style={{ padding: '10px 12px' }}>Vehicle Number</th>
                  <th style={{ padding: '10px 12px' }}>User Details</th>
                  <th style={{ padding: '10px 12px' }}>Toll Plaza</th>
                  <th style={{ padding: '10px 12px' }}>Trips Left / Booked</th>
                  <th style={{ padding: '10px 12px' }}>Total Fee</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                      <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      <div>{isLoading ? 'Loading bookings...' : 'No toll bookings match your search.'}</div>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b, idx) => {
                    const isExhausted = b.remainingCount <= 0;
                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>

                        {/* Vehicle Plate with IND Badge */}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: '0.82rem',
                            }}
                          >
                            <span style={{ fontSize: '0.65rem', color: '#0284c7', fontWeight: 800 }}>IND</span>
                            {b.vehicleNumber}
                          </span>
                        </td>

                        {/* User Details */}
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.userName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.phoneNumber}</div>
                        </td>

                        {/* Toll Plaza */}
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          <div style={{ fontWeight: 500 }}>{b.tollName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹{b.ratePerEntry}/entry</div>
                        </td>

                        {/* Trips Progress */}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: isExhausted ? '#dc2626' : '#059669',
                              background: isExhausted ? '#fef2f2' : '#ecfdf5',
                              border: `1px solid ${isExhausted ? '#fecaca' : '#a7f3d0'}`,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {b.remainingCount} / {b.bookedCount} Trips
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{Number(b.totalAmount || 0).toFixed(2)}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              background: b.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                              color: b.status === 'ACTIVE' ? '#059669' : '#64748b',
                              border: b.status === 'ACTIVE' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {b.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {/* Fast Gadi IN (-1) */}
                            {b.status === 'ACTIVE' && b.remainingCount > 0 && canWrite && (
                              <button
                                type="button"
                                onClick={() => handleDeductTrip(b.vehicleNumber)}
                                title="Record Vehicle IN and Deduct 1 Trip (-1)"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  color: '#059669',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <ArrowRight size={12} />
                                Vehicle IN (-1)
                              </button>
                            )}

                            {/* View QR Pass */}
                            <button
                              type="button"
                              onClick={() => setQrModalBooking(b)}
                              title="View & Print Digital QR Pass"
                              style={{
                                padding: '4px 6px',
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                color: 'var(--accent-blue)',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <QrCode size={13} />
                            </button>

                            {/* Delete Button */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBooking(b.id, b.vehicleNumber)}
                                title="Delete Booking"
                                style={{
                                  padding: '4px 6px',
                                  background: '#ffffff',
                                  border: '1px solid var(--border-color)',
                                  color: '#dc2626',
                                  borderRadius: '5px',
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: GADI IN & TRIP DEDUCTION SIMULATOR (-1 on every IN) */}
        {/* ========================================================================= */}
        {activeTab === 'deduct' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Deduct Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                padding: '1rem 1.25rem',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Vehicle IN &amp; Trip Deduction Trigger
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                When a registered vehicle enters the toll lane, 1 trip is automatically deducted from its balance.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
                  <Car size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Enter Vehicle Plate (e.g. UP 32 AB 1234)"
                    value={deductPlate}
                    onChange={(e) => setDeductPlate(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: 'var(--text-primary)',
                      background: '#ffffff',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDeductTrip()}
                  disabled={isDeducting || !deductPlate.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: isDeducting || !deductPlate.trim() ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ArrowRight size={14} />
                  {isDeducting ? 'Deducting...' : 'Confirm Vehicle IN (-1 Trip)'}
                </button>
              </div>

              {/* Quick Select Chips */}
              {bookings.filter((b) => b.status === 'ACTIVE' && b.remainingCount > 0).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Vehicles:</span>
                  {bookings
                    .filter((b) => b.status === 'ACTIVE' && b.remainingCount > 0)
                    .slice(0, 8)
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setDeductPlate(b.vehicleNumber);
                          handleDeductTrip(b.vehicleNumber);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          color: 'var(--accent-blue)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {b.vehicleNumber} ({b.remainingCount} left)
                      </button>
                    ))}
                </div>
              )}

              {/* Deduction Feedback Result Box */}
              {lastDeductResult && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: lastDeductResult.success ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${lastDeductResult.success ? '#a7f3d0' : '#fecaca'}`,
                    color: lastDeductResult.success ? '#065f46' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {lastDeductResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{lastDeductResult.message}</span>
                </div>
              )}
            </div>

            {/* Recent Vehicle IN Logs Table */}
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
                    <th style={{ padding: '8px 8px', fontWeight: 600, width: '40px' }}>#</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Entry Time</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Vehicle Number</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Toll Plaza</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Previous Count</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Deducted</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Remaining Trips</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {entryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                        <Clock size={28} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                        <div>No vehicle entry logs recorded yet.</div>
                      </td>
                    </tr>
                  ) : (
                    entryLogs.map((log, idx) => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                          {new Date(log.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {log.vehicleNumber}
                        </td>
                        <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{log.tollName}</td>
                        <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{log.previousCount}</td>
                        <td style={{ padding: '8px 8px', color: '#dc2626', fontWeight: 700 }}>-1</td>
                        <td style={{ padding: '8px 8px', color: '#059669', fontWeight: 700 }}>
                          {log.remainingCount} trips left
                        </td>
                        <td style={{ padding: '8px 8px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              background: log.source === 'ANPR_CAMERA' ? '#eff6ff' : '#f1f5f9',
                              color: log.source === 'ANPR_CAMERA' ? '#1d4ed8' : '#64748b',
                              border: log.source === 'ANPR_CAMERA' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {log.source}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: TOLL PLAZAS TABLE (Exact Original Table from Previous Git Commit) */}
        {/* ========================================================================= */}
        {activeTab === 'plazas' && (
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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditPlaza(toll)}
                                style={{
                                  padding: '4px 6px',
                                  background: '#ffffff',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--accent-blue)',
                                  borderRadius: '4px',
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
                                onClick={() => handleDeletePlaza(toll.id, toll.name)}
                                style={{
                                  padding: '4px 6px',
                                  background: '#ffffff',
                                  border: '1px solid var(--border-color)',
                                  color: '#dc2626',
                                  borderRadius: '4px',
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD TOLL BOOKING (Take User Details & Count: 1, 2, 3, 4...) */}
      {/* ========================================================================= */}
      {isBookingModalOpen && (
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
            if (e.target === e.currentTarget) setIsBookingModalOpen(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  New Toll Booking
                </h3>

              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

              {/* User Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    User Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={bookingFormData.userName}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, userName: e.target.value })}
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

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={bookingFormData.phoneNumber}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, phoneNumber: e.target.value })}
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
              </div>

              {/* Vehicle Number */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Vehicle Plate Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UP 32 AB 1234"
                  value={bookingFormData.vehicleNumber}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, vehicleNumber: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* Toll Plaza Selection */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Toll Plaza
                </label>
                <select
                  value={bookingFormData.tollId}
                  onChange={(e) => handleBookingTollChange(e.target.value)}
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
                >
                  {tolls.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (₹{t.ratePerEntry}/entry)
                    </option>
                  ))}
                </select>
              </div>

              {/* Kitane Time Ke Liye Booking Kr Rha H (Count: 1, 2, 3, 4...) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>

                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                    {bookingFormData.bookedCount} Trips
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  placeholder="e.g. 1, 2, 3, 4, 5..."
                  value={bookingFormData.bookedCount}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, bookedCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    background: '#ffffff',
                  }}
                />

                {/* Quick Count Selection Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {[1, 2, 3, 4, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBookingFormData({ ...bookingFormData, bookedCount: num })}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        background: bookingFormData.bookedCount === num ? '#eff6ff' : '#ffffff',
                        color: bookingFormData.bookedCount === num ? '#1d4ed8' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {num} {num === 1 ? 'Trip' : 'Trips'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Total: {bookingFormData.bookedCount} Trips × ₹{bookingFormData.ratePerEntry || 150}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Total Booking Fee
                  </div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  ₹{(Number(bookingFormData.bookedCount || 1) * Number(bookingFormData.ratePerEntry || 150)).toFixed(2)}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
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
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSaving ? 'Creating...' : 'Save & Generate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QR PASS & PRINT MODAL */}
      {/* ========================================================================= */}
      {qrModalBooking && (
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
            if (e.target === e.currentTarget) setQrModalBooking(null);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '400px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Digital Toll Pass</div>
              <button
                type="button"
                onClick={() => setQrModalBooking(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {qrModalBooking.qrCode && (
              <img
                src={qrModalBooking.qrCode}
                alt="Toll Pass QR"
                style={{ width: '160px', height: '160px', margin: '0 auto 12px', display: 'block', borderRadius: '8px' }}
              />
            )}

            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {qrModalBooking.vehicleNumber}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {qrModalBooking.userName} ({qrModalBooking.phoneNumber})
            </div>

            <div
              style={{
                margin: '1rem 0',
                padding: '8px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Booked</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{qrModalBooking.bookedCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Remaining</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: qrModalBooking.remainingCount > 0 ? '#059669' : '#dc2626' }}>
                  {qrModalBooking.remainingCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Amount</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>₹{qrModalBooking.totalAmount}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '7px',
                  background: 'var(--accent-blue)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Printer size={14} />
                Print Pass
              </button>
              <button
                type="button"
                onClick={() => setQrModalBooking(null)}
                style={{
                  padding: '7px 14px',
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EXACT OLD TOLL PLAZA ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {isPlazaModalOpen && (
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
            if (e.target === e.currentTarget) setIsPlazaModalOpen(false);
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
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {editingPlazaId ? 'Edit Toll Plaza' : 'Add New Toll'}
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Toll Name &amp; Fee Per Entry (₹)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlazaModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePlazaFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Toll Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yamuna Expressway Toll Plaza"
                  value={plazaFormData.name}
                  onChange={(e) => setPlazaFormData({ ...plazaFormData, name: e.target.value })}
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

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Rate Per Entry (₹) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 120"
                    value={plazaFormData.ratePerEntry}
                    onChange={(e) => setPlazaFormData({ ...plazaFormData, ratePerEntry: e.target.value })}
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPlazaModalOpen(false)}
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
                  {isSaving ? 'Saving...' : editingPlazaId ? 'Update Toll' : 'Save Toll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
