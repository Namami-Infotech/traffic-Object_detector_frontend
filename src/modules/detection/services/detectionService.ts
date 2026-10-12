import { detectionApi } from '../../../services/api';
import type { DetectionLogInput } from '../../../services/api';

export const detectionService = {
  logEvent(data: DetectionLogInput) {
    return detectionApi.createLog(data);
  },

  clearAllLogs() {
    return detectionApi.clearLogs();
  },
};
