import React, { useState } from 'react';
import {
  Calendar,
  Check,
  Play,
  RotateCcw,
  Settings,
  Star,
  User,
} from 'lucide-react';
import { CAREER_MISSIONS } from '../data/careerMissions';
import {
  paymentProvider,
  PREMIUM_CATALOG,
  rewardedAdProvider,
  StoreProduct,
} from '../services/MonetizationManager';
import { useGameStore } from '../store/useGameStore';
import { GraphicsQuality, LanguageCode, SteeringMode } from '../types/game';
import { formatRaceTime } from './RaceHUD';

export const DailyRewardsModal: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setScreen = useGameStore((s) => s.setScreen);
  const canClaim = useGameStore((s) => s.canClaimDailyReward());
  const claimDailyReward = useGameStore((s) => s.claimDailyReward);
  const grantSandboxBonusCoins = useGameStore((s) => s.grantSandboxBonusCoins);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [sandboxAdDisclosure, setSandboxAdDisclosure] = useState<string | null>(null);

  const rewardTable = [600, 850, 1100, 1400, 1800, 2200, 3500];
  const currentDayIndex = saveData.dailyRewardStreak % 7;

  const handleClaim = () => {
    const res = claimDailyReward();
    if (res.granted) {
      setStatusMsg(`Claimed Day ${res.streak} Bonus: +${res.coins.toLocaleString()} Coins!`);
    }
  };

  const handleTestSandboxAd = async () => {
    const res = await rewardedAdProvider.showRewardedAd('daily_bonus_slot', 400);
    if (res.status === 'sandbox_completed') {
      grantSandboxBonusCoins(res.rewardCoins);
      setSandboxAdDisclosure(res.disclosure);
      setStatusMsg(`Sandbox Ad Test Completed: +${res.rewardCoins} Coins granted.`);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090d16]/94 safe-area-pad overflow-y-auto overflow-x-hidden">
      <div className="my-auto w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0d1320] p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-5 w-5 text-amber-400 shrink-0" />
            <h2 className="font-display text-lg sm:text-2xl font-bold text-white truncate">
              Daily Driver Rewards
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setScreen('main_menu')}
            className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white shrink-0"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-300">
          Claim your daily syndicate stipend every 20 hours. Consecutive days escalate your coin payout up to Day 7.
        </p>

        <div className="mt-3.5 grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-7 gap-2">
          {rewardTable.map((coins, idx) => {
            const isPast = idx < currentDayIndex;
            const isCurrent = idx === currentDayIndex;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-between rounded-xl border p-2.5 text-center ${
                  isCurrent && canClaim
                    ? 'border-amber-400 bg-amber-500/20'
                    : isPast
                    ? 'border-emerald-500/40 bg-emerald-500/10 opacity-75'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-400">Day {idx + 1}</span>
                <span className="my-1.5 font-mono text-sm font-bold text-amber-400 tabular-nums">
                  {coins.toLocaleString()}
                </span>
                <span className="text-[10px] font-medium text-slate-300">
                  {isPast ? 'Claimed' : isCurrent ? 'Next' : 'Locked'}
                </span>
              </div>
            );
          })}
        </div>

        {statusMsg && (
          <div className="mt-3.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-300">
            {statusMsg}
          </div>
        )}

        {sandboxAdDisclosure && (
          <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-slate-900 p-3 text-[11px] text-slate-300">
            {sandboxAdDisclosure}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-800 pt-3.5">
          <button
            type="button"
            disabled={!canClaim}
            onClick={handleClaim}
            className={`h-10 sm:h-11 rounded-xl px-5 font-display text-xs sm:text-sm font-bold transition-all ${
              canClaim
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {canClaim ? 'Claim Daily Stipend' : 'Already Claimed Today'}
          </button>

          <button
            type="button"
            onClick={handleTestSandboxAd}
            className="h-10 sm:h-11 rounded-xl border border-sky-500/50 bg-sky-500/15 px-4 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
          >
            [Sandbox Ad Provider] Test +400 Bonus Coins
          </button>
        </div>
      </div>
    </div>
  );
};

export const PremiumShopModal: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setScreen = useGameStore((s) => s.setScreen);
  const unlockCosmeticWithCoins = useGameStore((s) => s.unlockCosmeticWithCoins);
  const unlockGarageThemeWithCoins = useGameStore((s) => s.unlockGarageThemeWithCoins);
  const activateSandboxAdFree = useGameStore((s) => s.activateSandboxAdFree);

  const [disclosureBanner, setDisclosureBanner] = useState<string | null>(null);

  const handleProductAction = async (item: StoreProduct) => {
    if (item.category === 'ad_free') {
      const res = await paymentProvider.requestPurchase(item);
      if (res.status === 'sandbox_approved') {
        activateSandboxAdFree();
        setDisclosureBanner(res.disclosure);
      }
      return;
    }

    if (item.category === 'skin' && item.cosmeticId && item.coinPrice) {
      const ok = unlockCosmeticWithCoins(item.cosmeticId, item.coinPrice);
      if (ok) {
        setDisclosureBanner(`Unlocked ${item.title} using earned race coins! Equip it in the Garage.`);
      }
      return;
    }

    if (item.category === 'garage_theme' && item.garageThemeId && item.coinPrice) {
      const ok = unlockGarageThemeWithCoins(item.garageThemeId, item.coinPrice);
      if (ok) {
        setDisclosureBanner(`Activated ${item.title} showroom environment!`);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090d16]/94 safe-area-pad overflow-y-auto overflow-x-hidden">
      <div className="my-auto w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0d1320] p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-2xl font-bold text-white truncate">
              Cosmetics & Syndicate Pass
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              100% cosmetic items — zero pay-to-win stats.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 tabular-nums">
              {saveData.coins.toLocaleString()} Coins
            </span>
            <button
              type="button"
              onClick={() => setScreen('main_menu')}
              className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-sky-500/30 bg-slate-900/90 p-3 text-[11px] sm:text-xs text-slate-300">
          <span className="font-bold text-sky-400">Monetization Provider Disclosure:</span> Real-money transactions and
          rewarded ads use abstract <code className="text-sky-300">PaymentProvider</code> and{' '}
          <code className="text-sky-300">RewardedAdProvider</code> interfaces. In this build, the development sandbox
          provider is active — no real payment credentials exist in the frontend and no real charges occur.
        </div>

        {disclosureBanner && (
          <div className="mt-3 rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-3 text-xs font-semibold text-emerald-300">
            {disclosureBanner}
          </div>
        )}

        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {PREMIUM_CATALOG.map((item) => {
            const isOwned =
              (item.category === 'ad_free' && saveData.adFreeOwned) ||
              (item.cosmeticId && saveData.ownedCosmetics.includes(item.cosmeticId)) ||
              (item.garageThemeId && saveData.ownedCosmetics.includes(`theme_${item.garageThemeId}`));

            const isActiveTheme = item.garageThemeId && saveData.garageTheme === item.garageThemeId;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3.5"
              >
                <div>
                  <div className="text-[11px] font-semibold text-sky-400 uppercase">
                    {item.category.replace('_', ' ')}
                  </div>
                  <h3 className="mt-0.5 font-display text-base sm:text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-slate-800 pt-2.5">
                  <span className="font-mono text-xs font-bold text-amber-400">{item.priceDisplay}</span>

                  {isOwned ? (
                    item.garageThemeId ? (
                      <button
                        type="button"
                        onClick={() => handleProductAction(item)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold ${
                          isActiveTheme
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                        }`}
                      >
                        {isActiveTheme ? 'Active Theme' : 'Apply Theme'}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <Check className="h-4 w-4" /> Owned
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(item.coinPrice && saveData.coins < item.coinPrice)}
                      onClick={() => handleProductAction(item)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        item.coinPrice && saveData.coins < item.coinPrice
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      }`}
                    >
                      {item.category === 'ad_free' ? 'Test Sandbox Unlock' : 'Unlock with Coins'}
                    </button>
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

export const SettingsModal: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const settings = useGameStore((s) => s.saveData.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const resetAllProgress = useGameStore((s) => s.resetAllProgress);
  const setScreen = useGameStore((s) => s.setScreen);

  const [confirmReset, setConfirmReset] = useState(false);

  const handleClose = () => {
    if (onClose) onClose();
    else setScreen('main_menu');
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#090d16]/95 safe-area-pad overflow-y-auto overflow-x-hidden">
      <div className="my-auto w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0d1320] p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-lg sm:text-2xl font-bold text-white">Game Settings</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Done
          </button>
        </div>

        <div className="mt-3.5 space-y-3 text-xs">
          {/* Graphics Quality */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div>
              <div className="font-bold text-white">Graphics Quality Preset</div>
              <div className="text-[11px] text-slate-400">Controls shadows, pixel ratio, speed lines, and city density</div>
            </div>
            <div className="flex items-center gap-1.5">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => updateSettings({ graphicsQuality: q })}
                  className={`rounded-lg px-3 py-1.5 font-bold capitalize transition-colors ${
                    settings.graphicsQuality === q
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Steering Mode */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div>
              <div className="font-bold text-white">Steering Control Layout</div>
              <div className="text-[11px] text-slate-400">Choose on-screen buttons, virtual wheel, or device tilt</div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'buttons', label: 'Buttons' },
                  { id: 'wheel', label: 'Virtual Wheel' },
                  { id: 'tilt', label: 'Tilt Sensor' },
                ] as { id: SteeringMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateSettings({ steeringMode: m.id })}
                  className={`rounded-lg px-2.5 py-1.5 font-bold transition-colors ${
                    settings.steeringMode === m.id
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Steering Sensitivity */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Steering Sensitivity</span>
              <span className="font-mono text-sky-400 tabular-nums">{settings.steeringSensitivity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.6"
              step="0.05"
              value={settings.steeringSensitivity}
              onChange={(e) => updateSettings({ steeringSensitivity: parseFloat(e.target.value) })}
              className="mt-1.5 w-full accent-sky-500"
            />
          </div>

          {/* Audio Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div>
              <div className="flex justify-between font-bold text-white">
                <span>Master Volume</span>
                <span className="tabular-nums">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => updateSettings({ masterVolume: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-bold text-white">
                <span>Synth Music</span>
                <span className="tabular-nums">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-bold text-white">
                <span>Engine & SFX</span>
                <span className="tabular-nums">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => updateSettings({ sfxVolume: parseFloat(e.target.value) })}
                className="mt-1.5 w-full accent-sky-500"
              />
            </div>
          </div>

          {/* Toggles: Mute, Vibration, Reduced Motion, FPS, Language */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ muted: !settings.muted })}
              className={`rounded-xl border p-2 font-bold ${
                settings.muted ? 'border-rose-500 bg-rose-500/20 text-rose-300' : 'border-slate-800 bg-slate-900 text-slate-300'
              }`}
            >
              Audio: {settings.muted ? 'Muted' : 'Active'}
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ vibration: !settings.vibration })}
              className={`rounded-xl border p-2 font-bold ${
                settings.vibration ? 'border-sky-500/50 bg-sky-500/15 text-sky-300' : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              Haptics: {settings.vibration ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
              className={`rounded-xl border p-2 font-bold ${
                settings.reducedMotion ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              Motion: {settings.reducedMotion ? 'Reduced' : 'Full'}
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ showFps: !settings.showFps })}
              className={`rounded-xl border p-2 font-bold ${
                settings.showFps ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              FPS: {settings.showFps ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ language: (settings.language === 'en' ? 'hi' : 'en') as LanguageCode })}
              className="col-span-2 sm:col-span-1 rounded-xl border border-slate-700 bg-slate-900 p-2 font-bold text-white hover:border-sky-400"
            >
              Lang: {settings.language === 'en' ? 'English' : 'हिन्दी'}
            </button>
          </div>

          {/* Local Save Notice & Reset Progress */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
            <div className="text-[11px] text-slate-300">
              <span className="font-bold text-rose-400">Local Save Storage:</span> Progress is stored locally on this
              browser and does not sync across separate devices.
            </div>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-lg border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 whitespace-nowrap shrink-0"
              >
                Reset Progress
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAllProgress();
                    setConfirmReset(false);
                  }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
                >
                  Confirm Wipe
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileModal: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setScreen = useGameStore((s) => s.setScreen);
  const [nameInput, setNameInput] = useState(saveData.playerName);

  const totalStars = Object.values(saveData.missionProgress).reduce((acc, m) => acc + (m.stars || 0), 0);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090d16]/94 safe-area-pad overflow-y-auto overflow-x-hidden">
      <div className="my-auto w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700/80 bg-[#0d1320] p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-lg sm:text-2xl font-bold text-white">Driver Profile</h2>
          </div>
          <button
            type="button"
            onClick={() => setScreen('main_menu')}
            className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-3.5 flex items-center gap-2">
          <input
            type="text"
            value={nameInput}
            maxLength={18}
            onChange={(e) => setNameInput(e.target.value)}
            className="h-10 flex-1 min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-sm font-semibold text-white focus:border-sky-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setPlayerName(nameInput)}
            className="h-10 rounded-xl bg-sky-500 px-4 font-display text-xs font-bold text-slate-950 hover:bg-sky-400 shrink-0"
          >
            Save Callsign
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 tabular-nums">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="text-xs text-slate-400">Driver Level</div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-sky-400">
              LVL {saveData.level} <span className="text-xs font-normal text-slate-400">({saveData.xp} XP)</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="text-xs text-slate-400">Races / Wins</div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
              {saveData.totalWins} <span className="text-sm font-normal text-slate-400">/ {saveData.totalRaces}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="text-xs text-slate-400">Career Stars</div>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-amber-400">{totalStars} / 60</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="text-xs text-slate-400">Distance Driven</div>
            <div className="mt-1 font-display text-lg sm:text-xl font-bold text-white">{saveData.totalDistanceKm} KM</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="text-xs text-slate-400">Lifetime Drift Pts</div>
            <div className="mt-1 font-display text-lg sm:text-xl font-bold text-amber-400">
              {saveData.totalDriftPoints.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
            <div className="text-xs text-slate-400">Garage Collection</div>
            <div className="mt-1 font-display text-lg sm:text-xl font-bold text-emerald-400">
              {saveData.ownedCars.length} / 4 Cars
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PauseAndResultsOverlay: React.FC = () => {
  const isPaused = useGameStore((s) => s.isPaused);
  const lastRaceResult = useGameStore((s) => s.lastRaceResult);
  const setPaused = useGameStore((s) => s.setPaused);
  const restartActiveRace = useGameStore((s) => s.restartActiveRace);
  const quitRaceToMenu = useGameStore((s) => s.quitRaceToMenu);
  const startCareerMission = useGameStore((s) => s.startCareerMission);
  const grantSandboxBonusCoins = useGameStore((s) => s.grantSandboxBonusCoins);

  const [showSettingsInPause, setShowSettingsInPause] = useState(false);
  const [adBonusClaimed, setAdBonusClaimed] = useState(false);

  if (showSettingsInPause) {
    return <SettingsModal onClose={() => setShowSettingsInPause(false)} />;
  }

  // Race Finished Modal
  if (lastRaceResult) {
    const nextMissionId =
      lastRaceResult.missionId && lastRaceResult.missionId < CAREER_MISSIONS.length
        ? lastRaceResult.missionId + 1
        : null;

    const handleSandboxBonus = async () => {
      if (adBonusClaimed) return;
      const res = await rewardedAdProvider.showRewardedAd('post_race_bonus', 350);
      if (res.status === 'sandbox_completed') {
        grantSandboxBonusCoins(res.rewardCoins);
        setAdBonusClaimed(true);
      }
    };

    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#090d16]/94 safe-area-pad overflow-y-auto overflow-x-hidden">
        <div className="my-auto w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-sky-500/50 bg-[#0d1320] p-4 sm:p-6 text-center shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
            {lastRaceResult.missionId ? `Career Mission ${lastRaceResult.missionId}` : 'Event Complete'}
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
            {lastRaceResult.position === 1
              ? 'VICTORY · 1ST PLACE'
              : lastRaceResult.missionPassed
              ? `OBJECTIVE CLEARED · P${lastRaceResult.position}`
              : `FINISHED P${lastRaceResult.position}`}
          </h2>

          <div className="mt-2.5 flex items-center justify-center gap-2">
            {[1, 2, 3].map((idx) => (
              <Star
                key={idx}
                className={`h-6 w-6 sm:h-7 sm:w-7 ${
                  lastRaceResult.starsEarned >= idx ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 text-left text-xs tabular-nums">
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 sm:p-3">
              <div className="text-slate-400">Total Race Time</div>
              <div className="mt-0.5 font-mono text-sm sm:text-base font-bold text-white">
                {formatRaceTime(lastRaceResult.elapsedMs)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 sm:p-3">
              <div className="text-slate-400">Best Lap</div>
              <div className="mt-0.5 font-mono text-sm sm:text-base font-bold text-sky-400">
                {formatRaceTime(lastRaceResult.bestLapMs)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 sm:p-3">
              <div className="text-slate-400">Coins Earned</div>
              <div className="mt-0.5 font-mono text-sm sm:text-base font-bold text-amber-400">
                +{lastRaceResult.coinsEarned.toLocaleString()}
                {lastRaceResult.firstClearBonus > 0 && (
                  <span className="ml-1 text-[11px] text-emerald-400">
                    (+{lastRaceResult.firstClearBonus})
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 sm:p-3">
              <div className="text-slate-400">XP & Drift Score</div>
              <div className="mt-0.5 font-mono text-sm sm:text-base font-bold text-white">
                +{lastRaceResult.xpEarned} XP · {lastRaceResult.driftScore.toLocaleString()} Pts
              </div>
            </div>
          </div>

          <div className="mt-3.5">
            <button
              type="button"
              disabled={adBonusClaimed}
              onClick={handleSandboxBonus}
              className={`w-full rounded-xl border py-2 px-3 text-xs font-semibold transition-colors ${
                adBonusClaimed
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              {adBonusClaimed
                ? 'Sandbox Bonus Claimed (+350 Coins)'
                : '[Sandbox Ad Test] Claim +350 Bonus Race Coins'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAdBonusClaimed(false);
                restartActiveRace();
              }}
              className="flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 text-xs font-bold text-slate-200 hover:border-sky-400 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry</span>
            </button>

            {nextMissionId && lastRaceResult.missionPassed && (
              <button
                type="button"
                onClick={() => {
                  setAdBonusClaimed(false);
                  startCareerMission(nextMissionId);
                }}
                className="flex h-10 sm:h-11 items-center gap-1.5 rounded-xl bg-sky-500 px-5 font-display text-xs sm:text-sm font-bold text-slate-950 hover:bg-sky-400"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Next Mission (M{nextMissionId})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAdBonusClaimed(false);
                quitRaceToMenu(lastRaceResult.missionId ? 'career' : 'main_menu');
              }}
              className="flex h-10 sm:h-11 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-700"
            >
              <span>Continue</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pause Modal
  if (!isPaused) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#090d16]/92 safe-area-pad">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/80 bg-[#0d1320] p-5 sm:p-6 text-center shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-white">RACE PAUSED</h2>
        <p className="mt-1 text-xs text-slate-400">Simulation suspended</p>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setPaused(false)}
            className="h-10 sm:h-11 w-full rounded-xl bg-sky-500 font-display text-sm font-bold text-slate-950 hover:bg-sky-400"
          >
            Resume Race
          </button>

          <button
            type="button"
            onClick={restartActiveRace}
            className="h-10 sm:h-11 w-full rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200 hover:border-sky-400 hover:text-white"
          >
            Restart Race
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsInPause(true)}
            className="h-10 sm:h-11 w-full rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200 hover:border-sky-400 hover:text-white"
          >
            Settings & Controls
          </button>

          <button
            type="button"
            onClick={() => quitRaceToMenu('main_menu')}
            className="h-10 sm:h-11 w-full rounded-xl border border-rose-500/40 bg-rose-500/15 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
          >
            Exit to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
