import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  // Permite que Vite empaquete el worker de MapLibre correctamente en producción
  worker: {
    format: 'es',
  },
})
