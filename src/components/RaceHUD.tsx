import React, { useEffect, useState } from 'react';
import { Camera, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { CAREER_MISSIONS } from '../data/careerMissions';
import { TRACK_CATALOG } from '../data/tracks';
import { controlInputs, liveTelemetry } from '../game/RaceBridge';
import { t } from '../services/Localization';
import { useGameStore } from '../store/useGameStore';
import { LiveRaceTelemetry } from '../types/game';

export function formatRaceTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '--:--.--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export const RaceHUD: React.FC = () => {
  const activeRace = useGameStore((s) => s.activeRace);
  const isPaused = useGameStore((s) => s.isPaused);
  const setPaused = useGameStore((s) => s.setPaused);
  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const settings = useGameStore((s) => s.saveData.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  const [hudState, setHudState] = useState<LiveRaceTelemetry>(() => ({ ...liveTelemetry }));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHudState({
        ...liveTelemetry,
        standings: [...liveTelemetry.standings],
        minimapRacers: [...liveTelemetry.minimapRacers],
      });
    }, 45);
    return () => clearInterval(interval);
  }, []);

  if (!activeRace) return null;

  const trackDef = TRACK_CATALOG[activeRace.trackId];
  const mission = activeRace.missionId ? CAREER_MISSIONS.find((m) => m.id === activeRace.missionId) : null;
  const lang = settings.language;

  const minimapPolyline = hudState.minimapPoints
    .map(([x, y]) => `${(x * 100).toFixed(1)},${(y * 100).toFixed(1)}`)
    .join(' ');

  const showSpeedLines =
    !settings.reducedMotion &&
    settings.graphicsQuality !== 'low' &&
    hudState.racePhase === 'RACING' &&
    (hudState.nitroActive || hudState.speedKmh > 205);

  const renderSpeedometerContent = () => (
    <>
      {/* Speed & Gear */}
      <div className="flex items-baseline gap-1.5 sm:gap-2">
        <div className="font-display text-2xl sm:text-4xl font-bold text-white tabular-nums leading-none min-w-[3ch] text-right">
          {hudState.speedKmh}
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[10px] font-bold text-sky-400 leading-tight">{t(lang, 'speed')}</span>
          <span className="font-mono text-[10px] sm:text-xs font-semibold text-slate-400 tabular-nums leading-tight">
            G{hudState.gear}
          </span>
        </div>
      </div>

      {/* Nitro & RPM Progress Bars */}
      <div className="flex flex-col gap-1 w-24 sm:w-36">
        <div className="hidden sm:flex items-center justify-between text-[9px] font-medium text-slate-400">
          <span>RPM</span>
          <span className="tabular-nums">{Math.round(hudState.rpmNormalized * 8500)}</span>
        </div>
        <div className="hidden sm:block h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 transition-all duration-75"
            style={{ width: `${Math.min(100, Math.round(hudState.rpmNormalized * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold">
          <span className={hudState.nitroActive ? 'text-orange-400 font-bold' : 'text-sky-400'}>
            {t(lang, 'nitro')}
          </span>
          <span className="tabular-nums text-slate-300">{hudState.nitroAmount}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 p-[1px]">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              hudState.nitroActive
                ? 'bg-gradient-to-r from-sky-400 to-orange-500'
                : 'bg-gradient-to-r from-sky-500 to-cyan-300'
            }`}
            style={{ width: `${hudState.nitroAmount}%` }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between safe-area-pad select-none overflow-hidden">
      {/* Subtle Peripheral Speed Lines Overlay */}
      {showSpeedLines && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full animate-speed-lines"
        >
          <g
            stroke={hudState.nitroActive ? '#38bdf8' : '#e2e8f0'}
            strokeWidth="0.22"
            strokeOpacity={hudState.nitroActive ? '0.45' : '0.24'}
          >
            <line x1="0" y1="12" x2="16" y2="28" />
            <line x1="0" y1="35" x2="12" y2="42" />
            <line x1="0" y1="68" x2="14" y2="58" />
            <line x1="0" y1="88" x2="18" y2="72" />
            <line x1="100" y1="12" x2="84" y2="28" />
            <line x1="100" y1="35" x2="88" y2="42" />
            <line x1="100" y1="68" x2="86" y2="58" />
            <line x1="100" y1="88" x2="82" y2="72" />
            <line x1="22" y1="0" x2="34" y2="14" />
            <line x1="78" y1="0" x2="66" y2="14" />
          </g>
        </svg>
      )}

      {/* Top HUD Section: Non-overlapping Top Bar + Mobile Speedometer Dock */}
      <div className="relative z-10 flex flex-col gap-1.5 w-full">
        <div className="flex items-start justify-between gap-1.5 sm:gap-3 w-full">
          {/* Top Left: Position, Current Lap & Optional Minimap */}
          <div className="flex items-start gap-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 rounded-xl border border-sky-500/30 bg-[#090d16]/88 px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-lg">
              {activeRace.aiCount > 0 && activeRace.mode !== 'traffic_run' && (
                <div>
                  <div className="text-[8px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t(lang, 'position')}
                  </div>
                  <div className="font-display text-base sm:text-2xl font-bold text-sky-400 tabular-nums leading-none">
                    {hudState.position}
                    <span className="text-[10px] sm:text-sm font-normal text-slate-400">/{hudState.totalRacers}</span>
                  </div>
                </div>
              )}
              <div>
                <div className="text-[8px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t(lang, 'lap')}
                </div>
                <div className="font-display text-base sm:text-2xl font-bold text-white tabular-nums leading-none">
                  {hudState.lap}
                  <span className="text-[10px] sm:text-sm font-normal text-slate-400">/{hudState.totalLaps}</span>
                </div>
              </div>
              <div className="hidden lg:block border-l border-slate-800 pl-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Gate</div>
                <div className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                  {hudState.checkpointIndex}/{hudState.totalCheckpoints}
                </div>
              </div>
            </div>

            {/* Compact Vector Minimap on medium+ screens */}
            {hudState.minimapPoints.length > 2 && (
              <div className="hidden md:flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-xl border border-slate-700/80 bg-[#090d16]/88 p-1.5 shadow-lg">
                <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
                  <polygon
                    points={minimapPolyline}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="6"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={minimapPolyline}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  {hudState.minimapRacers.map((dot, idx) => (
                    <circle
                      key={idx}
                      cx={dot.x * 100}
                      cy={dot.y * 100}
                      r={dot.isPlayer ? 5.2 : 3.6}
                      fill={dot.isPlayer ? '#38bdf8' : dot.color}
                      stroke="#090d16"
                      strokeWidth="1.5"
                    />
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Top Center: Race Timer */}
          <div className="flex flex-col items-center rounded-xl border border-sky-500/30 bg-[#090d16]/88 px-2.5 py-1 sm:px-4 sm:py-2 shadow-lg min-w-0">
            <div className="text-[8px] sm:text-[11px] font-medium text-slate-400 truncate max-w-[105px] sm:max-w-[220px]">
              {mission ? `M${mission.id} · ${mission.title}` : trackDef.name}
            </div>
            <div className="font-mono text-sm sm:text-2xl font-bold text-white tabular-nums tracking-tight leading-tight">
              {formatRaceTime(hudState.elapsedMs)}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 tabular-nums">
              <span>Best: {formatRaceTime(hudState.bestLapMs)}</span>
              {hudState.driftScoreTotal > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold">Drift: {hudState.driftScoreTotal.toLocaleString()}</span>
                </>
              )}
              {hudState.nearMissCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">Near Miss: {hudState.nearMissCount}</span>
                </>
              )}
            </div>
          </div>

          {/* Top Right: Camera Switch, Reset, Mute & Pause */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 shrink-0">
            {settings.showFps && (
              <div className="hidden sm:block rounded-lg border border-slate-700/80 bg-[#090d16]/88 px-2 py-1.5 font-mono text-[11px] text-emerald-400 tabular-nums">
                {hudState.fps} FPS
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                controlInputs.resetRequested = true;
              }}
              title="Reset Car to Track (R)"
              className="flex h-8 w-8 sm:h-10 sm:w-auto sm:px-2.5 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#090d16]/88 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-transform shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
              <span className="hidden lg:inline">{t(lang, 'resetCar')}</span>
            </button>

            <button
              type="button"
              onClick={cycleCameraMode}
              title="Switch Camera View (C)"
              className="flex h-8 w-8 sm:h-10 sm:w-auto sm:px-2.5 items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#090d16]/88 text-xs font-semibold text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-transform shrink-0"
            >
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
              <span className="hidden lg:inline capitalize">{cameraMode.replace('_', ' ')}</span>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ muted: !settings.muted })}
              title="Mute / Unmute Audio (M)"
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-[#090d16]/88 text-slate-200 hover:border-sky-500 hover:text-white active:scale-95 transition-transform shrink-0"
            >
              {settings.muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
            </button>

            <button
              type="button"
              onClick={() => setPaused(!isPaused)}
              title="Pause Race (Esc)"
              className="flex h-8 sm:h-10 items-center gap-1.5 rounded-xl border border-sky-500/50 bg-[#090d16]/95 px-2 sm:px-3.5 text-xs font-bold text-white hover:bg-sky-500/20 active:scale-95 transition-transform whitespace-nowrap shrink-0"
            >
              <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400" />
              <span className="hidden sm:inline">{t(lang, 'pause')}</span>
            </button>
          </div>
        </div>

        {/* Mobile Speedometer & Nitro Dock (Tucked under top bar on < md screens so center car & bottom buttons are 100% clear) */}
        <div className="flex md:hidden items-center justify-between gap-2.5 self-start rounded-xl border border-sky-500/35 bg-[#090d16]/90 px-3 py-1 shadow-lg">
          {renderSpeedometerContent()}
        </div>
      </div>

      {/* Center Dynamic Alerts: Countdown (3 -> 2 -> 1 -> GO!) / Wrong Way / Active Drift Multiplier */}
      <div className="pointer-events-none flex flex-col items-center justify-center my-auto">
        {(hudState.racePhase === 'COUNTDOWN' ||
          (hudState.racePhase === 'RACING' && hudState.countdownStage === 'GO')) &&
          hudState.countdownStage !== null && (
            <div className="pointer-events-none rounded-2xl border border-sky-500/40 bg-[#090d16]/95 px-8 py-4 sm:px-10 sm:py-5 text-center shadow-2xl">
              <div className="text-[11px] sm:text-xs font-semibold text-slate-400">
                {hudState.countdownStage === 'GO' ? 'Launch Active' : 'Prepare to Launch'}
              </div>
              <div
                key={hudState.countdownStage}
                className={`animate-countdown-pop font-display text-5xl sm:text-7xl font-bold tracking-tight tabular-nums ${
                  hudState.countdownStage === 'GO' ? 'text-emerald-400' : 'text-sky-400'
                }`}
              >
                {hudState.countdownStage === 'GO' ? 'GO!' : hudState.countdownStage}
              </div>
            </div>
          )}

        {hudState.wrongWay && hudState.racePhase === 'RACING' && hudState.countdownStage === null && (
          <div className="pointer-events-none rounded-xl border border-rose-500 bg-[#090d16]/95 px-5 py-2 text-center shadow-xl">
            <div className="font-display text-sm sm:text-lg font-bold text-rose-400">Wrong Direction · Turn Around</div>
          </div>
        )}

        {hudState.isDrifting && hudState.driftScoreCurrent > 25 && hudState.racePhase === 'RACING' && (
          <div className="pointer-events-none mt-2 rounded-xl border border-amber-500/60 bg-[#090d16]/90 px-3.5 py-1 text-center">
            <span className="font-display text-xs sm:text-sm font-bold text-amber-400 tabular-nums">
              DRIFT +{hudState.driftScoreCurrent.toLocaleString()} PTS
            </span>
          </div>
        )}
      </div>

      {/* Desktop / Wide Landscape Bottom-Center Speedometer (Hidden on narrow mobile screens so it never blocks car or pedals) */}
      <div className="pointer-events-none relative z-10 mx-auto hidden md:flex items-center gap-4 rounded-2xl border border-sky-500/35 bg-[#090d16]/90 px-5 py-2 shadow-xl">
        {renderSpeedometerContent()}
      </div>
    </div>
  );
};
