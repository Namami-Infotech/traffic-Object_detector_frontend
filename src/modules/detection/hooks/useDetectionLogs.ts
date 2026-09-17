import { useState, useEffect, useMemo, useCallback } from 'react';
import { analyticsApi, detectionApi } from '../../../services/api';
import type { DetectionLogEntry } from '../types/detection.types';

export interface UseDetectionLogsOptions {
  liveLogs?: DetectionLogEntry[];
  initialPageSize?: number;
}

export function useDetectionLogs({
  liveLogs = [],
  initialPageSize = 10,
}: UseDetectionLogsOptions = {}) {
  const [dbLogs, setDbLogs] = useState<DetectionLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalDbCount, setTotalDbCount] = useState<number>(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  const fetchDbLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getAnalytics();
      if (res.success && res.data) {
        if (Array.isArray(res.data.recentLogs)) {
          setDbLogs(res.data.recentLogs);
          setTotalDbCount(res.data.recentLogs.length);
        }
      }
    } catch (err) {
      console.warn('Failed to load DB logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDbLogs();
    const interval = setInterval(fetchDbLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchDbLogs]);

  // Merge Live Session Logs + DB Logs with robust deduplication
  const mergedLogs = useMemo(() => {
    const fingerprintMap = new Map<string, DetectionLogEntry>();

    // Helper to generate a unique fingerprint for a detection event
    const getFingerprint = (l: DetectionLogEntry): string => {
      const timeMs = new Date(l.detectedAt).getTime();
      // Round to 5-second bucket to match client liveLog timestamp with DB insert timestamp
      const timeBucket = Math.round(timeMs / 5000);
      const trackKey = l.trackId !== undefined && l.trackId !== null ? l.trackId : 'notrack';
      const camKey = l.cameraId || l.cameraName || 'cam';
      return `${camKey}_${trackKey}_${l.event}_${l.vehicleType}_${timeBucket}`;
    };

    // 1. Add DB logs first (these have full camera relationships & permanent database IDs)
    dbLogs.forEach((l) => {
      const fp = getFingerprint(l);
      if (!fingerprintMap.has(fp)) {
        fingerprintMap.set(fp, l);
      }
    });

    // 2. Add Live logs only if the event hasn't settled into dbLogs yet
    liveLogs.forEach((l) => {
      const fp = getFingerprint(l);
      if (!fingerprintMap.has(fp)) {
        fingerprintMap.set(fp, l);
      }
    });

    return Array.from(fingerprintMap.values()).sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }, [liveLogs, dbLogs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return mergedLogs.filter((log) => {
      const matchesSearch =
        !searchTerm ||
        log.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.cameraName && log.cameraName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.location && log.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEvent = eventFilter === 'ALL' || log.event === eventFilter;
      const matchesVehicle = vehicleFilter === 'ALL' || log.vehicleType === vehicleFilter;

      return matchesSearch && matchesEvent && matchesVehicle;
    });
  }, [mergedLogs, searchTerm, eventFilter, vehicleFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const clearLogs = useCallback(async () => {
    try {
      await detectionApi.clearLogs();
      setDbLogs([]);
      setTotalDbCount(0);
    } catch (err) {
      console.warn('Failed to clear logs:', err);
    }
  }, []);

  return {
    logs: paginatedLogs,
    totalCount: filteredLogs.length,
    totalDbCount,
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
    refresh: fetchDbLogs,
    clearLogs,
  };
}
