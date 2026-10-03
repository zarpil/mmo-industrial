import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { Player, MachineInstance } from '@mmo/shared';
import { simulateMachineCatchup } from './simulation';
import { initDb, pool, isDbConnected } from './db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Variables globales para el Vertical Slice 
let globalPlayer: Player = {
  id: 'player-1',
  username: 'Capitalista_01',
  money: 500,
  createdAt: new Date(),
};
let globalMachine: MachineInstance = {
  id: 'machine-1',
  machineDataId: 'coal_extractor',
  parcelId: 'parcel-1',
  ownerId: 'player-1',
  inventory: { maxVolume: 100, slots: [{ itemId: 'coal_ore', quantity: 15 }] },
  status: 'producing',
  lastTickProcessedAt: new Date(),
};

// Cargar o crear el estado inicial desde PostgreSQL
async function loadStateFromDb() {
  if (!isDbConnected) {
    console.log('📦 Servidor usando estado en memoria para desarrollo local rápido');
    return;
  }
  const client = await pool.connect();
  try {
    // 1. Jugador
    const playerRes = await client.query('SELECT * FROM players WHERE id = $1', ['player-1']);
    if (playerRes.rows.length === 0) {
      await client.query('INSERT INTO players (id, username, money) VALUES ($1, $2, $3)', ['player-1', 'Capitalista_01', 500]);
      globalPlayer = { id: 'player-1', username: 'Capitalista_01', money: 500, createdAt: new Date() };
    } else {
      const row = playerRes.rows[0];
      globalPlayer = { id: row.id, username: row.username, money: parseFloat(row.money), createdAt: row.created_at };
    }

    // 2. Parcela
    const parcelRes = await client.query('SELECT * FROM parcels WHERE id = $1', ['parcel-1']);
    if (parcelRes.rows.length === 0) {
      await client.query('INSERT INTO parcels (id, owner_id, type, area_sqm) VALUES ($1, $2, $3, $4)', ['parcel-1', 'player-1', 'industrial', 1000]);
    }

    // 3. Máquina
    const machineRes = await client.query('SELECT * FROM machine_instances WHERE id = $1', ['machine-1']);
    if (machineRes.rows.length === 0) {
      const defaultInventory = { maxVolume: 100, slots: [] };
      await client.query(
        'INSERT INTO machine_instances (id, parcel_id, owner_id, machine_data_id, inventory, status, last_tick_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['machine-1', 'parcel-1', 'player-1', 'coal_extractor', defaultInventory, 'producing', new Date()]
      );
      globalMachine = {
        id: 'machine-1', machineDataId: 'coal_extractor', parcelId: 'parcel-1', ownerId: 'player-1',
        inventory: defaultInventory, status: 'producing', lastTickProcessedAt: new Date()
      };
    } else {
      const row = machineRes.rows[0];
      globalMachine = {
        id: row.id, machineDataId: row.machine_data_id, parcelId: row.parcel_id, ownerId: row.owner_id,
        inventory: row.inventory, status: row.status, lastTickProcessedAt: row.last_tick_at
      };
    }
    console.log('📦 Estado cargado desde BD:', { money: globalPlayer.money, items: globalMachine.inventory.slots });
  } catch (err: any) {
    console.warn('⚠️ Error al leer de BD, continuando con estado en memoria:', err.message);
  } finally {
    client.release();
  }
}

// Guardar el estado a PostgreSQL
async function saveStateToDb() {
  if (!isDbConnected || !globalMachine || !globalPlayer) return;
  try {
    const client = await pool.connect();
    try {
      await client.query('UPDATE players SET money = $1 WHERE id = $2', [globalPlayer.money, globalPlayer.id]);
      await client.query(
        'UPDATE machine_instances SET inventory = $1, status = $2, last_tick_at = $3 WHERE id = $4',
        [globalMachine.inventory, globalMachine.status, globalMachine.lastTickProcessedAt, globalMachine.id]
      );
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('⚠️ Error al guardar en BD:', err.message);
  }
}

// Bucle del servidor (Tick)
setInterval(async () => {
  if (!globalMachine) return;
  const previousInventory = JSON.stringify(globalMachine.inventory);
  
  globalMachine = simulateMachineCatchup(globalMachine, new Date());
  
  if (JSON.stringify(globalMachine.inventory) !== previousInventory) {
    await saveStateToDb(); // Persistencia!
    io.emit('gameState', { player: globalPlayer, machine: globalMachine });
  }
}, 5000);

// Conexiones de clientes
io.on('connection', async (socket) => {
  console.log(`🔌 Jugador conectado: ${socket.id}`);
  
  if (!globalMachine || !globalPlayer) {
    await loadStateFromDb();
  }
  
  if (globalMachine) {
    // Forzar un catchup para el tiempo en el que nadie estuvo conectado
    globalMachine = simulateMachineCatchup(globalMachine, new Date());
    await saveStateToDb();
    socket.emit('gameState', { player: globalPlayer, machine: globalMachine });
  }

  socket.on('sellCoal', async () => {
    if (!globalMachine || !globalPlayer) return;
    const coalSlot = globalMachine.inventory.slots.find(s => s.itemId === 'coal_ore');
    if (coalSlot && coalSlot.quantity > 0) {
      const cantidad = coalSlot.quantity;
      const ganancias = cantidad * 5; 
      
      globalPlayer.money += ganancias;
      coalSlot.quantity = 0;
      globalMachine.status = "producing";
      globalMachine.lastTickProcessedAt = new Date();
      
      console.log(`💰 Venta (Persistida): +${ganancias}€`);
      await saveStateToDb(); // Persistencia!
      io.emit('gameState', { player: globalPlayer, machine: globalMachine });
    }
  });
});

async function start() {
  await initDb();
  await loadStateFromDb();
  
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 MMO Server conectado a PostgreSQL corriendo en puerto ${PORT}`);
  });
}

start();
