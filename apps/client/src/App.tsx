import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, MachineInstance } from '@mmo/shared';

// MapLibre desde el CDN en index.html
declare const maplibregl: any;

const backendUrl = import.meta.env.PROD
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

// Estilo Vectorial Oscuro Nativo de OpenFreeMap (rápido, sin API key, soporte OSM completo)
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

// Ciudades e hitos globales para navegación instantánea
const GLOBAL_HUBS = [
  { id: 'madrid', name: 'Madrid (Distrito AZCA)', coords: [-3.6917, 40.4500] as [number, number], zoom: 16.2, pitch: 62, bearing: -25 },
  { id: 'ny', name: 'Nueva York (Midtown)', coords: [-73.9855, 40.7484] as [number, number], zoom: 16.0, pitch: 64, bearing: 30 },
  { id: 'tokyo', name: 'Tokio (Shinjuku)', coords: [139.6917, 35.6895] as [number, number], zoom: 16.4, pitch: 60, bearing: -40 },
  { id: 'london', name: 'Londres (Canary Wharf)', coords: [-0.0235, 51.5054] as [number, number], zoom: 16.1, pitch: 62, bearing: 45 },
  { id: 'ruhr', name: 'Cuenca del Ruhr (Industrial)', coords: [7.0116, 51.4556] as [number, number], zoom: 15.8, pitch: 58, bearing: 15 },
];

// Opciones de construcción (Factorio / Satisfactory style)
interface BuildableBlueprint {
  id: string;
  name: string;
  icon: string;
  cost: number;
  energyReqMW: number;
  outputName: string;
  outputRateSec: number;
  desc: string;
}

const BLUEPRINTS: BuildableBlueprint[] = [
  { id: 'coal_extractor', name: 'Mina de Carbón', icon: '⛏️', cost: 100, energyReqMW: 5, outputName: 'Carbón', outputRateSec: 5, desc: 'Extrae carbón fósil para energía y metalurgia.' },
  { id: 'iron_extractor', name: 'Extractor de Hierro', icon: '🪨', cost: 250, energyReqMW: 8, outputName: 'Hierro', outputRateSec: 6, desc: 'Extracción de menas de hierro de alta pureza.' },
  { id: 'smelter', name: 'Fundición Industrial', icon: '🔥', cost: 500, energyReqMW: 15, outputName: 'Acero', outputRateSec: 8, desc: 'Combina carbón y hierro para forjar acero.' },
  { id: 'power_gen', name: 'Central Térmica', icon: '⚡', cost: 350, energyReqMW: -30, outputName: 'Energía', outputRateSec: 0, desc: 'Genera 30 MW quemando carbón.' },
  { id: 'assembler', name: 'Línea de Montaje', icon: '🏭', cost: 1200, energyReqMW: 20, outputName: 'Maquinaria', outputRateSec: 12, desc: 'Produce componentes mecánicos avanzados.' },
];

// Materias primas del mercado (CapitalRift style)
interface Commodity {
  id: string;
  name: string;
  unit: string;
  price: number;
  change: number;
  icon: string;
}

