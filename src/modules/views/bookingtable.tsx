import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Car,
  User,
  Phone,
  Clock,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  IndianRupee,
  CalendarCheck,
  QrCode,
  Printer,
  Download,
} from 'lucide-react';
import { bookingApi } from '../../services/api/bookingApi';
import type { Booking, BookingInput, BookingStats } from '../../services/api/bookingApi';
import { parkingApi } from '../../services/api/parkingApi';

export interface BookingTableProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

export const BookingTable: React.FC<BookingTableProps> = ({
  canWrite = true,
  canDelete = true,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [qrModalBooking, setQrModalBooking] = useState<Booking | null>(null);

  // Form State
  const [formData, setFormData] = useState<BookingInput>({
    vehicleNumber: '',
    userName: '',
    phoneNumber: '',
    bookingDate: new Date().toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16),
    parkingLotId: '',
    parkingLotName: '',
    slotNumber: '',
    totalAmount: 150,
    status: 'CONFIRMED',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bookings and stats
  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const [resBookings, resStats, resLots] = await Promise.all([
        bookingApi.getAll(),
        bookingApi.getStats(),
        parkingApi.getAll(),
      ]);

      if (resBookings.success && resBookings.data) {
        setBookings(resBookings.data);
      }
      if (resStats.success && resStats.data) {
        setStats(resStats.data);
      }
      if (resLots.success && resLots.data) {
        setParkingLots(resLots.data);
      }
    } catch (err: any) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Calculate dynamic availability of each parking lot for the selected time window
  const getParkingAvailability = useCallback((lotId: string, startStr?: string, endStr?: string) => {
    const lot = parkingLots.find((l) => l.id === lotId);
    if (!lot) return { totalSpace: 0, occupied: 0, available: 0, isAvailable: false, pricePerHour: 50 };

    const totalSpace = Number(lot.totalSpace) || 0;
    const pricePerHour = Number(lot.pricePerHour) || 50;

    if (!startStr || !endStr) {
      const occupied = Number(lot.occupiedSpace) || 0;
      const available = Math.max(0, totalSpace - occupied);
      return { totalSpace, occupied, available, isAvailable: available > 0 && lot.status !== 'MAINTENANCE', pricePerHour };
    }

    const reqStart = new Date(startStr).getTime();
    const reqEnd = new Date(endStr).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
      const occupied = Number(lot.occupiedSpace) || 0;
      const available = Math.max(0, totalSpace - occupied);
      return { totalSpace, occupied, available, isAvailable: available > 0 && lot.status !== 'MAINTENANCE', pricePerHour };
    }

    // Count overlapping active bookings for this parking lot
    const overlappingBookings = bookings.filter((b) => {
      if (b.parkingLotId !== lotId) return false;
      if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;
      if (editingBooking && b.id === editingBooking.id) return false;

      const bStart = new Date(b.startDate).getTime();
      const bEnd = new Date(b.endDate).getTime();
      if (isNaN(bStart) || isNaN(bEnd)) return false;

      // Overlap condition
      return bStart < reqEnd && bEnd > reqStart;
    });

    const occupied = overlappingBookings.length;
    const available = Math.max(0, totalSpace - occupied);
    const isAvailable = lot.status !== 'MAINTENANCE' && lot.status !== 'FULL' && available > 0;

    return {
      totalSpace,
      occupied,
      available,
      isAvailable,
      pricePerHour,
    };
  }, [parkingLots, bookings, editingBooking]);

  // Recalculate estimated amount when dates or parking lot changes
  const calculateEstimatedAmount = (lotId: string, startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return 0;

    const diffHours = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60)));
    const lot = parkingLots.find((p) => p.id === lotId);
    const rate = lot ? Number(lot.pricePerHour) || 50 : 50;
    return diffHours * rate;
  };

  const handleOpenAddModal = () => {
    const now = new Date();
    const startIso = new Date(now.getTime() + 10 * 60 * 1000).toISOString().slice(0, 16);
    const endIso = new Date(now.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 16);

    // Pick first available parking lot
    const firstAvailLot = parkingLots.find((p) => {
      const a = getParkingAvailability(p.id, startIso, endIso);
      return a.isAvailable;
    }) || parkingLots[0];

    setFormData({
      vehicleNumber: '',
      userName: '',
      phoneNumber: '',
      bookingDate: now.toISOString().slice(0, 10),
      startDate: startIso,
      endDate: endIso,
      parkingLotId: firstAvailLot ? firstAvailLot.id : '',
      parkingLotName: firstAvailLot ? firstAvailLot.name : '',
      slotNumber: '',
      totalAmount: calculateEstimatedAmount(firstAvailLot?.id || '', startIso, endIso),
      status: 'CONFIRMED',
      notes: '',
    });
    setEditingBooking(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      vehicleNumber: booking.vehicleNumber,
      userName: booking.userName,
      phoneNumber: booking.phoneNumber,
      bookingDate: booking.bookingDate ? new Date(booking.bookingDate).toISOString().slice(0, 10) : '',
      startDate: booking.startDate ? new Date(booking.startDate).toISOString().slice(0, 16) : '',
      endDate: booking.endDate ? new Date(booking.endDate).toISOString().slice(0, 16) : '',
      parkingLotId: booking.parkingLotId || '',
      parkingLotName: booking.parkingLotName || '',
      slotNumber: booking.slotNumber || '',
      totalAmount: Number(booking.totalAmount) || 0,
      status: booking.status || 'CONFIRMED',
      notes: booking.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleNumber.trim() || !formData.userName.trim() || !formData.phoneNumber.trim()) {
      setFormError('Please enter Vehicle Number, Customer Name, and Phone Number');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError('Please specify Start Date and End Date');
      return;
    }

    const s = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end <= s) {
      setFormError('End Date & Time must be after Start Date & Time');
      return;
    }

    if (formData.parkingLotId) {
      const avail = getParkingAvailability(formData.parkingLotId, formData.startDate, formData.endDate);
      if (!avail.isAvailable) {
        setFormError(`Selected parking area is Not Available / FULL (0/${avail.totalSpace} spaces available) for these dates. Please choose another parking area.`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const selectedLot = parkingLots.find((l) => l.id === formData.parkingLotId);
      const payload: BookingInput = {
        ...formData,
        vehicleNumber: formData.vehicleNumber.toUpperCase().trim(),
        parkingLotName: selectedLot ? selectedLot.name : formData.parkingLotName,
        status: formData.status || 'CONFIRMED',
      };

      if (editingBooking) {
        const res = await bookingApi.update(editingBooking.id, payload);
        if (res.success && res.data) {
          setIsModalOpen(false);
          setQrModalBooking(res.data);
          fetchBookings();
        } else {
          setFormError(res.message || 'Failed to update booking');
        }
      } else {
        const res = await bookingApi.create(payload);
        if (res.success && res.data) {
          setIsModalOpen(false);
          setQrModalBooking(res.data);
          fetchBookings();
        } else {
          setFormError(res.message || 'Failed to create booking');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, vehicleNum: string) => {
    if (!confirm(`Are you sure you want to delete the booking for ${vehicleNum}?`)) return;
    try {
      await bookingApi.delete(id);
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete booking');
    }
  };

  const handleQuickStatusChange = async (booking: Booking, newStatus: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED') => {
    try {
      await bookingApi.update(booking.id, { status: newStatus });
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        b.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.parkingLotName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.slotNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const isExpired = b.status === 'EXPIRED' || b.isExpired || Boolean(b.endDate && new Date() > new Date(b.endDate));
      const effectiveStatus = isExpired && b.status === 'CONFIRMED' ? 'EXPIRED' : b.status;
      const matchesStatus =
        statusFilter === 'ALL' ||
        effectiveStatus === statusFilter ||
        (statusFilter === 'EXPIRED' && isExpired);

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateOnly = (dateStr?: string | Date) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateDuration = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return '-';
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return '-';

    const diffMins = Math.round((e - s) / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Bookings</span>
            <CalendarCheck size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {stats?.total ?? bookings.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Vehicle Reservations</div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Confirmed Active</span>
            <CheckCircle2 size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {stats?.confirmed ?? bookings.filter((b) => b.status === 'CONFIRMED').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669' }}>Slots Locked & Reserved</div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Today's Bookings</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {stats?.todayBookings ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Booked Today</div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Revenue</span>
            <IndianRupee size={18} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px' }}>
            ₹{stats?.totalRevenue ?? bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Estimated Bookings Value</div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="glass-panel" style={{ padding: '1rem', overflow: 'hidden' }}>
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
            <CalendarCheck size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Parking & Vehicle Bookings
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
              {filteredBookings.length} Bookings
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Status Tabs */}
            <div
              style={{
                display: 'flex',
                background: '#f8fafc',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              {(['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'] as const).map((tab) => {
                const isActive = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      background: isActive ? 'var(--accent-blue)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={fetchBookings}
              disabled={isLoading}
              title="Refresh Bookings"
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
                onClick={handleOpenAddModal}
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
                New Booking
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '1rem',
            background: '#f8fafc',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by Gadi Number (e.g. DL 01 AB 1234), Name, Phone, or Parking Area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

        {/* Bookings Table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table
            style={{
              width: '100%',
              minWidth: '1050px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>#</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Vehicle (Gadi Number)</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>QR Pass</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Phone Number</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Parking Area & Slot</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Booking Date</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Start Date</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>End Date</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '10px 8px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Loading bookings...' : 'No vehicle bookings found. Click "New Booking" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b, idx) => {
                  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                    CONFIRMED: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
                    PENDING: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
                    COMPLETED: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
                    CANCELLED: { bg: '#fee2f2', text: '#b91c1c', border: '#fca5a5' },
                    EXPIRED: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
                  };

                  const isRowExpired =
                    b.status === 'EXPIRED' ||
                    b.isExpired ||
                    Boolean(b.endDate && new Date() > new Date(b.endDate));
                  const effectiveStatus = isRowExpired && b.status === 'CONFIRMED' ? 'EXPIRED' : b.status;
                  const color = statusColors[effectiveStatus] || statusColors.CONFIRMED;

                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                        background: isRowExpired ? 'rgba(254, 242, 242, 0.35)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>

                      {/* Gadi Number Plate */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              background: '#f8fafc',
                              border: '1.5px solid #0f172a',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.86rem',
                              letterSpacing: '0.5px',
                              color: '#0f172a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                          >
                            <Car size={13} color="#2563eb" />
                            {b.vehicleNumber}
                          </div>
                        </div>
                      </td>

                      {/* QR Pass */}
                      <td style={{ padding: '10px 8px' }}>
                        <button
                          type="button"
                          onClick={() => setQrModalBooking(b)}
                          title={isRowExpired ? 'QR Code Pass Expired - Click to view' : 'View QR Code Pass'}
                          style={{
                            background: isRowExpired ? '#fef2f2' : 'rgba(37, 99, 235, 0.08)',
                            color: isRowExpired ? '#dc2626' : '#2563eb',
                            border: `1px solid ${isRowExpired ? '#fca5a5' : 'rgba(37, 99, 235, 0.25)'}`,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <QrCode size={13} color={isRowExpired ? '#dc2626' : '#2563eb'} />
                          <span>{isRowExpired ? 'Expired QR' : 'QR Pass'}</span>
                        </button>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <User size={13} color="var(--text-muted)" />
                          <span>{b.userName}</span>
                        </div>
                      </td>

                      {/* Phone Number */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <Phone size={13} color="var(--text-muted)" />
                          <span>{b.phoneNumber}</span>
                        </div>
                      </td>

                      {/* Parking Area & Slot */}
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} color="var(--accent-blue)" />
                            {b.parkingLotName || 'General Lot'}
                          </span>
                          {b.slotNumber && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Slot: <strong style={{ color: '#2563eb' }}>{b.slotNumber}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Booking Date */}
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="var(--text-muted)" />
                          <span>{formatDateOnly(b.bookingDate || b.createdAt)}</span>
                        </div>
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: '10px 8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="#059669" />
                          <span>{formatDateTime(b.startDate)}</span>
                        </div>
                      </td>

                      {/* End Date */}
                      <td style={{ padding: '10px 8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="#dc2626" />
                          <span>{formatDateTime(b.endDate)}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                        {calculateDuration(b.startDate, b.endDate)}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '10px 8px', fontWeight: 700, color: '#4f46e5' }}>
                        ₹{Number(b.totalAmount || 0)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 8px' }}>
                        <select
                          value={effectiveStatus}
                          onChange={(e) => handleQuickStatusChange(b, e.target.value as any)}
                          style={{
                            background: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PENDING">PENDING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setQrModalBooking(b)}
                            title="View / Download QR Pass"
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            <QrCode size={12} />
                          </button>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(b)}
                              title="Edit Booking"
                              style={{
                                background: '#f8fafc',
                                color: '#2563eb',
                                border: '1px solid #cbd5e1',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(b.id, b.vehicleNumber)}
                              title="Delete Booking"
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Trash2 size={12} />
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
      </div>

      {/* Create / Edit Booking Modal */}
      {isModalOpen && (
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
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {editingBooking ? 'Edit Booking' : 'New Vehicle Booking'}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Register slot, gadi number, contact and reservation dates
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Row 1: Gadi Number & Customer Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Vehicle / Gadi Number: *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL 01 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Name: *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Phone Number */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Phone Number: *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Row 3: Start Date & End Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Start Date & Time: *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const est = calculateEstimatedAmount(formData.parkingLotId || '', newStart, formData.endDate);
                      setFormData({ ...formData, startDate: newStart, totalAmount: est });
                    }}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    End Date & Time: *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      const est = calculateEstimatedAmount(formData.parkingLotId || '', formData.startDate, newEnd);
                      setFormData({ ...formData, endDate: newEnd, totalAmount: est });
                    }}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Parking Area & Total Amount (Slot/Bay & Status removed) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.65fr', gap: '10px', alignItems: 'start' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Parking Area: *
                  </label>
                  <select
                    value={formData.parkingLotId || ''}
                    onChange={(e) => {
                      const lotId = e.target.value;
                      const sel = parkingLots.find((l) => l.id === lotId);
                      const est = calculateEstimatedAmount(lotId, formData.startDate, formData.endDate);
                      setFormData({
                        ...formData,
                        parkingLotId: lotId,
                        parkingLotName: sel ? sel.name : '',
                        totalAmount: est,
                      });
                    }}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">Select Parking Area...</option>
                    {parkingLots.map((lot) => {
                      const avail = getParkingAvailability(lot.id, formData.startDate, formData.endDate);
                      return (
                        <option
                          key={lot.id}
                          value={lot.id}
                          disabled={!avail.isAvailable}
                          style={{
                            color: avail.isAvailable ? 'inherit' : '#94a3b8',
                            background: avail.isAvailable ? '#ffffff' : '#f8fafc',
                          }}
                        >
                          {lot.name} {avail.isAvailable
                            ? `(Available: ${avail.available}/${avail.totalSpace} • ₹${lot.pricePerHour}/hr)`
                            : `(Not Available / FULL • 0/${avail.totalSpace})`}
                        </option>
                      );
                    })}
                  </select>

                  {/* Dynamic Availability Indicator for selected parking */}
                  {formData.parkingLotId && (() => {
                    const selAvail = getParkingAvailability(formData.parkingLotId, formData.startDate, formData.endDate);
                    if (!selAvail.isAvailable) {
                      return (
                        <div
                          style={{
                            marginTop: '6px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#991b1b',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <AlertCircle size={13} color="#dc2626" />
                          <span>Not Available (FULL) for this time window. Please select another area.</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        style={{
                          marginTop: '6px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#065f46',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" />
                        <span>
                          Available: <strong>{selAvail.available}</strong> of {selAvail.totalSpace} slots free on selected dates.
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Total Amount (₹):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.totalAmount ?? 0}
                    onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP parking, prepaid, boom barrier pass"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: 'var(--accent-blue)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isSubmitting ? 'Saving...' : editingBooking ? 'Update Booking' : 'Create Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Pass Modal */}
      {qrModalBooking && (() => {
        const isModalExpired =
          qrModalBooking.status === 'EXPIRED' ||
          qrModalBooking.isExpired ||
          Boolean(qrModalBooking.endDate && new Date() > new Date(qrModalBooking.endDate));

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-primary, #ffffff)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '430px',
                border: isModalExpired ? '2px solid #f87171' : '1px solid var(--border-color, #e2e8f0)',
                boxShadow: isModalExpired
                  ? '0 20px 40px -10px rgba(220, 38, 38, 0.3)'
                  : '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: isModalExpired
                    ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  color: '#ffffff',
                  padding: '1.15rem 1.4rem',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: 700 }}>
                    {isModalExpired ? '⚠️ Parking Pass [EXPIRED]' : 'Digital Parking Pass'}
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
                    {isModalExpired ? 'Expired QR Pass' : 'Booking QR Code'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalBooking(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    color: '#ffffff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* QR Card Content */}
              <div style={{ padding: '1.4rem', textAlign: 'center' }}>
                {/* Expiry Banner */}
                {isModalExpired ? (
                  <div
                    style={{
                      background: '#fee2e2',
                      border: '1.5px solid #f87171',
                      color: '#991b1b',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '1rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                    <div>
                      <div>QR Pass EXPIRED on {formatDateTime(qrModalBooking.endDate)}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 500, color: '#b91c1c' }}>
                        End date has passed. Access is no longer authorized.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #6ee7b7',
                      color: '#065f46',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      marginBottom: '1rem',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Valid Pass &bull; Active until {formatDateTime(qrModalBooking.endDate)}</span>
                  </div>
                )}

                {/* QR Image Box */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.8rem' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '12px',
                      borderRadius: '14px',
                      display: 'inline-block',
                      border: isModalExpired ? '2px solid #f87171' : '2px solid #e2e8f0',
                      boxShadow: isModalExpired
                        ? '0 4px 12px rgba(220,38,38,0.15)'
                        : '0 4px 12px rgba(0,0,0,0.06)',
                      opacity: isModalExpired ? 0.75 : 1,
                    }}
                  >
                    {qrModalBooking.qrCode || qrModalBooking.qrCodeUrl ? (
                      <img
                        src={qrModalBooking.qrCode || qrModalBooking.qrCodeUrl || ''}
                        alt="Booking QR Code"
                        style={{
                          width: '190px',
                          height: '190px',
                          display: 'block',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '190px',
                          height: '190px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <QrCode size={48} color="#94a3b8" />
                        <span>QR Code generating...</span>
                      </div>
                    )}
                  </div>

                  {/* Red Watermark Stamp if Expired */}
                  {isModalExpired && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(-24deg)',
                        background: 'rgba(220, 38, 38, 0.92)',
                        color: '#ffffff',
                        padding: '6px 18px',
                        borderRadius: '6px',
                        fontWeight: 900,
                        fontSize: '1.05rem',
                        letterSpacing: '2px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        pointerEvents: 'none',
                        border: '2px solid #ffffff',
                      }}
                    >
                      EXPIRED
                    </div>
                  )}
                </div>

                {/* License Plate Banner */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#f8fafc',
                    border: '2px solid #0f172a',
                    borderRadius: '6px',
                    padding: '4px 14px',
                    fontFamily: 'monospace',
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    color: '#0f172a',
                    marginBottom: '1rem',
                  }}
                >
                  <Car size={16} color="#2563eb" />
                  {qrModalBooking.vehicleNumber}
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    background: 'var(--bg-secondary, #f8fafc)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    textAlign: 'left',
                    fontSize: '0.78rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Name</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{qrModalBooking.userName}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Phone</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{qrModalBooking.phoneNumber}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Parking Area</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{qrModalBooking.parkingLotName || 'General Lot'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Slot</span>
                    <strong style={{ color: '#2563eb' }}>{qrModalBooking.slotNumber || 'Unassigned'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Start Time</span>
                    <strong style={{ color: '#059669', fontSize: '0.74rem' }}>{formatDateTime(qrModalBooking.startDate)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>End Time (Expiry)</span>
                    <strong style={{ color: '#dc2626', fontSize: '0.74rem' }}>{formatDateTime(qrModalBooking.endDate)}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: </span>
                      <strong style={{ color: isModalExpired ? '#dc2626' : '#059669' }}>
                        {isModalExpired ? 'EXPIRED' : qrModalBooking.status}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Amount: </span>
                      <strong style={{ fontSize: '0.95rem', color: '#4f46e5' }}>₹{Number(qrModalBooking.totalAmount || 0)}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const qrSrc = qrModalBooking.qrCode || qrModalBooking.qrCodeUrl;
                      if (!qrSrc) return;
                      const link = document.createElement('a');
                      link.href = qrSrc;
                      link.download = `QR-Booking-${qrModalBooking.vehicleNumber}${isModalExpired ? '-EXPIRED' : ''}.png`;
                      link.click();
                    }}
                    style={{
                      flex: 1,
                      background: '#f1f5f9',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Download size={14} />
                    Download QR
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    style={{
                      flex: 1,
                      background: isModalExpired ? '#dc2626' : 'var(--accent-blue, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Printer size={14} />
                    {isModalExpired ? 'Print Expired Pass' : 'Print Pass'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
