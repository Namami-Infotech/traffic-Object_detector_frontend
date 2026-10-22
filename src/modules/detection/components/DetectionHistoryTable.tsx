import React, { useState, useEffect } from 'react';
import {
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
  Calendar,
  Camera,
  X,
} from 'lucide-react';
import { useDetectionLogs } from '../hooks/useDetectionLogs';
import type { DetectionLogEntry } from '../types/detection.types';
import { VEHICLE_META } from '../../../constants/vehicle.constants';
import { API_BASE_URL } from '../../../app/config/env.config';

export interface DetectionHistoryTableProps {
  liveLogs?: DetectionLogEntry[];
  onClearLogs?: () => void;
  onOpenPlateScanner?: () => void;
  searchTerm?: string;
}

export const DetectionHistoryTable: React.FC<DetectionHistoryTableProps> = ({
  liveLogs = [],
  onClearLogs,
  onOpenPlateScanner,
  searchTerm: propSearchTerm,
}) => {
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    plateNumber: string;
    trackId?: number;
    time: string;
    confidence?: number;
    vehicleType?: string;
  } | null>(null);

  const getFullImageUrl = (url: string) => {
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  };
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
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    refresh,
    clearLogs,
  } = useDetectionLogs({ liveLogs });

  useEffect(() => {
    if (propSearchTerm !== undefined) {
      setSearchTerm(propSearchTerm);
      setCurrentPage(1);
    }
  }, [propSearchTerm, setSearchTerm, setCurrentPage]);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all database detection logs?')) {
      await clearLogs();
      onClearLogs?.();
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: '1rem', padding: '0.8rem', overflow: 'hidden' }}>
      {/* Unified Table Controls & Filter Toolbar */}
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
            minWidth: '200px',
            maxWidth: '280px',
            flex: '1 1 auto',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search plate, camera, label..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.8rem',
              width: '100%',
              color: 'var(--text-primary)',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
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

        {/* Date Filter (Default: Today / Current Data) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="var(--accent-blue)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date:</span>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            style={{
              padding: '4px 8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: dateFilter === 'TODAY' ? '1px solid #93c5fd' : '1px solid var(--border-color)',
              background: dateFilter === 'TODAY' ? '#eff6ff' : '#ffffff',
              color: dateFilter === 'TODAY' ? '#1d4ed8' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="TODAY">Today (Current)</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="ALL">All Time</option>
            <option value="CUSTOM">Custom Range...</option>
          </select>
        </div>

        {/* Custom Date Pickers when CUSTOM is selected */}
        {dateFilter === 'CUSTOM' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '3px 6px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                color: 'var(--text-primary)',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '3px 6px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: '#ffffff',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}

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

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {onOpenPlateScanner && (
            <button
              type="button"
              onClick={onOpenPlateScanner}
              style={{
                background: 'var(--accent-blue)',
                color: '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Scan Plate (ANPR)
            </button>
          )}

          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh Database Logs"
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
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
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
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

      {/* Table Content */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '8px 8px' }}>Timestamp</th>
              <th style={{ padding: '8px 8px' }}>Camera</th>
              <th style={{ padding: '8px 8px' }}>Vehicle Class</th>
              <th style={{ padding: '8px 8px' }}>Number Plate (ANPR)</th>
              <th style={{ padding: '8px 8px' }}>Track ID</th>
              <th style={{ padding: '8px 8px' }}>Event</th>
              <th style={{ padding: '8px 8px' }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Loading detection records from server...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                      {new Date(log.detectedAt).toLocaleTimeString([], { hour12: false })}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        {new Date(log.detectedAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ padding: '8px 8px', fontWeight: 600 }}>
                      {log.camera?.cameraName || log.cameraName || 'CCTV Feed'}
                      {log.camera?.location && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                          {log.camera.location}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '8px 8px' }}>
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

                    <td style={{ padding: '8px 8px' }}>
                      {log.plateNumber ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#ffffff',
                              border: '1.5px solid #1e293b',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              fontFamily: 'monospace',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              letterSpacing: '0.6px',
                            }}
                          >
                            <span
                              style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '1px 3px',
                                borderRadius: '2px',
                                marginRight: '6px',
                                lineHeight: 1,
                              }}
                            >
                              IND
                            </span>
                            <span style={{ color: '#0f172a' }}>{log.plateNumber}</span>
                            {log.plateConfidence && (
                              <span
                                title={`OCR Accuracy: ${Math.round(log.plateConfidence * 100)}%`}
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '0.65rem',
                                  color: '#059669',
                                  fontWeight: 600,
                                }}
                              >
                                {Math.round(log.plateConfidence * 100)}%
                              </span>
                            )}
                          </div>

                          {log.imageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: log.imageUrl!,
                                  plateNumber: log.plateNumber!,
                                  trackId: log.trackId,
                                  time: new Date(log.detectedAt).toLocaleTimeString(),
                                  confidence: log.plateConfidence || log.confidence,
                                  vehicleType: log.vehicleType,
                                })
                              }
                              title="View Cropped License Plate Photo"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#dbeafe';
                                e.currentTarget.style.borderColor = '#3b82f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#eff6ff';
                                e.currentTarget.style.borderColor = '#bfdbfe';
                              }}
                            >
                              <Camera size={13} color="#2563eb" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                      #{log.trackId || 'N/A'}
                    </td>

                    <td style={{ padding: '8px 8px' }}>
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

                    <td style={{ padding: '8px 8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669' }}>
                        <ShieldCheck size={13} />
                        {Math.round(((log.plateConfidence !== null && log.plateConfidence !== undefined) ? log.plateConfidence : (log.confidence || 0.9)) * 100)}%
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
          {totalCount > 0 ? (
            <>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> records (Page {currentPage} of {totalPages})
            </>
          ) : (
            'Showing 0 records'
          )}
        </span>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
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
        )}
      </div>

      {/* Cropped License Plate Photo Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.25rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Captured Number Plate Photo
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cropped Plate Image Preview */}
            <div
              style={{
                background: '#0f172a',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '140px',
                marginBottom: '1rem',
                border: '1.5px solid #334155',
                overflow: 'hidden',
              }}
            >
              <img
                src={getFullImageUrl(previewImage.url)}
                alt={`Plate ${previewImage.plateNumber}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '220px',
                  borderRadius: '4px',
                  objectFit: 'contain',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80" viewBox="0 0 300 80"><rect width="300" height="80" fill="%231e293b"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="14">Image not available</text></svg>';
                }}
              />
            </div>

            {/* Metadata Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                }}
              >
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Registration No</span>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0284c7', fontSize: '0.95rem' }}>
                  {previewImage.plateNumber}
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                }}
              >
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>OCR Accuracy</span>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                  {previewImage.confidence ? `${Math.round(previewImage.confidence * 100)}%` : '92%'}
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                }}
              >
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Track ID</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  #{previewImage.trackId || 'N/A'}
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                }}
              >
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Timestamp</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {previewImage.time}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