const COMMODITIES: Commodity[] = [
  { id: 'coal_ore', name: 'Carbón Térmico', unit: 'ton', price: 5, change: +2.4, icon: '⛏️' },
  { id: 'iron_ore', name: 'Mineral de Hierro', unit: 'ton', price: 9, change: -1.1, icon: '🪨' },
  { id: 'steel_ingot', name: 'Lingotes de Acero', unit: 'u', price: 24, change: +4.8, icon: '🔩' },
  { id: 'machinery_parts', name: 'Piezas Industriales', unit: 'u', price: 65, change: +1.5, icon: '⚙️' },
  { id: 'power_mwh', name: 'Energía Eléctrica', unit: 'MWh', price: 42, change: -0.8, icon: '⚡' },
];

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Estado del Jugador y Máquina
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);
  const [inventoryStock, setInventoryStock] = useState<Record<string, number>>({ coal_ore: 15 });

  // Coordenadas de la fábrica principal del jugador (Madrid AZCA por defecto)
  const [factoryCoords, setFactoryCoords] = useState<[number, number]>([-3.6917, 40.4500]);
  const factoryMarkerRef = useRef<any>(null);

  // Interacción UI
  const [selectedHub, setSelectedHub] = useState('madrid');
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'factory' | 'parcels'>('overview');
  const [selectedParcel, setSelectedParcel] = useState<{ lat: number; lng: number; area: number; zone: string; price: number } | null>(null);
  const [buildingMode, setBuildingMode] = useState<BuildableBlueprint | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Notificación de eventos
  const [floatingPill, setFloatingPill] = useState<string | null>(null);

  // Reproductor de sonido sintetizado para inmersión
  const playSound = useCallback((type: 'click' | 'produce' | 'build' | 'cash') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'produce') {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(540, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'cash') {
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'build') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Audio fallback silencioso
    }
  }, [soundEnabled]);

  // ── 1. Inicialización del Mapa 3D con MapLibre ──────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: [-3.6917, 40.4500], // Madrid AZCA: Distrito Financiero & Industrial
      zoom: 16.2,
      pitch: 62, // Perspectiva 3D inclinada tipo juego / Google Earth
      bearing: -25,
      antialias: true,
      maxPitch: 85,
    });

    map.current = m;

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    m.on('load', () => {
      console.log('🗺️ Mapa base cargado con éxito');

      // ── A. Luz 3D direccional (ilumina caras de edificios 3D como en un juego) ──
      try {
        m.setLight({
          anchor: 'viewport',
          color: '#e2f1ff',
          intensity: 0.65,
          position: [1.5, 90, 75],
        });
      } catch (err) {
        console.warn('Luz no soportada:', err);
      }

      // ── B. Terreno 3D (DEM Elevation) con AWS Terrarium Tiles ──
      try {
        if (!m.getSource('terrain-dem')) {
          m.addSource('terrain-dem', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14,
          });
          m.setTerrain({ source: 'terrain-dem', exaggeration: 1.35 });
          console.log('⛰️ Terreno 3D activado con elevación real');
        }
      } catch (err) {
        console.warn('⚠️ Elevación DEM omitida:', err);
      }

      // ── C. Edificios 3D con Extrusión Dinámica (OpenMapTiles) ──
      try {
        if (!m.getLayer('buildings-3d')) {
          m.addLayer({
            id: 'buildings-3d',
            source: 'openmaptiles',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              // Altura real con fallback
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                13, 0,
                14.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 12]
              ],
              'fill-extrusion-base': [
                'coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0
              ],
              // Paleta arquitectónica ciber-industrial con gradiente por altura
              'fill-extrusion-color': [
                'interpolate', ['linear'],
                ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
                0, '#101c2e',
                20, '#162842',
                50, '#1c375c',
                90, '#224a7d',
                150, '#2a5ea0',
                250, '#3878cc'
              ],
              'fill-extrusion-opacity': 0.88,
            },
          });
          console.log('🏢 Edificios 3D extrusionados renderizándose');
        }
      } catch (err) {
        console.warn('⚠️ No se pudo inyectar buildings-3d:', err);
      }

      // ── D. Clic en el mapa para inspeccionar parcelas o construir ──
      m.on('click', (e: any) => {
        const coords = e.lngLat;
        const lat = parseFloat(coords.lat.toFixed(5));
        const lng = parseFloat(coords.lng.toFixed(5));

        setSelectedParcel({
          lat,
          lng,
          area: Math.floor(800 + Math.random() * 1200),
          zone: Math.random() > 0.4 ? 'Zona Industrial Pesada (Z-I)' : 'Parque Tecnológico / Logístico',
          price: 250,
        });

        playSound('click');
      });

      setMapReady(true);
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, [playSound]);

  // ── 2. Marcador 3D de la Fábrica del Jugador ────────────────────────
  useEffect(() => {
    if (!mapReady || !map.current) return;

    if (factoryMarkerRef.current) {
      factoryMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'industrial-factory-marker';
    el.innerHTML = `
      <div class="marker-smoke"></div>
      <div class="marker-beacon">
        <div class="marker-ping-ring"></div>
        <span style="font-size: 22px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">🏭</span>
      </div>
      <div class="marker-label">
        <span style="color: #4ade80;">● ACTIVA</span> | Mina Carbón #1
      </div>
    `;

    el.onclick = (e) => {
      e.stopPropagation();
      setActiveTab('factory');
      playSound('click');
    };

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(factoryCoords)
      .addTo(map.current);

    factoryMarkerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [mapReady, factoryCoords, playSound]);

  // ── 3. WebSocket & Persistencia con el Servidor ───────────────────
  useEffect(() => {
    if (socket.connected) {
      setConnected(true);
    }

    const onConnect = () => {
      console.log('⚡ Conectado al servidor MMO');
      setConnected(true);
    };

    const onDisconnect = () => {
      console.warn('🔌 Desconectado del servidor MMO');
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('gameState', (data: { player: Player; machine: MachineInstance }) => {
      setPlayer(data.player);
      setMachine(data.machine);

      // Actualizar inventario
      const coalSlot = data.machine.inventory.slots.find(s => s.itemId === 'coal_ore');
      const coalQty = coalSlot ? coalSlot.quantity : 0;
      setInventoryStock(prev => {
        if (coalQty > (prev.coal_ore || 0)) {
          setFloatingPill(`+${coalQty - (prev.coal_ore || 0)} Carbón`);
          setTimeout(() => setFloatingPill(null), 2500);
          playSound('produce');
        }
        return { ...prev, coal_ore: coalQty };
      });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameState');
    };
  }, [playSound]);

  // Acción: Venta de recursos al mercado
  const handleSellResource = useCallback((itemKey: string, pricePerUnit: number) => {
    const qty = inventoryStock[itemKey] || 0;
    if (qty <= 0) return;

    if (itemKey === 'coal_ore') {
      socket.emit('sellCoal');
    } else {
      // Simulación local para otros recursos
      const totalEarned = qty * pricePerUnit;
      setPlayer(prev => prev ? { ...prev, money: prev.money + totalEarned } : null);
      setInventoryStock(prev => ({ ...prev, [itemKey]: 0 }));
    }

    playSound('cash');
  }, [inventoryStock, playSound]);

  // Acción: Navegación rápida entre urbes
  const flyToHub = (hub: typeof GLOBAL_HUBS[0]) => {
    setSelectedHub(hub.id);
    playSound('click');
    if (!map.current) return;

    map.current.flyTo({
      center: hub.coords,
      zoom: hub.zoom,
      pitch: hub.pitch,
      bearing: hub.bearing,
      duration: 3500,
      essential: true,
    });
  };

  // Acción: Centrar en la propia fábrica
  const flyToMyFactory = () => {
    playSound('click');
    if (!map.current) return;

    map.current.flyTo({
      center: factoryCoords,
      zoom: 16.8,
      pitch: 65,
      bearing: -20,
      duration: 2500,
      essential: true,
    });
  };

  // Acción: Construir en la parcela seleccionada
  const handleConfirmBuild = () => {
    if (!selectedParcel || !player) return;
    const cost = buildingMode ? buildingMode.cost : selectedParcel.price;

    if (player.money < cost) {
      alert('¡Capital insuficiente! Vende carbón o recursos primero.');
      return;
    }

    playSound('build');
    setPlayer(prev => prev ? { ...prev, money: prev.money - cost } : null);
    setFactoryCoords([selectedParcel.lng, selectedParcel.lat]);
    setBuildingMode(null);
    setSelectedParcel(null);

    // Centrar suavemente en la nueva fábrica
    map.current?.flyTo({
      center: [selectedParcel.lng, selectedParcel.lat],
      zoom: 17,
      pitch: 65,
      duration: 2000,
    });
  };

  const coalAmount = inventoryStock.coal_ore || 0;

  return (
    <div className="game-viewport">
      {/* 1. Canvas del Mapa 3D */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      {/* Viñeta atmosférica para inmersión */}
      <div className="map-vignette" />

      {/* Pill flotante de producción */}
      {floatingPill && (
        <div style={{
          position: 'absolute', top: 110, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(234, 88, 12, 0.95)', color: '#fff', padding: '8px 22px',
          borderRadius: 24, fontWeight: 800, fontSize: 14, letterSpacing: 1,
          boxShadow: '0 0 25px rgba(234, 88, 12, 0.8), 0 4px 15px rgba(0,0,0,0.5)',
          zIndex: 1000, pointerEvents: 'none',
          animation: 'beacon-pulse 1s infinite alternate',
        }}>
          ⛏️ {floatingPill}
        </div>
      )}

      {/* 2. Top Header HUD (CapitalRift / Factorio Style) */}
      <header style={{
        position: 'absolute', top: 16, left: 20, right: 20, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'auto',
      }}>
        {/* Brand & Corp Logo */}
        <div className="glass-panel glass-panel-glow" style={{
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 0 16px rgba(249, 115, 22, 0.6)',
          }}>
            ⚙
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
              Industrial Empire MMO
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>
              {player ? player.username : 'Corporación Principal'}
            </div>
          </div>
        </div>

        {/* Global Financial & Grid Stats */}
        <div className="glass-panel" style={{
          padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 28,
        }}>
          {/* Capital */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>💰</span>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Capital Líquido</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                {player ? Number(player.money).toLocaleString('es-ES') : '500'} €
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: 'rgba(56, 189, 248, 0.2)' }} />

          {/* Red Eléctrica */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Red Eléctrica</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', fontFamily: 'Chakra Petch' }}>
                5.0 / 30.0 <span style={{ fontSize: 11, color: '#64748b' }}>MW</span>
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: 'rgba(56, 189, 248, 0.2)' }} />

          {/* Servidor / Tick persistente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 10px #22c55e' : '0 0 10px #ef4444',
            }} />
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Servidor MMO</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: connected ? '#4ade80' : '#f87171' }}>
                {connected ? 'Tick 5s Activo' : 'Offline (Local)'}
              </div>
            </div>
          </div>
        </div>

        {/* Global Travel & Audio controls */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Selector de Ciudad */}
          <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🌍</span>
            <select
              value={selectedHub}
              onChange={(e) => {
                const h = GLOBAL_HUBS.find(x => x.id === e.target.value);
                if (h) flyToHub(h);
              }}
              style={{
                background: 'transparent', border: 'none', color: '#e2e8f0',
                fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer',
              }}
            >
              {GLOBAL_HUBS.map(h => (
                <option key={h.id} value={h.id} style={{ background: '#090d16', color: '#fff' }}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Ir a Mi Factoría */}
          <button
            onClick={flyToMyFactory}
            className="glass-panel"
            title="Centrar en mi Fábrica"
            style={{
              padding: '8px 14px', color: '#f97316', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            🏭 Mi Factoría
          </button>

          {/* Toggle de Audio */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playSound('click');
            }}
            className="glass-panel"
            title={soundEnabled ? 'Silenciar Efectos' : 'Activar Sonido Inmersivo'}
            style={{
              padding: '8px 12px', color: soundEnabled ? '#38bdf8' : '#64748b',
              cursor: 'pointer', fontSize: 16,
            }}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* 3. Panel Lateral Izquierdo: Gestión de Factoría & Mercados */}
      <aside style={{
        position: 'absolute', top: 90, left: 20, width: 340, zIndex: 90,
        display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'auto',
      }}>
        {/* Navigation Tabs */}
        <div className="glass-panel" style={{ display: 'flex', padding: 4 }}>
          {[
            { id: 'overview', label: 'Resumen', icon: '📊' },
            { id: 'factory', label: 'Fábrica', icon: '🏭' },
            { id: 'market', label: 'Mercado', icon: '📈' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); playSound('click'); }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8,
                background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Complejo Minero #1
              </span>
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                ● Produciendo (100%)
              </span>
            </div>

            {/* Recurso Actual: Carbón */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, padding: 12, border: '1px solid rgba(56, 189, 248, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>⛏️ Carbón Almacenado</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', fontFamily: 'Chakra Petch' }}>
                  {coalAmount} / 100 ton
                </span>
              </div>
              <div style={{ width: '100%', height: 8, background: '#090d16', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, coalAmount)}%`, height: '100%',
                  background: coalAmount > 80 ? 'linear-gradient(90deg, #ea580c, #f97316)' : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b' }}>
                <span>Tasa: +1 ton / 5s</span>
                <span>Valor: {(coalAmount * 5).toLocaleString()} €</span>
              </div>
            </div>

            {/* Botón de Venta Inmediata */}
            <button
              onClick={() => handleSellResource('coal_ore', 5)}
              disabled={coalAmount === 0}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
                background: coalAmount > 0 ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(30, 41, 59, 0.5)',
                color: coalAmount > 0 ? '#f8fafc' : '#475569',
                fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
                cursor: coalAmount > 0 ? 'pointer' : 'not-allowed',
                boxShadow: coalAmount > 0 ? '0 0 20px rgba(37, 99, 235, 0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {coalAmount > 0 ? `Vender al Mercado (+${coalAmount * 5} €)` : 'Sin Stock para Vender'}
            </button>

            {/* Quick Guía Controls */}
            <div style={{ borderTop: '1px solid rgba(56, 189, 248, 0.15)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Controles de Cámara 3D</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>🖱️ Click Izq: Mover</span>
                <span style={{ color: '#94a3b8' }}>🖱️ Click Der: Rotar 3D</span>
                <span style={{ color: '#94a3b8' }}>🔍 Rueda: Zoom</span>
                <span style={{ color: '#94a3b8' }}>🏢 Click Edificio: Parcela</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: FACTORY (Cadena de Producción Factorio) */}
        {activeTab === 'factory' && (
          <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚙️</span> Cadena Industrial ({machine?.id || 'Instancia #1'})
              </div>
              <span style={{ fontSize: 10, color: '#38bdf8' }}>{machine?.status || 'Activa'}</span>
            </div>

            <div style={{
              background: 'rgba(9, 13, 22, 0.85)', borderRadius: 8, padding: 14,
              border: '1px dashed rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {/* Etapa 1 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>⛏️</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Mina de Carbón</div>
                    <div style={{ fontSize: 10, color: '#4ade80' }}>Produciendo continuo</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>+12/min</div>
              </div>

              {/* Flecha flujo */}
              <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: 12 }}>↓ Transporte cinta transportadora ↓</div>

              {/* Etapa 2 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🔥</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Fundición de Acero</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Requiere desbloquear (€500)</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Bloqueado</div>
              </div>
            </div>

            {/* Overclock / Mejoras */}
            <button
              onClick={() => { playSound('click'); alert('¡Mejora de perforación instalada! Eficiencia +15%'); }}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 6,
                background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              ⚡ Overclock de Extracción (€150)
            </button>
          </div>
        )}

        {/* Tab Content: COMMODITIES MARKET (CapitalRift Style) */}
        {activeTab === 'market' && (
          <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>📈 Bolsa Global de Recursos</span>
              <span style={{ fontSize: 10, color: '#22c55e' }}>● En Directo</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COMMODITIES.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)', borderRadius: 8, padding: '8px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid rgba(56, 189, 248, 0.1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: c.change > 0 ? '#4ade80' : '#f87171' }}>
                        {c.change > 0 ? `▲ +${c.change}%` : `▼ ${c.change}%`}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                      {c.price} € <span style={{ fontSize: 10, color: '#94a3b8' }}>/{c.unit}</span>
                    </div>
                    {c.id === 'coal_ore' && coalAmount > 0 && (
                      <button
                        onClick={() => handleSellResource(c.id, c.price)}
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)',
                          color: '#4ade80', fontSize: 10, fontWeight: 700, borderRadius: 4,
                          padding: '2px 8px', marginTop: 4, cursor: 'pointer',
                        }}
                      >
                        Vender Todo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* 4. Modal de Parcela Seleccionada en el Mapa 3D */}
      {selectedParcel && (
        <div className="glass-panel glass-panel-glow" style={{
          position: 'absolute', top: 90, right: 20, width: 320, zIndex: 90,
          padding: 20, display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Parcela Geográfica
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                {selectedParcel.zone}
              </div>
            </div>
            <button
              onClick={() => setSelectedParcel(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 8, padding: 12, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Coordenadas:</span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{selectedParcel.lat}, {selectedParcel.lng}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Superficie:</span>
              <span style={{ color: '#e2e8f0' }}>{selectedParcel.area} m²</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Riqueza Mineral:</span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>Carbón (Alta pureza)</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Coste de Adquisición</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                {buildingMode ? buildingMode.cost : selectedParcel.price} €
              </div>
            </div>
            <button
              onClick={handleConfirmBuild}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff', fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
                cursor: 'pointer', boxShadow: '0 0 16px rgba(249, 115, 22, 0.5)',
              }}
            >
              {buildingMode ? `Instalar ${buildingMode.name}` : 'Reclamar Parcela'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Barra Inferior de Construcción (Satisfactory / Factorio Build Bar) */}
      <footer style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, pointerEvents: 'auto',
      }}>
        <div className="glass-panel" style={{
          padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            fontSize: 10, color: '#38bdf8', fontWeight: 800, letterSpacing: 2,
            writingMode: 'vertical-lr', textTransform: 'uppercase', paddingRight: 4,
          }}>
            FABRICAR
          </div>

          {BLUEPRINTS.map(bp => {
            const isSelected = buildingMode?.id === bp.id;
            return (
              <button
                key={bp.id}
                onClick={() => {
                  setBuildingMode(isSelected ? null : bp);
                  playSound('click');
                }}
                title={`${bp.name} (${bp.cost}€): ${bp.desc}`}
                style={{
                  background: isSelected ? 'rgba(249, 115, 22, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                  border: isSelected ? '2px solid #f97316' : '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 10, padding: '8px 14px', minWidth: 90,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 16px rgba(249, 115, 22, 0.5)' : 'none',
                }}
              >
                <span style={{ fontSize: 22 }}>{bp.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#fdba74' : '#e2e8f0' }}>{bp.name}</span>
                <span style={{ fontSize: 10, color: '#facc15', fontFamily: 'Chakra Petch' }}>{bp.cost} €</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
