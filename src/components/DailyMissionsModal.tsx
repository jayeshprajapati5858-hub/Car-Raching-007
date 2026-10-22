import React, { useEffect, useState } from 'react';
import { Award, Check, Clock, Sparkles, Trophy, X } from 'lucide-react';
import { DAILY_MISSIONS_CATALOG } from '../data/dailyMissions';
import { audioManager } from '../services/AudioManager';
import { useGameStore } from '../store/useGameStore';

export const DailyMissionsModal: React.FC = () => {
  const saveData = useGameStore((s) => s.saveData);
  const setScreen = useGameStore((s) => s.setScreen);
  const claimDailyMissionReward = useGameStore((s) => s.claimDailyMissionReward);

  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [claimToast, setClaimToast] = useState<string | null>(null);

  // Calculate time until midnight UTC reset
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeLeftStr(`${hours}h ${mins}m ${secs}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = (missionId: string, rewardCoins: number, decalId?: string) => {
    audioManager.playClick();
    const res = claimDailyMissionReward(missionId);
    if (res.granted) {
      setClaimToast(`Claimed +${res.coins} Coins${decalId ? ' & Exclusive Decal!' : ''}!`);
      setTimeout(() => setClaimToast(null), 3500);
    }
  };

  const missionsState = saveData.dailyMissions || {};

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-sky-500/30 bg-[#090d16]/95 p-5 sm:p-7 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/25 border border-amber-500/50 text-amber-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                Daily Missions
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-sky-400" />
                <span>Resets in: <strong className="text-white tabular-nums">{timeLeftStr}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setScreen('main_menu')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:border-sky-500 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Claim Toast Banner */}
        {claimToast && (
          <div className="my-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-500/20 py-2.5 px-4 text-xs sm:text-sm font-semibold text-emerald-200 animate-bounce">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>{claimToast}</span>
          </div>
        )}

        {/* Mission List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3.5 pr-1">
          {DAILY_MISSIONS_CATALOG.map((mission) => {
            const entry = missionsState[mission.id] || { progress: 0, completed: false, claimed: false };
            const percent = Math.min(100, Math.round((entry.progress / mission.target) * 100));

            return (
              <div
                key={mission.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                  entry.claimed
                    ? 'border-slate-800 bg-slate-900/40 opacity-70'
                    : entry.completed
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                      {mission.title}
                    </h3>
                    {entry.completed && !entry.claimed && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        Ready to Claim
                      </span>
                    )}
                    {entry.claimed && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Claimed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{mission.description}</p>

                  {/* Progress Bar */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          entry.completed ? 'bg-amber-400' : 'bg-sky-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 tabular-nums shrink-0">
                      {entry.progress} / {mission.target}
                    </span>
                  </div>
                </div>

                {/* Reward & Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-amber-400">+{mission.rewardCoins} Coins</span>
                    {mission.rewardDecalId && (
                      <span className="flex items-center gap-1 rounded-lg bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[10px] text-sky-300">
                        <Award className="h-3 w-3 text-sky-400" /> Decal
                      </span>
                    )}
                  </div>

                  {entry.claimed ? (
                    <button
                      type="button"
                      disabled
                      className="flex h-9 items-center justify-center rounded-xl bg-slate-800 px-4 text-xs font-semibold text-slate-500 cursor-not-allowed w-full sm:w-auto"
                    >
                      Claimed
                    </button>
                  ) : entry.completed ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(mission.id, mission.rewardCoins, mission.rewardDecalId)}
                      className="flex h-9 items-center justify-center rounded-xl bg-amber-500 px-5 font-display text-xs font-bold text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/20 w-full sm:w-auto animate-pulse"
                    >
                      Claim Reward
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex h-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-4 text-xs font-semibold text-slate-400 cursor-not-allowed w-full sm:w-auto"
                    >
                      In Progress ({percent}%)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 border-t border-slate-800 pt-3 text-center text-[11px] text-slate-400 shrink-0">
          Complete daily missions every day to accumulate wealth, unlock exclusive custom liveries, and dominate the streets!
        </div>

      </div>
    </div>
  );
};
