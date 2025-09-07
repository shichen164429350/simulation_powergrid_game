export enum CellType {
  EMPTY = 'EMPTY',
  CITY = 'CITY',
  PLANT = 'PLANT',
  TRANSMISSION = 'TRANSMISSION',
  SUBSTATION = 'SUBSTATION',
  BATTERY = 'BATTERY',
  DISTRIBUTION = 'DISTRIBUTION',
}

export enum PlantType {
  COAL = 'COAL',
  SOLAR = 'SOLAR',
  NUCLEAR = 'NUCLEAR',
  WIND = 'WIND',
}

export type Tool = 'PLANT' | 'TRANSMISSION' | 'INFO' | 'BULLDOZE' | 'SUBSTATION' | 'BATTERY' | 'DISTRIBUTION';
export type Weather = 'CALM' | 'BREEZY' | 'WINDY';

export type TechId = 'UNLOCK_WIND' | 'IMPROVE_SOLAR' | 'IMPROVE_BATTERY' | 'GRID_OPTIMIZATION';

export interface ResearchTech {
    id: TechId;
    name: string;
    description: string;
    cost: number; // Research Points
    unlocked: boolean;
    dependencies: TechId[];
}

export interface PlantData {
  type: PlantType;
  output: number;
  baseOutput: number;
  cost: number;
  maintenance: number;
  level: number;
}

export interface CityData {
  demand: number;
  baseDemand: number;
  isPowered: boolean;
  name: string;
}

export interface TransmissionData {
  isStormProof: boolean;
}

export interface SubstationData {
  maintenance: number;
}

export interface BatteryData {
  capacity: number; // MWh
  charge: number; // MWh
  maxChargeRate: number; // MW
  maxDischargeRate: number; // MW
  maintenance: number;
}

export interface GridCell {
  type: CellType;
  data: PlantData | CityData | TransmissionData | SubstationData | BatteryData | null;
  connections: { [key: string]: boolean };
  isDamaged?: boolean;
}

export interface GameEvent {
    message: string;
    duration: number;
    apply: (gs: GameState) => GameState;
    revert: (gs: GameState) => GameState;
}

export interface GameState {
  grid: GridCell[][];
  budget: number;
  researchPoints: number;
  techTree: Record<TechId, ResearchTech>;
  totalDemand: number;
  productionSupply: number; // Raw output from plants
  effectiveSupply: number; // Production + battery discharge
  poweredDemand: number;
  gameStatus: 'MENU' | 'PLAYING' | 'WON' | 'LOST';
  message: string;
  day: number;
  timeOfDay: 'DAY' | 'NIGHT';
  weather: Weather;
  activeEvent: { event: GameEvent, remaining: number } | null;
  eventLog: string[];
  dailyIncome: number;
  dailyMaintenance: number;
  gridStabilityBonus: number;
  totalBatteryCapacity: number;
  totalBatteryCharge: number;
}