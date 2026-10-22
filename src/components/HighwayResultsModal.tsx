import React from 'react';
import { Award, Coins, Flag, RefreshCw, Trophy } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

interface HighwayResultsModalProps {
  results: {
    distanceMeters: number;
    score: number;
    nearMisses: number;
    coinsEarned: number;
    elapsedSec: number;
  };
  onRetry: () => void;
  onMainMenu: () => void;
}

export const HighwayResultsModal: React.FC<HighwayResultsModalProps> = ({ results, onRetry, onMainMenu }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#080c14]/90 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/85 bg-[#0b101d] p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-500/50 text-sky-400 mb-4">
          <Trophy className="h-7 w-7" />
        </div>

        <h2 className="font-display text-2xl font-extrabold text-white">HIGHWAY RUN COMPLETED</h2>
        <p className="text-xs text-slate-400 mt-1">Great driving! Here are your run statistics.</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full my-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Distance</span>
            <span className="font-display text-2xl font-bold text-white mt-1">{results.distanceMeters} M</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Score</span>
            <span className="font-display text-2xl font-bold text-sky-400 mt-1">{results.score}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Near Misses</span>
            <span className="font-display text-2xl font-bold text-amber-400 mt-1">{results.nearMisses}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Coins Earned</span>
            <div className="flex items-center gap-1 mt-1">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="font-display text-2xl font-bold text-amber-400">+{results.coinsEarned}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 font-display text-sm font-bold text-slate-950 hover:bg-sky-400 active:scale-95 transition-all shadow-lg shadow-sky-500/25"
          >
            <RefreshCw className="h-4 w-4" />
            <span>PLAY AGAIN</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 font-display text-sm font-bold text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-all"
          >
            <Flag className="h-4 w-4 text-sky-400" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
