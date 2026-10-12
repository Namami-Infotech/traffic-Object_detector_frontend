import { useState, useEffect, useMemo, useCallback } from 'react';
import { detectionApi } from '../../../services/api';
import type { DetectionLogEntry } from '../types/detection.types';

export type DateFilterOption = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM';

export interface UseDetectionLogsOptions {
  liveLogs?: DetectionLogEntry[];
  initialPageSize?: number;
  initialDateFilter?: DateFilterOption;
}

export function useDetectionLogs({
  liveLogs = [],
  initialPageSize = 10,
  initialDateFilter = 'TODAY',
}: UseDetectionLogsOptions = {}) {
  const [logs, setLogs] = useState<DetectionLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  // Date Filter: default to TODAY ('Current data')
  const [dateFilter, setDateFilter] = useState<DateFilterOption>(initialDateFilter);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Compute date range according to filter
  const getDateRange = useCallback(() => {
    const now = new Date();
    if (dateFilter === 'TODAY') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    if (dateFilter === 'YESTERDAY') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    if (dateFilter === 'LAST_7_DAYS') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    if (dateFilter === 'THIS_MONTH') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    }
    if (dateFilter === 'CUSTOM') {
      const s = customStartDate ? new Date(customStartDate + 'T00:00:00').toISOString() : undefined;
      const e = customEndDate ? new Date(customEndDate + 'T23:59:59.999').toISOString() : undefined;
      return { startDate: s, endDate: e };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter, customStartDate, customEndDate]);

  // Fetch paginated logs from backend
  const fetchLogs = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const { startDate, endDate } = getDateRange();
        const res = await detectionApi.getDetectionLogs({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch.trim() || undefined,
          event: eventFilter !== 'ALL' ? eventFilter : undefined,
          vehicleType: vehicleFilter !== 'ALL' ? vehicleFilter : undefined,
          startDate,
          endDate,
        });

        if (res.success && res.data) {
          const rawLogs: DetectionLogEntry[] = Array.isArray(res.data.logs)
            ? res.data.logs
            : Array.isArray(res.data)
            ? (res.data as any)
            : [];

          const pagination = res.data.pagination || (res as any).meta?.pagination || (res as any).pagination;

          setLogs(rawLogs);
          if (pagination) {
            setTotalCount(Number(pagination.total || 0));
            setTotalPages(Math.max(1, Number(pagination.totalPages || 1)));
          } else {
            setTotalCount(rawLogs.length);
            setTotalPages(Math.max(1, Math.ceil(rawLogs.length / pageSize)));
          }
        }
      } catch (err) {
        console.warn('Failed to load detection logs from backend:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, eventFilter, vehicleFilter, getDateRange]
  );

  // Fetch when page, pageSize, search, or filters change
  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Polling every 5 seconds to keep database logs up-to-date
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // On page 1 with no filters, seamlessly show brand-new live detections
  const displayLogs = useMemo(() => {
    if (currentPage !== 1 || liveLogs.length === 0 || debouncedSearch || eventFilter !== 'ALL' || vehicleFilter !== 'ALL' || (dateFilter !== 'TODAY' && dateFilter !== 'ALL')) {
      return logs;
    }

    const existingIds = new Set(logs.map((l) => l.id));
    const freshLive = liveLogs.filter((l) => {
      if (existingIds.has(l.id)) return false;
      const ageMs = Date.now() - new Date(l.detectedAt).getTime();
      return ageMs < 8000;
    });

    if (freshLive.length === 0) return logs;
    return [...freshLive, ...logs].slice(0, pageSize);
  }, [logs, liveLogs, currentPage, pageSize, debouncedSearch, eventFilter, vehicleFilter, dateFilter]);

  const clearLogs = useCallback(async () => {
    try {
      await detectionApi.clearLogs();
      setLogs([]);
      setTotalCount(0);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (err) {
      console.warn('Failed to clear logs:', err);
    }
  }, []);

  return {
    logs: displayLogs,
    totalCount,
    totalDbCount: totalCount,
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
    refresh: () => fetchLogs(false),
    clearLogs,
  };
}
