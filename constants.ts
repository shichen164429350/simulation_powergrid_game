import { PlantType, PlantData, ResearchTech, TechId } from './types';

export const GRID_SIZE = 15;
export const INITIAL_BUDGET = 5000;

// Build Costs
export const TRANSMISSION_LINE_COST = 50;
export const DISTRIBUTION_LINE_COST = 20;
export const BULLDOZE_COST = 25;
export const SUBSTATION_COST = 300;
export const BATTERY_BANK_COST = 400;

// Upgrade Costs
export const TRANSMISSION_UPGRADE_COST = 250;
export const PLANT_UPGRADE_COST_MULTIPLIER = 1.8;
export const PLANT_UPGRADE_OUTPUT_MULTIPLIER = 1.5;

// Game Mechanics
export const DAY_DURATION_MS = 10000;
export const INCOME_PER_MW = 1;
export const GRID_STABILITY_BONUS = 0.15; // 15% bonus income for stable grids
export const GRID_STABILITY_THRESHOLD = 0.2; // Supply must be within 20% of demand for bonus
export const CITY_GROWTH_CHANCE = 0.1; // 10% chance per day for a city to grow
export const CITY_GROWTH_AMOUNT = 10; // MW

export const CITY_NAMES = [
  'Aurora', 'Beacon', 'Cascade', 'Diamond', 'Emerald', 'Falcon', 'Garnet', 'Horizon', 'Ivory', 'Jade', 'Krypton', 'Lagoon', 'Maple', 'Nova', 'Onyx', 'Pearl', 'Quartz', 'Ruby', 'Sapphire', 'Topaz', 'Utopia', 'Valor', 'Willow', 'Xenon', 'Yarrow', 'Zephyr'
];

export const PLANT_SPECS: Record<PlantType, Omit<PlantData, 'level' | 'baseOutput'>> = {
  [PlantType.COAL]: { type: PlantType.COAL, output: 100, cost: 500, maintenance: 20 },
  [PlantType.SOLAR]: { type: PlantType.SOLAR, output: 50, cost: 350, maintenance: 10 },
  [PlantType.WIND]: { type: PlantType.WIND, output: 60, cost: 400, maintenance: 15 },
  [PlantType.NUCLEAR]: { type: PlantType.NUCLEAR, output: 500, cost: 2000, maintenance: 100 },
};

export const SUBSTATION_MAINTENANCE = 15;
export const BATTERY_SPECS = {
    capacity: 200, // MWh
    maxChargeRate: 50, // MW
    maxDischargeRate: 50, // MW
    maintenance: 10,
};

// Research & Development
export const RESEARCH_COST_PER_POINT = 100;
export const TECH_TREE_DATA: Record<TechId, Omit<ResearchTech, 'unlocked'>> = {
    'UNLOCK_WIND': { id: 'UNLOCK_WIND', name: 'Advanced Turbines', description: 'Unlocks Wind Turbines for construction.', cost: 10, dependencies: [] },
    'IMPROVE_SOLAR': { id: 'IMPROVE_SOLAR', name: 'Improved Solar Panels', description: 'Increases base output of all Solar Plants by 20%.', cost: 25, dependencies: [] },
    'IMPROVE_BATTERY': { id: 'IMPROVE_BATTERY', name: 'High-Capacity Batteries', description: 'Increases capacity of all Battery Banks by 50%.', cost: 20, dependencies: [] },
    'GRID_OPTIMIZATION': { id: 'GRID_OPTIMIZATION', name: 'Grid Optimization', description: 'Reduces all maintenance costs by 10%.', cost: 40, dependencies: ['IMPROVE_SOLAR', 'IMPROVE_BATTERY'] },
}

// Weather Effects
export const WEATHER_MULTIPLIERS: Record<string, { wind: number, damageChance: number }> = {
    'CALM': { wind: 0.25, damageChance: 0 },
    'BREEZY': { wind: 1.0, damageChance: 0 },
    'WINDY': { wind: 1.5, damageChance: 0.05 }, // 5% chance to damage a few lines
};