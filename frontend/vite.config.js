import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: process.cwd(),
  plugins: [react()],
  optimizeDeps: { noDiscovery: true, include: ["react-dom/client", "leaflet"] },
  server: { proxy: { '/api': 'http://localhost:5001' } }
})
