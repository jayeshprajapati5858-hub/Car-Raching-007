import React, { useState } from 'react';
import { Sparkles, RotateCw, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { audioManager } from '../services/AudioManager';

export const LuckySpinModal: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const grantSandboxBonusCoins = useGameStore((s) => s.grantSandboxBonusCoins);
  const saveData = useGameStore((s) => s.saveData);

  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ title: string; coins: number } | null>(null);

  const prizes = [
    { title: 'Neon Turbo Pack', coins: 750 },
    { title: 'Street Legend Jackpot', coins: 3500 },
    { title: 'Nitro Surge Bonus', coins: 1200 },
    { title: 'Racer Stipend', coins: 500 },
    { title: 'Midnight Drift Cache', coins: 2000 },
    { title: 'Supercar Fund', coins: 5000 },
  ];

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setWonPrize(null);
    audioManager.playClick();

    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
        grantSandboxBonusCoins(randomPrize.coins);
        setWonPrize(randomPrize);
        setSpinning(false);
        audioManager.playVictory(true);
      }
    }, 100);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#090d16]/95 safe-area-pad p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl border border-sky-500/40 bg-[#0d1320] p-6 shadow-2xl text-center">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400 animate-spin" />
            <h2 className="font-display text-xl font-bold text-white">Lucky Street Spin 🎰</h2>
          </div>
          <button
            type="button"
            onClick={() => setScreen('main_menu')}
            className="rounded-xl border border-slate-700 p-1.5 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-300">
          Spin the wheel of fortune to instantly win high-stakes coin bounties and fund your garage hypercars!
        </p>

        <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-inner">
          <div className="text-xs uppercase tracking-widest text-slate-400">Current Prize Pool</div>
          <div className="my-3 font-display text-3xl font-extrabold text-amber-400 tabular-nums">
            {spinning ? 'SPINNING...' : wonPrize ? `+${wonPrize.coins.toLocaleString()} Coins!` : 'Up to 5,000 Coins'}
          </div>
          <div className="text-sm font-semibold text-sky-400">
            {spinning ? 'Feeling the adrenaline rush...' : wonPrize ? wonPrize.title : 'Tap spin to test your luck!'}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-left">
            <div className="text-[11px] text-slate-400">Wallet Balance</div>
            <div className="font-mono text-sm font-bold text-amber-400">{saveData.coins.toLocaleString()} Coins</div>
          </div>
          <button
            type="button"
            disabled={spinning}
            onClick={handleSpin}
            className={`flex h-12 items-center gap-2 rounded-xl px-6 font-display text-sm font-bold shadow-lg transition-all ${
              spinning
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-400/20'
            }`}
          >
            <RotateCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
            <span>{spinning ? 'Spinning...' : 'Spin Now!'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
