import { useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsService } from '../services/analyticsService';
import type { AnalyticsSummaryState, MergedVehicleInOut } from '../types/analytics.types';
import type { VehicleInOutMetrics } from '../../../services/api';

export interface UseTrafficAnalyticsOptions {
  cameraInMap?: Record<string, number>;
  cameraOutMap?: Record<string, number>;
  cameraActiveMap?: Record<string, number>;
  cameraLiveCountsMap?: Record<string, Record<string, number>>;
  activeCameraId?: string;
  viewMode?: 'GRID' | 'SINGLE';
  liveVehicleInOut?: Record<string, { in: number; out: number }>;
}

export function useTrafficAnalytics({
  cameraInMap = {},
  cameraOutMap = {},
  cameraActiveMap = {},
  cameraLiveCountsMap = {},
  activeCameraId = 'default-webcam',
  viewMode = 'GRID',
  liveVehicleInOut = {},
}: UseTrafficAnalyticsOptions = {}) {
  const [dbGlobalTotals, setDbGlobalTotals] = useState<AnalyticsSummaryState>({
    totalIn: 0,
    totalOut: 0,
    summary: { CAR: 0, TRUCK: 0, BUS: 0, MOTORCYCLE: 0 },
  });

  const [dbGlobalVehicleInOut, setDbGlobalVehicleInOut] = useState<Record<string, VehicleInOutMetrics>>({
    CAR: { in: 0, out: 0 },
    TRUCK: { in: 0, out: 0 },
    BUS: { in: 0, out: 0 },
    MOTORCYCLE: { in: 0, out: 0 },
    PERSON: { in: 0, out: 0 },
  });

  const [dbCameraStats, setDbCameraStats] = useState<
    Record<string, { in: number; out: number; vehicles?: Record<string, number>; vehicleInOut?: Record<string, { in: number; out: number }> }>
  >({});

  const fetchGlobalDbAnalytics = useCallback(async () => {
    try {
      const data = await analyticsService.getAnalytics();
      if (data) {
        setDbGlobalTotals({
          totalIn: data.totalIn || 0,
          totalOut: data.totalOut || 0,
          summary: data.summary || {},
        });
        if (data.vehicleInOut) {
          setDbGlobalVehicleInOut(data.vehicleInOut);
        }
        if (data.cameraStats) {
          setDbCameraStats(data.cameraStats);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch global DB analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalDbAnalytics();
    const interval = setInterval(fetchGlobalDbAnalytics, 3000);
    return () => clearInterval(interval);
  }, [fetchGlobalDbAnalytics]);

  // Aggregate metrics based on viewMode (SINGLE vs GRID)
  const displayMetrics = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let activeCount = 0;
    let liveCounts: Record<string, number> = {};

    if (viewMode === 'SINGLE') {
      inCount = cameraInMap[activeCameraId] || 0;
      outCount = cameraOutMap[activeCameraId] || 0;
      activeCount = cameraActiveMap[activeCameraId] || 0;
      liveCounts = cameraLiveCountsMap[activeCameraId] || {};
    } else {
      inCount = Object.values(cameraInMap).reduce((acc, val) => acc + (val || 0), 0);
      outCount = Object.values(cameraOutMap).reduce((acc, val) => acc + (val || 0), 0);
      activeCount = Object.values(cameraActiveMap).reduce((acc, val) => acc + (val || 0), 0);

      const aggregatedClassCounts: Record<string, number> = {};
      Object.values(cameraLiveCountsMap).forEach((cMap) => {
        Object.entries(cMap || {}).forEach(([cls, cnt]) => {
          aggregatedClassCounts[cls] = (aggregatedClassCounts[cls] || 0) + (cnt || 0);
        });
      });
      liveCounts = aggregatedClassCounts;
    }

    return {
      inCount: Math.max(inCount, dbGlobalTotals.totalIn),
      outCount: Math.max(outCount, dbGlobalTotals.totalOut),
      activeCount,
      liveCounts: { ...liveCounts, ...dbGlobalTotals.summary },
    };
  }, [
    viewMode,
    cameraInMap,
    cameraOutMap,
    cameraActiveMap,
    cameraLiveCountsMap,
    activeCameraId,
    dbGlobalTotals,
  ]);

  // Real-time merged vehicle IN / OUT combining MySQL counts with instant live tallies
  const mergedVehicleInOut: MergedVehicleInOut = useMemo(() => {
    const classes = ['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'PERSON'] as const;
    const result: MergedVehicleInOut = {};

    classes.forEach((cls) => {
      const dbVal = dbGlobalVehicleInOut[cls] || { in: 0, out: 0 };
      const liveVal = liveVehicleInOut[cls] || { in: 0, out: 0 };
      const inV = Math.max(dbVal.in || 0, liveVal.in || 0);
      const outV = Math.max(dbVal.out || 0, liveVal.out || 0);
      const dbTotal = (dbVal as any).total || 0;
      const summaryTotal = dbGlobalTotals.summary[cls] || 0;
      const totalV = Math.max(inV + outV, dbTotal, summaryTotal);

      result[cls] = {
        in: inV,
        out: outV,
        total: totalV,
      };
    });

    return result;
  }, [dbGlobalVehicleInOut, liveVehicleInOut, dbGlobalTotals.summary]);

  return {
    dbGlobalTotals,
    dbGlobalVehicleInOut,
    displayInCount: displayMetrics.inCount,
    displayOutCount: displayMetrics.outCount,
    displayActiveCount: displayMetrics.activeCount,
    displayLiveCounts: displayMetrics.liveCounts,
    mergedVehicleInOut,
    dbCameraStats,
    refetch: fetchGlobalDbAnalytics,
  };
}
