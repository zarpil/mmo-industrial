// ==========================================
// CORE DOMAIN TYPES FOR THE MMO
// ==========================================

export type EntityId = string;

// ------------------------------------------
// 1. PLAYER
// ------------------------------------------
export interface Player {
  id: EntityId;
  username: string;
  money: number;
  createdAt: Date;
}

// ------------------------------------------
// 2. MAP & REAL WORLD
// ------------------------------------------
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface Parcel {
  id: EntityId;
  centerCoordinates: GeoCoordinates;
  polygon: GeoCoordinates[]; // Boundary based on OSM
  type: "urban" | "rural" | "industrial" | "resource";
  ownerId: EntityId | null; // null = owned by the system
  areaSqm: number;
}

// ------------------------------------------
// 3. DATA-DRIVEN DEFINITIONS (Catalog)
// ------------------------------------------
// These represent the "blueprints" of the game.

export interface ItemData {
  id: string; // e.g. "iron_ore", "coal"
  name: string;
  category: "resource" | "product" | "component";
  volume: number; // Physical size (important for storage limits)
}

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

export interface MachineData {
  id: string; // e.g. "iron_extractor"
  name: string;
  baseProductionTimeMs: number;
  outputItemId: string; // What it produces (for the vertical slice)
  outputAmount: number;
  inputSlots?: InventorySlot[]; // What it consumes (if applicable)
  maxInventoryVolume: number; // Max storage before it stops producing
}

// ------------------------------------------
// 4. IN-GAME INSTANCES
// ------------------------------------------
// These represent the actual objects in the world.

export interface Inventory {
  maxVolume: number;
  slots: InventorySlot[];
}

export interface MachineInstance {
  id: EntityId;
  machineDataId: string;
  parcelId: EntityId;
  ownerId: EntityId;
  inventory: Inventory;
  status: "idle" | "producing" | "full" | "no_resources";
  lastTickProcessedAt: Date; // CRITICAL for offline catch-up simulation
}

// ------------------------------------------
// 5. REAL ESTATE & URBAN PARCELS (CapitalRift style)
// ------------------------------------------
export interface RealEstateProperty {
  id: EntityId;
  name: string;
  address?: string;
  coords: GeoCoordinates;
  polygon?: GeoCoordinates[];
  areaSqm: number;
  heightMeters: number;
  levels?: number;
  buildingType: string; // "commercial" | "office" | "residential" | "industrial" | "demolished" | "hq"
  ownerId: EntityId | null; // null = disponible para adquisición
  ownerName?: string;
  price: number;
  monthlyRevenue: number;
  status: "available" | "owned" | "demolished" | "under_construction" | "facility_active";
  facilityType?: string | null; // "coal_mine" | "iron_mine" | "smelter" | "power_substation" | "logistics_hub" | "tech_hq"
  tier?: number;
  customNotes?: string;
  createdAt?: Date;
}

