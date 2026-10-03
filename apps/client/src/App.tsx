import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Player, MachineInstance } from '@mmo/shared';

const backendUrl = import.meta.env.PROD 
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

function App() {
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);
  
  // Estado de la cámara 3D
  const [viewState, setViewState] = useState({
    longitude: -3.7038,
    latitude: 40.4168,
    zoom: 16,
    pitch: 60, // Inclinación de la cámara (3D)
    bearing: -20 // Rotación (Click derecho)
  });

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('gameState', (data: { player: Player, machine: MachineInstance }) => {
      setPlayer(data.player);
      setMachine(data.machine);
    });
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('gameState');
    };
  }, []);

  const handleSell = () => socket.emit('sellCoal');

  if (!connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e2f', color: '#fff' }}>
        <h2>Conectando al Servidor del MMO...</h2>
      </div>
    );
  }

  const coalAmount = machine?.inventory.slots.find(s => s.itemId === 'coal_ore')?.quantity || 0;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      
      {/* UI Overlay flotante */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, pointerEvents: 'none' }}>
        <h1 style={{ color: 'white', textShadow: '2px 2px 4px #000', margin: '0 0 20px 0' }}>🌍 MMO Industrial</h1>
        
        {player && (
          <div style={{ backgroundColor: 'rgba(20, 20, 30, 0.85)', border: '1px solid #3a3a5a', padding: '20px', borderRadius: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)', pointerEvents: 'auto', backdropFilter: 'blur(10px)' }}>
            <h2 style={{ color: 'white', margin: '0 0 10px 0' }}>{player.username}</h2>
            <p style={{ fontSize: '28px', margin: '10px 0', color: '#f1c40f', fontWeight: 'bold' }}>💰 {player.money} €</p>
            
            <button 
              onClick={handleSell}
              disabled={coalAmount === 0}
              style={{ 
                padding: '12px 20px', 
                fontSize: '16px', 
                backgroundColor: coalAmount > 0 ? '#3498db' : '#555', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                cursor: coalAmount > 0 ? 'pointer' : 'not-allowed',
                width: '100%',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              Vender Carbón (+{coalAmount * 5}€)
            </button>
            <p style={{ color: '#888', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
              Click derecho + arrastrar para rotar en 3D
            </p>
          </div>
        )}
      </div>

      {/* Motor WebGL 3D con MapLibre */}
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        maxPitch={85}
      >
        <NavigationControl position="bottom-right" />

        {machine && (
          <Marker 
            longitude={-3.7038} 
            latitude={40.4168} 
            anchor="bottom"
          >
            {/* Visualización de la fábrica en el mapa 3D */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: machine.status === 'full' ? 'rgba(231, 76, 60, 0.9)' : 'rgba(41, 128, 185, 0.9)',
              border: '2px solid #fff',
              borderRadius: '8px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
              cursor: 'pointer',
              fontWeight: 'bold',
              transform: 'perspective(500px) rotateX(10deg)' // Un toque isométrico a la UI
            }}>
              <span style={{ fontSize: '24px' }}>🏭</span>
              <span>{coalAmount} / 100</span>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}

export default App;
