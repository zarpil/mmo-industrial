import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─────────────────────────────────────────────────────────────
// FIX CRÍTICO: MapLibre GL + Vite Worker Registration
// MapLibre usa Web Workers internos para el renderizado WebGL.
// En Vite (tanto dev como prod), el Worker no se empaqueta
// automáticamente, hay que indicarle la URL explícitamente
// ANTES de que se monte cualquier componente de mapa.
// ─────────────────────────────────────────────────────────────
import { setWorkerUrl } from 'maplibre-gl'
setWorkerUrl(
  new URL('maplibre-gl/dist/maplibre-gl-csp-worker', import.meta.url).href
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
