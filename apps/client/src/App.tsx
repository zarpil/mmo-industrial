import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, MachineInstance, RealEstateProperty } from '@mmo/shared';

// MapLibre desde el CDN en index.html
declare const maplibregl: any;

const backendUrl = import.meta.env.PROD
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

// Estilo Vectorial Diurno de OpenFreeMap (rápido, sin API key, soporte OSM completo)
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

// Ciudades e hitos globales para navegación instantánea
const GLOBAL_HUBS = [
  { id: 'madrid', name: 'Madrid (Distrito AZCA)', coords: [-3.6917, 40.4500] as [number, number], zoom: 16.2, pitch: 62, bearing: -25 },
  { id: 'guadarrama', name: '🏔️ Sierra de Guadarrama (Cantera Los Molinos)', coords: [-3.9650, 40.7850] as [number, number], zoom: 14.8, pitch: 72, bearing: -35 },
  { id: 'garzweiler', name: '⛏️ Cantera Gigante Garzweiler (Alemania)', coords: [6.5050, 51.0550] as [number, number], zoom: 14.8, pitch: 70, bearing: 45 },
  { id: 'alps', name: '🏔️ Alpes Suizos (Matterhorn / Picos 4.400m)', coords: [7.7491, 46.0207] as [number, number], zoom: 14.2, pitch: 75, bearing: -20 },
  { id: 'ny', name: 'Nueva York (Midtown)', coords: [-73.9855, 40.7484] as [number, number], zoom: 16.0, pitch: 64, bearing: 30 },
  { id: 'tokyo', name: 'Tokio (Shinjuku)', coords: [139.6917, 35.6895] as [number, number], zoom: 16.4, pitch: 60, bearing: -40 },
  { id: 'london', name: 'Londres (Canary Wharf)', coords: [-0.0235, 51.5054] as [number, number], zoom: 16.1, pitch: 62, bearing: 45 },
  { id: 'ruhr', name: 'Cuenca del Ruhr (Industrial)', coords: [7.0116, 51.4556] as [number, number], zoom: 15.8, pitch: 58, bearing: 15 },
];

// Umbral mínimo de zoom para habilitar rotación y perspectiva 3D
const MIN_ROTATE_ZOOM = 14.0;

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

// Opciones de Reconversión / Edificación tras demoler o en solar
interface FacilityOption {
  id: string;
  name: string;
  icon: string;
  cost: number;
  revenueBonus: number;
  desc: string;
}

const FACILITY_OPTIONS: FacilityOption[] = [
  { id: 'open_pit_mine', name: 'Cantera a Cielo Abierto', icon: '⛏️', cost: 350, revenueBonus: 45, desc: 'Corta el terreno en bancos escalonados hacia abajo. Profundiza con el tiempo y extrae minerales.' },
  { id: 'corp_hq', name: 'Sede Corporativa Central', icon: '🏢', cost: 800, revenueBonus: 65, desc: 'Genera 65€/tick por alquiler corporativo y expande el límite de red.' },
  { id: 'deep_mine', name: 'Pozo Minero Profundo', icon: '⛏️', cost: 450, revenueBonus: 35, desc: 'Extracción subterránea automatizada de minerales de alta ley.' },
  { id: 'urban_foundry', name: 'Fundición Metalúrgica', icon: '🔥', cost: 650, revenueBonus: 50, desc: 'Horno de arco eléctrico para transformación pesada.' },
  { id: 'power_substation', name: 'Subestación Eléctrica', icon: '⚡', cost: 500, revenueBonus: 40, desc: 'Añade +40 MW de capacidad a la red eléctrica regional.' },
  { id: 'tech_tower', name: 'Torre de Oficinas I+D', icon: '🏙️', cost: 1200, revenueBonus: 95, desc: 'Alquiler tecnológico y patentes industriales (+95€/tick).' },
  { id: 'logistics_depot', name: 'Centro Logístico y Distribución', icon: '🚚', cost: 700, revenueBonus: 55, desc: 'Almacén de aduana con acceso directo a vías rápidas.' },
];

