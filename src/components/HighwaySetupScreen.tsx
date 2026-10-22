import React, { useState } from 'react';
import { ArrowLeft, Flag, Play, Shield, Zap } from 'lucide-react';
import { HIGHWAY_THEMES } from '../game/HighwayTrackBuilder';
import { useGameStore } from '../store/useGameStore';
import { GameMode } from '../types/game';

export const HighwaySetupScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const saveData = useGameStore((s) => s.saveData);

  const [selectedTheme, setSelectedTheme] = useState<string>('midnight_express');
  const [gameMode, setGameMode] = useState<GameMode>('highway_endless');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  const startHighwayRace = useGameStore((s) => s.startQuickRace); // or custom highway start action

  const handleStart = () => {
    // Start active race with highway config
    useGameStore.setState({
      activeRace: {
        sessionId: `highway_${Date.now()}`,
        mode: gameMode,
        trackId: 'coastal_highway',
        laps: 1,
        aiCount: 0,
        aiDifficulty: difficulty === 'easy' ? 'beginner' : difficulty === 'hard' ? 'hard' : 'normal',
      },
      screen: 'racing',
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#080c14]/95 backdrop-blur-md p-4 sm:p-8 select-none text-white overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setScreen('main_menu')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 hover:border-sky-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-sky-400" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">HIGHWAY TRAFFIC</h1>
            <p className="text-xs text-slate-400">High-speed endless traffic weaving & near-miss scoring</p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-300">
          Best Distance: <span className="font-bold text-sky-400">{saveData.highwayBestDistanceM || 0} M</span>
        </div>
      </div>

      {/* Main Grid Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full my-auto">
        {/* Game Mode */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold text-sky-400 uppercase tracking-wider">Select Mode</h2>
          <div className="flex flex-col gap-2">
            {[
              { id: 'highway_endless', name: 'Endless Highway', desc: 'Drive as far as possible without totaling your car' },
              { id: 'highway_time', name: 'Time Trial', desc: 'Cover maximum distance before 60-second timer expires' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setGameMode(m.id as GameMode)}
                className={`flex flex-col text-left rounded-xl p-3 border transition-all ${
                  gameMode === m.id
                    ? 'border-sky-500 bg-sky-500/15 text-white ring-1 ring-sky-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-sm">{m.name}</span>
                <span className="text-xs text-slate-400 mt-0.5">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Environment Theme */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold text-sky-400 uppercase tracking-wider">Highway Route</h2>
          <div className="flex flex-col gap-2">
            {Object.values(HIGHWAY_THEMES).map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={`flex flex-col text-left rounded-xl p-3 border transition-all ${
                  selectedTheme === theme.id
                    ? 'border-sky-500 bg-sky-500/15 text-white ring-1 ring-sky-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-sm">{theme.name}</span>
                <span className="text-xs text-slate-400 mt-0.5">{theme.isNight ? 'Night Neon Lights' : 'Daytime Sunset'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Traffic Density & Difficulty */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 flex flex-col gap-3">
          <h2 className="font-display text-sm font-bold text-sky-400 uppercase tracking-wider">Traffic Density</h2>
          <div className="flex flex-col gap-2">
            {[
              { id: 'easy', name: 'Light Traffic', desc: 'Fewer civilian vehicles, relaxed cruising' },
              { id: 'normal', name: 'Dense Traffic', desc: 'Standard rush hour highway traffic' },
              { id: 'hard', name: 'Extreme Rush', desc: 'Heavy high-speed traffic wall-to-wall' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.id as any)}
                className={`flex flex-col text-left rounded-xl p-3 border transition-all ${
                  difficulty === d.id
                    ? 'border-sky-500 bg-sky-500/15 text-white ring-1 ring-sky-500'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-sm">{d.name}</span>
                <span className="text-xs text-slate-400 mt-0.5">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start Button Footer */}
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleStart}
          className="flex h-12 sm:h-14 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-8 sm:px-12 font-display text-base sm:text-lg font-bold text-slate-950 hover:bg-sky-400 active:scale-95 transition-all shadow-xl shadow-sky-500/30"
        >
          <Play className="h-5 w-5 fill-current" />
          <span>START HIGHWAY RACE</span>
        </button>
      </div>
    </div>
  );
};
