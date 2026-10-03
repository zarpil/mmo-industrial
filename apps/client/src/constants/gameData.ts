import type { BuildableBlueprint, Commodity, FacilityOption, GlobalHub } from '../types/game';

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

export const MIN_ROTATE_ZOOM = 14.0;

export const GLOBAL_HUBS: GlobalHub[] = [
  { id: 'madrid', name: 'Madrid (Distrito AZCA)', coords: [-3.6917, 40.4500], zoom: 16.2, pitch: 62, bearing: -25 },
  { id: 'guadarrama', name: '🏔️ Sierra de Guadarrama (Cantera Los Molinos)', coords: [-3.9650, 40.7850], zoom: 14.8, pitch: 72, bearing: -35 },
  { id: 'garzweiler', name: '⛏️ Cantera Gigante Garzweiler (Alemania)', coords: [6.5050, 51.0550], zoom: 14.8, pitch: 70, bearing: 45 },
  { id: 'alps', name: '🏔️ Alpes Suizos (Matterhorn / Picos 4.400m)', coords: [7.7491, 46.0207], zoom: 14.2, pitch: 75, bearing: -20 },
  { id: 'ny', name: 'Nueva York (Midtown)', coords: [-73.9855, 40.7484], zoom: 16.0, pitch: 64, bearing: 30 },
  { id: 'tokyo', name: 'Tokio (Shinjuku)', coords: [139.6917, 35.6895], zoom: 16.4, pitch: 60, bearing: -40 },
  { id: 'london', name: 'Londres (Canary Wharf)', coords: [-0.0235, 51.5054], zoom: 16.1, pitch: 62, bearing: 45 },
  { id: 'ruhr', name: 'Cuenca del Ruhr (Industrial)', coords: [7.0116, 51.4556], zoom: 15.8, pitch: 58, bearing: 15 },
];

export const BLUEPRINTS: BuildableBlueprint[] = [
  { id: 'coal_extractor', name: 'Mina de Carbón', icon: '⛏️', cost: 100, energyReqMW: 5, outputName: 'Carbón', outputRateSec: 5, desc: 'Extrae carbón fósil para energía y metalurgia.' },
  { id: 'iron_extractor', name: 'Extractor de Hierro', icon: '🪨', cost: 250, energyReqMW: 8, outputName: 'Hierro', outputRateSec: 6, desc: 'Extracción de menas de hierro de alta pureza.' },
  { id: 'smelter', name: 'Fundición Industrial', icon: '🔥', cost: 500, energyReqMW: 15, outputName: 'Acero', outputRateSec: 8, desc: 'Combina carbón y hierro para forjar acero.' },
  { id: 'power_gen', name: 'Central Térmica', icon: '⚡', cost: 350, energyReqMW: -30, outputName: 'Energía', outputRateSec: 0, desc: 'Genera 30 MW quemando carbón.' },
  { id: 'assembler', name: 'Línea de Montaje', icon: '🏭', cost: 1200, energyReqMW: 20, outputName: 'Maquinaria', outputRateSec: 12, desc: 'Produce componentes mecánicos avanzados.' },
];

export const COMMODITIES: Commodity[] = [
  { id: 'coal_ore', name: 'Carbón Térmico', unit: 'ton', price: 5, change: +2.4, icon: '⛏️' },
  { id: 'iron_ore', name: 'Mineral de Hierro', unit: 'ton', price: 9, change: -1.1, icon: '🪨' },
  { id: 'steel_ingot', name: 'Lingotes de Acero', unit: 'u', price: 24, change: +4.8, icon: '🔩' },
  { id: 'machinery_parts', name: 'Piezas Industriales', unit: 'u', price: 65, change: +1.5, icon: '⚙️' },
  { id: 'power_mwh', name: 'Energía Eléctrica', unit: 'MWh', price: 42, change: -0.8, icon: '⚡' },
];

export const FACILITY_OPTIONS: FacilityOption[] = [
  { id: 'open_pit_mine', name: 'Cantera a Cielo Abierto', icon: '⛏️', cost: 350, revenueBonus: 45, desc: 'Corta el terreno en bancos escalonados hacia abajo. Profundiza con el tiempo y extrae minerales.' },
  { id: 'corp_hq', name: 'Sede Corporativa Central', icon: '🏢', cost: 800, revenueBonus: 65, desc: 'Genera 65€/tick por alquiler corporativo y expande el límite de red.' },
  { id: 'deep_mine', name: 'Pozo Minero Profundo', icon: '⛏️', cost: 450, revenueBonus: 35, desc: 'Extracción subterránea automatizada de minerales de alta ley.' },
  { id: 'urban_foundry', name: 'Fundición Metalúrgica', icon: '🔥', cost: 650, revenueBonus: 50, desc: 'Horno de arco eléctrico para transformación pesada.' },
  { id: 'power_substation', name: 'Subestación Eléctrica', icon: '⚡', cost: 500, revenueBonus: 40, desc: 'Añade +40 MW de capacidad a la red eléctrica regional.' },
  { id: 'tech_tower', name: 'Torre de Oficinas I+D', icon: '🏙️', cost: 1200, revenueBonus: 95, desc: 'Alquiler tecnológico y patentes industriales (+95€/tick).' },
  { id: 'logistics_depot', name: 'Centro Logístico y Distribución', icon: '🚚', cost: 700, revenueBonus: 55, desc: 'Almacén de aduana con acceso directo a vías rápidas.' },
];
