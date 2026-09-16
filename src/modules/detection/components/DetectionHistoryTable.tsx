import React from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';
import { useDetectionLogs } from '../hooks/useDetectionLogs';
import type { DetectionLogEntry } from '../types/detection.types';
import { VEHICLE_META } from '../../../constants/vehicle.constants';

export interface DetectionHistoryTableProps {
  liveLogs?: DetectionLogEntry[];
  onClearLogs?: () => void;
}

export const DetectionHistoryTable: React.FC<DetectionHistoryTableProps> = ({
  liveLogs = [],
  onClearLogs,
}) => {
  const {
    logs,
    totalCount,
    loading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    searchTerm,
    setSearchTerm,
    eventFilter,
    setEventFilter,
    vehicleFilter,
    setVehicleFilter,
    refresh,
    clearLogs,
  } = useDetectionLogs({ liveLogs });

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all database detection logs?')) {
      await clearLogs();
      onClearLogs?.();
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.2rem', overflow: 'hidden' }}>
      {/* Table Header Controls */}
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
          <Database size={20} color="var(--accent-blue)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Traffic Detection & Crossing History
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
            {totalCount} Records
          </span>
        </div>

        {/* Action buttons: Refresh, Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh Database Logs"
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
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleClear}
            title="Clear all database logs"
            style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
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
            <Trash2 size={13} />
            Clear DB Logs
          </button>
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
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '200px' }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by vehicle, camera or location..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
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

        {/* Event Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Event:</span>
          <select
            value={eventFilter}
            onChange={(e) => {
              setEventFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">All Events</option>
            <option value="IN">IN (Entry)</option>
            <option value="OUT">OUT (Exit)</option>
            <option value="DETECTION">Detection</option>
          </select>
        </div>

        {/* Vehicle Class Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Vehicle:</span>
          <select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">All Vehicles</option>
            <option value="CAR">Car</option>
            <option value="TRUCK">Truck</option>
            <option value="BUS">Bus</option>
            <option value="MOTORCYCLE">Motorcycle</option>
            <option value="PERSON">Pedestrian</option>
          </select>
        </div>

        {/* Page Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              color: 'var(--text-primary)',
            }}
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '8px 12px' }}>Timestamp</th>
              <th style={{ padding: '8px 12px' }}>Camera</th>
              <th style={{ padding: '8px 12px' }}>Vehicle Class</th>
              <th style={{ padding: '8px 12px' }}>Track ID</th>
              <th style={{ padding: '8px 12px' }}>Event</th>
              <th style={{ padding: '8px 12px' }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No detection logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const vMeta = VEHICLE_META[log.vehicleType] || {
                  label: log.vehicleType,
                  emoji: '🚗',
                  color: '#3b82f6',
                  bg: '#eff6ff',
                  border: '#bfdbfe',
                };

                const isEntry = log.event === 'IN';
                const isExit = log.event === 'OUT';

                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {new Date(log.detectedAt).toLocaleTimeString([], { hour12: false })}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        {new Date(log.detectedAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {log.camera?.cameraName || log.cameraName || 'CCTV Feed'}
                      {log.camera?.location && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                          {log.camera.location}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          background: vMeta.bg,
                          color: vMeta.color,
                          border: `1px solid ${vMeta.border}`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{vMeta.emoji}</span>
                        <span>{vMeta.label}</span>
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      #{log.trackId || 'N/A'}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      {isEntry && (
                        <span
                          style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ArrowDownRight size={13} /> IN
                        </span>
                      )}
                      {isExit && (
                        <span
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ArrowUpRight size={13} /> OUT
                        </span>
                      )}
                      {!isEntry && !isExit && (
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                          }}
                        >
                          {log.event}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669' }}>
                        <ShieldCheck size={13} />
                        {Math.round((log.confidence || 0.9) * 100)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
            paddingTop: '0.8rem',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Page {currentPage} of {totalPages}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First Page"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Previous Page"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {/* Numbered Page Buttons: 1, 2, 3 ... 20 */}
            {(() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
              } else if (currentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
              } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
              }

              return pages.map((pageItem, idx) => {
                if (pageItem === '...') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        padding: '0 4px',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        userSelect: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '22px',
                        height: '32px',
                      }}
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = pageItem as number;
                const isActive = pageNum === currentPage;

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      minWidth: '32px',
                      height: '32px',
                      padding: '0 6px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#0f172a' : '#ffffff',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      border: `1px solid ${isActive ? '#0f172a' : 'var(--border-color)'}`,
                      cursor: isActive ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? '0 2px 6px rgba(15, 23, 42, 0.2)' : undefined,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              });
            })()}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              title="Next Page"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last Page"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
