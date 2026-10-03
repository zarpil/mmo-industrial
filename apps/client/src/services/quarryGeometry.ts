import type { RealEstateProperty } from '@mmo/shared';

/**
 * Generador de geometría 3D GeoJSON para cráteres y canteras a cielo abierto
 * Produce taludes de coronación y terrazas concéntricas escalonadas
 */
export function generateQuarryCratersGeoJSON(props: RealEstateProperty[]) {
  const features: any[] = [];
  props.forEach(p => {
    const depth = p.excavationDepthMeters || (p.facilityType?.includes('mine') ? 8 : 0);
    if (depth <= 0) return;

    const [lng, lat] = [p.coords.lng, p.coords.lat];
    const numPoints = 28;

    // Escala del radio según el tamaño y la profundidad de la cantera
    const baseRadius = 0.00045 + Math.min(0.00025, depth * 0.000003);

    // 1. Dique / Talud de Coronación Elevado (Berm exterior de contención y seguridad)
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
