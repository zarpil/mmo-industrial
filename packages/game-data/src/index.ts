import { ItemData, MachineData } from '@mmo/shared';

// Catálogo central de Ítems
export const ITEMS: Record<string, ItemData> = {
  "coal_ore": {
    id: "coal_ore",
    name: "Mineral de Carbón",
    category: "resource",
    volume: 1
  }
};

// Catálogo central de Máquinas
export const MACHINES: Record<string, MachineData> = {
  "coal_extractor": {
    id: "coal_extractor",
    name: "Mina de Carbón",
    baseProductionTimeMs: 5000, // Produce 1 de carbón cada 5 segundos
    outputItemId: "coal_ore",
    outputAmount: 1,
    maxInventoryVolume: 100 // Límite máximo antes de parar la producción
  }
};
