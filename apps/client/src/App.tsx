import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, MachineInstance } from '@mmo/shared';

// MapLibre cargado via CDN en index.html — accedemos al global
declare const maplibregl: typeof import('maplibre-gl');

const backendUrl = import.meta.env.PROD
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

// ─── Estilo oscuro "Industrial Night" con edificios 3D ──────
// Usamos demotiles (demo oficial de MapLibre, siempre disponible,
// OpenMapTiles schema con datos reales de OSM y alturas de edificios)
const STYLE_URL = 'https://demotiles.maplibre.org/style.json';

// Colores del tema oscuro para sobrescribir el estilo base
const DARK_OVERRIDES: Record<string, [string, string]> = {
  'background': ['background-color', '#080c14'],
  'water': ['fill-color', '#0d1f35'],
  'landuse-residential': ['fill-color', '#0c1220'],
  'landuse-commercial': ['fill-color', '#0e1525'],
  'landuse-industrial': ['fill-color', '#0d1a1a'],
  'park': ['fill-color', '#0a180e'],
  'road-minor-casing': ['line-color', '#050a14'],
  'road-secondary-tertiary-casing': ['line-color', '#050a14'],
  'road-primary-casing': ['line-color', '#050a14'],
  'road-motorway-casing': ['line-color', '#050a14'],
};

