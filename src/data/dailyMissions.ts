import { DailyMissionDefinition } from '../types/game';

export const DAILY_MISSIONS_CATALOG: DailyMissionDefinition[] = [
  {
    id: 'drift_500m',
    title: 'Drift Master',
    description: 'Drift for 500 cumulative meters across races',
    target: 500,
    rewardCoins: 1000,
  },
  {
    id: 'finish_3_highway',
    title: 'Highway Runner',
    description: 'Complete 3 highway runs or races',
    target: 3,
    rewardCoins: 1200,
    rewardDecalId: 'decal_neon_flame',
  },
  {
    id: 'reach_220kmh',
    title: 'Velocity Peak',
    description: 'Reach 220 km/h top speed in any event',
    target: 220,
    rewardCoins: 800,
  },
  {
    id: 'win_neon_race',
    title: 'Neon Victory',
    description: 'Win a circuit race in Neon City',
    target: 1,
    rewardCoins: 1500,
    rewardDecalId: 'decal_cyber_grid',
  },
];
