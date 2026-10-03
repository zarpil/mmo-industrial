import React, { useState } from 'react';
import type { Player, RealEstateProperty, ArchitecturalStyle } from '@mmo/shared';
import type { FacilityOption } from '../types/game';
import { FACILITY_OPTIONS } from '../constants/gameData';

interface Props {
  selectedProperty: RealEstateProperty | null;
  player: Player | null;
  isEditingName: boolean;
  nameInput: string;
  onClose: () => void;
  onSetNameInput: (val: string) => void;
  onStartEditingName: () => void;
  onSaveName: () => void;
  onBuyProperty: () => void;
  onDemolishProperty: () => void;
  onConstructFacility: (facility: FacilityOption) => void;
  onAddFloor?: (cost: number) => void;
  onChangeStyle?: (style: ArchitecturalStyle) => void;
  onInstallFloorModule?: (floorNumber: number, module: any) => void;
}

export const PropertyInspectorModal: React.FC<Props> = ({
  selectedProperty,
  player,
  isEditingName,
  nameInput,
  onClose,
  onSetNameInput,
  onStartEditingName,
  onSaveName,
  onBuyProperty,
  onDemolishProperty,
  onConstructFacility,
  onAddFloor,
  onChangeStyle,
  onInstallFloorModule,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'sims'>('info');
  const [selectedFloorForModule, setSelectedFloorForModule] = useState<number>(1);

  if (!selectedProperty) return null;

  const isSelectedOwnedByPlayer = selectedProperty.ownerId === player?.id;
  const isQuarry =
    (selectedProperty.excavationDepthMeters && selectedProperty.excavationDepthMeters > 0) ||
    selectedProperty.facilityType?.includes('mine');

  const construction = selectedProperty.construction;
  const currentFloors = construction?.floors || [];
  const currentStyle: ArchitecturalStyle = construction?.style || 'modern_glass';
  const newFloorCost = Math.round(350 + (selectedProperty.levels || 1) * 45);

  const STYLES: { id: ArchitecturalStyle; name: string; icon: string; color: string; desc: string }[] = [
    { id: 'modern_glass', name: 'Cristal Templado', icon: '🏢', color: '#38bdf8', desc: 'Fachada corporativa acristalada' },
    { id: 'industrial_steel', name: 'Acero Industrial', icon: '🏭', color: '#f59e0b', desc: 'Vigas IPE reforzadas y chapa naval' },
    { id: 'brutalist_concrete', name: 'Hormigón Armado', icon: '🏛️', color: '#94a3b8', desc: 'Bloque monolítico macizo' },
    { id: 'high_tech_composite', name: 'High-Tech Neón', icon: '⚡', color: '#10b981', desc: 'Paneles solares y nodos de datos' },
    { id: 'classic_brick', name: 'Ladrillo Clásico', icon: '🧱', color: '#e11d48', desc: 'Mampostería señorial tradicional' },
  ];

  const MODULE_OPTIONS = [
    { id: 'mod-tech', name: 'Datacenter & Nube', type: 'energy' as const, bonus: 45, icon: '🖥️', cost: 120 },
    { id: 'mod-robot', name: 'Taller Automatizado', type: 'production' as const, bonus: 55, icon: '🤖', cost: 160 },
    { id: 'mod-office', name: 'Oficinas Ejecutivas', type: 'office' as const, bonus: 35, icon: '💼', cost: 90 },
    { id: 'mod-storage', name: 'Silo Logístico', type: 'storage' as const, bonus: 30, icon: '📦', cost: 80 },
  ];

  return (
    <div
      className="glass-panel glass-panel-glow"
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        width: 375,
        padding: 18,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxHeight: 'calc(100vh - 110px)',
        overflowY: 'auto',
      }}
    >
      {/* Cabecera del Inspector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            {isSelectedOwnedByPlayer
              ? '🏢 TU PROPIEDAD ADQUIRIDA'
              : selectedProperty.ownerId !== null
              ? '🔒 FINCA REGISTRADA'
              : selectedProperty.heightMeters === 0
              ? '🌿 SOLAR RÚSTICO DISPONIBLE'
              : '🏛️ FINCA CATASTRAL DISPONIBLE'}
          </div>

          {/* Nombre editable o estático */}
          {isEditingName ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => onSetNameInput(e.target.value)}
                style={{
                  background: '#090d16',
                  border: '1px solid #38bdf8',
                  borderRadius: 4,
                  padding: '4px 8px',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  outline: 'none',
                  flex: 1,
                }}
              />
              <button
                onClick={onSaveName}
                style={{
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Guardar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#f8fafc', fontWeight: 800 }}>
                {selectedProperty.name}
              </h3>
              {isSelectedOwnedByPlayer && (
                <button
                  onClick={onStartEditingName}
                  title="Editar Nombre del Inmueble"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✏️
                </button>
              )}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{selectedProperty.address}</div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* Pestañas de modo si es propiedad del jugador */}
      {isSelectedOwnedByPlayer && selectedProperty.status !== 'demolished' && (
        <div style={{ display: 'flex', gap: 6, background: 'rgba(15, 23, 42, 0.6)', padding: 3, borderRadius: 6 }}>
          <button
            onClick={() => setActiveTab('info')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === 'info' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: activeTab === 'info' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            📋 Ficha Catastral
          </button>
          <button
            onClick={() => setActiveTab('sims')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === 'sims' ? 'rgba(234, 179, 8, 0.25)' : 'transparent',
              color: activeTab === 'sims' ? '#facc15' : '#94a3b8',
              fontWeight: 800,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            🏗️ Modo Construcción Sims
          </button>
        </div>
      )}

      {/* ── TAB 1: INFORMACIÓN GENERAL Y CATASTRO ── */}
      {(!isSelectedOwnedByPlayer || activeTab === 'info') && (
        <>
          <div
            style={{
              background: 'rgba(9, 13, 22, 0.7)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Superficie Catastral:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
                {selectedProperty.areaSqm?.toLocaleString()} m²
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Altura / Cota:</span>
              <span style={{ color: selectedProperty.heightMeters > 0 ? '#38bdf8' : '#a1a1aa', fontWeight: 700 }}>
                {selectedProperty.heightMeters > 0 ? `${selectedProperty.heightMeters.toFixed(1)} metros` : 'A ras de suelo (0m)'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Plantas Edificadas:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
                {selectedProperty.levels || (selectedProperty.heightMeters > 0 ? Math.max(1, Math.round(selectedProperty.heightMeters / 3.4)) : 0)} niveles
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Uso Territorial:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700, textTransform: 'capitalize' }}>
                {selectedProperty.buildingType === 'office' ? 'Oficinas & Corporativo' :
                 selectedProperty.buildingType === 'commercial' ? 'Comercial' :
                 selectedProperty.buildingType === 'industrial' ? 'Industrial / Minero' :
                 selectedProperty.buildingType === 'demolished' ? 'Solar Derribado' : selectedProperty.buildingType}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
              <span style={{ color: '#94a3b8' }}>Rendimiento Mensual:</span>
              <span style={{ color: '#4ade80', fontWeight: 800 }}>
                +{selectedProperty.monthlyRevenue?.toLocaleString()} €/mes
              </span>
            </div>

            {/* Título de propiedad catastral registrado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
              <span>Nº Título Catastral:</span>
              <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                {selectedProperty.deedsNumber || `TIT-CAT-${selectedProperty.id.slice(-6).toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* Medidor de cantera si aplica */}
          {isQuarry && (
            <div
              style={{
                background: 'rgba(120, 53, 15, 0.25)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#facc15', fontWeight: 800, textTransform: 'uppercase' }}>
                  ⛏️ Excavación Minera Activa
                </span>
                <span style={{ fontSize: 11, color: '#fdba74', fontWeight: 700 }}>
                  -{selectedProperty.excavationDepthMeters || 8}m
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#1c1917', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, ((selectedProperty.excavationDepthMeters || 8) / 85) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  }}
                />
              </div>
            </div>
          )}

          {/* ACCIONES DE COMPRA Y DEMOLICIÓN */}
          {!isSelectedOwnedByPlayer && selectedProperty.ownerId !== null && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 22 }}>🔒</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                  Propiedad de {selectedProperty.ownerName || 'Otro Magnate MMO'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  Finca inscrita en el registro persistente.
                </div>
              </div>
            </div>
          )}

          {!isSelectedOwnedByPlayer && selectedProperty.ownerId === null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Valor de Adquisición</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                  {selectedProperty.price.toLocaleString()} €
                </div>
              </div>

              <button
                onClick={onBuyProperty}
                style={{
                  padding: '12px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)',
                }}
              >
                🛒 Comprar {selectedProperty.heightMeters === 0 ? 'Parcela' : 'Inmueble'}
              </button>
            </div>
          )}

          {isSelectedOwnedByPlayer && selectedProperty.status !== 'demolished' && selectedProperty.heightMeters > 0 && (
            <div
              style={{
                background: 'rgba(234, 88, 12, 0.1)',
                border: '1px solid rgba(234, 88, 12, 0.3)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fdba74' }}>Derribo y Despeje</div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>Demoler para abrir cantera o rehacer solar</div>
              </div>

              <button
                onClick={onDemolishProperty}
                style={{
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🔨 Demoler (150€)
              </button>
            </div>
          )}

          {/* Edificar sobre solar despejado */}
          {isSelectedOwnedByPlayer && (selectedProperty.status === 'demolished' || selectedProperty.heightMeters === 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                🏗️ Edificar en el Solar / Abrir Cantera
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {FACILITY_OPTIONS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onConstructFacility(f)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: 6,
                      padding: '8px 6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{f.icon}</span>
                      <span style={{ fontSize: 10, color: '#facc15', fontWeight: 800 }}>{f.cost}€</span>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{f.name}</div>
                    <div style={{ fontSize: 9, color: '#4ade80' }}>+{f.revenueBonus} €/mes</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: MODO CONSTRUCCIÓN ESTILO SIMS (PERSISTENTE) ── */}
      {isSelectedOwnedByPlayer && activeTab === 'sims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Ampliación de Plantas / Pisos */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#facc15' }}>🏗️ Estructura Vertical</span>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {selectedProperty.levels || 1} Plantas construidas ({selectedProperty.heightMeters.toFixed(1)}m)
                </div>
              </div>

              <button
                onClick={() => onAddFloor && onAddFloor(newFloorCost)}
                style={{
                  background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                  border: 'none',
                  color: '#000',
                  borderRadius: 6,
                  padding: '7px 12px',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(234, 179, 8, 0.4)',
                }}
              >
                + Añadir Planta ({newFloorCost}€)
              </button>
            </div>

            {/* Pila de pisos estilo Sims */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: 4,
                maxHeight: 130,
                overflowY: 'auto',
                background: 'rgba(2, 6, 23, 0.6)',
                padding: 6,
                borderRadius: 6,
              }}
            >
              {currentFloors.length > 0 ? (
                currentFloors.map((fl) => (
                  <div
                    key={fl.floorNumber}
                    onClick={() => setSelectedFloorForModule(fl.floorNumber)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 8px',
                      background: selectedFloorForModule === fl.floorNumber ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                      border: selectedFloorForModule === fl.floorNumber ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 4,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                      🏢 Planta {fl.floorNumber}
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      {fl.modules?.length || 0}/3 módulos equipados
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', padding: 4 }}>
                  Nivel base estándar (añade plantas para personalizar piso a piso)
                </div>
              )}
            </div>
          </div>

          {/* 2. Selector de Fachada y Estilo Arquitectónico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
              🎨 Estilo y Material de Fachada
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {STYLES.map(s => {
                const isCurrent = currentStyle === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onChangeStyle && onChangeStyle(s.id)}
                    style={{
                      background: isCurrent ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      border: isCurrent ? `2px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: '8px 6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{s.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? s.color : '#f8fafc' }}>
                        {s.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Módulos Industriales y Comerciales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#4ade80', textTransform: 'uppercase' }}>
              ⚙️ Instalar Módulo en Planta {selectedFloorForModule}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {MODULE_OPTIONS.map(m => (
                <button
                  key={m.id}
                  onClick={() =>
                    onInstallFloorModule &&
                    onInstallFloorModule(selectedFloorForModule, {
                      id: `${m.id}-${Date.now()}`,
                      name: m.name,
                      type: m.type,
                      efficiencyBonus: m.bonus,
                    })
                  }
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(74, 222, 128, 0.2)',
                    borderRadius: 6,
                    padding: '8px 6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{m.icon}</span>
                    <span style={{ fontSize: 9, color: '#facc15', fontWeight: 800 }}>{m.cost}€</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 9, color: '#4ade80' }}>+{m.bonus} €/mes</div>
                </button>
              ))}
            </div>
          </div>

          {/* Garantía de persistencia MMO */}
          <div
            style={{
              background: 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              borderRadius: 6,
              padding: 8,
              fontSize: 10,
              color: '#7dd3fc',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>💾</span>
            <span>
              <strong>Persistencia Activa:</strong> Construcción sincronizada en PostgreSQL y visible para todos los jugadores del MMO en tiempo real.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
