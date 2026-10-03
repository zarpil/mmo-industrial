import React from 'react';
import type { Player, MachineInstance, RealEstateProperty } from '@mmo/shared';
import { COMMODITIES } from '../constants/gameData';
import { SoundService } from '../services/sound';

interface Props {
  activeTab: 'overview' | 'market' | 'factory' | 'properties';
  player: Player | null;
  machine: MachineInstance | null;
  properties: RealEstateProperty[];
  selectedProperty: RealEstateProperty | null;
  inventoryStock: Record<string, number>;
  onSelectTab: (tab: 'overview' | 'market' | 'factory' | 'properties') => void;
  onFlyToProperty: (prop: RealEstateProperty) => void;
  onSellResource: (itemKey: string, pricePerUnit: number) => void;
  onNotify: (msg: string) => void;
}

export const DrawerSidebar: React.FC<Props> = ({
  activeTab,
  player,
  machine,
  properties,
  selectedProperty,
  inventoryStock,
  onSelectTab,
  onFlyToProperty,
  onSellResource,
  onNotify,
}) => {
  const coalAmount = inventoryStock.coal_ore || 0;
  const ownedProperties = properties.filter(p => p.ownerId === player?.id);
  const totalPassiveRevenue = ownedProperties.reduce(
    (acc, p) => acc + (p.status !== 'demolished' ? p.monthlyRevenue : 0),
    0
  );

  return (
    <aside
      style={{
        position: 'absolute',
        top: 90,
        left: 20,
        width: 360,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'auto',
      }}
    >
      {/* Botones de Pestañas */}
      <div className="glass-panel" style={{ display: 'flex', padding: 4 }}>
        {[
          { id: 'overview', label: 'Resumen', icon: '📊' },
          { id: 'properties', label: `Inmuebles (${ownedProperties.length})`, icon: '🏢' },
          { id: 'factory', label: 'Fábrica', icon: '🏭' },
          { id: 'market', label: 'Mercado', icon: '📈' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              onSelectTab(tab.id as any);
              SoundService.play('click');
            }}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: 8,
              background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              transition: 'all 0.2s',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Pestaña: RESUMEN */}
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
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: 10,
              padding: 12,
              border: '1px solid rgba(56, 189, 248, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>⛏️ Carbón Almacenado</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', fontFamily: 'Chakra Petch' }}>
                {coalAmount} / 100 ton
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#090d16', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, coalAmount)}%`,
                  height: '100%',
                  background:
                    coalAmount > 80
                      ? 'linear-gradient(90deg, #ea580c, #f97316)'
                      : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b' }}>
              <span>Tasa: +1 ton / 5s</span>
              <span>Valor: {(coalAmount * 5).toLocaleString()} €</span>
            </div>
          </div>

          {/* Venta Inmediata */}
          <button
            onClick={() => onSellResource('coal_ore', 5)}
            disabled={coalAmount === 0}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 8,
              border: 'none',
              background: coalAmount > 0 ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(30, 41, 59, 0.5)',
              color: coalAmount > 0 ? '#f8fafc' : '#475569',
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 1,
              cursor: coalAmount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: coalAmount > 0 ? '0 0 20px rgba(37, 99, 235, 0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {coalAmount > 0 ? `Vender al Mercado (+${coalAmount * 5} €)` : 'Sin Stock para Vender'}
          </button>

          {/* Guía Rápida */}
          <div
            style={{
              borderTop: '1px solid rgba(56, 189, 248, 0.15)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              Interacción Inmobiliaria 3D
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
              <span style={{ color: '#94a3b8' }}>🏢 Click en Edificio 3D</span>
              <span style={{ color: '#94a3b8' }}>🛒 Comprar / Reclamar</span>
              <span style={{ color: '#94a3b8' }}>🔨 Demoler Estructura</span>
              <span style={{ color: '#94a3b8' }}>🏗️ Construir Complejos</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Pestaña: INMUEBLES EN PROPIEDAD */}
      {activeTab === 'properties' && (
        <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Tus Inmuebles y Solares</span>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>+{totalPassiveRevenue} €/mes</span>
          </div>

          {ownedProperties.length === 0 ? (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 12,
                border: '1px dashed rgba(56, 189, 248, 0.2)',
              }}
            >
              Aún no posees ningún inmueble o parcela. Haz clic sobre cualquier edificio 3D del mapa para consultar su valoración catastral y adquirirlo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {ownedProperties.map(p => (
                <div
                  key={p.id}
                  onClick={() => onFlyToProperty(p)}
                  style={{
                    background: selectedProperty?.id === p.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.7)',
                    border: selectedProperty?.id === p.id ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.12)',
                    borderRadius: 8,
                    padding: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#f8fafc' }}>
                      {p.status === 'demolished' ? '🚧 ' : p.status === 'facility_active' ? '🏭 ' : '🏢 '}
                      {p.name}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 700,
                        background: p.status === 'demolished' ? 'rgba(234, 88, 12, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                        color: p.status === 'demolished' ? '#fdba74' : '#4ade80',
                      }}
                    >
                      {p.status === 'demolished' ? 'Solar en Obras' : `+${p.monthlyRevenue}€/mes`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#64748b' }}>
                    <span>
                      {p.areaSqm} m² {p.heightMeters > 0 ? `| ${p.heightMeters}m (${p.levels} pl.)` : '| Terreno libre'}
                    </span>
                    <span style={{ color: '#38bdf8' }}>Centrar Cámara ↗</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Pestaña: FÁBRICA Y AUTOMATIZACIÓN */}
      {activeTab === 'factory' && (
        <div className="glass-panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚙️</span> Cadena Industrial ({machine?.id || 'Instancia #1'})
            </div>
            <span style={{ fontSize: 10, color: '#38bdf8' }}>{machine?.status || 'Activa'}</span>
          </div>

          <div
            style={{
              background: 'rgba(9, 13, 22, 0.85)',
              borderRadius: 8,
              padding: 14,
              border: '1px dashed rgba(56, 189, 248, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
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

            <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: 12 }}>↓ Cinta transportadora ↓</div>

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

          <button
            onClick={() => {
              SoundService.play('click');
              onNotify('⚡ ¡Mejora de perforación instalada! Eficiencia +15%');
            }}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 6,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⚡ Overclock de Extracción (150€)
          </button>
        </div>
      )}

      {/* 4. Pestaña: BOLSA Y MERCADO GLOBAL */}
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
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
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
                      onClick={() => onSellResource(c.id, c.price)}
                      style={{
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.5)',
                        color: '#4ade80',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 4,
                        padding: '2px 8px',
                        marginTop: 4,
                        cursor: 'pointer',
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
  );
};
