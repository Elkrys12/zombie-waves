import type { WeaponId } from "@zombie-waves/shared";

/**
 * Efectos de sonido sintetizados con Web Audio (sin archivos de audio).
 * Todos los sonidos se generan con osciladores y ruido con envolventes cortas.
 */
export class SoundManager {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuffer?: AudioBuffer;
  muted = false;

  /** Crea el contexto de audio; el navegador exige que ocurra tras una interacción del usuario. */
  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);

    // 1 s de ruido blanco reutilizable para disparos e impactos
    const length = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  // ------------------------------------------------------------------ efectos

  shoot(weapon: WeaponId, distanceFactor = 1) {
    const presets: Record<WeaponId, { dur: number; freq: number; vol: number }> = {
      pistol: { dur: 0.12, freq: 900, vol: 0.8 },
      smg: { dur: 0.07, freq: 1400, vol: 0.5 },
      shotgun: { dur: 0.25, freq: 500, vol: 1 },
      rifle: { dur: 0.2, freq: 700, vol: 0.9 },
    };
    const p = presets[weapon] ?? presets.pistol;
    this.noise(p.dur, p.freq, p.vol * distanceFactor);
    this.tone("square", 120, 40, 0.08, 0.25 * distanceFactor);
  }

  zombieHit() {
    this.noise(0.06, 300, 0.4);
    this.tone("triangle", 180, 90, 0.08, 0.3);
  }

  zombieDeath() {
    this.tone("sawtooth", 220, 60, 0.35, 0.35);
    this.noise(0.2, 200, 0.3);
  }

  playerHurt() {
    this.tone("square", 200, 80, 0.2, 0.4);
    this.noise(0.1, 150, 0.4);
  }

  waveStart() {
    // Sirena: dos subidas de tono
    this.tone("sawtooth", 300, 600, 0.5, 0.3);
    setTimeout(() => this.tone("sawtooth", 300, 600, 0.5, 0.3), 550);
  }

  waveClear() {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.tone("triangle", f, f, 0.18, 0.35), i * 110));
  }

  purchase() {
    this.tone("sine", 700, 1000, 0.1, 0.3);
    setTimeout(() => this.tone("sine", 1000, 1300, 0.12, 0.3), 90);
  }

  denied() {
    this.tone("square", 200, 150, 0.15, 0.25);
  }

  gameOver() {
    [330, 262, 196, 131].forEach((f, i) => setTimeout(() => this.tone("sawtooth", f, f * 0.9, 0.4, 0.35), i * 300));
  }

  // ------------------------------------------------------------------ primitivas

  private tone(type: OscillatorType, from: number, to: number, duration: number, volume: number) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noise(duration: number, cutoff: number, volume: number) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }
}
