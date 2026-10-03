import React from 'react';
import type { Player, RealEstateProperty } from '@mmo/shared';
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
}) => {
  if (!selectedProperty) return null;

  const isSelectedOwnedByPlayer = selectedProperty.ownerId === player?.id;

  return (
    <div
      className="glass-panel glass-panel-glow"
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        width: 360,
        padding: 20,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxHeight: 'calc(100vh - 120px)',
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
              <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc', fontWeight: 800 }}>
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

      {/* Métricas y Ficha Técnica Catastral */}
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
          <span style={{ color: '#94a3b8' }}>Altura de Fachada:</span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>
            {selectedProperty.heightMeters > 0 ? `${selectedProperty.heightMeters} metros` : 'Rasante de Suelo'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Número de Plantas:</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
            {selectedProperty.levels && selectedProperty.levels > 0 ? `${selectedProperty.levels} plantas sobre rasante` : 'Sin Edificación'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Calificación de Uso:</span>
          <span style={{ color: '#fdba74', fontWeight: 700 }}>
            {selectedProperty.buildingType === 'office'
              ? 'Oficinas y Terciario'
              : selectedProperty.buildingType === 'commercial'
              ? 'Comercial e Industrial'
              : selectedProperty.buildingType === 'demolished'
              ? 'Solar Limpio / Sin Edificar'
              : 'Uso Mixto'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Rendimiento Pasivo:</span>
          <span style={{ color: '#4ade80', fontWeight: 800 }}>
            +{selectedProperty.monthlyRevenue} € / mes
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Coordenadas GPS:</span>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
            {selectedProperty.coords.lat.toFixed(5)}, {selectedProperty.coords.lng.toFixed(5)}
          </span>
        </div>

        {/* Ficha Geológica si es cantera / mina a cielo abierto deformable */}
        {((selectedProperty.excavationDepthMeters || 0) > 0 || selectedProperty.facilityType?.includes('mine')) && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(69, 26, 3, 0.5), rgba(24, 24, 27, 0.8))',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 10,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                ⛏️ Cota Cantera a Cielo Abierto
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#facc15', fontFamily: 'Chakra Petch' }}>
                -{selectedProperty.excavationDepthMeters || 8} metros
              </span>
            </div>

            <div style={{ width: '100%', height: 8, background: '#090d16', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, ((selectedProperty.excavationDepthMeters || 8) / 75) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f59e0b, #ea580c, #dc2626)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
              <span>
                Fase:{' '}
                {(selectedProperty.excavationDepthMeters || 8) < 15
                  ? 'Desmonte Inicial de Tierras'
                  : (selectedProperty.excavationDepthMeters || 8) < 30
                  ? 'Bancos Escalonados'
                  : (selectedProperty.excavationDepthMeters || 8) < 55
                  ? 'Cráter Minero Abierto'
                  : 'Pozo Abisal de Roca Madre'}
              </span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>
                +{selectedProperty.totalMinedTons || 10} ton
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ACCIONES DISPONIBLES */}

      {/* 1. Propiedad de Otro Jugador */}
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
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 22 }}>🔒</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
              Propiedad de {selectedProperty.ownerName || 'Otro Magnate MMO'}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>
              Esta finca o cantera minera ya está registrada en el catastro territorial.
            </div>
          </div>
        </div>
      )}

      {/* 2. Disponible para Compra en el Catastro */}
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
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)',
              letterSpacing: 0.5,
            }}
          >
            🛒 Comprar {selectedProperty.heightMeters === 0 ? 'Parcela' : 'Inmueble'}
          </button>
        </div>
      )}

      {/* 3. Propiedad del Jugador (Demoler, Abrir Cantera o Construir) */}
      {isSelectedOwnedByPlayer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {/* Botón de Demolición si el edificio aún existe con altura */}
          {selectedProperty.status !== 'demolished' && selectedProperty.heightMeters > 0 && (
            <div
              style={{
                background: 'rgba(234, 88, 12, 0.1)',
                border: '1px solid rgba(234, 88, 12, 0.3)',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fdba74' }}>Derribo y Demolición</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Demuele la estructura para despejar el solar y excavar</div>
              </div>

              <button
                onClick={onDemolishProperty}
                style={{
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🔨 Demoler (150€)
              </button>
            </div>
          )}

          {/* Indicador de Solar Despejado si no hay edificio */}
          {(selectedProperty.status === 'demolished' || selectedProperty.heightMeters === 0) && (
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>🌿</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#86efac' }}>Solar Despejado / Suelo Rústico</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  Terreno listo para excavación de canteras a cielo abierto o factorías
                </div>
              </div>
            </div>
          )}

          {/* Opciones de Construcción y Excavación sobre el solar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1 }}>
              🏗️{' '}
              {selectedProperty.status === 'demolished' || selectedProperty.heightMeters === 0
                ? 'Edificar en el Solar / Abrir Cantera'
                : 'Reconvertir Instalación'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FACILITY_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => onConstructFacility(f)}
                  title={f.desc}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: 8,
                    padding: '10px 8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                    <span style={{ fontSize: 10, color: '#facc15', fontWeight: 800, fontFamily: 'Chakra Petch' }}>
                      {f.cost}€
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {f.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 600 }}>
                    +{f.revenueBonus} €/mes
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
