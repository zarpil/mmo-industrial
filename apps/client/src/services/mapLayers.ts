import type { RealEstateProperty } from '@mmo/shared';
import { generateQuarryCratersGeoJSON } from './quarryGeometry';

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
          maxzoom: 22,
          layout: { visibility: 'visible' },
        },
        'building'
      );
    }
  } catch (err) {
    console.warn('Satellite layer error:', err);
  }

  // 4. Terreno 3D con elevación Terrarium DEM y Hillshading
  try {
    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'terrain-dem', exaggeration: 2.6 });

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

  // 5. Edificios 3D Arquitectónicos
  try {
    if (!map.getLayer('buildings-3d')) {
      map.addLayer({
        id: 'buildings-3d',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 13,
        paint: {
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            13, 0,
            14.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 12]
          ],
          'fill-extrusion-base': [
            'coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0
          ],
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

      // Delimitación de Parcelas y Bordes Catastrales en el Suelo
      if (!map.getLayer('building-cadastral-borders')) {
        map.addLayer({
          id: 'building-cadastral-borders',
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'line',
          minzoom: 13.5,
          paint: {
            'line-color': 'rgba(56, 189, 248, 0.55)',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              13.5, 1.2,
              16, 2.4,
              18, 3.6
            ],
            'line-opacity': 0.85,
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

  // 6. Canteras y Cráteres Escalonados
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
