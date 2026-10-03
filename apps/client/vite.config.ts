import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Fix crítico para MapLibre GL JS + Vite:
  // MapLibre usa Web Workers internamente para el renderizado WebGL.
  // Sin esta configuración, Vite no los empaqueta correctamente y el mapa no arranca.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
