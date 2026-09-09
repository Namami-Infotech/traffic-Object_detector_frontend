import React, { useEffect, useState, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
} from 'lucide-react';
import { getAnalytics, clearDetectionLogs } from '../routes';

export interface DetectionLogEntry {
  id: string;
  cameraId?: string;
  cameraName?: string;
  camera?: {
    id?: string;
    cameraName?: string;
    location?: string;
    lane?: string;
    direction?: string;
  };
  vehicleType: string; // e.g. CAR, BUS, TRUCK, MOTORCYCLE, PERSON
  trackId?: number;
  event: 'IN' | 'OUT' | 'STABLE' | 'DETECTION';
  confidence: number;
  count: number;
  detectedAt: string | Date;
  location?: string;
}

interface DetectionHistoryTableProps {
  liveLogs?: DetectionLogEntry[];
  onClearLogs?: () => void;
}

export const DetectionHistoryTable: React.FC<DetectionHistoryTableProps> = ({
  liveLogs = [],
  onClearLogs,
}) => {
  const [dbLogs, setDbLogs] = useState<DetectionLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalDbCount, setTotalDbCount] = useState<number>(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter / Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  // Default seed demo logs to ensure table is never empty on first load
  const initialSeedLogs: DetectionLogEntry[] = [
    {
      id: 'log-001',
      vehicleType: 'CAR',
      trackId: 101,
      event: 'IN',
      confidence: 0.94,
      count: 1,
      detectedAt: new Date(Date.now() - 15000).toISOString(),
      location: 'Main Gate Intersection',
    },
    {
      id: 'log-002',
      vehicleType: 'BUS',
      trackId: 102,
      event: 'IN',
      confidence: 0.91,
      count: 1,
      detectedAt: new Date(Date.now() - 45000).toISOString(),
      location: 'Main Gate Intersection',
    },
    {
      id: 'log-003',
      vehicleType: 'MOTORCYCLE',
      trackId: 103,
      event: 'OUT',
      confidence: 0.88,
      count: 1,
      detectedAt: new Date(Date.now() - 90000).toISOString(),
      location: 'Main Gate Intersection',
    },
    {
      id: 'log-004',
      vehicleType: 'PERSON',
      trackId: 104,
      event: 'STABLE',
      confidence: 0.96,
      count: 1,
      detectedAt: new Date(Date.now() - 120000).toISOString(),
      location: 'Main Gate Intersection',
    },
    {
      id: 'log-005',
      vehicleType: 'TRUCK',
      trackId: 105,
      event: 'OUT',
      confidence: 0.89,
      count: 1,
      detectedAt: new Date(Date.now() - 180000).toISOString(),
      location: 'Main Gate Intersection',
    },
  ];

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const json = await getAnalytics();
      if (json.success && json.data) {
        if (json.data.recentLogs && json.data.recentLogs.length > 0) {
          setDbLogs(json.data.recentLogs);
        }
        if (typeof json.data.totalDetections === 'number') {
          setTotalDbCount(json.data.totalDetections);
        }
      }
    } catch (err) {
      console.log('Node backend server not connected yet, displaying active frontend logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  // Merge live logs + db logs + fallback seed logs
  const combinedLogs: DetectionLogEntry[] = useMemo(() => {
    const combined = [
      ...liveLogs,
      ...dbLogs,
      ...(liveLogs.length === 0 && dbLogs.length === 0 ? initialSeedLogs : []),
    ];
    // Remove duplicates by id
    const map = new Map<string, DetectionLogEntry>();
    combined.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [liveLogs, dbLogs]);

  // Apply filters and search
  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((log) => {
      // Event filter
      if (eventFilter !== 'ALL' && log.event !== eventFilter) {
        return false;
      }
      // Vehicle type filter
      if (vehicleFilter !== 'ALL' && log.vehicleType.toUpperCase() !== vehicleFilter.toUpperCase()) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const idMatch = String(log.id).toLowerCase().includes(term);
        const camMatch = (log.camera?.cameraName || log.cameraName || '').toLowerCase().includes(term);
        const locMatch = (log.camera?.location || log.location || '').toLowerCase().includes(term);
        const vehMatch = (log.vehicleType || '').toLowerCase().includes(term);
        const trackMatch = log.trackId ? String(log.trackId).includes(term) : false;
        return idMatch || camMatch || locMatch || vehMatch || trackMatch;
      }
      return true;
    });
  }, [combinedLogs, eventFilter, vehicleFilter, searchTerm]);

  // Total pages calculation
  const totalEntries = filteredLogs.length;
  const effectivePageSize = pageSize === -1 ? (totalEntries || 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalEntries / effectivePageSize));

  // Ensure currentPage is within range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Sliced logs for current page
  const paginatedLogs = useMemo(() => {
    if (pageSize === -1) {
      return filteredLogs;
    }
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const getEventBadge = (event: string) => {
    if (event === 'IN') {
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.18)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowDownRight size={14} /> IN
        </span>
      );
    }
    if (event === 'OUT') {
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.18)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
          }}
        >
          <ArrowUpRight size={14} /> OUT
        </span>
      );
    }
    if (event === 'STABLE') {
      return (
        <span
          style={{
            padding: '4px 9px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.18)',
            color: '#f59e0b',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck size={13} /> STABLE
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '4px 9px',
          borderRadius: '6px',
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          fontSize: '0.78rem',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
      >
        <Activity size={13} /> DETECTED
      </span>
    );
  };

  const getVehicleColor = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'car') return '#10b981';
    if (t === 'bus') return '#f59e0b';
    if (t === 'truck') return '#ef4444';
    if (t === 'motorcycle') return '#8b5cf6';
    if (t === 'person') return '#06b6d4';
    return '#3b82f6';
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', borderRadius: '16px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Database size={20} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '-0.2px' }}>
                MySQL & Real-time AI Event Logs
              </h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {totalDbCount > 0 ? `${totalDbCount} Total Records in DB` : `${combinedLogs.length} Total Logs`}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tracks all line crossings, vehicle classifications, track IDs, and anti-duplicate events
            </span>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to clear all detection logs from MySQL database?')) {
                try {
                  await clearDetectionLogs();
                  setDbLogs([]);
                  setTotalDbCount(0);
                } catch (e) {}
                if (onClearLogs) onClearLogs();
              }
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <Trash2 size={14} /> Clear DB Logs
          </button>

          <button
            onClick={fetchLogs}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '1rem',
        }}
      >
        {/* Left: Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '220px' }}>
          <Search size={15} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search by Camera, Track ID, Vehicle, or Log ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Right: Event & Vehicle Type Filters + Page Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Event Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Filter size={13} color="var(--text-secondary)" />
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="ALL">All Events</option>
              <option value="IN">IN (Line Cross)</option>
              <option value="OUT">OUT (Line Cross)</option>
              <option value="STABLE">STABLE</option>
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">All Vehicles</option>
            <option value="PERSON">Person</option>
            <option value="CAR">Car</option>
            <option value="BUS">Bus</option>
            <option value="TRUCK">Truck</option>
            <option value="MOTORCYCLE">Motorcycle</option>
          </select>

          {/* Rows Per Page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-color)',
                color: '#60a5fa',
                fontWeight: 600,
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={-1}>All ({totalEntries})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>LOG ID</th>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CAMERA NAME / SOURCE</th>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#60a5fa' }}>OBJECT / TRACK ID</th>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>EVENT TYPE</th>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CONFIDENCE</th>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>COUNT</th>
              <th style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DETECTED AT</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No matching logs found. Try adjusting your search query or filters.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const vColor = getVehicleColor(log.vehicleType);
                const displayName =
                  log.camera?.cameraName ||
                  log.cameraName ||
                  (log.cameraId === 'default-webcam' ? 'Local Webcam / USB Camera' : log.cameraId || 'Camera #1');
                const displayLocation = log.camera?.location || log.location || 'Main Gate';

                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {/* LOG ID */}
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      #{String(log.id).substring(0, 9)}
                    </td>

                    {/* CAMERA NAME / SOURCE */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Camera size={13} color="#60a5fa" />
                        {displayName}
                        <span style={{ fontSize: '0.74rem', opacity: 0.75, fontWeight: 400 }}>({displayLocation})</span>
                      </span>
                    </td>

                    {/* OBJECT / TRACK ID */}
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: `${vColor}20`,
                          color: vColor,
                          border: `1px solid ${vColor}40`,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                        }}
                      >
                        {log.vehicleType.toUpperCase()} {log.trackId ? `#${log.trackId}` : ''}
                      </span>
                    </td>

                    {/* EVENT TYPE */}
                    <td style={{ padding: '12px 14px' }}>{getEventBadge(log.event)}</td>

                    {/* CONFIDENCE */}
                    <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 700 }}>
                      {Math.round((log.confidence || 0.95) * 100)}%
                    </td>

                    {/* COUNT */}
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{log.count || 1}</td>

                    {/* DETECTED AT */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.detectedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        {/* Record count summary */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Showing{' '}
          <strong style={{ color: '#fff' }}>
            {totalEntries === 0 ? 0 : (currentPage - 1) * (pageSize === -1 ? totalEntries : pageSize) + 1}
          </strong>{' '}
          to{' '}
          <strong style={{ color: '#fff' }}>
            {pageSize === -1 ? totalEntries : Math.min(currentPage * pageSize, totalEntries)}
          </strong>{' '}
          of <strong style={{ color: '#60a5fa' }}>{totalEntries}</strong> entries
          {totalDbCount > totalEntries && ` (${totalDbCount} in MySQL DB)`}
        </div>

        {/* Page Nav Buttons */}
        {pageSize !== -1 && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* First Button */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="First Page"
            >
              <ChevronsLeft size={15} />
            </button>

            {/* Prev Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.8rem',
              }}
              title="Previous Page"
            >
              <ChevronLeft size={15} /> Prev
            </button>

            {/* Page number pills */}
            {getPageNumbers().map((num, idx) => {
              if (num === '...') {
                return (
                  <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    ...
                  </span>
                );
              }
              const isCurrent = currentPage === num;
              return (
                <button
                  key={`page-${num}`}
                  onClick={() => setCurrentPage(Number(num))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: isCurrent ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                    background: isCurrent ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'rgba(15, 23, 42, 0.8)',
                    color: isCurrent ? '#fff' : 'var(--text-secondary)',
                    fontWeight: isCurrent ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    minWidth: '32px',
                    textAlign: 'center',
                  }}
                >
                  {num}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.8rem',
              }}
              title="Next Page"
            >
              Next <ChevronRight size={15} />
            </button>

            {/* Last Button */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Last Page"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
