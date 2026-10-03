import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, MachineInstance } from '@mmo/shared';

const backendUrl = import.meta.env.PROD 
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001';
const socket: Socket = io(backendUrl);

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

  const handleSell = () => {
    socket.emit('sellCoal');
  };

  if (!connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e2f', color: '#fff' }}>
        <h2>Conectando al Servidor del MMO...</h2>
      </div>
    );
  }

  const coalSlot = machine?.inventory.slots.find(s => s.itemId === 'coal_ore');
  const coalAmount = coalSlot?.quantity || 0;

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#1e1e2f', color: '#fff', minHeight: '100vh' }}>
      <h1>🌍 MMO Industrial - Vertical Slice</h1>
      
      {player && (
        <div style={{ backgroundColor: '#2a2a40', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Corporación: {player.username}</h2>
            <p style={{ fontSize: '24px', margin: '10px 0', color: '#f1c40f' }}>💰 {player.money} €</p>
          </div>
          <button 
            onClick={handleSell}
            disabled={coalAmount === 0}
            style={{ 
              padding: '15px 30px', 
              fontSize: '18px', 
              backgroundColor: coalAmount > 0 ? '#3498db' : '#555', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: coalAmount > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            Vender Carbón (+{coalAmount * 5}€)
          </button>
        </div>
      )}
      
      <div style={{ backgroundColor: '#2a2a40', padding: '20px', borderRadius: '8px' }}>
        <h2>Vista de Parcela (God View)</h2>
        <p>Esta mina produce 1 de carbón cada 5 segundos incluso si cierras la pestaña.</p>
        
        <div style={{ 
          width: '500px', 
          height: '400px', 
          backgroundColor: '#27ae60', 
          position: 'relative',
          border: '4px solid #2ecc71',
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          
          {machine && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120px',
              height: '120px',
              backgroundColor: '#2c3e50',
              border: `2px solid ${machine.status === 'full' ? '#e74c3c' : '#34495e'}`,
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '30px' }}>🏭</span>
              <br />
              Mina de Carbón
              <br />
              <div style={{ marginTop: '10px', padding: '5px', backgroundColor: '#000', borderRadius: '4px' }}>
                Inventario: {coalAmount} / {machine.inventory.maxVolume}
              </div>
              {machine.status === 'full' && (
                <div style={{ color: '#e74c3c', fontSize: '10px', marginTop: '5px', fontWeight: 'bold' }}>
                  ALMACÉN LLENO
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
