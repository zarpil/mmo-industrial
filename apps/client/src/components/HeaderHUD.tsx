import React from 'react';
import type { Player, RealEstateProperty } from '@mmo/shared';
import type { GlobalHub } from '../types/game';
import { GLOBAL_HUBS } from '../constants/gameData';

interface Props {
  player: Player | null;
  properties: RealEstateProperty[];
  connected: boolean;
  visualMode: 'satellite' | 'realistic' | 'dark';
  terrainExaggeration: number;
  selectedHub: string;
  soundEnabled: boolean;
  onSwitchVisualMode: (mode: 'satellite' | 'realistic' | 'dark') => void;
  onChangeTerrain: (val: number) => void;
  onFlyToHub: (hub: GlobalHub) => void;
  onFlyToMyFactory: () => void;
  onToggleSound: () => void;
}

export const HeaderHUD: React.FC<Props> = ({
  player,
  properties,
  connected,
  visualMode,
  terrainExaggeration,
  selectedHub,
  soundEnabled,
  onSwitchVisualMode,
  onChangeTerrain,
  onFlyToHub,
  onFlyToMyFactory,
  onToggleSound,
}) => {
  // Calcular rendimiento pasivo mensual total
  const monthlyTotal = properties
    .filter(p => p.ownerId === player?.id && p.status !== 'demolished')
    .reduce((acc, curr) => acc + (curr.monthlyRevenue || 0), 0);

  return (
    <header
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {/* Indicadores Económicos e Industriales */}
      <div
        className="glass-panel"
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          pointerEvents: 'auto',
        }}
      >
        {/* Capital */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>💰</span>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Capital Líquido
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
              {player ? Math.floor(player.money).toLocaleString() : '---'} €
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: 'rgba(56, 189, 248, 0.2)' }} />

        {/* Renta Inmobiliaria */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏢</span>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Renta Pasiva
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80', fontFamily: 'Chakra Petch' }}>
              +{monthlyTotal} <span style={{ fontSize: 11 }}>€/mes</span>
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: 'rgba(56, 189, 248, 0.2)' }} />

        {/* Red Eléctrica */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Red Eléctrica
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', fontFamily: 'Chakra Petch' }}>
              5.0 / 30.0 <span style={{ fontSize: 11, color: '#64748b' }}>MW</span>
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: 'rgba(56, 189, 248, 0.2)' }} />

        {/* Servidor MMO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#ef4444',
              boxShadow: connected ? '0 0 10px #22c55e' : '0 0 10px #ef4444',
            }}
          />
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Servidor MMO
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: connected ? '#4ade80' : '#f87171' }}>
              {connected ? 'Tick 5s Activo' : 'Offline (Local)'}
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Vista, Relieve y Navegación */}
      <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
        {/* Selector de Modo Visual */}
        <div className="glass-panel" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { id: 'satellite', label: '🛰️ Satélite 3D' },
            { id: 'realistic', label: '🏙️ Ciudad Día' },
            { id: 'dark', label: '🌆 Noche' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onSwitchVisualMode(m.id as any)}
              style={{
                background: visualMode === m.id ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                border: visualMode === m.id ? '1px solid rgba(56, 189, 248, 0.5)' : 'none',
                borderRadius: 6,
                padding: '5px 9px',
                color: visualMode === m.id ? '#38bdf8' : '#94a3b8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Selector de Relieve 3D */}
        <div
          className="glass-panel"
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          title="Ajustar exageración de relieve 3D en montañas y canteras"
        >
          <span style={{ fontSize: 13, marginRight: 2 }}>⛰️</span>
          {[
            { val: 1.4, label: '1.4x' },
            { val: 2.6, label: '2.6x Juego' },
            { val: 4.2, label: '4.2x Épico' },
          ].map(r => (
            <button
              key={r.val}
              onClick={() => onChangeTerrain(r.val)}
              style={{
                background: terrainExaggeration === r.val ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
                border: terrainExaggeration === r.val ? '1px solid rgba(245, 158, 11, 0.6)' : 'none',
                borderRadius: 6,
                padding: '5px 8px',
                color: terrainExaggeration === r.val ? '#fbbf24' : '#94a3b8',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Selector de Ciudad / Hitos Globales */}
        <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🌍</span>
          <select
            value={selectedHub}
            onChange={(e) => {
              const h = GLOBAL_HUBS.find(x => x.id === e.target.value);
              if (h) onFlyToHub(h);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e2e8f0',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {GLOBAL_HUBS.map(h => (
              <option key={h.id} value={h.id} style={{ background: '#090d16', color: '#fff' }}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Centrar en Fábrica */}
        <button
          onClick={onFlyToMyFactory}
          className="glass-panel"
          title="Centrar en mi Fábrica"
          style={{
            padding: '6px 12px',
            color: '#38bdf8',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🏭</span> Mi Factoría
        </button>

        {/* Botón de Sonido */}
        <button
          onClick={onToggleSound}
          className="glass-panel"
          style={{
            padding: '6px 10px',
            color: soundEnabled ? '#4ade80' : '#94a3b8',
            fontSize: 14,
            cursor: 'pointer',
          }}
          title={soundEnabled ? 'Silenciar Efectos de Audio' : 'Activar Sonidos de Juego'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
};
