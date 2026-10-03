import React from 'react';
import type { BuildableBlueprint } from '../types/game';
import { BLUEPRINTS } from '../constants/gameData';
import { SoundService } from '../services/sound';

interface Props {
  buildingMode: BuildableBlueprint | null;
  onSelectBlueprint: (bp: BuildableBlueprint | null) => void;
}

export const BuildBar: React.FC<Props> = ({ buildingMode, onSelectBlueprint }) => {
  return (
    <footer
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: '#38bdf8',
            fontWeight: 800,
            letterSpacing: 2,
            writingMode: 'vertical-lr',
            textTransform: 'uppercase',
            paddingRight: 4,
          }}
        >
          FABRICAR
        </div>

        {BLUEPRINTS.map(bp => {
          const isSelected = buildingMode?.id === bp.id;
          return (
            <button
              key={bp.id}
              onClick={() => {
                onSelectBlueprint(isSelected ? null : bp);
                SoundService.play('click');
              }}
              title={`${bp.name} (${bp.cost}€): ${bp.desc}`}
              style={{
                background: isSelected ? 'rgba(249, 115, 22, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                border: isSelected ? '2px solid #f97316' : '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 10,
                padding: '8px 14px',
                minWidth: 90,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 0 16px rgba(249, 115, 22, 0.5)' : 'none',
              }}
            >
              <span style={{ fontSize: 22 }}>{bp.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#fdba74' : '#e2e8f0' }}>
                {bp.name}
              </span>
              <span style={{ fontSize: 10, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                {bp.cost} €
              </span>
            </button>
          );
        })}
      </div>
    </footer>
  );
};
