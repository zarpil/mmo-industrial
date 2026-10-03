import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Map, {
  NavigationControl,
  useMap,
} from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Player, MachineInstance } from '@mmo/shared';

const backendUrl = import.meta.env.PROD
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

// ============================================================
// ESTILO DE MAPA PERSONALIZADO: "Industrial Night"
// Construido sobre los vector tiles gratuitos de OpenFreeMap
// sin necesidad de API Key, con extrusión 3D de edificios real
// ============================================================
const INDUSTRIAL_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'Industrial Night',
  // Glyphs (fuentes de texto) desde CDN de MapLibre - siempre disponible
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  // Sin sprite: no usamos iconos POI, elimina el error 404
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    // Fondo oceano
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#080c14' },
    },
    // Agua
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#0d1f35' },
    },
    // Tierra base
    {
      id: 'landuse',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      paint: {
        'fill-color': [
          'match',
          ['get', 'class'],
          'residential', '#0f1520',
          'commercial', '#111928',
          'industrial', '#0e1a14',
          'park', '#0a1810',
          '#0c1118',
        ],
      },
    },
    // Tierra/Continentes
    {
      id: 'land',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      paint: {
        'fill-color': [
          'match',
          ['get', 'class'],
          'wood', '#0a1a0c',
          'grass', '#0b1810',
          'scrub', '#0c1a0e',
          'crop', '#0d1c12',
          '#0c1118',
        ],
      },
    },
    // Calles secundarias
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'minor', 'service', 'track', 'path'],
      paint: {
        'line-color': '#1a2535',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 18, 2],
      },
    },
    // Calles principales
    {
      id: 'road-main',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'secondary', 'tertiary', 'primary'],
      paint: {
        'line-color': '#1e3050',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 18, 4],
      },
    },
    // Autopistas con efecto neón
    {
      id: 'road-motorway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      paint: {
        'line-color': '#1a4a7a',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 18, 6],
        'line-blur': 0.5,
      },
    },
    // Autopistas glow (efecto neón)
    {
      id: 'road-motorway-glow',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      paint: {
        'line-color': 'rgba(40,120,200,0.3)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 18, 12],
        'line-blur': 4,
      },
    },
    // Edificios base (sin extrusión)
    {
      id: 'building-fill',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-color': '#111c2a',
        'fill-outline-color': '#1a3050',
      },
    },
    // EDIFICIOS 3D EXTRUIDOS - El corazón visual del juego
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': [
          'interpolate',
          ['linear'],
          ['get', 'render_height'],
          0,   '#0e1825',
          10,  '#111f30',
          30,  '#142440',
          80,  '#1a3055',
          150, '#1e3a6a',
          300, '#243f75',
        ],
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14, 0,
          15, ['coalesce', ['get', 'render_height'], 10],
        ],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.9,
      },
    },
    // Nombres de países (gran zoom out)
    {
      id: 'label-country',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'country'],
      maxzoom: 8,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 8, 16],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.1,
      },
      paint: {
        'text-color': '#4a7aaa',
        'text-halo-color': '#080c14',
        'text-halo-width': 2,
      },
    },
    // Nombres de ciudades
    {
      id: 'label-city',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['in', 'class', 'city', 'town'],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 15, 16],
      },
      paint: {
        'text-color': '#6a9acc',
        'text-halo-color': '#080c14',
        'text-halo-width': 2,
      },
    },
  ],
};

