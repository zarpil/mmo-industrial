import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Player, MachineInstance } from '@mmo/shared';
import { simulateMachineCatchup } from './simulation';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// ==========================================
// ESTADO EN MEMORIA (Vertical Slice Temporal)
// (Cuando tengas Docker, cambiaremos esto por la Base de Datos PostgreSQL)
// ==========================================
let mockPlayer: Player = {
  id: "player-1",
  username: "Capitalista_01",
  money: 0,
  createdAt: new Date()
};

let mockMachine: MachineInstance = {
  id: "machine-1",
  machineDataId: "coal_extractor", // Lee del paquete game-data
  parcelId: "parcel-1",
  ownerId: "player-1",
  inventory: { maxVolume: 100, slots: [] },
  status: "producing",
  lastTickProcessedAt: new Date()
};

// ==========================================
// TICK ENGINE (Bucle del servidor)
// ==========================================
setInterval(() => {
  const previousInventory = JSON.stringify(mockMachine.inventory);
  
  // Procesamos la simulación
  mockMachine = simulateMachineCatchup(mockMachine, new Date());
  
  // Si algo ha cambiado, notificamos a los clientes conectados
  if (JSON.stringify(mockMachine.inventory) !== previousInventory) {
    console.log(`🏭 Producción completada. Inventario:`, mockMachine.inventory.slots);
    io.emit('gameState', { player: mockPlayer, machine: mockMachine });
  }
}, 5000); // Revisar cada 5 segundos

// ==========================================
// SOCKETS
// ==========================================
io.on('connection', (socket) => {
  console.log(`🔌 Jugador conectado: ${socket.id}`);
  
  // Al conectar, forzamos un catch-up para darle lo que generó offline
  mockMachine = simulateMachineCatchup(mockMachine, new Date());
  socket.emit('gameState', { player: mockPlayer, machine: mockMachine });

  // Acción: Vender
  socket.on('sellCoal', () => {
    const coalSlot = mockMachine.inventory.slots.find(s => s.itemId === 'coal_ore');
    if (coalSlot && coalSlot.quantity > 0) {
      const cantidad = coalSlot.quantity;
      const ganancias = cantidad * 5; // 5€ por cada carbón
      
      mockPlayer.money += ganancias;
      coalSlot.quantity = 0;
      mockMachine.status = "producing";
      mockMachine.lastTickProcessedAt = new Date(); // Reinicia el reloj para que siga produciendo sin fallos temporales
      
      console.log(`💰 Venta: +${ganancias}€`);
      io.emit('gameState', { player: mockPlayer, machine: mockMachine });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 MMO Server (Vertical Slice) corriendo en puerto ${PORT}`);
});
