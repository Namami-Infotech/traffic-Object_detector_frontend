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

  // Compute date range according to filter (using YYYY-MM-DD for clean day-level querying)
  const getDateRange = useCallback(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    if (dateFilter === 'TODAY') {
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      return { startDate: todayStr, endDate: todayStr };
    }
    if (dateFilter === 'YESTERDAY') {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
      return { startDate: yStr, endDate: yStr };
    }
    if (dateFilter === 'LAST_7_DAYS') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      const sStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
      const eStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      return { startDate: sStr, endDate: eStr };
    }
    if (dateFilter === 'THIS_MONTH') {
      const sStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const eStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      return { startDate: sStr, endDate: eStr };
    }
    if (dateFilter === 'CUSTOM') {
      return { startDate: customStartDate || undefined, endDate: customEndDate || undefined };
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

  // On page 1 with no filters, seamlessly show brand-new detections without expiring/vanishing
  const displayLogs = useMemo(() => {
    if (
      currentPage !== 1 ||
      liveLogs.length === 0 ||
      debouncedSearch ||
      eventFilter !== 'ALL' ||
      vehicleFilter !== 'ALL' ||
      (dateFilter !== 'TODAY' && dateFilter !== 'ALL')
    ) {
      return logs;
    }

    const existingIds = new Set(logs.map((l) => l.id));
    const freshLive = liveLogs.filter((l) => {
      // If already present in DB by ID
      if (existingIds.has(l.id)) return false;
      // If DB logs already contain this exact plate detected within the last 60 seconds, avoid duplicate
      if (
        l.plateNumber &&
        logs.some(
          (dbLog) =>
            dbLog.plateNumber === l.plateNumber &&
            Math.abs(new Date(dbLog.detectedAt).getTime() - new Date(l.detectedAt).getTime()) < 60000
        )
      ) {
        return false;
      }
      return true;
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
