
export interface BuildableBlueprint {
  id: string;
  name: string;
  icon: string;
  cost: number;
  energyReqMW: number;
  outputName: string;
  outputRateSec: number;
  desc: string;
}

export interface Commodity {
  id: string;
  name: string;
  unit: string;
  price: number;
  change: number;
  icon: string;
}

export interface FacilityOption {
  id: string;
  name: string;
  icon: string;
  cost: number;
  revenueBonus: number;
  desc: string;
}

export interface GlobalHub {
  id: string;
  name: string;
  coords: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface HoveredCadastralInfo {
  x: number;
  y: number;
  name: string;
  isRealName: boolean;
  type: string;
  levels: number;
  height: number;
  area: number;
  price: number;
  isParcel: boolean;
  status: 'available' | 'owned' | 'facility' | 'other';
  ownerName?: string;
}
