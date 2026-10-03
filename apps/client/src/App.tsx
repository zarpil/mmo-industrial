import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Player, MachineInstance } from '@mmo/shared';

// Arreglo para que los iconos de Leaflet carguen bien en Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// URL del WebSocket que funciona en Local y VPS
const backendUrl = import.meta.env.PROD 
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

// Componente invisible que escucha clicks en el mapa para posicionar cosas
function LocationSelector({ onLocationSelected }: { onLocationSelected: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng);
    },
  });
  return null;
}

function App() {
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [machine, setMachine] = useState<MachineInstance | null>(null);

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
  
  // Por ahora la máquina del prototipo la plantamos en el centro de España
  const machineCoords: [number, number] = [40.4168, -3.7038]; 

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* UI Overlay flotante */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, pointerEvents: 'none' }}>
        <h1 style={{ color: 'white', textShadow: '2px 2px 4px #000', margin: '0 0 20px 0' }}>🌍 MMO Industrial</h1>
        
        {player && (
          <div style={{ backgroundColor: 'rgba(42, 42, 64, 0.95)', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.5)', pointerEvents: 'auto', backdropFilter: 'blur(5px)' }}>
            <h2 style={{ color: 'white', margin: '0 0 10px 0' }}>Corporación: {player.username}</h2>
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
                transition: 'background-color 0.2s'
              }}
            >
              Vender Carbón (+{coalAmount * 5}€)
            </button>
          </div>
        )}
      </div>

      {/* El Mapa del Mundo */}
      <MapContainer 
        center={[20.0, 0.0]} // Empieza viendo todo el mapamundi
        zoom={3} 
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenZooming={false}
          updateWhenIdle={true}
        />
        
        <LocationSelector onLocationSelected={(latlng) => console.log('Coordenadas clickeadas:', latlng)} />

        {machine && (
          <Marker position={machineCoords}>
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>🏭 Mina de Carbón</h3>
                <div style={{ backgroundColor: '#f1f2f6', padding: '10px', borderRadius: '5px', marginBottom: '5px' }}>
                  <strong>Inventario:</strong> {coalAmount} / {machine.inventory.maxVolume}
                </div>
                {machine.status === 'full' && (
                  <strong style={{ color: '#e74c3c', display: 'block', marginTop: '5px' }}>¡ALMACÉN LLENO!</strong>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default App;
