import { detectionApi } from '../../../services/api';
import type { DetectionLogInput } from '../../../services/api';

export const detectionService = {
  logEvent(data: DetectionLogInput) {
    return detectionApi.createLog(data).catch((err) => {
      console.warn('Failed to save detection log to DB:', err.message);
    });
  },

  clearAllLogs() {
    return detectionApi.clearLogs();
  },
};
