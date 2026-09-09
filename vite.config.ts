import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listens on 0.0.0.0 so other devices on the network can connect
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:5004',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