// Generador de geometría 3D para cráteres y canteras a cielo abierto deformables
function generateQuarryCratersGeoJSON(props: RealEstateProperty[]) {
  const features: any[] = [];
  props.forEach(p => {
    const depth = p.excavationDepthMeters || (p.facilityType?.includes('mine') ? 8 : 0);
    if (depth <= 0) return;

    const [lng, lat] = [p.coords.lng, p.coords.lat];
    const numPoints = 28;

    // Escala del radio según el tamaño y la profundidad de la cantera
    const baseRadius = 0.00045 + Math.min(0.00025, depth * 0.000003);

    // 1. Dique / Talud de Coronación Elevado (Berm exterior de contención y seguridad)
    // Se eleva 3.5m por encima de la cota natural de la tierra
    const bermCoords: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      bermCoords.push([
        lng + Math.cos(angle) * (baseRadius * 1.18),
        lat + Math.sin(angle) * (baseRadius * 1.18 * 0.74)
      ]);
    }
    features.push({
      type: 'Feature',
      properties: {
        id: `${p.id}-berm`,
        height: 3.8,
        color: '#78350f', // Arcilla rojiza compactada y terraplén de desmonte
      },
      geometry: { type: 'Polygon', coordinates: [bermCoords] }
    });

    // 2. Banco Superior (Tier 1: Desmonte de Suelo - Cota -5m)
    const tier1Coords: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      tier1Coords.push([
        lng + Math.cos(angle) * baseRadius,
        lat + Math.sin(angle) * (baseRadius * 0.74)
      ]);
    }
    features.push({
      type: 'Feature',
      properties: {
        id: `${p.id}-tier1`,
        height: 2.2,
        color: '#a16207', // Banco de áridos y grava
      },
      geometry: { type: 'Polygon', coordinates: [tier1Coords] }
    });

    // 3. Banco Intermedio (Tier 2: Corte de Roca - Cota -20m a -40m)
    const tier2Coords: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      tier2Coords.push([
        lng + Math.cos(angle) * (baseRadius * 0.68),
        lat + Math.sin(angle) * (baseRadius * 0.68 * 0.74)
      ]);
    }
    features.push({
      type: 'Feature',
      properties: {
        id: `${p.id}-tier2`,
        height: 1.1,
        color: '#451a03', // Pared de roca madre fracturada
      },
      geometry: { type: 'Polygon', coordinates: [tier2Coords] }
    });

    // 4. Fondo del Cráter / Pozo de Extracción Minera (Cota -40m a -80m)
    const pitCoords: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      pitCoords.push([
        lng + Math.cos(angle) * (baseRadius * 0.38),
        lat + Math.sin(angle) * (baseRadius * 0.38 * 0.74)
      ]);
    }
    features.push({
      type: 'Feature',
      properties: {
        id: `${p.id}-pit`,
        height: 0.2,
        color: '#18181b', // Fondo carbón / magnetita oscura
      },
      geometry: { type: 'Polygon', coordinates: [pitCoords] }
    });
  });

  return { type: 'FeatureCollection', features };
}

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Estado del Jugador y Máquina
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);
  const [inventoryStock, setInventoryStock] = useState<Record<string, number>>({ coal_ore: 15 });

  // Propiedades Inmobiliarias Reales (sincronizadas con el servidor)
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const propertiesRef = useRef<RealEstateProperty[]>([]);
  propertiesRef.current = properties;
  const propertyMarkersRef = useRef<any[]>([]);

  // Selección de Edificio / Parcela Real
  const [selectedProperty, setSelectedProperty] = useState<RealEstateProperty | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Coordenadas de la fábrica principal del jugador (Madrid AZCA por defecto)
  const [factoryCoords] = useState<[number, number]>([-3.6917, 40.4500]);
  const factoryMarkerRef = useRef<any>(null);

  // Interacción UI
  const [selectedHub, setSelectedHub] = useState('madrid');
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'factory' | 'properties'>('overview');
  const [visualMode, setVisualMode] = useState<'satellite' | 'realistic' | 'dark'>('satellite');
  const [terrainExaggeration, setTerrainExaggeration] = useState(2.6);
  const [isRotationUnlocked, setIsRotationUnlocked] = useState(true);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(16.2);
  const [hoveredInfo, setHoveredInfo] = useState<{
    x: number;
    y: number;
    name: string;
    isRealName: boolean;
    type: string;
    levels: number;
    height: number;
    area: number;
    price: number;
    isParcel: boolean;
    status: 'available' | 'owned' | 'facility' | 'other';
    ownerName?: string;
  } | null>(null);
  const selectedReticleMarkerRef = useRef<any>(null);

  const [buildingMode, setBuildingMode] = useState<BuildableBlueprint | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Notificación de eventos
  const [floatingPill, setFloatingPill] = useState<string | null>(null);

  // Función para modificar en vivo el relieve 3D de montañas y terreno
  const changeTerrainExaggeration = (val: number) => {
    setTerrainExaggeration(val);
    playSound('click');
    if (map.current) {
      try {
        map.current.setTerrain({ source: 'terrain-dem', exaggeration: val });
        setFloatingPill(`⛰️ Relieve de Terreno ajustado a ${val.toFixed(1)}x`);
        setTimeout(() => setFloatingPill(null), 2500);
      } catch (e) {
        console.warn('Error al actualizar relieve:', e);
      }
    }
  };

  // Reproductor de sonido sintetizado para inmersión
  const playSound = useCallback((type: 'click' | 'produce' | 'build' | 'cash' | 'demolish') => {
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
      } else if (type === 'demolish') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Silencioso si falla
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

      // ── A. Luz 3D Solar Realista (iluminación diurna con sombras) ──
      try {
        m.setLight({
          anchor: 'viewport',
          color: '#ffffff',
          intensity: 0.95,
          position: [1.5, 90, 48],
        });
      } catch (err) {
        console.warn('Luz no soportada:', err);
      }

      // ── B. Atmósfera y Cielo Realista ──
      try {
        if (m.setSky) {
          m.setSky({
            'sky-color': '#0284c7',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#7dd3fc',
            'horizon-fog-blend': 0.8,
            'fog-color': '#e0f2fe',
            'fog-ground-blend': 0.5,
          });
        }
      } catch {}

      // ── C. Capa Satelital Realista Fotorrealista (Esri World Imagery) ──
      try {
        if (!m.getSource('satellite-tiles')) {
          m.addSource('satellite-tiles', {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
          });

          // Insertar capa satélite debajo de los edificios
          m.addLayer(
            {
              id: 'satellite-layer',
              type: 'raster',
              source: 'satellite-tiles',
              minzoom: 0,
              maxzoom: 22,
              layout: {
                visibility: 'visible', // Por defecto: Satélite 3D estilo Google Earth
              },
            },
            'building'
          );
          console.log('🛰️ Capa de satélite fotorrealista 3D cargada');
        }
      } catch (err) {
        console.warn('Satellite layer error:', err);
      }

      // ── D. Terreno 3D (DEM Elevation) con Hillshading (Montañas y Relieve 3D) ──
      try {
        if (!m.getSource('terrain-dem')) {
          m.addSource('terrain-dem', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14,
          });
          m.setTerrain({ source: 'terrain-dem', exaggeration: 2.6 });
          console.log('⛰️ Terreno 3D activado con relieve aumentado a 2.6x');

          // Capa de Hillshading: Sombras dinámicas y volumen en laderas montañosas y canteras
          if (!m.getLayer('terrain-hillshade')) {
            m.addLayer(
              {
                id: 'terrain-hillshade',
                type: 'hillshade',
                source: 'terrain-dem',
                paint: {
                  'hillshade-shadow-color': 'rgba(15, 23, 42, 0.45)',
                  'hillshade-highlight-color': 'rgba(255, 255, 255, 0.48)',
                  'hillshade-illumination-direction': 315,
                  'hillshade-exaggeration': 0.72,
                },
              },
              'building'
            );
            console.log('🏔️ Sombreado de relieve montañoso (Hillshade) inyectado');
          }
        }
      } catch (err) {
        console.warn('⚠️ Elevación DEM omitida:', err);
      }

      // ── E. Edificios 3D con Extrusión Realista (Piedra, Cristal y Hormigón) ──
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
              // Paleta arquitectónica realista (fachadas de hormigón claro, piedra y cristal templado)
              'fill-extrusion-color': [
                'interpolate', ['linear'],
                ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
                0, '#f8fafc',
                20, '#e2e8f0',
                50, '#cbd5e1',
                90, '#94a3b8',
                150, '#64748b',
                250, '#475569'
              ],
              'fill-extrusion-opacity': 0.85,
            },
          });
          console.log('🏢 Edificios 3D realistas renderizándose');

          // Delimitación de Parcelas y Bordes Catastrales en el Suelo
          if (!m.getLayer('building-cadastral-borders')) {
            m.addLayer({
              id: 'building-cadastral-borders',
              source: 'openmaptiles',
              'source-layer': 'building',
              type: 'line',
              minzoom: 13.5,
              paint: {
                'line-color': 'rgba(56, 189, 248, 0.55)', // Borde cian arquitectónico / catastral nítido
                'line-width': [
                  'interpolate', ['linear'], ['zoom'],
                  13.5, 1.2,
                  16, 2.4,
                  18, 3.6
                ],
                'line-opacity': 0.85,
              },
            }, 'buildings-3d');
            console.log('📐 Delimitación catastral de parcelas inyectada');
          }

          // Capa de nombres reales de edificios e hitos urbanos (OSM)
          if (!m.getLayer('building-real-names')) {
            m.addLayer({
              id: 'building-real-names',
              source: 'openmaptiles',
              'source-layer': 'poi',
              type: 'symbol',
              minzoom: 15.0,
              filter: ['has', 'name'],
              layout: {
                'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name']],
                'text-size': 11,
                'text-transform': 'uppercase',
                'text-letter-spacing': 0.08,
                'text-max-width': 9,
                'text-offset': [0, -1.2],
                'text-anchor': 'bottom',
                'text-allow-overlap': false,
              },
              paint: {
                'text-color': '#f8fafc',
                'text-halo-color': 'rgba(10, 18, 32, 0.95)',
                'text-halo-width': 2.5,
              },
            });
            console.log('🏛️ Nombres reales de edificios inyectados');
          }
        }
      } catch (err) {
        console.warn('⚠️ No se pudo inyectar buildings-3d o capas catastrales:', err);
      }

      // ── F. Capas de Canteras y Cráteres de Excavación Minera Progresiva ──
      try {
        if (!m.getSource('quarry-craters')) {
          m.addSource('quarry-craters', {
            type: 'geojson',
            data: generateQuarryCratersGeoJSON(propertiesRef.current),
          });

          m.addLayer({
            id: 'quarry-craters-fill',
            type: 'fill-extrusion',
            source: 'quarry-craters',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': 0,
              'fill-extrusion-opacity': 0.92,
            },
          });

          m.addLayer({
            id: 'quarry-craters-outline',
            type: 'line',
            source: 'quarry-craters',
            paint: {
              'line-color': '#f59e0b',
              'line-width': 2.5,
              'line-dasharray': [3, 1],
            },
          });
          console.log('⛏️ Capa 3D de canteras y cráteres inyectada con éxito');
        }
      } catch (err) {
        console.warn('Quarry craters layer error:', err);
      }

      // ── G. Hover Interactivo con Inspector Cadastral Flotante ──
      m.on('mousemove', (e: any) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['buildings-3d', 'quarry-craters-fill'] });
        m.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

        if (features.length > 0) {
          const feat = features[0];
          const p = feat.properties || {};
          const isQuarry = feat.layer?.id === 'quarry-craters-fill';

          if (isQuarry) {
            const quarryProp = propertiesRef.current.find(item =>
              item.id.includes(p.id?.replace('-tier1', '')?.replace('-tier2', '')?.replace('-berm', '')?.replace('-pit', ''))
            );
            if (quarryProp) {
              setHoveredInfo({
                x: e.point.x,
                y: e.point.y,
                name: quarryProp.name,
                isRealName: true,
                type: 'Cantera Minera Activa',
                levels: 0,
                height: quarryProp.excavationDepthMeters || 8,
                area: quarryProp.areaSqm,
                price: quarryProp.price,
                isParcel: true,
                status: quarryProp.ownerId === player?.id ? 'owned' : 'other',
                ownerName: quarryProp.ownerName || 'Magnate',
              });
              return;
            }
          }

          const height = Math.round(p.render_height || p.height || 32);
          const levels = p.levels || Math.max(1, Math.round(height / 3.4));
          const osmName = p.name || p['name:es'] || p['name:en'];
          const hasRealName = Boolean(osmName);
          const area = Math.round(levels * (220 + height * 5));
          const price = Math.round(450 + height * 18 + area * 0.12);
          const coords = e.lngLat;
          const lat = parseFloat(coords.lat.toFixed(5));
          const lng = parseFloat(coords.lng.toFixed(5));
          const propId = `bldg-${feat.id || Math.abs(Math.round(lat * 100000) ^ Math.round(lng * 100000))}`;

          const existing = propertiesRef.current.find(
            item => item.id === propId || (Math.abs(item.coords.lat - lat) < 0.0003 && Math.abs(item.coords.lng - lng) < 0.0003)
          );

          let status: 'available' | 'owned' | 'facility' | 'other' = 'available';
          let ownerName = '';
          if (existing) {
            if (existing.ownerId === player?.id) {
              status = existing.status === 'facility_active' ? 'facility' : 'owned';
            } else if (existing.ownerId) {
              status = 'other';
              ownerName = existing.ownerName || 'Magnate';
            }
          }

          setHoveredInfo({
            x: e.point.x,
            y: e.point.y,
            name: existing ? existing.name : (osmName || `Edificio Catastral #${propId.slice(-4)}`),
            isRealName: hasRealName || Boolean(existing?.name),
            type: p.building === 'office' ? 'Oficinas & Corporativo' :
                  p.building === 'commercial' ? 'Comercial' :
                  p.building === 'retail' ? 'Comercio / Tienda' :
                  p.building === 'apartments' ? 'Residencial' : 'Inmueble Urbano',
            levels,
            height,
            area: existing ? existing.areaSqm : area,
            price: existing ? existing.price : price,
            isParcel: false,
            status,
            ownerName,
          });
        } else {
          setHoveredInfo(null);
        }
      });

      m.on('mouseout', () => {
        setHoveredInfo(null);
      });

      // ── G. Selección y Consulta de Datos Reales de Edificios / Parcelas ──
      m.on('click', (e: any) => {
        const buildingFeatures = m.queryRenderedFeatures(e.point, { layers: ['buildings-3d'] });
        const coords = e.lngLat;
        const lat = parseFloat(coords.lat.toFixed(5));
        const lng = parseFloat(coords.lng.toFixed(5));

        if (buildingFeatures && buildingFeatures.length > 0) {
          const feat = buildingFeatures[0];
          const p = feat.properties || {};
          const height = Math.round(p.render_height || p.height || 32);
          const levels = p.levels || Math.max(1, Math.round(height / 3.4));
          const buildingType = p.building || p.type || 'office';
          const osmName = p.name || p['name:es'] || p['name:en'];
          const propId = `bldg-${feat.id || Math.abs(Math.round(lat * 100000) ^ Math.round(lng * 100000))}`;

          // Comprobar si ya existe en el estado de propiedades del servidor
          const existing = propertiesRef.current.find(
            item => item.id === propId || (Math.abs(item.coords.lat - lat) < 0.0003 && Math.abs(item.coords.lng - lng) < 0.0003)
          );

          if (existing) {
            setSelectedProperty(existing);
            setNameInput(existing.name);
          } else {
            const area = Math.round(levels * (220 + height * 5));
            const price = Math.round(450 + height * 18 + area * 0.12);
            const newProp: RealEstateProperty = {
              id: propId,
              name: osmName || `Edificio Comercial #${propId.slice(-4)}`,
              address: `Zona Financiera (${lat}, ${lng})`,
              coords: { lat, lng },
              areaSqm: area,
              heightMeters: height,
              levels: levels,
              buildingType: buildingType,
              ownerId: null,
              price: price,
              monthlyRevenue: Math.round(price * 0.06),
              status: 'available',
              tier: 1,
            };
            setSelectedProperty(newProp);
            setNameInput(newProp.name);
          }
        } else {
          // Clic sobre terreno / solar
          const parcelId = `parcel-${Math.abs(Math.round(lat * 100000) ^ Math.round(lng * 100000))}`;
          const existing = propertiesRef.current.find(item => item.id === parcelId);
          if (existing) {
            setSelectedProperty(existing);
            setNameInput(existing.name);
          } else {
            const area = Math.floor(700 + Math.random() * 1200);
            const price = 250;
            const newProp: RealEstateProperty = {
              id: parcelId,
              name: `Solar Despejado #${parcelId.slice(-4)}`,
              address: `Coordenadas Catastrales (${lat}, ${lng})`,
              coords: { lat, lng },
              areaSqm: area,
              heightMeters: 0,
              levels: 0,
              buildingType: 'industrial',
              ownerId: null,
              price: price,
              monthlyRevenue: 20,
              status: 'available',
              tier: 1,
            };
            setSelectedProperty(newProp);
            setNameInput(newProp.name);
          }
        }
        setIsEditingName(false);
        playSound('click');
      });

      // ── H. Control Inteligente de Rotación y Auto-Enderezado al Norte ─
      const updateRotationLock = () => {
        const z = m.getZoom();
        setCurrentZoomLevel(Number(z.toFixed(1)));

        if (z < MIN_ROTATE_ZOOM) {
          setIsRotationUnlocked(false);
          // 1. Deshabilitar rotación con botón derecho o gestos táctiles
          if (m.dragRotate.isEnabled()) {
            m.dragRotate.disable();
            m.touchZoomRotate.disableRotation();
          }
          m.setMaxPitch(0);

          // 2. Si el mapa está girado o inclinado, auto-enderezar recto hacia el Norte
          if (Math.abs(m.getBearing()) > 0.1 || m.getPitch() > 0.1) {
            m.easeTo({
              bearing: 0,
              pitch: 0,
              duration: 500,
              essential: true,
            });
          }
        } else {
          setIsRotationUnlocked(true);
          // Habilitar rotación 3D y perspectiva inclinada
          if (!m.dragRotate.isEnabled()) {
            m.dragRotate.enable();
            m.touchZoomRotate.enableRotation();
          }
          m.setMaxPitch(85);

          // Si venía del modo 2D plano y pasa el umbral de juego, inclinar suavemente a perspectiva 3D
          if (m.getPitch() < 5) {
            m.easeTo({
              pitch: 62,
              duration: 700,
              essential: true,
            });
          }
        }
      };

      // Si el usuario hace zoom out por debajo del umbral, cortar inmediatamente la rotación
      m.on('zoom', () => {
        const z = m.getZoom();
        if (z < MIN_ROTATE_ZOOM && m.dragRotate.isEnabled()) {
          m.dragRotate.disable();
          m.touchZoomRotate.disableRotation();
        }
      });

      // Al terminar de hacer zoom, comprobar estado y enderezar si corresponde
      m.on('zoomend', updateRotationLock);

      // Verificación inicial de rotación según zoom actual
      updateRotationLock();

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

  // ── 2B. Retícula 3D de Selección Inmobiliaria en el Mundo ───────────
  useEffect(() => {
    if (!mapReady || !map.current) return;
    if (selectedReticleMarkerRef.current) {
      selectedReticleMarkerRef.current.remove();
      selectedReticleMarkerRef.current = null;
    }

    if (selectedProperty) {
      const el = document.createElement('div');
      el.className = 'selected-property-reticle';
      el.innerHTML = `
        <div class="reticle-badge">
          <span>🎯</span>
          <span>${selectedProperty.name}</span>
        </div>
      `;
      const m = new maplibregl.Marker({ element: el })
        .setLngLat([selectedProperty.coords.lng, selectedProperty.coords.lat])
        .addTo(map.current);
      selectedReticleMarkerRef.current = m;
    }

    return () => {
      if (selectedReticleMarkerRef.current) {
        selectedReticleMarkerRef.current.remove();
        selectedReticleMarkerRef.current = null;
      }
    };
  }, [mapReady, selectedProperty]);

  // ── 3. Marcadores 3D para Propiedades Adquiridas, Solares y Canteras ─
  useEffect(() => {
    if (!mapReady || !map.current) return;

    // Actualizar geometría 3D de canteras y cráteres en el mapa
    if (map.current.getSource('quarry-craters')) {
      map.current.getSource('quarry-craters').setData(generateQuarryCratersGeoJSON(properties));
    }

    // Limpiar marcadores anteriores
    propertyMarkersRef.current.forEach(m => m.remove());
    propertyMarkersRef.current = [];

    properties.forEach(prop => {
      const isPlayerOwned = prop.ownerId === player?.id;
      const isQuarry = (prop.excavationDepthMeters && prop.excavationDepthMeters > 0) || prop.facilityType?.includes('mine');
      const isDemolished = prop.status === 'demolished';
      const isAvailablePlot = prop.status === 'available' && prop.heightMeters === 0;

      // Mostrar todos los cráteres/canteras mineras públicas, solares despejados y propiedades adquiridas
      if (!isPlayerOwned && !isQuarry && !isDemolished && !isAvailablePlot) return;

      const el = document.createElement('div');
      el.className = 'owned-property-marker';

      if (isQuarry) {
        el.innerHTML = `
          <div class="quarry-pit-badge">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="quarry-hazard-light"></div>
              <span style="font-size: 11px; font-weight: 800; color: #facc15; letter-spacing: 0.5px;">
                ⛏️ CANTERA: ${prop.name}
              </span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 10px;">
              <span class="quarry-depth-tag">-${prop.excavationDepthMeters || 8}m</span>
              <span style="font-size: 10px; color: #4ade80; font-weight: 700;">+${prop.totalMinedTons || 10} ton</span>
            </div>
          </div>
        `;
      } else if (isDemolished) {
        el.innerHTML = `
          <div class="demolished-site-badge">
            <span>🚧</span>
            <span>SOLAR DESPEJADO: ${prop.name}</span>
          </div>
        `;
      } else if (isAvailablePlot) {
        el.innerHTML = `
          <div class="demolished-site-badge" style="background: linear-gradient(135deg, #15803d, #166534); border-color: #86efac; box-shadow: 0 4px 16px rgba(0,0,0,0.7), 0 0 12px rgba(34,197,94,0.4);">
            <span>🌿</span>
            <span>SOLAR RÚSTICO: ${prop.name} (${prop.price}€)</span>
          </div>
        `;
      } else if (prop.status === 'facility_active') {
        el.innerHTML = `
          <div class="owned-property-badge" style="background: linear-gradient(135deg, #ea580c, #f97316); border-color: #fdba74;">
            <span>🏭</span>
            <span>${prop.name} (+${prop.monthlyRevenue}€)</span>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="owned-property-badge">
            <span>👑</span>
            <span>${prop.name} (+${prop.monthlyRevenue}€)</span>
          </div>
        `;
      }

      el.onclick = (e) => {
        e.stopPropagation();
        setSelectedProperty(prop);
        setNameInput(prop.name);
        setIsEditingName(false);
        playSound('click');
      };

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([prop.coords.lng, prop.coords.lat])
        .addTo(map.current);

      propertyMarkersRef.current.push(m);
    });
  }, [mapReady, properties, player?.id, playSound]);

  // ── 4. WebSocket & Persistencia con el Servidor ───────────────────
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

    socket.on('gameState', (data: { player: Player; machine: MachineInstance; properties?: RealEstateProperty[] }) => {
      setPlayer(data.player);
      setMachine(data.machine);

      if (data.properties) {
        setProperties(data.properties);
        // Si la propiedad actualmente abierta se actualizó en el servidor, refrescarla
        if (selectedProperty) {
          const updated = data.properties.find(p => p.id === selectedProperty.id);
          if (updated) setSelectedProperty(updated);
        }
      }

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
  }, [playSound, selectedProperty]);

  // Acción: Venta de recursos al mercado
  const handleSellResource = useCallback((itemKey: string, pricePerUnit: number) => {
    const qty = inventoryStock[itemKey] || 0;
    if (qty <= 0) return;

    if (itemKey === 'coal_ore') {
      socket.emit('sellCoal');
    } else {
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

  // Acción: Conmutar entre Modo Satélite 3D, Ciudad Día y Modo Noche
  const switchVisualMode = (mode: 'satellite' | 'realistic' | 'dark') => {
    setVisualMode(mode);
    playSound('click');
    const m = map.current;
    if (!m) return;

    if (mode === 'satellite') {
      if (m.getLayer('satellite-layer')) {
        m.setLayoutProperty('satellite-layer', 'visibility', 'visible');
      }
      try {
        m.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.95, position: [1.5, 90, 48] });
        if (m.setSky) {
          m.setSky({ 'sky-color': '#0284c7', 'horizon-color': '#7dd3fc', 'fog-color': '#e0f2fe' });
        }
      } catch {}
      if (m.getLayer('buildings-3d')) {
        m.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', 0.85);
        m.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
          0, '#f8fafc',
          20, '#e2e8f0',
          50, '#cbd5e1',
          90, '#94a3b8',
          150, '#64748b',
          250, '#475569'
        ]);
      }
    } else if (mode === 'realistic') {
      if (m.getLayer('satellite-layer')) {
        m.setLayoutProperty('satellite-layer', 'visibility', 'none');
      }
      try {
        m.setLight({ anchor: 'viewport', color: '#fffdf5', intensity: 0.9, position: [1.5, 80, 50] });
        if (m.setSky) {
          m.setSky({ 'sky-color': '#38bdf8', 'horizon-color': '#bae6fd', 'fog-color': '#f0f9ff' });
        }
      } catch {}
      if (m.getLayer('buildings-3d')) {
        m.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', 0.9);
        m.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
          0, '#f1f5f9',
          20, '#e2e8f0',
          50, '#cbd5e1',
          90, '#94a3b8',
          150, '#7898b8',
          250, '#5a82a8'
        ]);
      }
    } else if (mode === 'dark') {
      if (m.getLayer('satellite-layer')) {
        m.setLayoutProperty('satellite-layer', 'visibility', 'none');
      }
      try {
        m.setLight({ anchor: 'viewport', color: '#70a5ff', intensity: 0.5, position: [1.5, 90, 75] });
      } catch {}
      if (m.getLayer('buildings-3d')) {
        m.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', 0.88);
        m.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
          0, '#101c2e',
          20, '#162842',
          50, '#1c375c',
          90, '#224a7d',
          150, '#2a5ea0',
          250, '#3878cc'
        ]);
      }
    }
  };

  // ── 5. Acciones Inmobiliarias & Demolición ─────────────────────────

  // Compra de Edificio / Parcela Real
  const handleBuyProperty = () => {
    if (!selectedProperty || !player) return;
    if (player.money < selectedProperty.price) {
      setFloatingPill(`⚠️ Capital insuficiente (${selectedProperty.price.toLocaleString()} € necesarios)`);
      setTimeout(() => setFloatingPill(null), 3500);
      return;
    }

    playSound('cash');
    socket.emit('buyProperty', selectedProperty);
    setFloatingPill(`🎉 ¡${selectedProperty.name} Adquirido!`);
    setTimeout(() => setFloatingPill(null), 3500);
  };

  // Demoler Edificio
  const handleDemolishProperty = () => {
    if (!selectedProperty || !player) return;
    const demolitionCost = 150;
    if (player.money < demolitionCost) {
      setFloatingPill(`⚠️ Fondos insuficientes para demolición (${demolitionCost} €)`);
      setTimeout(() => setFloatingPill(null), 3500);
      return;
    }

    playSound('demolish');
    socket.emit('demolishProperty', { propertyId: selectedProperty.id });
    setFloatingPill(`🔨 Demolición completada: Solar despejado`);
    setTimeout(() => setFloatingPill(null), 3500);
  };

  // Construir Instalación sobre Solar
  const handleConstructFacility = (facility: FacilityOption) => {
    if (!selectedProperty || !player) return;
    if (player.money < facility.cost) {
      setFloatingPill(`⚠️ Requiere ${facility.cost} € para edificar`);
      setTimeout(() => setFloatingPill(null), 3500);
      return;
    }

    playSound('build');
    socket.emit('constructFacility', {
      propertyId: selectedProperty.id,
      facilityType: facility.id,
      name: `${facility.name} - ${selectedProperty.name.replace('Solar Despejado', '').trim()}`,
      cost: facility.cost,
    });
    setFloatingPill(`🏗️ ¡${facility.name} Construida!`);
    setTimeout(() => setFloatingPill(null), 3500);
  };

  // Renombrar / Editar Nombre de la Propiedad
  const handleSaveName = () => {
    if (!selectedProperty || !nameInput.trim()) return;
    playSound('click');
    socket.emit('renameProperty', {
      propertyId: selectedProperty.id,
      newName: nameInput.trim(),
    });
    setIsEditingName(false);
  };

  // Centrar cámara en una propiedad
  const flyToProperty = (prop: RealEstateProperty) => {
    playSound('click');
    setSelectedProperty(prop);
    setNameInput(prop.name);
    map.current?.flyTo({
      center: [prop.coords.lng, prop.coords.lat],
      zoom: 17.2,
      pitch: 65,
      bearing: -15,
      duration: 2500,
    });
  };

  const coalAmount = inventoryStock.coal_ore || 0;
  const isSelectedOwnedByPlayer = selectedProperty?.ownerId === player?.id;
  const ownedProperties = properties.filter(p => p.ownerId === player?.id);
  const totalPassiveRevenue = ownedProperties.reduce((acc, p) => acc + (p.status !== 'demolished' ? p.monthlyRevenue : 0), 0);

  return (
    <div className="game-viewport">
      {/* 1. Canvas del Mapa 3D */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      {/* Viñeta atmosférica sutil */}
      <div className="map-vignette" />

      {/* Pill flotante de producción / eventos */}
      {floatingPill && (
        <div style={{
          position: 'absolute', top: 110, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #ea580c, #f97316)', color: '#fff', padding: '8px 24px',
          borderRadius: 24, fontWeight: 800, fontSize: 14, letterSpacing: 1,
          boxShadow: '0 0 25px rgba(234, 88, 12, 0.8), 0 4px 15px rgba(0,0,0,0.5)',
          zIndex: 1000, pointerEvents: 'none',
          animation: 'beacon-pulse 1s infinite alternate',
        }}>
          {floatingPill}
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
          padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 24,
        }}>
          {/* Capital */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>💰</span>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Capital Líquido</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                {player ? Number(player.money).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '500'} €
              </div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: 'rgba(56, 189, 248, 0.2)' }} />

          {/* Renta Inmobiliaria Pasiva */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏢</span>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Renta Pasiva</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80', fontFamily: 'Chakra Petch' }}>
                +{totalPassiveRevenue} <span style={{ fontSize: 11, color: '#94a3b8' }}>€/mes</span>
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
          {/* Selector de Modo Visual (Satélite 3D / Ciudad Día / Noche) */}
          <div className="glass-panel" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { id: 'satellite', label: '🛰️ Satélite 3D' },
              { id: 'realistic', label: '🏙️ Ciudad Día' },
              { id: 'dark', label: '🌆 Noche' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => switchVisualMode(m.id as any)}
                style={{
                  background: visualMode === m.id ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  border: visualMode === m.id ? '1px solid rgba(56, 189, 248, 0.5)' : 'none',
                  borderRadius: 6, padding: '5px 9px', color: visualMode === m.id ? '#38bdf8' : '#94a3b8',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Selector de Relieve 3D (Montañas y Canteras) */}
          <div className="glass-panel" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }} title="Ajustar exageración de relieve 3D en montañas y valles">
            <span style={{ fontSize: 13, marginRight: 2 }}>⛰️</span>
            {[
              { val: 1.4, label: '1.4x' },
              { val: 2.6, label: '2.6x Juego' },
              { val: 4.2, label: '4.2x Épico' },
            ].map(r => (
              <button
                key={r.val}
                onClick={() => changeTerrainExaggeration(r.val)}
                style={{
                  background: terrainExaggeration === r.val ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
                  border: terrainExaggeration === r.val ? '1px solid rgba(245, 158, 11, 0.6)' : 'none',
                  borderRadius: 6, padding: '5px 8px', color: terrainExaggeration === r.val ? '#fbbf24' : '#94a3b8',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

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

      {/* 3. Panel Lateral Izquierdo: Gestión de Factoría, Mercados y Propiedades */}
      <aside style={{
        position: 'absolute', top: 90, left: 20, width: 360, zIndex: 90,
        display: 'flex', flexDirection: 'column', gap: 12, pointerEvents: 'auto',
      }}>
        {/* Navigation Tabs */}
        <div className="glass-panel" style={{ display: 'flex', padding: 4 }}>
          {[
            { id: 'overview', label: 'Resumen', icon: '📊' },
            { id: 'properties', label: `Inmuebles (${ownedProperties.length})`, icon: '🏢' },
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
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
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
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Interacción Inmobiliaria 3D</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>🏢 Click en Edificio 3D</span>
                <span style={{ color: '#94a3b8' }}>🛒 Comprar / Reclamar</span>
                <span style={{ color: '#94a3b8' }}>🔨 Demoler Estructura</span>
                <span style={{ color: '#94a3b8' }}>🏗️ Construir Complejos</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: PROPIEDADES INMOBILIARIAS DEL JUGADOR */}
        {activeTab === 'properties' && (
          <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Tus Inmuebles y Solares</span>
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>+{totalPassiveRevenue} €/mes</span>
            </div>

            {ownedProperties.length === 0 ? (
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)', borderRadius: 8, padding: 16,
                textAlign: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed rgba(56, 189, 248, 0.2)',
              }}>
                Aún no posees ningún inmueble o parcela. Haz clic sobre cualquier edificio 3D del mapa para consultar su valoración catastral y adquirirlo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {ownedProperties.map(p => (
                  <div
                    key={p.id}
                    onClick={() => flyToProperty(p)}
                    style={{
                      background: selectedProperty?.id === p.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                      border: selectedProperty?.id === p.id ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.12)',
                      borderRadius: 8, padding: 10, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#f8fafc' }}>
                        {p.status === 'demolished' ? '🚧 ' : p.status === 'facility_active' ? '🏭 ' : '🏢 '}
                        {p.name}
                      </div>
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                        background: p.status === 'demolished' ? 'rgba(234, 88, 12, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                        color: p.status === 'demolished' ? '#fdba74' : '#4ade80',
                      }}>
                        {p.status === 'demolished' ? 'Solar en Obras' : `+${p.monthlyRevenue}€/mes`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
                      <span>{p.areaSqm} m² {p.heightMeters > 0 ? `| ${p.heightMeters}m (${p.levels} pl.)` : '| Terreno libre'}</span>
                      <span style={{ color: '#38bdf8' }}>Centrar Cámara ↗</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Requiere solar o reconversión</div>
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

      {/* 4. Modal Inspector Catastral & Inmobiliario Complejo (Edificios / Parcelas 3D) */}
      {selectedProperty && (
        <div className="glass-panel glass-panel-glow" style={{
          position: 'absolute', top: 90, right: 20, width: 380, zIndex: 90,
          padding: 22, display: 'flex', flexDirection: 'column', gap: 14, pointerEvents: 'auto',
          maxHeight: '85vh', overflowY: 'auto',
        }}>
          {/* Cabecera y Estado de Titularidad */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 800, textTransform: 'uppercase',
                  background: isSelectedOwnedByPlayer ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(100, 116, 139, 0.3)',
                  color: isSelectedOwnedByPlayer ? '#fff' : '#94a3b8',
                }}>
                  {isSelectedOwnedByPlayer ? '👑 Tu Propiedad' : '🏛️ Finca Registral Disponible'}
                </span>
                {selectedProperty.status === 'demolished' && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 800, background: '#ea580c', color: '#fff' }}>
                    🚧 Solar Demolido
                  </span>
                )}
              </div>

              {/* Título editable si es propiedad del jugador */}
              {isEditingName ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    style={{
                      flex: 1, background: '#0f172a', border: '1px solid #38bdf8', borderRadius: 4,
                      color: '#fff', padding: '4px 8px', fontSize: 13, fontWeight: 700,
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    style={{ background: '#0284c7', border: 'none', color: '#fff', borderRadius: 4, padding: '0 8px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
                    {selectedProperty.name}
                  </h3>
                  {isSelectedOwnedByPlayer && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      title="Editar Nombre del Inmueble"
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: 14 }}
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{selectedProperty.address}</div>
            </div>

            <button
              onClick={() => setSelectedProperty(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Ficha Técnica del Edificio OSM */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)', borderRadius: 10, padding: 14,
            fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid rgba(56, 189, 248, 0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Superficie Catastral:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{selectedProperty.areaSqm.toLocaleString()} m²</span>
            </div>

            {selectedProperty.heightMeters > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Altura de Fachada:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>{selectedProperty.heightMeters} metros</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Número de Plantas:</span>
                  <span style={{ color: '#e2e8f0' }}>{selectedProperty.levels} plantas sobre rasante</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Calificación de Uso:</span>
              <span style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>
                {selectedProperty.buildingType === 'office' ? 'Oficinas y Terciario' :
                 selectedProperty.buildingType === 'commercial' ? 'Comercial e Industrial' :
                 selectedProperty.buildingType === 'demolished' ? 'Solar Limpio / Sin Edificar' : 'Uso Mixto'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Rendimiento Pasivo:</span>
              <span style={{ color: '#4ade80', fontWeight: 800 }}>+{selectedProperty.monthlyRevenue} € / mes</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Coordenadas GPS:</span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
                {selectedProperty.coords.lat.toFixed(5)}, {selectedProperty.coords.lng.toFixed(5)}
              </span>
            </div>

            {/* Ficha Geológica si es cantera / mina a cielo abierto deformable */}
            {((selectedProperty.excavationDepthMeters || 0) > 0 || selectedProperty.facilityType?.includes('mine')) && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(69, 26, 3, 0.5), rgba(24, 24, 27, 0.8))',
                border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 10, padding: 12,
                display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                    ⛏️ Cota Cantera a Cielo Abierto
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                    -{selectedProperty.excavationDepthMeters || 8} metros
                  </span>
                </div>

                <div style={{ width: '100%', height: 8, background: '#090d16', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (((selectedProperty.excavationDepthMeters || 8)) / 75) * 100)}%`,
                    height: '100%', background: 'linear-gradient(90deg, #f59e0b, #ea580c, #dc2626)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                  <span>Fase: {
                    (selectedProperty.excavationDepthMeters || 8) < 15 ? 'Desmonte Inicial de Tierras' :
                    (selectedProperty.excavationDepthMeters || 8) < 30 ? 'Bancos Escalonados' :
                    (selectedProperty.excavationDepthMeters || 8) < 55 ? 'Cráter Minero Abierto' : 'Pozo Abisal de Roca Madre'
                  }</span>
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>+{selectedProperty.totalMinedTons || 10} ton</span>
                </div>
              </div>
            )}
          </div>

          {/* ACCIONES DISPONIBLES */}

          {/* 1. Caso: Propiedad de Otro Jugador */}
          {!isSelectedOwnedByPlayer && selectedProperty.ownerId !== null && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10, marginTop: 4,
            }}>
              <span style={{ fontSize: 22 }}>🔒</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                  Propiedad de {selectedProperty.ownerName || 'Otro Magnate MMO'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  Esta finca o cantera minera ya está registrada en el catastro territorial.
                </div>
              </div>
            </div>
          )}

          {/* 2. Caso: Disponible para Compra en el Catastro */}
          {!isSelectedOwnedByPlayer && selectedProperty.ownerId === null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Valor de Adquisición</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                  {selectedProperty.price.toLocaleString()} €
                </div>
              </div>

              <button
                onClick={handleBuyProperty}
                style={{
                  padding: '12px 20px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#fff', fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
                  cursor: 'pointer', boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)',
                  letterSpacing: 0.5,
                }}
              >
                🛒 Comprar {selectedProperty.heightMeters === 0 ? 'Parcela' : 'Inmueble'}
              </button>
            </div>
          )}

          {/* 3. Caso: Propiedad del Jugador (Demoler, Abrir Cantera o Construir) */}
          {isSelectedOwnedByPlayer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {/* Botón de Demolición si el edificio aún existe con altura */}
              {selectedProperty.status !== 'demolished' && selectedProperty.heightMeters > 0 && (
                <div style={{
                  background: 'rgba(234, 88, 12, 0.1)', border: '1px solid rgba(234, 88, 12, 0.3)',
                  borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fdba74' }}>Derribo y Demolición</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Demuele la estructura para despejar el solar y excavar</div>
                  </div>

                  <button
                    onClick={handleDemolishProperty}
                    style={{
                      background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                      border: 'none', color: '#fff', borderRadius: 6, padding: '8px 14px',
                      fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    🔨 Demoler (150€)
                  </button>
                </div>
              )}

              {/* Indicador de Solar Despejado si no hay edificio */}
              {(selectedProperty.status === 'demolished' || selectedProperty.heightMeters === 0) && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>🌿</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#86efac' }}>Solar Despejado / Suelo Rústico</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Terreno listo para excavación de canteras a cielo abierto o factorías</div>
                  </div>
                </div>
              )}

              {/* Opciones de Construcción y Excavación sobre el solar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1 }}>
                  🏗️ {selectedProperty.status === 'demolished' || selectedProperty.heightMeters === 0 ? 'Edificar en el Solar / Abrir Cantera' : 'Reconvertir Instalación'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FACILITY_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleConstructFacility(f)}
                      title={f.desc}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        borderRadius: 8, padding: '10px 8px', textAlign: 'left',
                        cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 18 }}>{f.icon}</span>
                        <span style={{ fontSize: 10, color: '#facc15', fontWeight: 800, fontFamily: 'Chakra Petch' }}>{f.cost}€</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 600 }}>
                        +{f.revenueBonus} €/mes
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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

      {/* 6. Indicador Dinámico de Bloqueo de Rotación y Auto-Enderezado */}
      <div
        onClick={() => {
          if (map.current) {
            map.current.easeTo({ bearing: 0, duration: 400 });
            playSound('click');
          }
        }}
        title={isRotationUnlocked ? "Click para enderezar el mapa al Norte" : "Haz zoom para habilitar rotación y 3D"}
        style={{
          position: 'absolute', bottom: 24, right: 64, zIndex: 90, pointerEvents: 'auto',
          background: 'rgba(10, 18, 32, 0.92)', backdropFilter: 'blur(16px)',
          border: isRotationUnlocked ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: 20, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          color: isRotationUnlocked ? '#38bdf8' : '#fbbf24',
          boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          transition: 'all 0.3s ease',
        }}
      >
        <span style={{ fontSize: 13 }}>{isRotationUnlocked ? '🎮' : '🧭'}</span>
        <span>
          {isRotationUnlocked
            ? 'Rotación 3D Libre (Click derecho/Ctrl para girar)'
            : 'Orientación Norte Fija (Haz Zoom para perspectiva 3D)'}
        </span>
        <span style={{
          fontSize: 10, background: 'rgba(255, 255, 255, 0.08)',
          padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', color: '#94a3b8'
        }}>
          Z:{currentZoomLevel}
        </span>
      </div>

      {/* 7. Tarjeta Flotante Cadastral al pasar el cursor sobre Edificios/Parcelas */}
      {hoveredInfo && (
        <div
          className="cadastral-hover-card"
          style={{ left: hoveredInfo.x, top: hoveredInfo.y }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {hoveredInfo.isRealName ? (
              <span className="real-name-tag">🏛️ Nombre Real</span>
            ) : (
              <span className="real-name-tag" style={{ background: 'rgba(148, 163, 184, 0.15)', borderColor: '#64748b', color: '#cbd5e1' }}>
                📐 Parcela Catastral
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              color: hoveredInfo.status === 'owned' ? '#4ade80' :
                     hoveredInfo.status === 'facility' ? '#fdba74' :
                     hoveredInfo.status === 'other' ? '#f87171' : '#38bdf8'
            }}>
              {hoveredInfo.status === 'owned' ? '👑 En Propiedad' :
               hoveredInfo.status === 'facility' ? '🏭 Instalación' :
               hoveredInfo.status === 'other' ? `🔒 ${hoveredInfo.ownerName}` : '🟢 Disponible'}
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.3 }}>
            {hoveredInfo.name}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
            <span>{hoveredInfo.type}</span>
            <span>{hoveredInfo.levels > 0 ? `${hoveredInfo.levels} pl. (${hoveredInfo.height}m)` : `${hoveredInfo.height}m cota`}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>{hoveredInfo.area.toLocaleString()} m²</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
              {hoveredInfo.price.toLocaleString()} €
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
