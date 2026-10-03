import React from 'react';
import type { HoveredCadastralInfo } from '../types/game';

interface Props {
  hoveredInfo: HoveredCadastralInfo | null;
}

export const CadastralHoverTooltip: React.FC<Props> = ({ hoveredInfo }) => {
  if (!hoveredInfo) return null;

  return (
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
  );
};
