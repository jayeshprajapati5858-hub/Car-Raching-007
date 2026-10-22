import { CarDefinition, CarId, CarStats, CarUpgradeLevels, UpgradeCategory } from '../types/game';

export const CAR_CATALOG: Record<CarId, CarDefinition> = {
  vortex_gtr: {
    id: 'vortex_gtr',
    name: 'Vortex GT-R',
    manufacturer: 'Kuroshi Motors',
    classLabel: 'Class C · Street Coupe',
    price: 0,
    description: 'Balanced twin-scroll turbo coupe engineered for predictable corner entry, responsive drift recovery, and urban circuit agility.',
    baseStats: {
      topSpeed: 245,
      acceleration: 64,
      handling: 74,
      braking: 70,
      nitroPower: 68,
    },
    defaultBodyColor: '#0ea5e9',
    defaultWheelColor: '#cbd5e1',
    defaultAccentColor: '#f97316',
    bodyStyle: 'coupe',
  },
  kuroshi_raijin: {
    id: 'kuroshi_raijin',
    name: 'Kuroshi Raijin X',
    manufacturer: 'Kuroshi Motors',
    classLabel: 'Class B · Drift Prototype',
    price: 4500,
    unlockMission: 2,
    description: 'Widebody street drift weapon featuring high-angle steering geometry, lightweight carbon panels, and rapid nitro recharge.',
    baseStats: {
      topSpeed: 268,
      acceleration: 76,
      handling: 86,
      braking: 78,
      nitroPower: 82,
    },
    defaultBodyColor: '#f97316',
    defaultWheelColor: '#1e293b',
    defaultAccentColor: '#38bdf8',
    bodyStyle: 'drift',
  },
  apex_specter: {
    id: 'apex_specter',
    name: 'Apex Specter S7',
    manufacturer: 'Apex Automotive',
    classLabel: 'Class A · Mid-Engine Sport',
    price: 9500,
    unlockMission: 4,
    description: 'Aerodynamic mid-engine track supercar with active ground-effect venturi tunnels and relentless mid-range acceleration.',
    baseStats: {
      topSpeed: 302,
      acceleration: 85,
      handling: 84,
      braking: 86,
      nitroPower: 84,
    },
    defaultBodyColor: '#ef4444',
    defaultWheelColor: '#e2e8f0',
    defaultAccentColor: '#fbbf24',
    bodyStyle: 'supercar',
  },
  hyperion_valkyrie: {
    id: 'hyperion_valkyrie',
    name: 'Hyperion Valkyrie Zero',
    manufacturer: 'Hyperion Labs',
    classLabel: 'Class S · Hybrid Hypercar',
    price: 22000,
    unlockMission: 8,
    description: 'Flagship carbon-monocoque hypercar combining a high-revving V10 with dual axial-flux electric motors for blistering velocity.',
    baseStats: {
      topSpeed: 348,
      acceleration: 94,
      handling: 91,
      braking: 93,
      nitroPower: 95,
    },
    defaultBodyColor: '#e2e8f0',
    defaultWheelColor: '#f59e0b',
    defaultAccentColor: '#06b6d4',
    bodyStyle: 'hypercar',
  },
};

export const CAR_LIST: CarDefinition[] = [
  CAR_CATALOG.vortex_gtr,
  CAR_CATALOG.kuroshi_raijin,
  CAR_CATALOG.apex_specter,
  CAR_CATALOG.hyperion_valkyrie,
];

export const UPGRADE_MAX_LEVEL = 5;

export const UPGRADE_METADATA: Record<
  UpgradeCategory,
  { label: string; description: string; baseCost: number; statKey: keyof CarStats }
> = {
  engine: {
    label: 'Twin-Scroll ECU & Turbo',
    description: 'Increases top speed and straight-line thrust.',
    baseCost: 600,
    statKey: 'topSpeed',
  },
  tires: {
    label: 'Semi-Slick Compound',
    description: 'Improves cornering grip and drift control.',
    baseCost: 550,
    statKey: 'handling',
  },
  brakes: {
    label: 'Carbon-Ceramic Rotors',
    description: 'Shortens braking distance before tight hairpins.',
    baseCost: 500,
    statKey: 'braking',
  },
  nitro: {
    label: 'Cryo-Injection Tank',
    description: 'Boosts nitro surge force and duration.',
    baseCost: 650,
    statKey: 'nitroPower',
  },
};

export function getUpgradeCost(carId: CarId, category: UpgradeCategory, currentLevel: number): number {
  const car = CAR_CATALOG[carId];
  const tierMultiplier = car.price === 0 ? 1 : car.price < 6000 ? 1.35 : car.price < 12000 ? 1.75 : 2.3;
  const base = UPGRADE_METADATA[category].baseCost;
  return Math.round(base * tierMultiplier * Math.pow(1.45, currentLevel));
}

export function computeEffectiveCarStats(carId: CarId, upgrades: CarUpgradeLevels): CarStats {
  const base = CAR_CATALOG[carId].baseStats;
  return {
    topSpeed: Math.round(base.topSpeed + upgrades.engine * 7),
    acceleration: Math.min(100, Math.round(base.acceleration + upgrades.engine * 2.2 + upgrades.nitro * 1.0)),
    handling: Math.min(100, Math.round(base.handling + upgrades.tires * 2.6)),
    braking: Math.min(100, Math.round(base.braking + upgrades.brakes * 2.6)),
    nitroPower: Math.min(100, Math.round(base.nitroPower + upgrades.nitro * 3.0)),
  };
}

export const BODY_PAINT_SWATCHES = [
  { name: 'Electric Cyan', hex: '#0ea5e9' },
  { name: 'Nitro Amber', hex: '#f97316' },
  { name: 'Crimson Apex', hex: '#ef4444' },
  { name: 'Titanium White', hex: '#f1f5f9' },
  { name: 'Stealth Obsidian', hex: '#1e293b' },
  { name: 'Acid Lime', hex: '#84cc16' },
  { name: 'Solar Gold', hex: '#eab308' },
  { name: 'Cobalt Pulse', hex: '#3b82f6' },
];

export const WHEEL_FINISH_SWATCHES = [
  { name: 'Machined Silver', hex: '#cbd5e1' },
  { name: 'Forged Gunmetal', hex: '#334155' },
  { name: 'Motorsport Gold', hex: '#f59e0b' },
  { name: 'Cyan Rim Lip', hex: '#06b6d4' },
  { name: 'Track Red', hex: '#ef4444' },
];
