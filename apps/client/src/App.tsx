import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, MachineInstance, RealEstateProperty, ArchitecturalStyle } from '@mmo/shared';
import type { GlobalHub, HoveredCadastralInfo, BuildableBlueprint, FacilityOption } from './types/game';
import { STYLE_URL, MIN_ROTATE_ZOOM } from './constants/gameData';
import { SoundService } from './services/sound';
import { initializeMapLayers, updatePlayerBuildingsLayer } from './services/mapLayers';
import { generateQuarryCratersGeoJSON } from './services/quarryGeometry';
import { HeaderHUD } from './components/HeaderHUD';
import { DrawerSidebar } from './components/DrawerSidebar';
import { PropertyInspectorModal } from './components/PropertyInspectorModal';
import { CadastralHoverTooltip } from './components/CadastralHoverTooltip';
import { RotationStatusChip } from './components/RotationStatusChip';
import { BuildBar } from './components/BuildBar';

declare const maplibregl: any;

const backendUrl = import.meta.env.PROD
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Estado del Jugador y Máquinas MMO
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);
  const [inventoryStock, setInventoryStock] = useState<Record<string, number>>({ coal_ore: 15 });

  // Propiedades Inmobiliarias Reales (sincronizadas por WebSocket)
  const [properties, setProperties] = useState<RealEstateProperty[]>([]);
  const propertiesRef = useRef<RealEstateProperty[]>([]);
  propertiesRef.current = properties;
  const propertyMarkersRef = useRef<any[]>([]);

  // Selección de Edificio / Parcela Real y Edición
  const [selectedProperty, setSelectedProperty] = useState<RealEstateProperty | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const selectedReticleMarkerRef = useRef<any>(null);

  // Inspector emergente al pasar el cursor
  const [hoveredInfo, setHoveredInfo] = useState<HoveredCadastralInfo | null>(null);

  // Coordenadas de la fábrica principal del jugador (Madrid AZCA)
  const [factoryCoords] = useState<[number, number]>([-3.6917, 40.4500]);
  const factoryMarkerRef = useRef<any>(null);

  // Interacción UI y Modos
  const [selectedHub, setSelectedHub] = useState('madrid');
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'factory' | 'properties'>('overview');
  const [visualMode, setVisualMode] = useState<'satellite' | 'realistic' | 'dark'>('satellite');
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.15);
  const [isRotationUnlocked, setIsRotationUnlocked] = useState(true);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(16.2);
  const [buildingMode, setBuildingMode] = useState<BuildableBlueprint | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Notificaciones flotantes
  const [floatingPill, setFloatingPill] = useState<string | null>(null);

  const showNotification = useCallback((msg: string, duration = 3000) => {
    setFloatingPill(msg);
    setTimeout(() => setFloatingPill(null), duration);
  }, []);

  // ── 1. Inicialización del Mapa 3D MapLibre ──────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLE_URL,
      center: [-3.6917, 40.4500],
      zoom: 16.2,
      maxZoom: 22,
      pitch: 58,
      bearing: -25,
      antialias: true,
      maxPitch: 80,
    });

    map.current = m;

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    m.on('load', () => {
      console.log('🗺️ Mapa base cargado con éxito');
      initializeMapLayers(m, propertiesRef.current);

      // Hover interactivo con inspector catastral
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

      // Selección al hacer click
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
          // Click sobre solar despejado / parcela sin edificio
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
        SoundService.play('click');
      });

      // Control inteligente de rotación, pitch y auto-enderezado al Norte
      const updateRotationLock = () => {
        const z = m.getZoom();
        setCurrentZoomLevel(Number(z.toFixed(1)));

        if (z < MIN_ROTATE_ZOOM) {
          setIsRotationUnlocked(false);
          if (m.dragRotate.isEnabled()) {
            m.dragRotate.disable();
            m.touchZoomRotate.disableRotation();
          }
          m.setMaxPitch(0);

          if (Math.abs(m.getBearing()) > 0.1 || m.getPitch() > 0.1) {
            m.easeTo({ bearing: 0, pitch: 0, duration: 500, essential: true });
          }
        } else {
          setIsRotationUnlocked(true);
          if (!m.dragRotate.isEnabled()) {
            m.dragRotate.enable();
            m.touchZoomRotate.enableRotation();
          }

          // PREVENCIÓN DE DESAPARICIÓN DE EDIFICIOS EN ZOOM CERCANO:
          // A zoom cercano (z >= 17), limitamos el pitch a 60° (isométrica Sims/SimCity).
          // Un pitch excesivo (>65°-85°) hace que el plano de corte WebGL (near clipping plane)
          // atraviese las alturas de los edificios y los oculte.
          if (z >= 17.0) {
            m.setMaxPitch(60);
            if (m.getPitch() > 60) {
              m.easeTo({ pitch: 56, duration: 350, essential: true });
            }
          } else {
            m.setMaxPitch(75);
          }

          if (m.getPitch() < 5) {
            m.easeTo({ pitch: 58, duration: 700, essential: true });
          }
        }
      };

      m.on('zoom', () => {
        const z = m.getZoom();
        if (z < MIN_ROTATE_ZOOM && m.dragRotate.isEnabled()) {
          m.dragRotate.disable();
          m.touchZoomRotate.disableRotation();
        }
      });

      m.on('zoomend', updateRotationLock);
      updateRotationLock();

      setMapReady(true);
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // ── 2. Marcador 3D de Fábrica ───────────────────────────────────────
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
      SoundService.play('click');
    };

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(factoryCoords)
      .addTo(map.current);

    factoryMarkerRef.current = marker;

    return () => {
      marker.remove();
    };
  }, [mapReady, factoryCoords]);

  // ── 3. Retícula 3D de Selección Inmobiliaria ───────────────────────
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

  // ── 4. Marcadores 3D para Propiedades, Solares y Canteras ──────────
  useEffect(() => {
    if (!mapReady || !map.current) return;

    if (map.current.getSource('quarry-craters')) {
      map.current.getSource('quarry-craters').setData(generateQuarryCratersGeoJSON(properties));
    }

    propertyMarkersRef.current.forEach(m => m.remove());
    propertyMarkersRef.current = [];

    properties.forEach(prop => {
      const isPlayerOwned = prop.ownerId === player?.id;
      const isQuarry = (prop.excavationDepthMeters && prop.excavationDepthMeters > 0) || prop.facilityType?.includes('mine');
      const isDemolished = prop.status === 'demolished';
      const isAvailablePlot = prop.status === 'available' && prop.heightMeters === 0;

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
        SoundService.play('click');
      };

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([prop.coords.lng, prop.coords.lat])
        .addTo(map.current);

      propertyMarkersRef.current.push(m);
    });
  }, [mapReady, properties, player?.id]);

  // ── 5. WebSocket & Sincronización MMO Persistente ────────────────────
  useEffect(() => {
    if (socket.connected) setConnected(true);

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
        updatePlayerBuildingsLayer(map.current, data.properties);
        if (selectedProperty) {
          const updated = data.properties.find(p => p.id === selectedProperty.id);
          if (updated) setSelectedProperty(updated);
        }
      }

      const coalSlot = data.machine.inventory.slots.find(s => s.itemId === 'coal_ore');
      const coalQty = coalSlot ? coalSlot.quantity : 0;
      setInventoryStock(prev => {
        if (coalQty > (prev.coal_ore || 0)) {
          showNotification(`+${coalQty - (prev.coal_ore || 0)} Carbón`);
          SoundService.play('produce');
        }
        return { ...prev, coal_ore: coalQty };
      });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameState');
    };
  }, [selectedProperty, showNotification]);

  // ── 6. Acciones del Juego ───────────────────────────────────────────
  const handleSellResource = useCallback((itemKey: string, pricePerUnit: number) => {
    const qty = inventoryStock[itemKey] || 0;
    if (qty <= 0) return;

    if (itemKey === 'coal_ore') {
      socket.emit('sellCoal');
    } else {
      const totalEarned = qty * pricePerUnit;
      setPlayer(prev => (prev ? { ...prev, money: prev.money + totalEarned } : null));
      setInventoryStock(prev => ({ ...prev, [itemKey]: 0 }));
    }

    SoundService.play('cash');
  }, [inventoryStock]);

  const flyToHub = (hub: GlobalHub) => {
    setSelectedHub(hub.id);
    SoundService.play('click');
    map.current?.flyTo({
      center: hub.coords,
      zoom: hub.zoom,
      pitch: hub.pitch,
      bearing: hub.bearing,
      duration: 3500,
      essential: true,
    });
  };

  const flyToMyFactory = () => {
    SoundService.play('click');
    map.current?.flyTo({
      center: factoryCoords,
      zoom: 16.8,
      pitch: 65,
      bearing: -20,
      duration: 2500,
      essential: true,
    });
  };

  const flyToProperty = (prop: RealEstateProperty) => {
    SoundService.play('click');
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

  const switchVisualMode = (mode: 'satellite' | 'realistic' | 'dark') => {
    setVisualMode(mode);
    SoundService.play('click');
    const m = map.current;
    if (!m) return;

    if (mode === 'satellite') {
      if (m.getLayer('satellite-layer')) m.setLayoutProperty('satellite-layer', 'visibility', 'visible');
      try {
        m.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.95, position: [1.5, 90, 48] });
        if (m.setSky) m.setSky({ 'sky-color': '#0284c7', 'horizon-color': '#7dd3fc', 'fog-color': '#e0f2fe' });
      } catch {}
      if (m.getLayer('buildings-3d')) {
        m.setPaintProperty('buildings-3d', 'fill-extrusion-opacity', 0.85);
      }
    } else if (mode === 'realistic') {
      if (m.getLayer('satellite-layer')) m.setLayoutProperty('satellite-layer', 'visibility', 'none');
      try {
        m.setLight({ anchor: 'viewport', color: '#fffdf5', intensity: 0.9, position: [1.5, 80, 50] });
        if (m.setSky) m.setSky({ 'sky-color': '#38bdf8', 'horizon-color': '#bae6fd', 'fog-color': '#f0f9ff' });
      } catch {}
    } else if (mode === 'dark') {
      if (m.getLayer('satellite-layer')) m.setLayoutProperty('satellite-layer', 'visibility', 'none');
      try {
        m.setLight({ anchor: 'viewport', color: '#60a5fa', intensity: 0.45, position: [1.5, 180, 20] });
        if (m.setSky) m.setSky({ 'sky-color': '#020617', 'horizon-color': '#0f172a', 'fog-color': '#1e293b' });
      } catch {}
    }
  };

  const changeTerrainExaggeration = (val: number) => {
    setTerrainExaggeration(val);
    SoundService.play('click');
    if (map.current) {
      try {
        map.current.setTerrain({ source: 'terrain-dem', exaggeration: val });
        showNotification(`⛰️ Relieve de Terreno ajustado a ${val.toFixed(1)}x`, 2500);
      } catch (e) {
        console.warn('Error al actualizar relieve:', e);
      }
    }
  };

  const handleBuyProperty = () => {
    if (!selectedProperty || !player) return;
    if (player.money < selectedProperty.price) {
      showNotification(`⚠️ Capital insuficiente (${selectedProperty.price.toLocaleString()} € necesarios)`, 3500);
      return;
    }

    SoundService.play('cash');
    socket.emit('buyProperty', selectedProperty);
    showNotification(`🎉 ¡${selectedProperty.name} Adquirido!`, 3500);
  };

  const handleDemolishProperty = () => {
    if (!selectedProperty || !player) return;
    const demolitionCost = 150;
    if (player.money < demolitionCost) {
      showNotification(`⚠️ Fondos insuficientes para demolición (${demolitionCost} €)`, 3500);
      return;
    }

    SoundService.play('demolish');
    socket.emit('demolishProperty', { propertyId: selectedProperty.id });
    showNotification(`🔨 Demolición completada: Solar despejado`, 3500);
  };

  const handleConstructFacility = (facility: FacilityOption) => {
    if (!selectedProperty || !player) return;
    if (player.money < facility.cost) {
      showNotification(`⚠️ Requiere ${facility.cost} € para edificar`, 3500);
      return;
    }

    SoundService.play('build');
    socket.emit('constructFacility', {
      propertyId: selectedProperty.id,
      facilityType: facility.id,
      name: `${facility.name} - ${selectedProperty.name.replace('Solar Despejado', '').trim()}`,
      cost: facility.cost,
    });
    showNotification(`🏗️ ¡${facility.name} Construida!`, 3500);
  };

  const handleSaveName = () => {
    if (!selectedProperty || !nameInput.trim()) return;
    SoundService.play('click');
    socket.emit('renameProperty', {
      propertyId: selectedProperty.id,
      newName: nameInput.trim(),
    });
    setIsEditingName(false);
  };

  const handleAddFloor = (cost: number) => {
    if (!selectedProperty || !player) return;
    if (player.money < cost) {
      showNotification(`⚠️ Fondos insuficientes (${cost.toLocaleString()} € necesarios)`, 3500);
      return;
    }
    SoundService.play('build');
    socket.emit('addBuildingFloor', { propertyId: selectedProperty.id, cost });
    showNotification(`🏗️ ¡Nueva planta construida con éxito! (+3.5m)`, 3500);
  };

  const handleChangeBuildingStyle = (style: ArchitecturalStyle) => {
    if (!selectedProperty || !player) return;
    SoundService.play('click');
    socket.emit('changeBuildingStyle', { propertyId: selectedProperty.id, style });
    showNotification(`🎨 Fachada actualizada a estilo ${style}`, 2500);
  };

  const handleInstallFloorModule = (floorNumber: number, mod: any) => {
    if (!selectedProperty || !player) return;
    if (player.money < mod.cost) {
      showNotification(`⚠️ Fondos insuficientes (${mod.cost} € necesarios)`, 3500);
      return;
    }
    SoundService.play('cash');
    socket.emit('installFloorModule', {
      propertyId: selectedProperty.id,
      floorNumber,
      module: mod,
    });
    showNotification(`⚙️ ${mod.name} instalado en Planta ${floorNumber}`, 3500);
  };

  return (
    <div className="game-viewport">
      {/* 1. Canvas del Mapa 3D */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      <div className="game-vignette" />

      {/* 2. Notificación Flotante */}
      {floatingPill && (
        <div
          style={{
            position: 'absolute',
            top: 75,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.95), rgba(37, 99, 235, 0.95))',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 800,
            boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.6)',
            zIndex: 300,
            border: '1px solid #7dd3fc',
            fontFamily: 'Chakra Petch',
            letterSpacing: 0.5,
          }}
        >
          {floatingPill}
        </div>
      )}

      {/* 3. Header HUD Modular */}
      <HeaderHUD
        player={player}
        properties={properties}
        connected={connected}
        visualMode={visualMode}
        terrainExaggeration={terrainExaggeration}
        selectedHub={selectedHub}
        soundEnabled={soundEnabled}
        onSwitchVisualMode={switchVisualMode}
        onChangeTerrain={changeTerrainExaggeration}
        onFlyToHub={flyToHub}
        onFlyToMyFactory={flyToMyFactory}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          SoundService.setEnabled(next);
          if (next) SoundService.play('click');
        }}
      />

      {/* 4. Panel Lateral Izquierdo Modular */}
      <DrawerSidebar
        activeTab={activeTab}
        player={player}
        machine={machine}
        properties={properties}
        selectedProperty={selectedProperty}
        inventoryStock={inventoryStock}
        onSelectTab={setActiveTab}
        onFlyToProperty={flyToProperty}
        onSellResource={handleSellResource}
        onNotify={showNotification}
      />

      {/* 5. Inspector Inmobiliario Modal */}
      <PropertyInspectorModal
        selectedProperty={selectedProperty}
        player={player}
        isEditingName={isEditingName}
        nameInput={nameInput}
        onClose={() => setSelectedProperty(null)}
        onSetNameInput={setNameInput}
        onStartEditingName={() => setIsEditingName(true)}
        onSaveName={handleSaveName}
        onBuyProperty={handleBuyProperty}
        onDemolishProperty={handleDemolishProperty}
        onConstructFacility={handleConstructFacility}
        onAddFloor={handleAddFloor}
        onChangeStyle={handleChangeBuildingStyle}
        onInstallFloorModule={handleInstallFloorModule}
      />

      {/* 6. Barra Inferior de Fabricación */}
      <BuildBar buildingMode={buildingMode} onSelectBlueprint={setBuildingMode} />

      {/* 7. Indicador de Bloqueo de Rotación y Auto-Enderezado */}
      <RotationStatusChip
        isRotationUnlocked={isRotationUnlocked}
        currentZoomLevel={currentZoomLevel}
        onResetOrientation={() => {
          map.current?.easeTo({ bearing: 0, duration: 400 });
          SoundService.play('click');
        }}
      />

      {/* 8. Tarjeta Flotante Cadastral al pasar el cursor */}
      <CadastralHoverTooltip hoveredInfo={hoveredInfo} />
    </div>
  );
}
