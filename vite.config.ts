import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env / .env.local based on current mode
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_URL || env.VITE_API_BASE_URL || 'http://localhost:5004'

  return {
    plugins: [react()],
    server: {
      host: true, // Listens on 0.0.0.0 so other devices on the network can connect
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              // Suppress noisy client disconnect / reset errors on page reload
              if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') return;
            });
          },
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err: any) => {
              // Suppress normal WebSocket close / tab reload aborts
              if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') return;
            });
          },
        },
      },
    },
  }
})
