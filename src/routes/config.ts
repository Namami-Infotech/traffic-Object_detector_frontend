// Base API configuration with intelligent Dev/Prod switching
// In development: Uses empty string '' so Vite proxies /api and /socket.io to local backend (port 5004)
// In production: Automatically targets the live server URL unless overridden
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://www.namami-infotech.com/trafficdetector' : '');

