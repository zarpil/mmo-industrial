import { MachineInstance } from '@mmo/shared';
import { MACHINES } from '@mmo/game-data';

/**
 * Motor de Simulación Catch-up ("Offline Progress")
 * Calcula cuántos recursos ha generado la fábrica basándose en el tiempo transcurrido,
 * sin necesidad de haber estado simulando frame a frame.
 */
export function simulateMachineCatchup(machine: MachineInstance, currentTime: Date): MachineInstance {
  const data = MACHINES[machine.machineDataId];
  if (!data) return machine;

  const msPassed = currentTime.getTime() - new Date(machine.lastTickProcessedAt).getTime();
  
  // Si no ha pasado suficiente tiempo ni para un ciclo, no hacemos nada
  if (msPassed < data.baseProductionTimeMs) {
    return machine; 
  }

  const cycles = Math.floor(msPassed / data.baseProductionTimeMs);
  const producedAmount = cycles * data.outputAmount;

  // Clonamos para no mutar directamente (buenas prácticas)
  const inventory = { ...machine.inventory };
  const slotIndex = inventory.slots.findIndex(s => s.itemId === data.outputItemId);
  let currentQty = 0;
  
  if (slotIndex !== -1) {
    currentQty = inventory.slots[slotIndex].quantity;
  }

  // Respetamos los cuellos de botella físicos (límite de almacén)
  const maxPossibleAdd = data.maxInventoryVolume - currentQty;
  const actualAdd = Math.min(producedAmount, maxPossibleAdd);

  if (actualAdd > 0) {
    if (slotIndex !== -1) {
      inventory.slots[slotIndex].quantity += actualAdd;
    } else {
      inventory.slots.push({ itemId: data.outputItemId, quantity: actualAdd });
    }
  }

  // Avanzamos el "reloj" de la máquina solo la cantidad exacta de ciclos procesados
  const newTime = new Date(new Date(machine.lastTickProcessedAt).getTime() + (cycles * data.baseProductionTimeMs));

  return {
    ...machine,
    inventory,
    status: actualAdd === maxPossibleAdd ? 'full' : 'producing',
    lastTickProcessedAt: newTime
  };
}
