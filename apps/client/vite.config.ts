import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // MapLibre se carga desde CDN en index.html — lo marcamos como external
  // para que Vite no intente importarlo desde node_modules
  build: {
    rolldownOptions: {
      external: ['maplibre-gl'],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
