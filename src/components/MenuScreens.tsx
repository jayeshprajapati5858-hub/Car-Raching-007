import React, { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Flag,
  Lock,
  Play,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  Upload,
  User,
  Wrench,
} from 'lucide-react';
import {
  BODY_PAINT_SWATCHES,
  CAR_CATALOG,
  CAR_LIST,
  computeEffectiveCarStats,
  getUpgradeCost,
  UPGRADE_MAX_LEVEL,
  UPGRADE_METADATA,
  WHEEL_FINISH_SWATCHES,
} from '../data/cars';
import { CAREER_MISSIONS } from '../data/careerMissions';
import { TRACK_CATALOG, TRACK_LIST } from '../data/tracks';
import { t } from '../services/Localization';
import { useGameStore } from '../store/useGameStore';
import { AIDifficulty, CarId, GameMode, TrackId, UpgradeCategory } from '../types/game';
import { formatRaceTime } from './RaceHUD';

export const MainMenuScreen: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setScreen = useGameStore((s) => s.setScreen);
  const startQuickRace = useGameStore((s) => s.startQuickRace);
  const selectCar = useGameStore((s) => s.selectCar);
  const updateCustomization = useGameStore((s) => s.updateCustomization);
  const canClaimDaily = useGameStore((s) => s.canClaimDailyReward());

  const [dockCollapsed, setDockCollapsed] = useState(false);

  const lang = saveData.settings.language;
  const activeCar = CAR_CATALOG[saveData.selectedCarId];
  const stats = computeEffectiveCarStats(saveData.selectedCarId, saveData.upgrades[saveData.selectedCarId]);
  const totalStars = Object.values(saveData.missionProgress).reduce((acc, m) => acc + (m.stars || 0), 0);
  const bestNeonMs = saveData.bestTrackTimesMs['neon_city'] ?? null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between safe-area-pad select-none overflow-hidden">
      {/* Top Bar: Bespoke SVG Brand Lockup + Player Telemetry & Quick Modal Triggers */}
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4 w-full">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="pointer-events-auto flex flex-col min-w-0">
          <div className="flex items-center gap-2.5">
            <svg className="h-8 w-8 sm:h-10 sm:w-10 shrink-0" viewBox="0 0 48 48" fill="none">
              <polygon points="6,38 18,10 30,10 18,38" fill="#0ea5e9" />
              <polygon points="22,38 34,10 42,10 30,38" fill="#f97316" />
              <rect x="4" y="40" width="38" height="3" fill="#f8fafc" />
            </svg>
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.25rem,3.5vw,1.875rem)] font-bold tracking-tight text-white leading-none truncate">
                NITRO RUSH
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-sky-400 tracking-wide mt-0.5 truncate">
                Street Legends · 3D Arcade Racing
              </p>
            </div>
          </div>

          {/* Unboxed Player Summary Metadata */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-300 tabular-nums">
            <span className="font-semibold text-white">{saveData.playerName}</span>
            <span aria-hidden="true">·</span>
            <span>LVL {saveData.level}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-amber-400">{saveData.coins.toLocaleString()} Coins</span>
            <span aria-hidden="true">·</span>
            <span>
              {saveData.ownedCars.length}/{CAR_LIST.length} Cars
            </span>
            <span aria-hidden="true">·</span>
            <span>{totalStars}/60 ★</span>
            {bestNeonMs && (
              <span className="hidden md:inline text-slate-400">
                · Best Loop: {formatRaceTime(bestNeonMs)}
              </span>
            )}
          </div>
        </div>

        {/* Right Utility Navigation */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setScreen('daily_rewards')}
            className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              canClaimDaily
                ? 'border-amber-400 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                : 'border-slate-700/80 bg-[#090d16]/90 text-slate-200 hover:border-sky-500'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            <span className="hidden xs:inline">{t(lang, 'dailyRewards')}</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('daily_missions')}
            className={`relative flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              Object.values(saveData.dailyMissions || {}).some((m) => m.completed && !m.claimed)
                ? 'border-amber-400 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                : 'border-slate-700/80 bg-[#090d16]/90 text-slate-200 hover:border-sky-500'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            <span className="hidden xs:inline">Missions</span>
            {Object.values(saveData.dailyMissions || {}).some((m) => m.completed && !m.claimed) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-slate-950" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setScreen('lucky_spin')}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-sky-400/80 bg-sky-500/20 px-2.5 sm:px-3.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/30 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400 animate-pulse" />
            <span className="hidden xs:inline">Lucky Spin</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('monetization_hub')}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-emerald-500/80 bg-emerald-500/20 px-2.5 sm:px-3.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
            <span className="hidden sm:inline">Earnings</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('premium_shop')}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#090d16]/90 px-2.5 sm:px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
            <span className="hidden sm:inline">{t(lang, 'premiumShop')}</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('profile')}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#090d16]/90 px-2.5 sm:px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
            <span className="hidden sm:inline">{t(lang, 'profile')}</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('settings')}
            className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#090d16]/90 px-2.5 sm:px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
            <span className="hidden sm:inline">{t(lang, 'settings')}</span>
          </button>
        </div>
      </div>

      {/* Unobstructed 3D Centerpiece Area */}
      <div className="my-auto flex flex-col items-center justify-center pointer-events-none py-1">
        <span className="text-[10px] sm:text-[11px] font-medium text-slate-400/80 text-center px-2">
          Drag horizontally to rotate {activeCar.name}
        </span>
      </div>

      {/* Unified Collapsible Bottom Command Dock */}
      <div className="pointer-events-auto mx-auto w-full max-w-[940px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="mb-1 flex items-center gap-1.5 rounded-t-xl border border-b-0 border-slate-700/80 bg-[#090d16]/92 px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 text-sky-400" />
              <span>Show Command Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-sky-400" />
              <span>Hide Dock (Cinema View)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full max-h-[52dvh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#090d16]/95 p-3 sm:p-4 shadow-2xl">
            {/* Upper Row: Active Vehicle Quick-Spec + Owned Car Switcher + Quick Paint Swatches */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-2.5 sm:pb-3">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-medium text-slate-400 truncate">
                  {activeCar.manufacturer} · {activeCar.classLabel}
                </div>
                <div className="font-display text-base sm:text-xl font-bold text-white truncate">
                  {activeCar.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-300 tabular-nums">
                  <span>Speed: {stats.topSpeed} KM/H</span>
                  <span>·</span>
                  <span>Accel: {stats.acceleration}</span>
                  <span>·</span>
                  <span>Grip: {stats.handling}</span>
                  <span>·</span>
                  <span>Nitro: {stats.nitroPower}</span>
                </div>
              </div>

              {/* Quick Paint Swatches & Owned Car Switcher */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  {BODY_PAINT_SWATCHES.slice(0, 6).map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      title={sw.name}
                      onClick={() =>
                        updateCustomization(saveData.selectedCarId, { bodyColor: sw.hex })
                      }
                      className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full border transition-transform ${
                        saveData.customizations[saveData.selectedCarId]?.bodyColor === sw.hex
                          ? 'scale-110 border-white ring-2 ring-sky-400'
                          : 'border-slate-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  ))}
                </div>

                {saveData.ownedCars.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                    {saveData.ownedCars.map((cid) => (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => selectCar(cid)}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          saveData.selectedCarId === cid
                            ? 'bg-sky-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {CAR_CATALOG[cid].name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lower Row: Primary Play CTA + Mode & Garage Navigation Buttons */}
            <div className="mt-2.5 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="grid grid-cols-2 xs:flex xs:flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => startQuickRace({ mode: 'quick_race', trackId: 'neon_city', laps: 2, aiCount: 3 })}
                  className="col-span-2 xs:col-span-1 flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 sm:px-5 font-display text-xs sm:text-sm font-bold text-slate-950 hover:bg-sky-400 active:scale-95 transition-all whitespace-nowrap shrink-0 shadow-lg shadow-sky-500/20"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{t(lang, 'play')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('career')}
                  className="flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-500/15 px-3.5 font-display text-xs sm:text-sm font-bold text-amber-300 hover:bg-amber-500/25 active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span>{t(lang, 'career')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('quick_race')}
                  className="flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Flag className="h-3.5 w-3.5 text-sky-400" />
                  <span>{t(lang, 'quickRace')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('garage')}
                  className="flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Wrench className="h-3.5 w-3.5 text-sky-400" />
                  <span>{t(lang, 'garage')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('highway_setup')}
                  className="flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-xl border border-sky-500/60 bg-sky-500/15 px-3.5 font-display text-xs sm:text-sm font-bold text-sky-300 hover:bg-sky-500/25 active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  <span>HIGHWAY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScreen('car_shop')}
                  className="flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-sky-400" />
                  <span>{t(lang, 'carShop')}</span>
                </button>
              </div>

              {/* Single Flat Control-Hint Line */}
              <div className="hidden lg:block text-[11px] font-medium text-slate-400 whitespace-nowrap">
                WASD / Arrows Move · Space Drift · Shift Nitro · Esc Pause
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CareerScreen: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setScreen = useGameStore((s) => s.setScreen);
  const startCareerMission = useGameStore((s) => s.startCareerMission);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);

  const isMissionUnlocked = (missionId: number) => {
    if (missionId === 1) return true;
    const prev = saveData.missionProgress[missionId - 1];
    return Boolean(prev && prev.stars >= 1);
  };

  const chapterMissions = CAREER_MISSIONS.filter((m) => m.chapter === selectedChapter);
  const totalStars = Object.values(saveData.missionProgress).reduce((acc, m) => acc + (m.stars || 0), 0);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#090d16]/95 safe-area-pad overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl pb-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setScreen('main_menu')}
              className="flex h-9 sm:h-10 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-2xl font-bold text-white truncate">
                Street Legends Career
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Complete race objectives to earn coins, XP, and unlock circuits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 tabular-nums">
            <span className="font-semibold text-amber-400">{totalStars} / 60 ★</span>
            <span>·</span>
            <span className="font-semibold text-sky-400">{saveData.coins.toLocaleString()} Coins</span>
          </div>
        </div>

        {/* Chapter Segmented Selector */}
        <div className="mt-3.5 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {[
            { ch: 1, title: '01. Street Ignition' },
            { ch: 2, title: '02. Coastal Velocity' },
            { ch: 3, title: '03. Touge & Canyon' },
            { ch: 4, title: '04. Legend Finals' },
          ].map((item) => (
            <button
              key={item.ch}
              type="button"
              onClick={() => setSelectedChapter(item.ch)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors truncate ${
                selectedChapter === item.ch
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>

        {/* Mission Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {chapterMissions.map((mission) => {
            const unlocked = isMissionUnlocked(mission.id);
            const progress = saveData.missionProgress[mission.id];
            const stars = progress?.stars || 0;
            const track = TRACK_CATALOG[mission.trackId];

            return (
              <div
                key={mission.id}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 transition-colors ${
                  unlocked
                    ? 'border-slate-800 bg-slate-900/90 hover:border-sky-500/60'
                    : 'border-slate-800/50 bg-slate-950/60 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-sky-400 truncate">
                        M{String(mission.id).padStart(2, '0')} · {track.name} ·{' '}
                        <span className="capitalize">{mission.mode.replace('_', ' ')}</span>
                      </div>
                      <h3 className="mt-0.5 font-display text-base sm:text-lg font-bold text-white truncate">
                        {mission.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">{mission.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3].map((sIdx) => (
                        <Star
                          key={sIdx}
                          className={`h-4 w-4 ${
                            stars >= sIdx ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                    {mission.starCriteria.map((crit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={stars >= idx + 1 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          ★ {idx + 1}:
                        </span>
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                  <div className="text-xs text-slate-300 tabular-nums">
                    Reward: <span className="font-semibold text-amber-400">{mission.rewards.coins} Coins</span> ·{' '}
                    <span>{mission.rewards.xp} XP</span>
                    {stars === 0 && (
                      <span className="ml-1 text-emerald-400">
                        (+{mission.rewards.firstClearBonusCoins} 1st Clear)
                      </span>
                    )}
                  </div>

                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => startCareerMission(mission.id)}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-sky-500 px-4 font-display text-xs font-bold text-slate-950 hover:bg-sky-400 active:scale-95 transition-all whitespace-nowrap shrink-0"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Race</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Lock className="h-3.5 w-3.5" />
                      <span>{mission.unlockRequirementText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const QuickRaceScreen: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setScreen = useGameStore((s) => s.setScreen);
  const startQuickRace = useGameStore((s) => s.startQuickRace);

  const [selectedTrack, setSelectedTrack] = useState<TrackId>('neon_city');
  const [selectedMode, setSelectedMode] = useState<GameMode>('quick_race');
  const [laps, setLaps] = useState<number>(2);
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');

  const isTrackUnlocked = (tDef: typeof TRACK_LIST[0]) => {
    if (!tDef.playable) return false;
    return saveData.level >= tDef.unlockLevel || Object.keys(saveData.missionProgress).length >= tDef.unlockLevel;
  };

  const activeTrackDef = TRACK_CATALOG[selectedTrack];
  const canLaunch = isTrackUnlocked(activeTrackDef);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#090d16]/95 safe-area-pad overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl pb-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setScreen('main_menu')}
              className="flex h-9 sm:h-10 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white whitespace-nowrap shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-2xl font-bold text-white truncate">Custom Race Setup</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Configure circuit, race mode, lap count, and AI rival intensity
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canLaunch}
            onClick={() =>
              startQuickRace({
                trackId: selectedTrack,
                mode: selectedMode,
                laps,
                aiCount:
                  selectedMode === 'time_trial' || selectedMode === 'drift_challenge'
                    ? 0
                    : selectedMode === 'traffic_run'
                    ? 6
                    : 3,
                aiDifficulty: difficulty,
              })
            }
            className={`flex h-10 sm:h-11 items-center gap-2 rounded-xl px-5 font-display text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              canLaunch
                ? 'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-lg shadow-sky-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Launch Event</span>
          </button>
        </div>

        {/* Track Selection Grid */}
        <h3 className="mt-4 font-display text-sm sm:text-base font-bold text-white">01. Select Circuit</h3>
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TRACK_LIST.map((trk) => {
            const unlocked = isTrackUnlocked(trk);
            const selected = selectedTrack === trk.id;
            const bestMs = saveData.bestTrackTimesMs[trk.id] ?? null;

            return (
              <button
                key={trk.id}
                type="button"
                onClick={() => {
                  if (trk.playable) setSelectedTrack(trk.id);
                }}
                className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                  selected
                    ? 'border-sky-400 bg-sky-500/15'
                    : trk.playable
                    ? 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                    : 'border-slate-800/40 bg-slate-950/60 opacity-65 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="truncate">{trk.region}</span>
                    <span className="tabular-nums shrink-0">{trk.lengthKm} KM</span>
                  </div>
                  <div className="mt-1 font-display text-base sm:text-lg font-bold text-white">{trk.name}</div>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{trk.description}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                  {!trk.playable ? (
                    <span className="text-amber-400 font-medium">Coming Soon (Expansion)</span>
                  ) : !unlocked ? (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Lock className="h-3.5 w-3.5" /> Level {trk.unlockLevel} / Career M{trk.unlockLevel}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Playable · {trk.difficulty}</span>
                  )}

                  {bestMs && (
                    <span className="font-mono text-slate-300 tabular-nums">{formatRaceTime(bestMs)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Game Mode, Laps, and Difficulty */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
            <h4 className="font-display text-sm font-bold text-white">02. Event Mode</h4>
            <div className="mt-2.5 flex flex-col gap-2">
              {[
                { id: 'quick_race' as GameMode, label: 'Circuit Race (vs 3 AI)', desc: 'Standard lap battle for 1st place' },
                { id: 'time_trial' as GameMode, label: 'Time Trial (Solo Clock)', desc: 'Pure hot-lap for personal best time' },
                { id: 'drift_challenge' as GameMode, label: 'Drift Challenge', desc: 'Score points by sliding through corners' },
                { id: 'traffic_run' as GameMode, label: 'Traffic Run (Near-Miss)', desc: 'Weave through highway traffic for nitro' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMode(m.id)}
                  className={`rounded-xl border p-2.5 text-left transition-colors ${
                    selectedMode === m.id
                      ? 'border-sky-400 bg-sky-500/20 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[11px] text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
            <h4 className="font-display text-sm font-bold text-white">03. Lap Distance</h4>
            <p className="mt-1 text-xs text-slate-400">More laps award proportionally higher coin & XP payouts</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLaps(l)}
                  className={`h-11 rounded-xl border font-display text-base font-bold tabular-nums transition-colors ${
                    laps === l
                      ? 'border-sky-400 bg-sky-500 text-slate-950'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
            <h4 className="font-display text-sm font-bold text-white">04. AI Rival Pace</h4>
            <p className="mt-1 text-xs text-slate-400">Adjust opponent cornering speed and top-end pace</p>
            <div className="mt-3 flex flex-col gap-2">
              {(['beginner', 'normal', 'hard'] as AIDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficulty(diff)}
                  className={`h-10 rounded-xl border px-4 text-xs font-bold capitalize transition-colors ${
                    difficulty === diff
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GarageAndShopScreen: React.FC<{ mode: 'garage' | 'car_shop' }> = ({ mode }) => {
  const saveData = useGameStore((s) => s.saveData);
  const previewCarId = useGameStore((s) => s.previewCarId);
  const setPreviewCarId = useGameStore((s) => s.setPreviewCarId);
  const selectCar = useGameStore((s) => s.selectCar);
  const buyCar = useGameStore((s) => s.buyCar);
  const upgradeCar = useGameStore((s) => s.upgradeCar);
  const updateCustomization = useGameStore((s) => s.updateCustomization);
  const setScreen = useGameStore((s) => s.setScreen);
  const customGlbUrl = useGameStore((s) => s.customGlbUrl);
  const setCustomGlbUrl = useGameStore((s) => s.setCustomGlbUrl);

  const [activeTab, setActiveTab] = useState<'upgrades' | 'paint'>(
    mode === 'car_shop' ? 'paint' : 'upgrades'
  );
  const [confirmPurchaseCar, setConfirmPurchaseCar] = useState<CarId | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const carDef = CAR_CATALOG[previewCarId];
  const isOwned = saveData.ownedCars.includes(previewCarId);
  const isEquipped = saveData.selectedCarId === previewCarId;
  const upgrades = saveData.upgrades[previewCarId] || { engine: 0, tires: 0, brakes: 0, nitro: 0 };
  const effectiveStats = computeEffectiveCarStats(previewCarId, upgrades);
  const custom = saveData.customizations[previewCarId];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between safe-area-pad select-none overflow-hidden">
      {/* Top Bar: Back Button + Car Selector + Wallet */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setScreen('main_menu')}
            className="flex h-9 sm:h-10 items-center gap-1 rounded-xl border border-slate-700/80 bg-[#090d16]/90 px-3 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Menu</span>
          </button>

          {/* Car Model Selector Bar */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-700/80 bg-[#090d16]/90 p-1">
            {CAR_LIST.map((c) => {
              const owned = saveData.ownedCars.includes(c.id);
              const active = previewCarId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPreviewCarId(c.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{c.name.split(' ').slice(0, 2).join(' ')}</span>
                  {!owned && <Lock className="h-3 w-3 opacity-75" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload Custom GLB Button */}
          <label className="cursor-pointer flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-sky-500/80 bg-sky-500/20 px-3 text-xs font-bold text-sky-300 hover:bg-sky-500/30 hover:text-white transition-colors whitespace-nowrap shrink-0">
            <Upload className="h-4 w-4" />
            <span>{customGlbUrl ? 'Custom GLB Active ✓' : 'Upload GLB Car'}</span>
            <input
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setCustomGlbUrl(url);
                }
              }}
            />
          </label>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#090d16]/90 px-3 py-1.5 text-xs tabular-nums">
            <span className="text-slate-400">Coins:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-amber-400">
              {saveData.coins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Modal if triggered */}
      {confirmPurchaseCar && (
        <div className="pointer-events-auto my-auto mx-auto w-full max-w-md rounded-2xl border border-sky-500/50 bg-[#090d16]/98 p-5 shadow-2xl">
          <h3 className="font-display text-lg sm:text-xl font-bold text-white">
            Confirm Purchase · {CAR_CATALOG[confirmPurchaseCar].name}
          </h3>
          <p className="mt-2 text-xs text-slate-300">
            Acquire this vehicle permanently for{' '}
            <span className="font-bold text-amber-400">
              {CAR_CATALOG[confirmPurchaseCar].price.toLocaleString()} Coins
            </span>
            ?
          </p>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmPurchaseCar(null)}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                buyCar(confirmPurchaseCar);
                setConfirmPurchaseCar(null);
              }}
              className="rounded-xl bg-sky-500 px-5 py-2 font-display text-xs font-bold text-slate-950 hover:bg-sky-400"
            >
              Confirm & Equip
            </button>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Garage & Dealership Dock */}
      <div className="pointer-events-auto mx-auto w-full max-w-[940px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="mb-1 flex items-center gap-1.5 rounded-t-xl border border-b-0 border-slate-700/80 bg-[#090d16]/92 px-3.5 py-1 text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 text-sky-400" />
              <span>Show Garage Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-sky-400" />
              <span>Hide Controls (Inspect 3D Car)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full max-h-[54dvh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#090d16]/95 p-3 sm:p-4 shadow-2xl">
            {/* Car Title, Specs & Ownership Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-slate-400 truncate">
                  {carDef.manufacturer} · {carDef.classLabel}
                </div>
                <div className="font-display text-lg sm:text-2xl font-bold text-white truncate">
                  {carDef.name}
                </div>
                <p className="mt-0.5 max-w-xl text-[11px] sm:text-xs text-slate-400 line-clamp-2">
                  {carDef.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isOwned ? (
                  isEquipped ? (
                    <div className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3.5 text-xs font-bold text-emerald-300">
                      <Check className="h-4 w-4" />
                      <span>Active Race Car</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectCar(previewCarId)}
                      className="flex h-9 sm:h-10 items-center gap-1.5 rounded-xl bg-sky-500 px-4 font-display text-xs font-bold text-slate-950 hover:bg-sky-400"
                    >
                      <span>Select for Racing</span>
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={saveData.coins < carDef.price}
                    onClick={() => setConfirmPurchaseCar(previewCarId)}
                    className={`flex h-9 sm:h-10 items-center gap-2 rounded-xl px-4 font-display text-xs font-bold transition-all ${
                      saveData.coins >= carDef.price
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'border border-slate-700 bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Buy · {carDef.price.toLocaleString()} Coins</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom 3D GLB Car Uploader */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/40 bg-sky-950/25 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Custom 3D Car Model (.glb)</div>
                  <div className="text-[10px] text-slate-300">
                    {customGlbUrl ? 'Active custom GLB loaded! (e.g. cartoon_sports_car.glb)' : 'Upload cartoon_sports_car.glb or any GLB car model'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {customGlbUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomGlbUrl(null)}
                    className="flex h-8 items-center gap-1 rounded-lg border border-red-500/50 bg-red-500/10 px-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                  >
                    Reset Default
                  </button>
                )}
                <label className="cursor-pointer flex h-8 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-xs font-bold text-slate-950 hover:bg-sky-400">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose GLB File</span>
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setCustomGlbUrl(url);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Live Performance Stat Bars */}
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2.5 border-b border-slate-800 pb-3 text-[11px] sm:text-xs">
              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Top Speed</span>
                  <span className="font-mono font-bold text-white tabular-nums">{effectiveStats.topSpeed} KM/H</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${Math.min(100, (effectiveStats.topSpeed / 380) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Acceleration</span>
                  <span className="font-mono font-bold text-white tabular-nums">{effectiveStats.acceleration}/100</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${effectiveStats.acceleration}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Handling</span>
                  <span className="font-mono font-bold text-white tabular-nums">{effectiveStats.handling}/100</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${effectiveStats.handling}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Braking</span>
                  <span className="font-mono font-bold text-white tabular-nums">{effectiveStats.braking}/100</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${effectiveStats.braking}%` }} />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <div className="flex justify-between text-slate-400">
                  <span>Nitro Surge</span>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">{effectiveStats.nitroPower}/100</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${effectiveStats.nitroPower}%` }} />
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Performance Upgrades vs Paint & Wheels */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upgrades')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'upgrades' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Performance Tuning
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paint')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === 'paint' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Paint, Rims & Livery
              </button>
            </div>

            {activeTab === 'upgrades' ? (
              <div className="mt-2.5 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(['engine', 'tires', 'brakes', 'nitro'] as UpgradeCategory[]).map((cat) => {
                  const meta = UPGRADE_METADATA[cat];
                  const lvl = upgrades[cat];
                  const isMax = lvl >= UPGRADE_MAX_LEVEL;
                  const cost = getUpgradeCost(previewCarId, cat, lvl);
                  const canAfford = isOwned && !isMax && saveData.coins >= cost;

                  return (
                    <div
                      key={cat}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 sm:p-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white capitalize">{cat}</span>
                          <span className="font-mono text-sky-400 tabular-nums">
                            Stage {lvl}/{UPGRADE_MAX_LEVEL}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-slate-300 truncate">{meta.label}</div>
                        <div className="mt-1.5 flex gap-1">
                          {[1, 2, 3, 4, 5].map((step) => (
                            <div
                              key={step}
                              className={`h-1.5 flex-1 rounded-full ${
                                lvl >= step ? 'bg-sky-400' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => upgradeCar(previewCarId, cat)}
                        className={`mt-2.5 h-8 w-full rounded-lg font-display text-xs font-bold tabular-nums transition-colors ${
                          !isOwned
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : isMax
                            ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                            : canAfford
                            ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                            : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {!isOwned ? 'Own Car to Tune' : isMax ? 'MAX STAGE' : `Upgrade · ${cost.toLocaleString()}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                  <div className="text-xs font-bold text-white">Bodywork Paint</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BODY_PAINT_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.name}
                        onClick={() => updateCustomization(previewCarId, { bodyColor: sw.hex })}
                        className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full border transition-transform ${
                          custom?.bodyColor === sw.hex
                            ? 'scale-110 border-white ring-2 ring-sky-400'
                            : 'border-slate-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                  <div className="text-xs font-bold text-white">Alloy Wheel Finish</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WHEEL_FINISH_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        title={sw.name}
                        onClick={() => updateCustomization(previewCarId, { wheelColor: sw.hex })}
                        className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full border transition-transform ${
                          custom?.wheelColor === sw.hex
                            ? 'scale-110 border-white ring-2 ring-sky-400'
                            : 'border-slate-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                  <div className="text-xs font-bold text-white">Surface Material</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { id: 'factory_stock', name: 'Gloss Clearcoat' },
                      { id: 'cyber_prism', name: 'Cyber Prism' },
                      { id: 'carbon_stealth', name: 'Forged Carbon' },
                    ].map((skin) => {
                      const unlocked = saveData.ownedCosmetics.includes(skin.id);
                      const active = custom?.skinId === skin.id;
                      return (
                        <button
                          key={skin.id}
                          type="button"
                          onClick={() => {
                            if (unlocked) {
                              updateCustomization(previewCarId, { skinId: skin.id });
                            } else {
                              setScreen('premium_shop');
                            }
                          }}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            active
                              ? 'border-sky-400 bg-sky-500/20 text-white'
                              : unlocked
                              ? 'border-slate-700 bg-slate-950 text-slate-300'
                              : 'border-slate-800 bg-slate-950/60 text-slate-500'
                          }`}
                        >
                          {skin.name} {!unlocked && '🔒'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MonetizationHubScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const grantSandboxBonusCoins = useGameStore((s) => s.grantSandboxBonusCoins);
  const saveData = useGameStore((s) => s.saveData);
  const [dau, setDau] = useState<number>(1000);
  const [claimedBonus, setClaimedBonus] = useState(false);

  const monthlyAdsRevenue = Math.round(((dau * 3 * 30) / 1000) * 3.5);
  const monthlyIapRevenue = Math.round(dau * 30 * 0.015 * 5.0);
  const totalMonthlyUsd = monthlyAdsRevenue + monthlyIapRevenue;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#090d16]/95 safe-area-pad overflow-y-auto overflow-x-hidden select-none">
      <div className="mx-auto w-full max-w-4xl pb-8 p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScreen('main_menu')}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Creator & Developer Earnings Hub 💰
              </h2>
              <p className="text-xs text-slate-400">
                How you earn real revenue when players play NITRO RUSH: Street Legends
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Your Wallet</div>
            <div className="font-mono text-base font-bold text-amber-400">{saveData.coins.toLocaleString()} Coins</div>
          </div>
        </div>

        {/* Hinglish Explanation Card */}
        <div className="mt-5 rounded-2xl border border-sky-500/50 bg-sky-950/20 p-5">
          <h3 className="font-display text-base font-bold text-white">
            Bhai, is game se earning kaise hogi? (Complete Guide)
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Jab players is game ko web, PWA, ya Android App (Play Store) par khetenge, toh aap 4 powerful monetization streams ke zariye paisa kama sakte hain:
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="font-bold text-sky-400">1. Rewarded Video & Interstitial Ads</div>
              <p className="mt-1 text-slate-300">
                Google AdMob ya Unity Ads integration ke zariye jab user extra nitro, double coins, ya daily spin ke liye ad dekhte hain, toh har ad view par aapko eCPM (per 1,000 impressions) ke hisab se dollars milte hain.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="font-bold text-amber-400">2. In-App Purchases (IAP)</div>
              <p className="mt-1 text-slate-300">
                Players game me rare cars, custom GLB car upload slots, aur massive coin packs real money (Google Play Billing / Stripe) se buy karte hain.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="font-bold text-emerald-400">3. Ad-Free VIP Pass</div>
              <p className="mt-1 text-slate-300">
                Players ek-time payment ($1.99 / ₹150) karke saare ads permanently remove kar sakte hain aur VIP racer badge paate hain.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
              <div className="font-bold text-purple-400">4. Brand Sponsorships</div>
              <p className="mt-1 text-slate-300">
                Aap custom branded cars ya sponsored tournament tracks add karke automotive brands ya sponsors se direct sponsorship fee charge kar sakte hain.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Revenue Calculator */}
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <h3 className="font-display text-base font-bold text-white">Estimated Monthly Revenue Calculator</h3>
          <p className="mt-1 text-xs text-slate-400">
            Slide daily active players (DAU) to estimate your monthly earnings potential:
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Daily Active Players (DAU):</span>
              <span className="font-mono text-base font-bold text-sky-400">{dau.toLocaleString()} Players/day</span>
            </div>
            <input
              type="range"
              min="100"
              max="50000"
              step="100"
              value={dau}
              onChange={(e) => setDau(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-center">
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[11px] text-slate-400">Monthly Ad Revenue</div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-400">${monthlyAdsRevenue.toLocaleString()} / mo</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[11px] text-slate-400">Monthly IAP Revenue</div>
                <div className="mt-1 font-mono text-lg font-bold text-amber-400">${monthlyIapRevenue.toLocaleString()} / mo</div>
              </div>
              <div className="rounded-xl bg-sky-950/40 p-3 border border-sky-500/40">
                <div className="text-[11px] text-sky-300 font-semibold">Total Estimated Revenue</div>
                <div className="mt-1 font-mono text-xl font-bold text-white">${totalMonthlyUsd.toLocaleString()} / mo</div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Claim Developer Bonus */}
        <div className="mt-5 rounded-2xl border border-amber-500/50 bg-amber-950/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-white">Test Developer Creator Bonus</h3>
            <p className="mt-1 text-xs text-slate-300">
              Claim a test developer payout of +5,000 Coins right now to test your in-game garage upgrades and custom cars!
            </p>
          </div>
          <button
            type="button"
            disabled={claimedBonus}
            onClick={() => {
              grantSandboxBonusCoins(5000);
              setClaimedBonus(true);
            }}
            className={`h-11 rounded-xl px-5 font-display text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              claimedBonus
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300 cursor-default'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-lg shadow-amber-400/20'
            }`}
          >
            {claimedBonus ? '✓ Claimed +5,000 Coins!' : 'Claim +5,000 Dev Coins'}
          </button>
        </div>
      </div>
    </div>
  );
};

