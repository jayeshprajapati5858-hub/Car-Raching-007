class ProceduralAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private skidGain: GainNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroOsc: OscillatorNode | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private isRacingActive = false;

  private masterVol = 0.8;
  private musicVol = 0.45;
  private sfxVol = 0.85;
  private isMuted = false;

  public unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applyVolumes();
      this.setupContinuousLoops();
      this.startBackgroundMusicLoop();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public updateSettings(master: number, music: number, sfx: number, muted: boolean) {
    this.masterVol = master;
    this.musicVol = music;
    this.sfxVol = sfx;
    this.isMuted = muted;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVol, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVol * 0.28, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.03);
  }

  private setupContinuousLoops() {
    if (!this.ctx || !this.sfxGain) return;

    // Engine dual-oscillator synth
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.value = 55;
    this.engineOsc2.frequency.value = 110;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineFilter.Q.value = 3.5;

    this.engineGain.gain.value = 0;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Tire skid filtered noise loop
    const bufferSize = this.ctx.sampleRate * 1.5;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const skidFilter = this.ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.value = 1150;
    skidFilter.Q.value = 4.5;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0;

    whiteNoise.connect(skidFilter);
    skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.sfxGain);
    whiteNoise.start();

    // Nitro turbine whine
    this.nitroOsc = this.ctx.createOscillator();
    this.nitroOsc.type = 'sine';
    this.nitroOsc.frequency.value = 280;
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.value = 0;

    this.nitroOsc.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxGain);
    this.nitroOsc.start();
  }

  public setRacingActive(active: boolean) {
    this.isRacingActive = active;
    if (!active && this.ctx) {
      const now = this.ctx.currentTime;
      this.engineGain?.gain.setTargetAtTime(0, now, 0.08);
      this.skidGain?.gain.setTargetAtTime(0, now, 0.05);
      this.nitroGain?.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  public updateVehicleAudio(speedKmh: number, rpmNorm: number, isDrifting: boolean, nitroActive: boolean, paused: boolean) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    const now = this.ctx.currentTime;

    if (!this.isRacingActive || paused) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      this.skidGain?.gain.setTargetAtTime(0, now, 0.04);
      this.nitroGain?.gain.setTargetAtTime(0, now, 0.04);
      return;
    }

    const baseFreq = 46 + rpmNorm * 145 + (nitroActive ? 35 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(240 + rpmNorm * 1100 + (nitroActive ? 500 : 0), now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.08 + rpmNorm * 0.1, now, 0.05);

    const skidTarget = isDrifting && speedKmh > 35 ? Math.min(0.16, (speedKmh / 250) * 0.16) : 0;
    this.skidGain?.gain.setTargetAtTime(skidTarget, now, 0.04);

    const nitroTarget = nitroActive ? 0.11 : 0;
    this.nitroGain?.gain.setTargetAtTime(nitroTarget, now, 0.05);
    if (nitroActive && this.nitroOsc) {
      this.nitroOsc.frequency.setTargetAtTime(420 + speedKmh * 1.4, now, 0.05);
    }
  }

  public playClick() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playCountdownBeep(isFinalGo: boolean) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinalGo ? 880 : 440, now);
    if (isFinalGo) {
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.25);
    }
    const dur = isFinalGo ? 0.35 : 0.16;
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playCollision(intensity = 1) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.18);
    gain.gain.setValueAtTime(Math.min(0.3, 0.18 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playCheckpoint() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(990, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playVictory(isWin: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = isWin ? [523.25, 659.25, 783.99, 1046.5] : [392.0, 349.23, 329.63, 261.63];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.1;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  private startBackgroundMusicLoop() {
    if (this.musicTimer !== null) return;
    // Driving dark synthwave bassline arpeggio (125 BPM -> ~240ms per 8th note)
    const bassNotes = [55, 55, 65.41, 55, 73.42, 65.41, 82.41, 73.42];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted || this.musicVol <= 0.01 || this.ctx.state !== 'running') {
        return;
      }
      const now = this.ctx.currentTime;
      const freq = bassNotes[this.musicStep % bassNotes.length];
      this.musicStep++;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.isRacingActive ? 460 : 280, now);
      filter.frequency.exponentialRampToValueAtTime(110, now + 0.2);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.22);
    }, 235);
  }
}

export const audioManager = new ProceduralAudioManager();
