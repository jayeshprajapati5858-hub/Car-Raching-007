import React from 'react';
import { Pause, Zap, Flame } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { liveTelemetry } from '../game/RaceBridge';

export const HighwayHUD: React.FC = () => {
  const setPaused = useGameStore((s) => s.setPaused);
  const [telemetry, setTelemetry] = React.useState({ ...liveTelemetry });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry({ ...liveTelemetry });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* Top Bar: Speedometer, Distance, Combo & Pause */}
      <div className="flex items-start justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-[#080c14]/90 px-4 py-2.5 backdrop-blur-md shadow-lg">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Speed</span>
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className="font-display text-3xl font-extrabold text-white">{telemetry.speedKmh}</span>
              <span className="text-xs font-bold text-sky-400">KM/H</span>
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-[#080c14]/90 px-4 py-2.5 backdrop-blur-md shadow-lg">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Distance</span>
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className="font-display text-2xl font-bold text-amber-400">{telemetry.driftScoreTotal}</span>
              <span className="text-xs font-bold text-slate-400">PTS</span>
            </div>
          </div>
        </div>

        {/* Combo Multiplier Badge */}
        {telemetry.nearMissCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/60 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 animate-pulse">
            <Flame className="h-4 w-4 text-amber-400 fill-current" />
            <span>Near Misses: {telemetry.nearMissCount}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPaused(true)}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#080c14]/90 hover:border-sky-500 transition-colors shadow-lg"
        >
          <Pause className="h-5 w-5 text-sky-400" />
        </button>
      </div>

      {/* Bottom Nitro Gauge */}
      <div className="flex items-end justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-[#080c14]/90 px-4 py-2.5 backdrop-blur-md shadow-lg">
            <Zap className="h-5 w-5 text-sky-400 fill-current" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-slate-400">NITRO</span>
              <div className="h-2 w-28 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-100"
                  style={{ width: `${telemetry.nitroAmount}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
