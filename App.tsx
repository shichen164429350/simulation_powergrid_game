import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GameState, GridCell, CellType, Tool, PlantType, CityData, PlantData, GameEvent, TransmissionData, SubstationData, BatteryData, Weather, TechId, ResearchTech } from './types';
import { GRID_SIZE, INITIAL_BUDGET, PLANT_SPECS, TRANSMISSION_LINE_COST, DISTRIBUTION_LINE_COST, CITY_NAMES, DAY_DURATION_MS, INCOME_PER_MW, BULLDOZE_COST, TRANSMISSION_UPGRADE_COST, PLANT_UPGRADE_COST_MULTIPLIER, PLANT_UPGRADE_OUTPUT_MULTIPLIER, SUBSTATION_COST, BATTERY_BANK_COST, SUBSTATION_MAINTENANCE, BATTERY_SPECS, GRID_STABILITY_BONUS, GRID_STABILITY_THRESHOLD, TECH_TREE_DATA, RESEARCH_COST_PER_POINT, WEATHER_MULTIPLIERS, CITY_GROWTH_CHANCE, CITY_GROWTH_AMOUNT } from './constants';
import PowerIcon from './components/icons/PowerIcon';
import TransmissionLineIcon from './components/icons/TransmissionIcon';
import CityIcon from './components/icons/CityIcon';
import InfoIcon from './components/icons/InfoIcon';
import BulldozeIcon from './components/icons/BulldozeIcon';
import SubstationIcon from './components/icons/SubstationIcon';
import BatteryIcon from './components/icons/BatteryIcon';
import DistributionLineIcon from './components/icons/DistributionLineIcon';
import WindIcon from './components/icons/WindIcon';
import ResearchIcon from './components/icons/ResearchIcon';

// --- HELPER FUNCTIONS ---
const createEmptyGrid = (): GridCell[][] => {
    return Array(GRID_SIZE).fill(null).map(() =>
        Array(GRID_SIZE).fill(null).map(() => ({
            type: CellType.EMPTY,
            data: null,
            connections: {}
        }))
    );
};

const deepCopyGrid = (grid: GridCell[][]): GridCell[][] => {
    return grid.map(row => row.map(cell => ({...cell, data: cell.data ? {...cell.data} : null, connections: {...cell.connections}})));
};

