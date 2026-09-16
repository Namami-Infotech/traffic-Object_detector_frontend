/**
 * Application Environment Configuration
 * Intelligent Dev/Prod switching:
 * - Development: Uses empty string '' so Vite proxies /api and /socket.io to backend
 * - Production: Targets the live server URL unless overridden by VITE_API_BASE_URL
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://www.namami-infotech.com/trafficdetector' : '');

export const IS_PRODUCTION: boolean = import.meta.env.PROD;
export const IS_DEVELOPMENT: boolean = import.meta.env.DEV;
