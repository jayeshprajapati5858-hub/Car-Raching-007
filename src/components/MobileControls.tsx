import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Disc, Flame } from 'lucide-react';
import { clearControlInputs, controlInputs } from '../game/RaceBridge';
import { audioManager } from '../services/AudioManager';
import { t } from '../services/Localization';
import { useGameStore } from '../store/useGameStore';

export const MobileControls: React.FC = () => {
  const screen = useGameStore((s) => s.screen);
  const isPaused = useGameStore((s) => s.isPaused);
  const setPaused = useGameStore((s) => s.setPaused);
  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const settings = useGameStore((s) => s.saveData.settings);

  const [uiActiveState, setUiActiveState] = useState({
    left: false,
    right: false,
    throttle: false,
    brake: false,
    nitro: false,
    drift: false,
    wheelAngleDeg: 0,
  });

  const wheelCenterRef = useRef<{ x: number; y: number } | null>(null);
  const wheelPointerIdRef = useRef<number | null>(null);

  const syncVisuals = () => {
    setUiActiveState({
      left: controlInputs.left,
      right: controlInputs.right,
      throttle: controlInputs.throttle,
      brake: controlInputs.brake,
      nitro: controlInputs.nitro,
      drift: controlInputs.drift,
      wheelAngleDeg: Math.round(controlInputs.analogSteer * 65),
    });
  };

  // Keyboard listener for desktop play + clear held keys on window blur
  useEffect(() => {
    if (screen !== 'racing') {
      clearControlInputs();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      audioManager.unlock();
      const code = e.code;

      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        setPaused(!useGameStore.getState().isPaused);
        return;
      }
      if (useGameStore.getState().isPaused) return;

      if (code === 'KeyC') {
        cycleCameraMode();
        return;
      }
      if (code === 'KeyR') {
        controlInputs.resetRequested = true;
        return;
      }

      if (code === 'KeyW' || code === 'ArrowUp') controlInputs.throttle = true;
      if (code === 'KeyS' || code === 'ArrowDown') controlInputs.brake = true;
      if (code === 'KeyA' || code === 'ArrowLeft') {
        controlInputs.useAnalog = false;
        controlInputs.left = true;
      }
      if (code === 'KeyD' || code === 'ArrowRight') {
        controlInputs.useAnalog = false;
        controlInputs.right = true;
      }
      if (code === 'Space') {
        e.preventDefault();
        controlInputs.drift = true;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyN') {
        controlInputs.nitro = true;
      }
      syncVisuals();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') controlInputs.throttle = false;
      if (code === 'KeyS' || code === 'ArrowDown') controlInputs.brake = false;
      if (code === 'KeyA' || code === 'ArrowLeft') controlInputs.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') controlInputs.right = false;
      if (code === 'Space') controlInputs.drift = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyN') controlInputs.nitro = false;
      syncVisuals();
    };

    const handleBlur = () => {
      clearControlInputs();
      syncVisuals();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      clearControlInputs();
    };
  }, [screen, setPaused, cycleCameraMode]);

  // Optional DeviceOrientation Tilt Steering
  useEffect(() => {
    if (screen !== 'racing' || settings.steeringMode !== 'tilt') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const clamped = Math.max(-30, Math.min(30, gamma));
      controlInputs.useAnalog = true;
      controlInputs.analogSteer = clamped / 30;
      syncVisuals();
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      controlInputs.useAnalog = false;
      controlInputs.analogSteer = 0;
    };
  }, [screen, settings.steeringMode]);

  if (screen !== 'racing' || isPaused) return null;

  const lang = settings.language;
  const vibrateShort = () => {
    if (settings.vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between safe-area-pad select-none">
      {/* Bottom-Left: Steering Controls (Left & Right Buttons OR Virtual Wheel) */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
        {settings.steeringMode === 'wheel' ? (
          <div
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const rect = e.currentTarget.getBoundingClientRect();
              wheelCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
              wheelPointerIdRef.current = e.pointerId;
              controlInputs.useAnalog = true;
              vibrateShort();
            }}
            onPointerMove={(e) => {
              if (wheelPointerIdRef.current !== e.pointerId || !wheelCenterRef.current) return;
              const dx = e.clientX - wheelCenterRef.current.x;
              const normalized = Math.max(-1, Math.min(1, dx / 55));
              controlInputs.useAnalog = true;
              controlInputs.analogSteer = normalized;
              syncVisuals();
            }}
            onPointerUp={(e) => {
              if (wheelPointerIdRef.current === e.pointerId) {
                wheelPointerIdRef.current = null;
                controlInputs.analogSteer = 0;
                controlInputs.useAnalog = false;
                syncVisuals();
              }
            }}
            onPointerCancel={() => {
              wheelPointerIdRef.current = null;
              controlInputs.analogSteer = 0;
              controlInputs.useAnalog = false;
              syncVisuals();
            }}
            className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full border-2 border-sky-500/60 bg-[#090d16]/88 shadow-xl touch-none cursor-grab active:cursor-grabbing"
          >
            <div
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-4 border-slate-300"
              style={{ transform: `rotate(${uiActiveState.wheelAngleDeg}deg)` }}
            >
              <div className="h-2 w-full bg-sky-400" />
            </div>
            <span className="absolute -top-5 text-[10px] font-semibold text-slate-400">Drag Wheel</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Steer Left"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                audioManager.unlock();
                vibrateShort();
                controlInputs.useAnalog = false;
                controlInputs.left = true;
                syncVisuals();
              }}
              onPointerUp={() => {
                controlInputs.left = false;
                syncVisuals();
              }}
              onPointerCancel={() => {
                controlInputs.left = false;
                syncVisuals();
              }}
              className={`flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border-2 transition-transform duration-100 touch-none shadow-lg ${
                uiActiveState.left
                  ? 'scale-92 border-sky-400 bg-sky-500/35 text-white'
                  : 'border-sky-500/40 bg-[#090d16]/88 text-slate-200'
              }`}
            >
              <ChevronLeft className="h-8 w-8 text-sky-400" />
            </button>

            <button
              type="button"
              aria-label="Steer Right"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                audioManager.unlock();
                vibrateShort();
                controlInputs.useAnalog = false;
                controlInputs.right = true;
                syncVisuals();
              }}
              onPointerUp={() => {
                controlInputs.right = false;
                syncVisuals();
              }}
              onPointerCancel={() => {
                controlInputs.right = false;
                syncVisuals();
              }}
              className={`flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border-2 transition-transform duration-100 touch-none shadow-lg ${
                uiActiveState.right
                  ? 'scale-92 border-sky-400 bg-sky-500/35 text-white'
                  : 'border-sky-500/40 bg-[#090d16]/88 text-slate-200'
              }`}
            >
              <ChevronRight className="h-8 w-8 text-sky-400" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom-Right: Action Cluster (Drift, Nitro, Brake, Accelerator) */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {/* Upper Action Row: DRIFT & NITRO */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              audioManager.unlock();
              vibrateShort();
              controlInputs.drift = true;
              syncVisuals();
            }}
            onPointerUp={() => {
              controlInputs.drift = false;
              syncVisuals();
            }}
            onPointerCancel={() => {
              controlInputs.drift = false;
              syncVisuals();
            }}
            className={`flex h-11 sm:h-12 items-center gap-1.5 rounded-xl border-2 px-3 sm:px-4 font-display text-xs sm:text-sm font-bold transition-transform duration-100 touch-none whitespace-nowrap shrink-0 shadow-lg ${
              uiActiveState.drift
                ? 'scale-92 border-amber-400 bg-amber-500/35 text-amber-200'
                : 'border-slate-700/90 bg-[#090d16]/88 text-slate-200'
            }`}
          >
            <Disc className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            <span>{t(lang, 'drift')}</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              audioManager.unlock();
              vibrateShort();
              controlInputs.nitro = true;
              syncVisuals();
            }}
            onPointerUp={() => {
              controlInputs.nitro = false;
              syncVisuals();
            }}
            onPointerCancel={() => {
              controlInputs.nitro = false;
              syncVisuals();
            }}
            className={`flex h-11 sm:h-12 items-center gap-1.5 rounded-xl border-2 px-3 sm:px-4 font-display text-xs sm:text-sm font-bold transition-transform duration-100 touch-none whitespace-nowrap shrink-0 shadow-lg ${
              uiActiveState.nitro
                ? 'scale-92 border-orange-400 bg-orange-500/35 text-white'
                : 'border-orange-500/60 bg-[#090d16]/88 text-orange-300'
            }`}
          >
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
            <span>{t(lang, 'nitro')}</span>
          </button>
        </div>

        {/* Lower Pedal Row: BRAKE/REV & GAS (Accelerator) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              audioManager.unlock();
              vibrateShort();
              controlInputs.brake = true;
              syncVisuals();
            }}
            onPointerUp={() => {
              controlInputs.brake = false;
              syncVisuals();
            }}
            onPointerCancel={() => {
              controlInputs.brake = false;
              syncVisuals();
            }}
            className={`flex h-14 w-16 sm:h-18 sm:w-22 flex-col items-center justify-center rounded-2xl border-2 font-display text-xs sm:text-sm font-bold transition-transform duration-100 touch-none shadow-lg ${
              uiActiveState.brake
                ? 'scale-92 border-rose-400 bg-rose-500/35 text-white'
                : 'border-slate-700/90 bg-[#090d16]/88 text-slate-300'
            }`}
          >
            <span>{t(lang, 'brake')}</span>
            <span className="text-[9px] font-normal text-slate-400">REV</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              audioManager.unlock();
              vibrateShort();
              controlInputs.throttle = true;
              syncVisuals();
            }}
            onPointerUp={() => {
              controlInputs.throttle = false;
              syncVisuals();
            }}
            onPointerCancel={() => {
              controlInputs.throttle = false;
              syncVisuals();
            }}
            className={`flex h-16 w-20 sm:h-20 sm:w-26 flex-col items-center justify-center rounded-2xl border-2 font-display text-xs sm:text-base font-bold transition-transform duration-100 touch-none shadow-lg ${
              uiActiveState.throttle
                ? 'scale-92 border-sky-400 bg-sky-500/35 text-white'
                : 'border-sky-500/80 bg-[#090d16]/92 text-sky-300'
            }`}
          >
            <span>{t(lang, 'gas')}</span>
            <span className="text-[9px] font-normal text-slate-400">ACCEL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