// --- MODAL COMPONENT ---
const GameModal: React.FC<{ title: string; message: string; onRestart: () => void }> = ({ title, message, onRestart }) => (
    <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-slate-800 rounded-lg p-8 shadow-2xl text-center border border-slate-600 max-w-sm mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-cyan-400">{title}</h2>
            <p className="text-lg mb-6 text-slate-300">{message}</p>
            <button
                onClick={onRestart}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105"
            >
                Play Again
            </button>
        </div>
    </div>
);

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [activeTool, setActiveTool] = useState<Tool>('INFO');
    const [selectedPlant, setSelectedPlant] = useState<PlantType>(PlantType.COAL);
    const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
    const [selectedCell, setSelectedCell] = useState<{ x: number, y: number} | null>(null);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'INFO' | 'RESEARCH'>('INFO');

    const gameEvents: GameEvent[] = useMemo(() => [
        {
            message: "Heatwave! City power demand increases by 50%.",
            duration: 2,
            apply: (gs) => {
                const newGrid = deepCopyGrid(gs.grid);
                newGrid.forEach(row => row.forEach(cell => {
                    if (cell.type === CellType.CITY) {
                        (cell.data as CityData).demand = Math.round((cell.data as CityData).demand * 1.5);
                    }
                }));
                return { ...gs, grid: newGrid };
            },
            revert: (gs) => {
                const newGrid = deepCopyGrid(gs.grid);
                newGrid.forEach(row => row.forEach(cell => {
                    if (cell.type === CellType.CITY) {
                        (cell.data as CityData).demand = (cell.data as CityData).baseDemand;
                    }
                }));
                return { ...gs, grid: newGrid };
            }
        },
        {
            message: "Storm! Random transmission lines have been damaged.",
            duration: 1,
            apply: (gs) => {
                const newGrid = deepCopyGrid(gs.grid);
                const lines: {x: number, y: number}[] = [];
                newGrid.forEach((row, y) => row.forEach((cell, x) => {
                    if (cell.type === CellType.TRANSMISSION && !(cell.data as TransmissionData)?.isStormProof) {
                        lines.push({x,y});
                    }
                }));

                if (lines.length > 0) {
                    const damageCount = Math.min(lines.length, Math.ceil(lines.length * 0.2));
                    for(let i = 0; i < damageCount; i++) {
                       const targetIndex = Math.floor(Math.random() * lines.length);
                       const target = lines[targetIndex];
                       if (target) {
                         newGrid[target.y][target.x].isDamaged = true;
                         lines.splice(targetIndex, 1);
                       }
                    }
                }
                return { ...gs, grid: newGrid };
            },
            revert: (gs) => gs,
        },
        {
            message: "Government Subsidy! You've received $1000.",
            duration: 1,
            apply: (gs) => ({ ...gs, budget: gs.budget + 1000 }),
            revert: (gs) => gs,
        }
    ], []);

    const recalculatePower = useCallback((currentState: GameState): GameState => {
        const newGrid = deepCopyGrid(currentState.grid);
        let productionSupply = 0;
        let totalDemand = 0;
        let dailyMaintenance = 0;
        let totalBatteryCapacity = 0;
        const plants: { x: number, y: number }[] = [];
        const substations: { x: number, y: number }[] = [];
        const cities: { x: number, y: number, data: CityData }[] = [];
        const batteries: { x: number, y: number, data: BatteryData }[] = [];

        const { techTree } = currentState;
        const solarBoost = techTree['IMPROVE_SOLAR'].unlocked ? 1.2 : 1.0;
        const batteryBoost = techTree['IMPROVE_BATTERY'].unlocked ? 1.5 : 1.0;
        const maintDiscount = techTree['GRID_OPTIMIZATION'].unlocked ? 0.9 : 1.0;

        // 1. Calculate base values and categorize components
        newGrid.forEach((row, y) => row.forEach((cell, x) => {
            switch(cell.type) {
                case CellType.PLANT:
                    const pData = cell.data as PlantData;
                    let output = pData.baseOutput;
                    if (pData.type === PlantType.SOLAR) {
                        output *= solarBoost;
                        if (currentState.timeOfDay === 'NIGHT') output = 0;
                    }
                    if (pData.type === PlantType.WIND) {
                        output *= WEATHER_MULTIPLIERS[currentState.weather].wind;
                    }
                    pData.output = Math.round(output);
                    productionSupply += pData.output;
                    dailyMaintenance += pData.maintenance;
                    plants.push({ x, y });
                    break;
                case CellType.CITY:
                    const cData = cell.data as CityData;
                    totalDemand += cData.demand;
                    cities.push({ x, y, data: cData });
                    cData.isPowered = false;
                    break;
                case CellType.BATTERY:
                    const bData = cell.data as BatteryData;
                    bData.capacity = BATTERY_SPECS.capacity * batteryBoost;
                    batteries.push({x,y, data: bData});
                    totalBatteryCapacity += bData.capacity;
                    dailyMaintenance += bData.maintenance;
                    break;
                case CellType.SUBSTATION:
                    substations.push({x,y});
                    dailyMaintenance += (cell.data as SubstationData).maintenance;
                    break;
                case CellType.TRANSMISSION:
                case CellType.DISTRIBUTION:
                    dailyMaintenance += 1;
                    break;
            }
        }));
        
        dailyMaintenance *= maintDiscount;

        // 2. Determine power surplus or deficit and handle batteries
        let energyBalance = productionSupply - totalDemand;
        let powerFromBatteries = 0;

        if (energyBalance > 0) { // Surplus: Charge batteries
            let chargeAmount = Math.min(energyBalance, batteries.reduce((sum, b) => sum + b.data.maxChargeRate, 0));
            batteries.forEach(b => {
                const bData = newGrid[b.y][b.x].data as BatteryData;
                const canStore = bData.capacity - bData.charge;
                const chargeToApply = Math.min(chargeAmount, canStore, bData.maxChargeRate);
                bData.charge += chargeToApply;
                chargeAmount -= chargeToApply;
            });
        } else if (energyBalance < 0) { // Deficit: Discharge batteries
            let deficit = -energyBalance;
            let dischargeAmount = Math.min(deficit, batteries.reduce((sum, b) => sum + b.data.maxDischargeRate, 0));
            batteries.forEach(b => {
                const bData = newGrid[b.y][b.x].data as BatteryData;
                const canGive = bData.charge;
                const dischargeToApply = Math.min(dischargeAmount, canGive, bData.maxDischargeRate);
                bData.charge -= dischargeToApply;
                powerFromBatteries += dischargeToApply;
                dischargeAmount -= dischargeToApply;
            });
        }
        
        const effectiveSupply = productionSupply + powerFromBatteries;

        // 3. Power flow simulation
        const poweredComponents = new Set<string>();
        const q = [...plants, ...batteries];
        q.forEach(p => poweredComponents.add(`${p.y},${p.x}`));

        while(q.length > 0) {
            const curr = q.shift()!;
            const cell = newGrid[curr.y][curr.x];
            if(cell.isDamaged) continue;

            ['up','down','left','right'].forEach(dir => {
                const neighborPos = {
                    x: curr.x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0),
                    y: curr.y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0)
                };
                if (cell.connections[dir] && !poweredComponents.has(`${neighborPos.y},${neighborPos.x}`)) {
                    const neighborCell = newGrid[neighborPos.y]?.[neighborPos.x];
                    if (neighborCell && !neighborCell.isDamaged) {
                        if(neighborCell.type === CellType.TRANSMISSION || neighborCell.type === CellType.SUBSTATION || neighborCell.type === CellType.BATTERY) {
                            poweredComponents.add(`${neighborPos.y},${neighborPos.x}`);
                            q.push(neighborPos);
                        }
                    }
                }
            });
        }

        const poweredSubstations = substations.filter(s => poweredComponents.has(`${s.y},${s.x}`));
        const q2 = [...poweredSubstations];

        while(q2.length > 0) {
            const curr = q2.shift()!;
            const cell = newGrid[curr.y][curr.x];
            if(cell.isDamaged) continue;

             ['up','down','left','right'].forEach(dir => {
                const neighborPos = {
                    x: curr.x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0),
                    y: curr.y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0)
                };
                if (cell.connections[dir] && !poweredComponents.has(`${neighborPos.y},${neighborPos.x}`)) {
                    const neighborCell = newGrid[neighborPos.y]?.[neighborPos.x];
                    if (neighborCell && !neighborCell.isDamaged) {
                        if(neighborCell.type === CellType.DISTRIBUTION || neighborCell.type === CellType.CITY) {
                            poweredComponents.add(`${neighborPos.y},${neighborPos.x}`);
                            q2.push(neighborPos);
                        }
                    }
                }
            });
        }

        let poweredDemand = 0;
        cities.forEach(c => {
            if(poweredComponents.has(`${c.y},${c.x}`)) {
                (newGrid[c.y][c.x].data as CityData).isPowered = true;
                poweredDemand += c.data.demand;
            }
        });

        // 4. Final calculations
        let dailyIncome = 0;
        let gridStabilityBonus = 0;
        if(effectiveSupply >= poweredDemand) {
            dailyIncome = poweredDemand * INCOME_PER_MW;
            const supplyDemandRatio = effectiveSupply / totalDemand;
            if (totalDemand > 0 && supplyDemandRatio >= 1 && supplyDemandRatio <= (1 + GRID_STABILITY_THRESHOLD)) {
                gridStabilityBonus = Math.floor(dailyIncome * GRID_STABILITY_BONUS);
                dailyIncome += gridStabilityBonus;
            }
        } else {
             newGrid.forEach(row => row.forEach(cell => {
                if(cell.type === CellType.CITY) (cell.data as CityData).isPowered = false;
            }));
            poweredDemand = 0;
        }

        const allCitiesPowered = cities.length > 0 && cities.every(c => (newGrid[c.y][c.x].data as CityData).isPowered);
        let gameStatus = currentState.gameStatus;
        let message = currentState.message;

        if (gameStatus === 'PLAYING') {
            if (allCitiesPowered) {
                gameStatus = 'WON';
                message = `Congratulations! You powered the whole grid in ${currentState.day} days!`;
            } else if (currentState.budget < 0 && (dailyIncome < dailyMaintenance * maintDiscount)) {
                gameStatus = 'LOST';
                message = 'You have gone bankrupt!';
            }
        }
        
        return {
            ...currentState,
            grid: newGrid,
            totalDemand,
            productionSupply,
            effectiveSupply,
            poweredDemand,
            dailyIncome,
            dailyMaintenance: Math.round(dailyMaintenance),
            gameStatus,
            message,
            gridStabilityBonus,
            totalBatteryCapacity: batteries.reduce((sum, b) => sum + (newGrid[b.y][b.x].data as BatteryData).capacity, 0),
            totalBatteryCharge: batteries.reduce((sum, b) => sum + (newGrid[b.y][b.x].data as BatteryData).charge, 0)
        };
    }, []);

    const advanceDay = useCallback(() => {
        setGameState(prevState => {
            if (!prevState || prevState.gameStatus !== 'PLAYING') return prevState;
    
            let tempState = { ...prevState };
    
            // Handle event duration
            if (tempState.activeEvent && tempState.activeEvent.remaining <= 1) {
                tempState = tempState.activeEvent.event.revert(tempState);
                tempState.eventLog = [...tempState.eventLog, `Day ${tempState.day}: ${tempState.activeEvent.event.message} has ended.`].slice(-10);
                tempState.activeEvent = null;
            } else if (tempState.activeEvent) {
                tempState.activeEvent = { ...tempState.activeEvent, remaining: tempState.activeEvent.remaining - 1 };
            }

            // Day/Night and Income/Maintenance cycle
            if (tempState.timeOfDay === 'NIGHT') {
                tempState.day += 1;
                tempState.timeOfDay = 'DAY';
                tempState.budget += tempState.dailyIncome - tempState.dailyMaintenance;
                tempState.eventLog = [...tempState.eventLog, `Day ${tempState.day}: Income: $${tempState.dailyIncome}, Maint: $${tempState.dailyMaintenance}. Budget: $${Math.round(tempState.budget)}`].slice(-10);
                
                // Weather change
                const weathers: Weather[] = ['CALM', 'BREEZY', 'WINDY'];
                tempState.weather = weathers[Math.floor(Math.random() * weathers.length)];
                tempState.eventLog = [...tempState.eventLog, `Day ${tempState.day}: Weather is now ${tempState.weather}.`].slice(-10);

                // City growth
                const newGrid = deepCopyGrid(tempState.grid);
                let cityGrew = false;
                newGrid.forEach(row => row.forEach(cell => {
                    if (cell.type === CellType.CITY && Math.random() < CITY_GROWTH_CHANCE) {
                        const cData = cell.data as CityData;
                        cData.baseDemand += CITY_GROWTH_AMOUNT;
                        cData.demand = cData.baseDemand;
                        tempState.eventLog = [...tempState.eventLog, `Day ${tempState.day}: ${cData.name} has grown! New demand: ${cData.baseDemand} MW.`].slice(-10);
                        cityGrew = true;
                    }
                }));
                if (cityGrew) tempState.grid = newGrid;

            } else {
                tempState.timeOfDay = 'NIGHT';
            }
            
            // Random Events
            if (tempState.day > 1 && tempState.timeOfDay === 'DAY' && !tempState.activeEvent && Math.random() < 0.20) {
                const newEvent = gameEvents[Math.floor(Math.random() * gameEvents.length)];
                tempState.activeEvent = { event: newEvent, remaining: newEvent.duration };
                tempState = newEvent.apply(tempState);
                tempState.eventLog = [...tempState.eventLog, `Day ${tempState.day}: EVENT! ${newEvent.message}`].slice(-10);
            }
            
            // Weather damage
            const {damageChance} = WEATHER_MULTIPLIERS[tempState.weather];
            if (damageChance > 0 && Math.random() < damageChance) {
                 const newGrid = deepCopyGrid(tempState.grid);
                 const lines: {x: number, y: number}[] = [];
                 newGrid.forEach((row, y) => row.forEach((cell, x) => {
                    if (cell.type === CellType.TRANSMISSION && !(cell.data as TransmissionData)?.isStormProof) lines.push({x,y});
                 }));
                 if (lines.length > 0) {
                     const target = lines[Math.floor(Math.random() * lines.length)];
                     newGrid[target.y][target.x].isDamaged = true;
                     tempState.grid = newGrid;
                     tempState.eventLog = [...tempState.eventLog, `Day ${tempState.day}: High winds damaged a transmission line!`].slice(-10);
                 }
            }

            return recalculatePower(tempState);
        });
    }, [recalculatePower, gameEvents]);

    const initGame = useCallback(() => {
        const grid = createEmptyGrid();
        const numCities = 5 + Math.floor(Math.random() * 3);
        let placedCities = 0;
        
        while(placedCities < numCities) {
            const x = Math.floor(Math.random() * GRID_SIZE);
            const y = Math.floor(Math.random() * GRID_SIZE);

            if(grid[y][x].type === CellType.EMPTY) {
                const demand = 50 + Math.floor(Math.random() * 6) * 10;
                const name = CITY_NAMES[placedCities % CITY_NAMES.length];
                grid[y][x] = {
                    type: CellType.CITY,
                    data: { demand, baseDemand: demand, isPowered: false, name: `${name} Heights` },
                    connections: {}
                };
                placedCities++;
            }
        }
        
        const initialTechTree = Object.fromEntries(
            Object.entries(TECH_TREE_DATA).map(([id, tech]) => [id, { ...tech, unlocked: false }])
        ) as Record<TechId, ResearchTech>;

        const initialState: GameState = {
            grid,
            budget: INITIAL_BUDGET,
            researchPoints: 0,
            techTree: initialTechTree,
            totalDemand: 0,
            productionSupply: 0,
            effectiveSupply: 0,
            poweredDemand: 0,
            gameStatus: 'PLAYING',
            message: 'Build a resilient power grid!',
            day: 1,
            timeOfDay: 'DAY',
            weather: 'BREEZY',
            activeEvent: null,
            eventLog: ["Day 1: Your journey as a Power Grid Tycoon begins!"],
            dailyIncome: 0,
            dailyMaintenance: 0,
            gridStabilityBonus: 0,
            totalBatteryCapacity: 0,
            totalBatteryCharge: 0,
        };

        setGameState(recalculatePower(initialState));
        setActiveTool('INFO');
        setLineStart(null);
        setSelectedCell(null);
        setActiveSidebarTab('INFO');
    }, [recalculatePower]);
    
    useEffect(() => {
        initGame();
    }, [initGame]);

    useEffect(() => {
        if (gameState?.gameStatus === 'PLAYING') {
            const timer = setInterval(advanceDay, DAY_DURATION_MS / 2);
            return () => clearInterval(timer);
        }
    }, [gameState?.gameStatus, advanceDay]);

    const handleCellClick = (x: number, y: number) => {
        if (!gameState || gameState.gameStatus !== 'PLAYING') return;
        
        const newGrid = deepCopyGrid(gameState.grid);
        const cell = newGrid[y][x];
        let newBudget = gameState.budget;
        let stateChanged = false;

        const placeBuilding = (type: CellType, cost: number, data: any) => {
            if (cell.type === CellType.EMPTY && newBudget >= cost) {
                newGrid[y][x] = { type, data, connections: {} };
                newBudget -= cost;
                stateChanged = true;
            }
        }

        switch(activeTool) {
            case 'PLANT':
                const plantSpec = PLANT_SPECS[selectedPlant];
                if (selectedPlant === PlantType.WIND && !gameState.techTree['UNLOCK_WIND'].unlocked) break;
                placeBuilding(CellType.PLANT, plantSpec.cost, { ...plantSpec, baseOutput: plantSpec.output, level: 1 });
                break;
            case 'SUBSTATION':
                placeBuilding(CellType.SUBSTATION, SUBSTATION_COST, { maintenance: SUBSTATION_MAINTENANCE });
                break;
            case 'BATTERY':
                placeBuilding(CellType.BATTERY, BATTERY_BANK_COST, { ...BATTERY_SPECS, charge: 0 });
                break;
            case 'TRANSMISSION':
            case 'DISTRIBUTION':
                if (cell.type === CellType.TRANSMISSION && cell.isDamaged) {
                    if(newBudget >= TRANSMISSION_LINE_COST) {
                        newGrid[y][x].isDamaged = false;
                        newBudget -= TRANSMISSION_LINE_COST;
                        stateChanged = true;
                    }
                } else if (cell.type !== CellType.EMPTY) {
                    if (!lineStart) {
                        setLineStart({ x, y });
                    } else {
                        if (lineStart.x === x && lineStart.y === y) {
                            setLineStart(null); return;
                        }
                        const path = findPath(lineStart, {x,y}, newGrid, activeTool);
                        if (path.length > 0) {
                            const cost = (path.length - 1) * (activeTool === 'TRANSMISSION' ? TRANSMISSION_LINE_COST : DISTRIBUTION_LINE_COST);
                             if (newBudget >= cost) {
                                 newBudget -= cost;
                                 for (let i = 0; i < path.length; i++) {
                                     const curr = path[i];
                                     if (i > 0) {
                                         const prev = path[i-1];
                                         if (prev.y < curr.y) { newGrid[curr.y][curr.x].connections['up'] = true; newGrid[prev.y][prev.x].connections['down'] = true; }
                                         if (prev.y > curr.y) { newGrid[curr.y][curr.x].connections['down'] = true; newGrid[prev.y][prev.x].connections['up'] = true; }
                                         if (prev.x < curr.x) { newGrid[curr.y][curr.x].connections['left'] = true; newGrid[prev.y][prev.x].connections['right'] = true; }
                                         if (prev.x > curr.x) { newGrid[curr.y][curr.x].connections['right'] = true; newGrid[prev.y][prev.x].connections['left'] = true; }
                                     }
                                     if (newGrid[curr.y][curr.x].type === CellType.EMPTY) {
                                        const lineType = activeTool === 'TRANSMISSION' ? CellType.TRANSMISSION : CellType.DISTRIBUTION;
                                        const lineData = activeTool === 'TRANSMISSION' ? { isStormProof: false } : null;
                                        newGrid[curr.y][curr.x] = { type: lineType, data: lineData, connections: newGrid[curr.y][curr.x].connections };
                                     }
                                 }
                                 stateChanged = true;
                             }
                        }
                        setLineStart(null);
                    }
                }
                break;
            case 'BULLDOZE':
                if (cell.type !== CellType.EMPTY && cell.type !== CellType.CITY) {
                    if(newBudget >= BULLDOZE_COST) {
                        newBudget -= BULLDOZE_COST;
                         [{x:0,y:-1,dir:'down'}, {x:0,y:1,dir:'up'}, {x:-1,y:0,dir:'right'}, {x:1,y:0,dir:'left'}].forEach(n => {
                            const nx = x + n.x, ny = y + n.y;
                            if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE && newGrid[ny][nx].connections[n.dir]) {
                               delete newGrid[ny][nx].connections[n.dir];
                            }
                         });
                        newGrid[y][x] = { type: CellType.EMPTY, data: null, connections: {} };
                        stateChanged = true;
                    }
                }
                break;
            case 'INFO':
                setSelectedCell(prev => (prev?.x === x && prev?.y === y) ? null : {x,y});
                setActiveSidebarTab('INFO');
                break;
        }

        if (stateChanged) {
            setGameState(recalculatePower({ ...gameState, grid: newGrid, budget: newBudget }));
        }
    };
    
    const findPath = (start: {x:number, y:number}, end: {x:number, y:number}, grid: GridCell[][], lineType: 'TRANSMISSION' | 'DISTRIBUTION'): {x:number, y:number}[] => {
        const openSet: {pos: {x:number, y:number}, f: number}[] = [{pos: start, f: Math.abs(start.x - end.x) + Math.abs(start.y - end.y)}];
        const cameFrom = new Map<string, {x:number, y:number}>();
        const gScore = new Map<string, number>();
        gScore.set(`${start.y},${start.x}`, 0);

        while (openSet.length > 0) {
            openSet.sort((a,b) => a.f - b.f);
            const current = openSet.shift()!.pos;

            if (current.x === end.x && current.y === end.y) {
                let path = [], temp: {x:number, y:number} | undefined = current;
                while (temp) { path.unshift(temp); temp = cameFrom.get(`${temp.y},${temp.x}`); }
                return path;
            }

            [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}]
                .map(n => ({x: current.x + n.x, y: current.y + n.y}))
                .filter(n => n.y >= 0 && n.y < GRID_SIZE && n.x >= 0 && n.x < GRID_SIZE)
                .forEach(neighbor => {
                    const neighborCell = grid[neighbor.y][neighbor.x];
                    const isEnd = neighbor.x === end.x && neighbor.y === end.y;
                    
                    if (neighborCell.type !== CellType.EMPTY && !isEnd) return;
                    
                    const tentative_gScore = (gScore.get(`${current.y},${current.x}`) ?? Infinity) + 1;
                    if(tentative_gScore < (gScore.get(`${neighbor.y},${neighbor.x}`) ?? Infinity)) {
                        cameFrom.set(`${neighbor.y},${neighbor.x}`, current);
                        gScore.set(`${neighbor.y},${neighbor.x}`, tentative_gScore);
                        if (!openSet.find(n => n.pos.x === neighbor.x && n.pos.y === neighbor.y)) {
                            openSet.push({pos: neighbor, f: tentative_gScore + Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y)});
                        }
                    }
                });
        }
        return [];
    }
    
    const handleToolSelect = (tool: Tool) => {
        setActiveTool(tool);
        setLineStart(null);
        if (tool !== 'INFO') setSelectedCell(null);
        setActiveSidebarTab('INFO');
    };

    const handleUpgradePlant = () => {
        if (!gameState || !selectedCell) return;
        const { x, y } = selectedCell;
        const newGrid = deepCopyGrid(gameState.grid);
        const cell = newGrid[y][x];
        if (cell.type !== CellType.PLANT) return;

        const plantData = cell.data as PlantData;
        const upgradeCost = Math.round(plantData.cost * PLANT_UPGRADE_COST_MULTIPLIER);
        if (gameState.budget >= upgradeCost) {
            plantData.level += 1;
            plantData.baseOutput = Math.round(plantData.baseOutput * PLANT_UPGRADE_OUTPUT_MULTIPLIER);
            plantData.maintenance = Math.round(plantData.maintenance * 1.3);
            plantData.cost = upgradeCost;
            setGameState(recalculatePower({ ...gameState, grid: newGrid, budget: gameState.budget - upgradeCost }));
        }
    }

    const handleUpgradeTransmission = () => {
        if (!gameState || !selectedCell) return;
        const { x, y } = selectedCell;
        const newGrid = deepCopyGrid(gameState.grid);
        const cell = newGrid[y][x];
        if (cell.type !== CellType.TRANSMISSION) return;
        const lineData = cell.data as TransmissionData;

        if (!lineData.isStormProof && gameState.budget >= TRANSMISSION_UPGRADE_COST) {
            lineData.isStormProof = true;
            setGameState(recalculatePower({ ...gameState, grid: newGrid, budget: gameState.budget - TRANSMISSION_UPGRADE_COST }));
        }
    }
    
    const handleBuyResearchPoints = (amount: number) => {
        if (!gameState) return;
        const cost = amount * RESEARCH_COST_PER_POINT;
        if (gameState.budget >= cost) {
            setGameState(prevState => prevState ? recalculatePower({
                ...prevState,
                budget: prevState.budget - cost,
                researchPoints: prevState.researchPoints + amount,
            }) : null);
        }
    }

    const handleUnlockTech = (techId: TechId) => {
        if (!gameState) return;
        const tech = gameState.techTree[techId];
        if (gameState.researchPoints >= tech.cost && !tech.unlocked) {
            setGameState(prevState => {
                if (!prevState) return null;
                const newTechTree = { ...prevState.techTree };
                newTechTree[techId].unlocked = true;
                return recalculatePower({
                    ...prevState,
                    researchPoints: prevState.researchPoints - tech.cost,
                    techTree: newTechTree,
                });
            });
        }
    }

    if (!gameState) {
        return <div className="flex items-center justify-center h-screen text-xl font-mono text-cyan-400">Initializing Grid...</div>;
    }

    const { grid, budget, productionSupply, effectiveSupply, totalDemand, gameStatus, day, timeOfDay, weather, dailyIncome, dailyMaintenance, activeEvent, gridStabilityBonus, totalBatteryCharge, totalBatteryCapacity, researchPoints, techTree } = gameState;

    const renderCell = (cell: GridCell, x: number, y: number) => {
        const isLineStart = lineStart?.x === x && lineStart?.y === y;
        const isSelected = selectedCell?.x === x && selectedCell?.y === y;
        let baseClasses = "w-full h-full flex items-center justify-center transition-colors duration-200 relative group";
        let content: React.ReactNode = null;
        let borderColor = 'border-transparent';

        if(isLineStart) borderColor = 'border-cyan-400 border-dashed';
        else if (isSelected) borderColor = 'border-yellow-400 border-dashed';
        
        if(cell.isDamaged) baseClasses += ' bg-red-900/80 animate-pulse-strong';

        switch (cell.type) {
            case CellType.CITY:
                const cityData = cell.data as CityData;
                baseClasses += cityData.isPowered ? ' bg-yellow-900/30' : ' bg-slate-700/30';
                content = <CityIcon className={`w-3/4 h-3/4 ${cityData.isPowered ? 'text-yellow-400' : 'text-slate-500'}`} />;
                break;
            case CellType.PLANT:
                const plantData = cell.data as PlantData;
                let color = 'text-green-500';
                if (plantData.type === PlantType.COAL) color = 'text-gray-400';
                if (plantData.type === PlantType.NUCLEAR) color = 'text-purple-500';
                if (plantData.type === PlantType.WIND) color = 'text-white';
                baseClasses += ' bg-slate-800/60';
                const Icon = plantData.type === PlantType.WIND ? WindIcon : PowerIcon;
                content = <Icon className={`w-3/4 h-3/4 ${plantData.output > 0 ? color : 'text-slate-600'}`} />;
                break;
            case CellType.SUBSTATION:
                 baseClasses += ' bg-orange-900/40';
                 content = <SubstationIcon className="w-3/4 h-3/4 text-orange-400" />;
                 break;
            case CellType.BATTERY:
                const batteryData = cell.data as BatteryData;
                const chargePercent = batteryData.capacity > 0 ? (batteryData.charge / batteryData.capacity) * 100 : 0;
                baseClasses += ' bg-indigo-900/40';
                content = <div className="relative w-full h-full flex items-center justify-center">
                    <div className="absolute bottom-0 left-0 w-full bg-green-500/50 transition-all duration-500" style={{height: `${chargePercent}%`}}></div>
                    <BatteryIcon className="w-3/4 h-3/4 text-indigo-300 z-10" />
                </div>
                break;
            case CellType.TRANSMISSION:
                baseClasses += (cell.data as TransmissionData)?.isStormProof ? ' bg-blue-900/40' : ' bg-slate-800/20';
                break;
            case CellType.DISTRIBUTION:
                 baseClasses += ' bg-slate-800/10';
                 break;
            case CellType.EMPTY:
                baseClasses += ' bg-transparent hover:bg-cyan-500/10';
                break;
        }

        const isGridPowered = effectiveSupply >= totalDemand;
        const connectionColor = (type: CellType) => {
            if (cell.isDamaged) return 'bg-red-500 animate-pulse-strong';
            if (!isGridPowered) return 'bg-slate-600';
            if (type === CellType.TRANSMISSION) return `bg-cyan-400 ${isGridPowered ? 'animate-pulse' : ''}`;
            if (type === CellType.DISTRIBUTION) return `bg-yellow-400 ${isGridPowered ? 'animate-pulse' : ''}`;
            return 'bg-slate-600';
        }
        
        const lineThickness = cell.type === CellType.TRANSMISSION ? 'w-1.5 h-1.5' : 'w-1 h-1';

        return (
            <div className={`aspect-square relative border-2 ${borderColor}`}
                onClick={() => handleCellClick(x, y)}>
                <div className={baseClasses}>{content}</div>
                {Object.entries(cell.connections).map(([dir, active]) => {
                    if (!active) return null;
                    let posClasses = '';
                    if (dir === 'up') posClasses = `h-1/2 ${lineThickness} top-0 left-1/2 -translate-x-1/2`;
                    if (dir === 'down') posClasses = `h-1/2 ${lineThickness} bottom-0 left-1/2 -translate-x-1/2`;
                    if (dir === 'left') posClasses = `w-1/2 ${lineThickness} top-1/2 left-0 -translate-y-1/2`;
                    if (dir === 'right') posClasses = `w-1/2 ${lineThickness} top-1/2 right-0 -translate-y-1/2`;
                    return <div key={dir} className={`absolute ${posClasses} ${connectionColor(cell.type)}`}></div>
                })}
            </div>
        );
    };
    
    const renderInfoPanel = () => {
        const cell = selectedCell ? gameState.grid[selectedCell.y][selectedCell.x] : null;

        if (activeTool === 'INFO' && cell) {
            switch(cell.type) {
                case CellType.PLANT:
                    const pData = cell.data as PlantData;
                    const upgradeCost = Math.round(pData.cost * PLANT_UPGRADE_COST_MULTIPLIER);
                    return (<div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-300">{pData.type} Plant (Lvl {pData.level})</h3>
                        <p>Output: <span className="font-semibold text-cyan-400">{pData.output}/{pData.baseOutput} MW</span></p>
                        <p>Maintenance: <span className="font-semibold text-red-400">${pData.maintenance}/day</span></p>
                        <button onClick={handleUpgradePlant} disabled={budget < upgradeCost} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded mt-2 transition-colors">Upgrade (${upgradeCost})</button>
                    </div>);
                case CellType.CITY:
                    const cData = cell.data as CityData;
                    return (<div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-300">{cData.name}</h3>
                        <p>Demand: <span className="font-semibold text-yellow-400">{cData.demand} MW</span></p>
                        <p>Status: <span className={`font-bold ${cData.isPowered ? "text-green-400" : "text-red-400"}`}>{cData.isPowered ? 'Powered' : 'Unpowered'}</span></p>
                    </div>);
                case CellType.TRANSMISSION:
                     const tData = cell.data as TransmissionData;
                     if (cell.isDamaged) return (<div><h3 className="text-lg font-bold text-red-400">Damaged Line</h3><p className="text-sm text-slate-400">Use 'Transmission' tool to repair for ${TRANSMISSION_LINE_COST}.</p></div>);
                     return (<div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-300">Transmission Line</h3>
                        {tData?.isStormProof ? <p className="text-blue-400 font-semibold">Storm-proofed</p> : <button onClick={handleUpgradeTransmission} disabled={budget < TRANSMISSION_UPGRADE_COST} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded mt-2">Storm-proof (${TRANSMISSION_UPGRADE_COST})</button>}
                    </div>);
                case CellType.BATTERY:
                    const bData = cell.data as BatteryData;
                    return (<div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-300">Battery Bank</h3>
                        <p>Storage: <span className="font-semibold text-green-400">{Math.round(bData.charge)} / {Math.round(bData.capacity)} MWh</span></p>
                        <p>Max I/O Rate: <span className="font-semibold text-indigo-400">{bData.maxChargeRate} MW</span></p>
                        <p>Maintenance: <span className="font-semibold text-red-400">${bData.maintenance}/day</span></p>
                    </div>);
                case CellType.SUBSTATION:
                     return (<div className="space-y-2"><h3 className="text-lg font-bold text-slate-300">Substation</h3><p>Maintenance: <span className="font-semibold text-red-400">${(cell.data as SubstationData).maintenance}/day</span></p></div>);
                default:
                    return <p className="text-sm text-slate-400 text-center">Select an object for information.</p>;
            }
        }
        
        if (activeTool === 'PLANT') {
            return (<div className="space-y-2">
                {Object.values(PLANT_SPECS).map(spec => {
                    const isLocked = spec.type === PlantType.WIND && !techTree['UNLOCK_WIND'].unlocked;
                    return (<button key={spec.type} onClick={() => !isLocked && setSelectedPlant(spec.type)} disabled={isLocked}
                        className={`w-full text-left p-3 rounded-md transition-colors border-2 ${selectedPlant === spec.type && !isLocked ? 'bg-cyan-900/80 border-cyan-500' : 'bg-slate-700/50 border-transparent'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700'}`}>
                        <div className="font-bold">{spec.type} Plant {isLocked ? '(Locked)' : ''}</div>
                        <div className="text-sm flex justify-between"><span>Output: {spec.output} MW</span><span>Cost: ${spec.cost}</span></div>
                        <div className="text-xs text-slate-400">Maint: ${spec.maintenance}/day</div>
                    </button>
                )})}
            </div>);
        }
        const toolInfo = {
            'TRANSMISSION': { title: "Transmission Lines", desc: `Connects power plants, substations, and batteries. Cost: $${TRANSMISSION_LINE_COST}/segment.` },
            'DISTRIBUTION': { title: "Distribution Lines", desc: `Connects substations to cities. Cost: $${DISTRIBUTION_LINE_COST}/segment.` },
            'SUBSTATION': { title: "Substation", desc: `Steps down power for city use. Cost: $${SUBSTATION_COST}.` },
            'BATTERY': { title: "Battery Bank", desc: `Stores excess power. Cost: $${BATTERY_BANK_COST}.` },
            'BULLDOZE': { title: "Bulldoze", desc: `Remove buildings and lines for $${BULLDOZE_COST}.` }
        };

        if(activeTool in toolInfo) {
            const { title, desc } = toolInfo[activeTool as keyof typeof toolInfo];
            return (<div><h3 className="text-lg font-bold text-slate-300">{title}</h3><p className="text-sm text-slate-400">{desc}</p></div>)
        }
        
        return <p className="text-sm text-slate-400 text-center">Select a tool or click an object for information.</p>;
    }

    const renderResearchPanel = () => (
        <div className="space-y-4">
            <div className="bg-slate-900/50 p-3 rounded-md text-center">
                <p className="text-slate-400">Research Points (RP)</p>
                <p className="text-3xl font-bold text-purple-400">{researchPoints}</p>
                <p className="text-xs text-slate-500">${RESEARCH_COST_PER_POINT} per point</p>
                <div className="flex gap-2 mt-2">
                    <button onClick={() => handleBuyResearchPoints(1)} className="flex-1 bg-purple-600/50 hover:bg-purple-600/80 text-white font-bold py-1 px-2 rounded text-sm transition-colors">Buy 1 RP</button>
                    <button onClick={() => handleBuyResearchPoints(10)} className="flex-1 bg-purple-600/50 hover:bg-purple-600/80 text-white font-bold py-1 px-2 rounded text-sm transition-colors">Buy 10 RP</button>
                </div>
            </div>
            <div className="space-y-2">
                {Object.values(techTree).map(tech => {
                    const canUnlock = researchPoints >= tech.cost && tech.dependencies.every(dep => techTree[dep].unlocked);
                    const isLockedByDep = !tech.dependencies.every(dep => techTree[dep].unlocked);
                     return (
                         <div key={tech.id} className={`p-3 rounded-md transition-colors ${tech.unlocked ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                             <div className="flex justify-between items-start">
                                 <div>
                                    <h4 className={`font-bold ${tech.unlocked ? 'text-green-300' : 'text-slate-300'}`}>{tech.name}</h4>
                                    <p className="text-xs text-slate-400">{tech.description}</p>
                                    {isLockedByDep && <p className="text-xs text-yellow-400">Requires: {tech.dependencies.map(d => techTree[d].name).join(', ')}</p>}
                                 </div>
                                 <button onClick={() => handleUnlockTech(tech.id)} disabled={!canUnlock || tech.unlocked} className="bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded text-sm transition-colors whitespace-nowrap">
                                     {tech.unlocked ? 'Done' : `${tech.cost} RP`}
                                 </button>
                             </div>
                         </div>
                     );
                })}
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen bg-slate-900 font-mono select-none flex p-4 gap-4">
            { (gameStatus === 'WON' || gameStatus === 'LOST') && <GameModal title={gameStatus === 'WON' ? 'Victory!' : 'Game Over'} message={gameState.message} onRestart={initGame} />}
            
            <div className="flex flex-col gap-2 bg-slate-800/50 p-2 rounded-lg border-2 border-slate-700">
                {[
                    { tool: 'INFO' as Tool, icon: InfoIcon, name: 'Info' },
                    { tool: 'PLANT' as Tool, icon: PowerIcon, name: 'Power Plant' },
                    { tool: 'BATTERY' as Tool, icon: BatteryIcon, name: 'Battery Bank' },
                    { tool: 'SUBSTATION' as Tool, icon: SubstationIcon, name: 'Substation' },
                    { tool: 'TRANSMISSION' as Tool, icon: TransmissionLineIcon, name: 'Transmission Line' },
                    { tool: 'DISTRIBUTION' as Tool, icon: DistributionLineIcon, name: 'Distribution Line' },
                    { tool: 'BULLDOZE' as Tool, icon: BulldozeIcon, name: 'Bulldoze' },
                ].map(({ tool, icon: Icon, name }) => (
                     <button key={tool} onClick={() => handleToolSelect(tool)} title={name} className={`group relative p-3 rounded-md transition-colors ${activeTool === tool ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                        <Icon className="w-8 h-8"/>
                     </button>
                ))}
            </div>

            <div className="flex-grow aspect-square relative bg-slate-900/50 p-2 rounded-lg border-2 border-slate-700 shadow-2xl shadow-cyan-500/10 overflow-hidden">
               <div className="grid border-r border-b border-slate-700/50" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                    {grid.map((row, y) => row.map((cell, x) => (
                        <div key={`${x}-${y}`} className="border-l border-t border-slate-700/50">{renderCell(cell, x, y)}</div>
                    )))}
               </div>
               {timeOfDay === 'NIGHT' && <div className="absolute inset-0 bg-blue-900/20 pointer-events-none transition-opacity duration-1000"></div>}
            </div>

            <div className="w-96 flex-shrink-0 bg-slate-800/50 p-4 rounded-lg border-2 border-slate-700 flex flex-col gap-4 overflow-y-auto">
                <h1 className="text-3xl font-bold text-center text-cyan-400 tracking-wider">POWER GRID</h1>
                
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-md">
                    <span className="text-lg font-bold">Day {day}</span>
                    <div>
                        <span className="text-sm font-bold px-2 py-1 rounded-full bg-slate-700 mr-2">{weather}</span>
                        <span className={`text-lg font-bold px-3 py-1 rounded-full text-sm ${timeOfDay === 'DAY' ? 'bg-yellow-400/20 text-yellow-300' : 'bg-blue-400/20 text-blue-300'}`}>{timeOfDay}</span>
                    </div>
                </div>

                {activeEvent && (
                    <div className="bg-red-900/50 border border-red-500 p-3 rounded-md animate-pulse-strong">
                        <h2 className="text-md font-bold text-red-300 mb-1">ALERT! ({activeEvent.remaining} days left)</h2>
                        <p className="text-sm text-red-200">{activeEvent.event.message}</p>
                    </div>
                )}

                <div className="bg-slate-900/50 p-3 rounded-md space-y-3">
                    <div className="flex justify-between items-center"><span className="text-slate-400">Budget</span><span className="text-2xl text-green-400 font-bold">${Math.round(budget)}</span></div>
                     <div className="text-sm space-y-1">
                        <div className="flex justify-between items-baseline"><span className="text-slate-400">Income/Day</span><span className="text-green-500">+${dailyIncome} {gridStabilityBonus > 0 && `(+${gridStabilityBonus})`}</span></div>
                        <div className="flex justify-between items-baseline"><span className="text-slate-400">Maint./Day</span><span className="text-red-500">-${dailyMaintenance}</span></div>
                     </div>
                </div>

                 <div className="bg-slate-900/50 p-3 rounded-md space-y-3">
                    <div className="flex justify-between items-center"><span className="text-slate-400">Production</span><span className="text-xl text-cyan-400">{productionSupply} MW</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400">Total Supply</span><span className="text-xl text-cyan-300">{effectiveSupply} MW</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400">City Demand</span><span className="text-xl text-yellow-400">{totalDemand} MW</span></div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2"><div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full" style={{ width: `${totalDemand > 0 ? Math.min(100, (effectiveSupply / totalDemand) * 100) : 100}%` }}></div></div>
                </div>
                
                 <div className="bg-slate-900/50 p-3 rounded-md space-y-3">
                    <div className="flex justify-between items-center"><span className="text-slate-400">Battery Storage</span><span className="text-xl text-green-400">{Math.round(totalBatteryCharge)}/{Math.round(totalBatteryCapacity)} MWh</span></div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-1"><div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${totalBatteryCapacity > 0 ? (totalBatteryCharge / totalBatteryCapacity) * 100 : 0}%` }}></div></div>
                </div>

                <div className="bg-slate-900/50 p-1 rounded-md flex-grow flex flex-col">
                    <div className="flex border-b border-slate-700">
                        <button onClick={() => setActiveSidebarTab('INFO')} className={`flex-1 p-2 text-center font-bold flex items-center justify-center gap-2 ${activeSidebarTab === 'INFO' ? 'bg-slate-700/50 text-cyan-400' : 'text-slate-400'}`}><InfoIcon className="w-5 h-5"/> Info</button>
                        <button onClick={() => setActiveSidebarTab('RESEARCH')} className={`flex-1 p-2 text-center font-bold flex items-center justify-center gap-2 ${activeSidebarTab === 'RESEARCH' ? 'bg-slate-700/50 text-cyan-400' : 'text-slate-400'}`}><ResearchIcon className="w-5 h-5"/> Research</button>
                    </div>
                    <div className="p-2 flex-grow animate-fade-in">
                        {activeSidebarTab === 'INFO' ? renderInfoPanel() : renderResearchPanel()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;