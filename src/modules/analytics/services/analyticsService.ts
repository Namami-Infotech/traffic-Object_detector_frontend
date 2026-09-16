import { analyticsApi } from '../../../services/api';
import type { AnalyticsData } from '../../../services/api';

export const analyticsService = {
  getAnalytics(cameraId?: string): Promise<AnalyticsData | null> {
    return analyticsApi.getAnalytics(cameraId).then((res) => (res.success && res.data ? res.data : null));
  },
};
