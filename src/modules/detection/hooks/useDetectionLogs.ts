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

  // Merge Live Session Logs + DB Logs with deduplication
  const mergedLogs = useMemo(() => {
    const map = new Map<string, DetectionLogEntry>();
    liveLogs.forEach((l) => map.set(l.id, l));
    dbLogs.forEach((l) => {
      if (!map.has(l.id)) {
        map.set(l.id, l);
      }
    });
    return Array.from(map.values()).sort(
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