// ─── HUD Panel ───────────────────────────────────────────────
function HudPanel({ player, coalAmount, onSell }: {
  player: Player;
  coalAmount: number;
  onSell: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', top: 20, left: 20, zIndex: 100,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Logo */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 80%, #0d2040)',
        border: '1px solid #1e4080',
        borderRadius: 8, padding: '12px 20px',
        boxShadow: '0 0 20px rgba(30,80,180,0.3), 0 4px 20px rgba(0,0,0,0.8)',
      }}>
        <div style={{ color: '#4a9eff', fontSize: 10, letterSpacing: 4, fontWeight: 700, textTransform: 'uppercase' }}>
          ⚙ INDUSTRIAL
        </div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
          EMPIRE MMO
        </div>
      </div>

      {/* Corp panel */}
      <div style={{
        background: 'rgba(8,14,26,0.92)', border: '1px solid #1a3060',
        borderRadius: 8, padding: '14px 18px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)', minWidth: 210,
      }}>
        <div style={{ color: '#4a7aaa', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
          Corporación
        </div>
        <div style={{ color: '#e0e8f0', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          {player.username}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>💰</span>
          <div>
            <div style={{ color: '#f0c030', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
              {Number(player.money).toFixed(0)} €
            </div>
            <div style={{ color: '#6a8aaa', fontSize: 10 }}>Capital</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1a3060', margin: '10px 0' }} />

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#8a9aaa', fontSize: 11 }}>⛏ Carbón</span>
            <span style={{ color: '#e0e8f0', fontSize: 11, fontWeight: 700 }}>{coalAmount} / 100</span>
          </div>
          <div style={{ background: '#0d1a2a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${coalAmount}%`, height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
              background: coalAmount > 80 ? 'linear-gradient(90deg,#e05020,#ff6030)' : 'linear-gradient(90deg,#1a6aaa,#40a0ff)',
              boxShadow: coalAmount > 80 ? '0 0 8px rgba(255,80,30,0.6)' : '0 0 8px rgba(40,120,255,0.6)',
            }} />
          </div>
        </div>

        <button onClick={onSell} disabled={coalAmount === 0} style={{
          width: '100%', padding: '10px 0',
          background: coalAmount > 0 ? 'linear-gradient(135deg,#1a4a90,#2060c0)' : '#1a2030',
          border: coalAmount > 0 ? '1px solid #4080e0' : '1px solid #2a3040',
          borderRadius: 6, color: coalAmount > 0 ? '#e0f0ff' : '#4a5a6a',
          fontSize: 13, fontWeight: 700, cursor: coalAmount > 0 ? 'pointer' : 'not-allowed',
          letterSpacing: 1, textTransform: 'uppercase',
          boxShadow: coalAmount > 0 ? '0 0 12px rgba(40,100,220,0.4)' : 'none',
          transition: 'all 0.2s',
        }}>
          {coalAmount > 0 ? `Vender (+${coalAmount * 5}€)` : 'Sin Stock'}
        </button>
      </div>

      {/* Controls hint */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Arrastrar', 'Mover'], ['Rueda', 'Zoom'], ['Btn Der.', 'Rotar 3D']].map(([k, v]) => (
          <div key={k} style={{
            background: 'rgba(8,14,26,0.8)', border: '1px solid #1a3060',
            borderRadius: 6, padding: '5px 10px', textAlign: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: '#4a9eff', fontSize: 10, fontWeight: 700 }}>🖱 {k}</div>
            <div style={{ color: '#4a6a8a', fontSize: 10 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);

  // ── Inicializar mapa 3D ──────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: [0, 20],
      zoom: 2.5,
      pitch: 30,
      bearing: 0,
      antialias: true,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.current.on('load', () => {
      const m = map.current;
      const existingLayers: string[] = m.getStyle().layers.map((l: any) => l.id);

      // Aplicar tema oscuro capa por capa
      Object.entries(DARK_OVERRIDES).forEach(([layerId, [prop, value]]) => {
        if (existingLayers.includes(layerId)) {
          try { m.setPaintProperty(layerId, prop, value); } catch (_) {}
        }
      });

      // Oscurecer todas las capas de relleno de tierra/parques/etc.
      existingLayers.forEach((id) => {
        const layer = m.getStyle().layers.find((l: any) => l.id === id);
        if (!layer) return;
        try {
          if (layer.type === 'fill') {
            const color = m.getPaintProperty(id, 'fill-color');
            if (color && typeof color === 'string' && (color.startsWith('#') || color.startsWith('rgb'))) {
              // dim it via opacity
              m.setPaintProperty(id, 'fill-opacity', 0.3);
            }
          }
          if (layer.type === 'line') {
            m.setPaintProperty(id, 'line-opacity', 0.4);
          }
        } catch (_) {}
      });

      // EDIFICIOS 3D — Usando la source openmaptiles del demotiles style
      // Intenta añadir la capa 3D sobre el source existente
      const sources = m.getStyle().sources;
      const sourceId = Object.keys(sources).find(s =>
        sources[s].url?.includes('openmaptiles') ||
        sources[s].url?.includes('maptiler') ||
        sources[s].url?.includes('maplibre')
      );

      if (sourceId) {
        m.addLayer({
          id: 'buildings-3d',
          source: sourceId,
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 5],
              0, '#0e1825', 20, '#152240', 60, '#1a3060', 150, '#1e3a75',
            ],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 5],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
            'fill-extrusion-opacity': 0.85,
          },
        });
      }

      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Marker de fábrica cuando tengamos coords ─────────────
  useEffect(() => {
    if (!mapReady || !map.current || !machine) return;
    const marker = new maplibregl.Marker({ color: '#2060c0' })
      .setLngLat([-3.7038, 40.4168])
      .setPopup(new maplibregl.Popup().setHTML('<b>🏭 Mina de Carbón</b>'))
      .addTo(map.current);
    return () => { marker.remove(); };
  }, [mapReady, machine]);

  // ── WebSocket ────────────────────────────────────────────
  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('gameState', (data: { player: Player; machine: MachineInstance }) => {
      setPlayer(data.player);
      setMachine(data.machine);
    });
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('gameState'); };
  }, []);

  const handleSell = useCallback(() => socket.emit('sellCoal'), []);
  const coalAmount = machine?.inventory.slots.find(s => s.itemId === 'coal_ore')?.quantity || 0;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#050a14' }}>

      {/* Mapa 3D — siempre visible, independiente del servidor */}
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* HUD del juego — solo si conectado */}
      {connected && player && (
        <HudPanel player={player} coalAmount={coalAmount} onSell={handleSell} />
      )}

      {/* Banner de conexión si no hay servidor */}
      {!connected && (
        <div style={{
          position: 'absolute', bottom: 30, right: 30, zIndex: 100,
          background: 'rgba(8,14,26,0.9)', border: '1px solid #2a4060',
          borderRadius: 8, padding: '12px 16px',
          color: '#4a7aaa', fontSize: 12, backdropFilter: 'blur(8px)',
        }}>
          🔌 Conectando al servidor...
        </div>
      )}
    </div>
  );
}
