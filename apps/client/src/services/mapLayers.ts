import type { RealEstateProperty } from '@mmo/shared';
import { generateQuarryCratersGeoJSON } from './quarryGeometry';

/**
 * Genera el GeoJSON 3D para construcciones y ampliaciones estilo Sims
 * de propiedades adquiridas por jugadores
 */
export function generatePlayerBuildingsGeoJSON(props: RealEstateProperty[]) {
  const features: any[] = [];
  props.forEach(p => {
    if (!p.construction || p.status === 'demolished' || p.heightMeters <= 0) return;
    const [lng, lat] = [p.coords.lng, p.coords.lat];
    const halfSize = 0.00018; // Huella aprox 30x30m
    const style = p.construction.style || 'modern_glass';

    const color =
      style === 'modern_glass' ? '#38bdf8' :
      style === 'industrial_steel' ? '#f59e0b' :
      style === 'brutalist_concrete' ? '#94a3b8' :
      style === 'high_tech_composite' ? '#10b981' : '#e11d48';

    const coords = [
      [lng - halfSize, lat - halfSize * 0.75],
      [lng + halfSize, lat - halfSize * 0.75],
      [lng + halfSize, lat + halfSize * 0.75],
      [lng - halfSize, lat + halfSize * 0.75],
      [lng - halfSize, lat - halfSize * 0.75],
    ];

    features.push({
      type: 'Feature',
      properties: {
        id: p.id,
        name: p.name,
        height: p.heightMeters,
        color: color,
        style: style,
        floors: p.construction.totalFloors || p.levels || 1,
      },
      geometry: { type: 'Polygon', coordinates: [coords] },
    });
  });
  return { type: 'FeatureCollection', features };
}

/**
 * Actualiza la capa de construcciones personalizadas en el mapa
 */
export function updatePlayerBuildingsLayer(map: any, props: RealEstateProperty[]) {
  if (!map) return;
  const source = map.getSource('player-constructions');
  if (source) {
    source.setData(generatePlayerBuildingsGeoJSON(props));
  }
}

/**
 * Inyecta las capas base y avanzadas en el mapa MapLibre
 */
export function initializeMapLayers(map: any, initialProperties: RealEstateProperty[]) {
  // 1. Iluminación diurna realista
  try {
    map.setLight({
      anchor: 'viewport',
      color: '#ffffff',
      intensity: 0.95,
      position: [1.5, 90, 48],
    });
  } catch {}

  // 2. Atmósfera y cielo
  try {
    if (map.setSky) {
      map.setSky({
        'sky-color': '#0284c7',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#7dd3fc',
        'horizon-fog-blend': 0.8,
        'fog-color': '#e0f2fe',
        'fog-ground-blend': 0.5,
      });
    }
  } catch {}

  // 3. Capa Satelital (Esri World Imagery)
  try {
    if (!map.getSource('satellite-tiles')) {
      map.addSource('satellite-tiles', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
      });

      map.addLayer(
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'satellite-tiles',
          minzoom: 0,
          maxzoom: 24,
          layout: { visibility: 'visible' },
        },
        'building'
      );
    }
  } catch (err) {
    console.warn('Satellite layer error:', err);
  }

  // 4. Terreno 3D con elevación Terrarium DEM y Hillshading
  // Usamos una exageración base balanceada de 1.15 para que las montañas sean visibles
  // pero los solares urbanos no deformen ni oculten los edificios en zoom cercano.
  try {
    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'terrain-dem', exaggeration: 1.15 });

      if (!map.getLayer('terrain-hillshade')) {
        map.addLayer(
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
      }
    }
  } catch (err) {
    console.warn('DEM Terrain error:', err);
  }

  // 5. Edificios 3D Arquitectónicos (OpenMapTiles / OSM)
  try {
    if (!map.getLayer('buildings-3d')) {
      map.addLayer({
        id: 'buildings-3d',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 13,
        maxzoom: 24, // Permite visualizar edificios hasta el zoom máximo sin desaparecer
        paint: {
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            14.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 14]
          ],
          'fill-extrusion-base': [
            'coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0.1
          ],
          'fill-extrusion-color': [
            'interpolate', ['linear'],
            ['coalesce', ['get', 'render_height'], ['get', 'height'], 14],
            0, '#f8fafc',
            20, '#e2e8f0',
            50, '#cbd5e1',
            90, '#94a3b8',
            150, '#64748b',
            250, '#475569'
          ],
          'fill-extrusion-opacity': 0.95,
        },
      });

      // Delimitación de Parcelas y Bordes Catastrales en el Suelo
      if (!map.getLayer('building-cadastral-borders')) {
        map.addLayer({
          id: 'building-cadastral-borders',
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'line',
          minzoom: 13.5,
          maxzoom: 24,
          paint: {
            'line-color': 'rgba(56, 189, 248, 0.65)',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              13.5, 1.2,
              16, 2.4,
              18, 3.6,
              21, 5.0
            ],
            'line-opacity': 0.9,
          },
        }, 'buildings-3d');
      }

      // Capa de nombres reales de edificios (OSM)
      if (!map.getLayer('building-real-names')) {
        map.addLayer({
          id: 'building-real-names',
          source: 'openmaptiles',
          'source-layer': 'poi',
          type: 'symbol',
          minzoom: 15.0,
          maxzoom: 24,
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
      }
    }
  } catch (err) {
    console.warn('Buildings 3D error:', err);
  }

  // 6. Construcciones Modulares de Jugadores Estilo Sims
  try {
    if (!map.getSource('player-constructions')) {
      map.addSource('player-constructions', {
        type: 'geojson',
        data: generatePlayerBuildingsGeoJSON(initialProperties),
      });

      map.addLayer({
        id: 'player-constructions-3d',
        type: 'fill-extrusion',
        source: 'player-constructions',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0.2,
          'fill-extrusion-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'player-constructions-glow',
        type: 'line',
        source: 'player-constructions',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3,
        },
      });
    }
  } catch (err) {
    console.warn('Player constructions error:', err);
  }

  // 7. Canteras y Cráteres Escalonados
  try {
    if (!map.getSource('quarry-craters')) {
      map.addSource('quarry-craters', {
        type: 'geojson',
        data: generateQuarryCratersGeoJSON(initialProperties),
      });

      map.addLayer({
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

      map.addLayer({
        id: 'quarry-craters-outline',
        type: 'line',
        source: 'quarry-craters',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.5,
          'line-dasharray': [3, 1],
        },
      });
    }
  } catch (err) {
    console.warn('Quarry craters error:', err);
  }
}