// ─── Componente: Panel HUD ────────────────────────────────────
function HudPanel({ player, coalAmount, onSell }: {
  player: Player;
  coalAmount: number;
  onSell: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 10,
    }}>
      {/* Logo + Recursos (top-left) */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        display: 'flex', flexDirection: 'column', gap: 12,
        pointerEvents: 'auto',
      }}>
        {/* Logo */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1628 80%, #0d2040)',
          border: '1px solid #1e4080',
          borderRadius: 8,
          padding: '12px 20px',
          boxShadow: '0 0 20px rgba(30,80,180,0.3), 0 4px 20px rgba(0,0,0,0.8)',
        }}>
          <div style={{ color: '#4a9eff', fontSize: 11, letterSpacing: 4, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
            ⚙ INDUSTRIAL
          </div>
          <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
            EMPIRE MMO
          </div>
        </div>

        {/* Corp info */}
        <div style={{
          background: 'rgba(8, 14, 26, 0.9)',
          border: '1px solid #1a3060',
          borderRadius: 8,
          padding: '14px 18px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
          minWidth: 200,
        }}>
          <div style={{ color: '#4a7aaa', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            Corporación
          </div>
          <div style={{ color: '#e0e8f0', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            {player.username}
          </div>

          {/* Capital */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div>
              <div style={{ color: '#f0c030', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                {player.money.toFixed(0)} €
              </div>
              <div style={{ color: '#6a8aaa', fontSize: 10 }}>Capital disponible</div>
            </div>
          </div>

          {/* Separador */}
          <div style={{ borderTop: '1px solid #1a3060', margin: '10px 0' }} />

          {/* Recurso carbón */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#8a9aaa', fontSize: 11 }}>⛏ Carbón en Stock</span>
              <span style={{ color: '#e0e8f0', fontSize: 11, fontWeight: 700 }}>{coalAmount} / 100</span>
            </div>
            {/* Barra de progreso */}
            <div style={{ background: '#0d1a2a', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{
                width: `${coalAmount}%`,
                height: '100%',
                background: coalAmount > 80
                  ? 'linear-gradient(90deg, #e05020, #ff6030)'
                  : 'linear-gradient(90deg, #1a6aaa, #40a0ff)',
                borderRadius: 4,
                transition: 'width 0.5s ease',
                boxShadow: coalAmount > 80 ? '0 0 8px rgba(255,80,30,0.6)' : '0 0 8px rgba(40,120,255,0.6)',
              }} />
            </div>
          </div>

          {/* Botón vender */}
          <button
            onClick={onSell}
            disabled={coalAmount === 0}
            style={{
              width: '100%',
              padding: '10px 0',
              background: coalAmount > 0
                ? 'linear-gradient(135deg, #1a4a90, #2060c0)'
                : '#1a2030',
              border: coalAmount > 0 ? '1px solid #4080e0' : '1px solid #2a3040',
              borderRadius: 6,
              color: coalAmount > 0 ? '#e0f0ff' : '#4a5a6a',
              fontSize: 13,
              fontWeight: 700,
              cursor: coalAmount > 0 ? 'pointer' : 'not-allowed',
              letterSpacing: 1,
              textTransform: 'uppercase',
              boxShadow: coalAmount > 0 ? '0 0 12px rgba(40,100,220,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {coalAmount > 0 ? `Vender (+${coalAmount * 5}€)` : 'Sin Stock'}
          </button>
        </div>
      </div>

      {/* Instrucciones (bottom-center) */}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 20,
      }}>
        {[
          { key: '🖱 Arrastrar', desc: 'Mover' },
          { key: '⚙ Rueda', desc: 'Zoom' },
          { key: '🖱 Click Der.', desc: 'Rotar 3D' },
        ].map(({ key, desc }) => (
          <div key={key} style={{
            background: 'rgba(8,14,26,0.8)',
            border: '1px solid #1a3060',
            borderRadius: 6,
            padding: '6px 14px',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ color: '#4a9eff', fontSize: 11, fontWeight: 700 }}>{key}</div>
            <div style={{ color: '#4a6a8a', fontSize: 10 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── App Principal ────────────────────────────────────────────
export default function App() {
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 0, latitude: 20, zoom: 2.5,
    pitch: 0, bearing: 0,
  });

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

  if (!connected) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', height: '100vh',
        background: 'linear-gradient(135deg, #050a14, #0a1428)',
        color: '#4a9eff', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>⚙</div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>CONECTANDO AL SERVIDOR</div>
        <div style={{ fontSize: 13, color: '#2a5080', letterSpacing: 1 }}>INDUSTRIAL EMPIRE MMO</div>
        <div style={{
          marginTop: 12, width: 200, height: 3,
          background: '#0a1828', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #1a6aaa, #40a0ff)',
            animation: 'loading 1.5s ease-in-out infinite',
            width: '60%',
          }} />
        </div>
        <style>{`@keyframes loading { 0%{transform:translateX(-100%)} 100%{transform:translateX(280%)} }`}</style>
      </div>
    );
  }

  const coalAmount = machine?.inventory.slots.find(s => s.itemId === 'coal_ore')?.quantity || 0;

  // Coordenadas de la fábrica prototipo (Madrid)
  const FACTORY_LNG = -3.7038;
  const FACTORY_LAT = 40.4168;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={INDUSTRIAL_MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        maxPitch={85}
      >
        <NavigationControl position="bottom-right" />

        {/* Marcador fábrica usando overlay HTML posicionado */}
        {machine && (() => {
          // Usamos el hook useMap en un sub-componente
          return null;
        })()}
      </Map>

      {/* HUD de juego */}
      {player && (
        <HudPanel player={player} coalAmount={coalAmount} onSell={handleSell} />
      )}

      {/* Marcador fábrica con posición absoluta calculada (workaround sin hook) */}
      {machine && (
        <FactoryOverlay
          longitude={FACTORY_LNG}
          latitude={FACTORY_LAT}
          full={machine.status === 'full'}
          coalAmount={coalAmount}
        />
      )}
    </div>
  );
}

// Componente que accede al mapa para convertir coords → píxeles
function FactoryOverlay({ longitude, latitude, full, coalAmount }: {
  longitude: number;
  latitude: number;
  full: boolean;
  coalAmount: number;
}) {
  const { current: map } = useMap();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      const p = map.project([longitude, latitude]);
      setPos({ x: p.x, y: p.y });
    };
    update();
    map.on('move', update);
    map.on('zoom', update);
    map.on('rotate', update);
    map.on('pitch', update);
    return () => { map.off('move', update); map.off('zoom', update); map.off('rotate', update); map.off('pitch', update); };
  }, [map, longitude, latitude]);

  if (!pos) return null;
  const color = full ? '#ff4030' : '#40a0ff';

  return (
    <div style={{
      position: 'absolute',
      left: pos.x - 30,
      top: pos.y - 30,
      pointerEvents: 'auto',
      zIndex: 5,
    }}>
      <div style={{
        width: 60, height: 60,
        filter: `drop-shadow(0 0 14px ${color})`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width={60} height={60}>
          <circle cx="30" cy="30" r="27" fill="rgba(8,14,26,0.92)" stroke={color} strokeWidth="2.5"/>
          <text x="30" y="39" textAnchor="middle" fontSize="26">🏭</text>
        </svg>
      </div>
      {/* Badge de inventario */}
      <div style={{
        position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(8,14,26,0.9)',
        border: `1px solid ${color}`,
        borderRadius: 10, padding: '2px 8px',
        color: color, fontSize: 10, fontWeight: 700,
        whiteSpace: 'nowrap',
        boxShadow: `0 0 8px ${color}40`,
      }}>
        ⛏ {coalAmount}/100
      </div>
    </div>
  );
}
