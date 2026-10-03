import React from 'react';

interface Props {
  isRotationUnlocked: boolean;
  currentZoomLevel: number;
  onResetOrientation: () => void;
}

export const RotationStatusChip: React.FC<Props> = ({
  isRotationUnlocked,
  currentZoomLevel,
  onResetOrientation,
}) => {
  return (
    <div
      onClick={onResetOrientation}
      title={isRotationUnlocked ? 'Click para enderezar el mapa al Norte' : 'Haz zoom para habilitar rotación y 3D'}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 64,
        zIndex: 90,
        pointerEvents: 'auto',
        background: 'rgba(10, 18, 32, 0.92)',
        backdropFilter: 'blur(16px)',
        border: isRotationUnlocked ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(245, 158, 11, 0.5)',
        borderRadius: 20,
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        color: isRotationUnlocked ? '#38bdf8' : '#fbbf24',
        boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ fontSize: 13 }}>{isRotationUnlocked ? '🎮' : '🧭'}</span>
      <span>
        {isRotationUnlocked
          ? 'Rotación 3D Libre (Click derecho/Ctrl para girar)'
          : 'Orientación Norte Fija (Haz Zoom para perspectiva 3D)'}
      </span>
      <span
        style={{
          fontSize: 10,
          background: 'rgba(255, 255, 255, 0.08)',
          padding: '2px 6px',
          borderRadius: 4,
          fontFamily: 'monospace',
          color: '#94a3b8',
        }}
      >
        Z:{currentZoomLevel}
      </span>
    </div>
  );
};
