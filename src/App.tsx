/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { GameViewport } from './components/GameViewport';
import {
  CareerScreen,
  GarageAndShopScreen,
  MainMenuScreen,
  MonetizationHubScreen,
  QuickRaceScreen,
} from './components/MenuScreens';
import { MobileControls } from './components/MobileControls';
import {
  DailyRewardsModal,
  PauseAndResultsOverlay,
  PremiumShopModal,
  ProfileModal,
  SettingsModal,
} from './components/Modals';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { LuckySpinModal } from './components/LuckySpinModal';
import { RaceHUD } from './components/RaceHUD';
import { HighwayHUD } from './components/HighwayHUD';
import { useGameStore } from './store/useGameStore';
import { HighwaySetupScreen } from './components/HighwaySetupScreen';

export default function App() {
  const initSave = useGameStore((s) => s.initSave);
  const screen = useGameStore((s) => s.screen);
  const startQuickRace = useGameStore((s) => s.startQuickRace);

  useEffect(() => {
    initSave();
  }, [initSave]);

  // Allow Enter to launch race from the Title / Main Menu screen
  useEffect(() => {
    if (screen !== 'main_menu') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        startQuickRace({ mode: 'quick_race', trackId: 'neon_city', laps: 2, aiCount: 3 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, startQuickRace]);

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#080c14] text-slate-100 select-none">
      {/* Persistent 3D WebGL Canvas Container */}
      <GameViewport />

      {/* Screen & Overlay Router */}
      {screen === 'main_menu' && <MainMenuScreen />}
      {screen === 'career' && <CareerScreen />}
      {screen === 'quick_race' && <QuickRaceScreen />}
      {screen === 'highway_setup' && <HighwaySetupScreen />}
      {screen === 'monetization_hub' && <MonetizationHubScreen />}
      {screen === 'garage' && <GarageAndShopScreen mode="garage" />}
      {screen === 'car_shop' && <GarageAndShopScreen mode="car_shop" />}
      {screen === 'daily_rewards' && (
        <>
          <MainMenuScreen />
          <DailyRewardsModal />
        </>
      )}
      {screen === 'daily_missions' && (
        <>
          <MainMenuScreen />
          <DailyMissionsModal />
        </>
      )}
      {screen === 'lucky_spin' && (
        <>
          <MainMenuScreen />
          <LuckySpinModal />
        </>
      )}
      {screen === 'premium_shop' && (
        <>
          <MainMenuScreen />
          <PremiumShopModal />
        </>
      )}
      {screen === 'settings' && (
        <>
          <MainMenuScreen />
          <SettingsModal />
        </>
      )}
      {screen === 'profile' && (
        <>
          <MainMenuScreen />
          <ProfileModal />
        </>
      )}
      {screen === 'racing' && (
        <>
          {useGameStore.getState().activeRace?.mode.startsWith('highway_') ? <HighwayHUD /> : <RaceHUD />}
          <MobileControls />
          <PauseAndResultsOverlay />
        </>
      )}
    </main>
  );
}
