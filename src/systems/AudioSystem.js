// ============================================================
//  AudioSystem – Procedural Web-Audio sound effects.
//  No audio files required; all sounds are synthesised.
// ============================================================

export class AudioSystem {
  constructor() {
    this._ctx   = null;
    this._bgGain = null;
    this._bgOscillators = [];
    this._muted = false;
  }

  /** Must be called after a user gesture (tap / click). */
  init() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[AudioSystem] Web Audio API not available:', e);
    }
  }

  // ── Helper ─────────────────────────────────────────────────
  _tone(freq, type, duration, gain = 0.4, startTime = 0) {
    if (!this._ctx || this._muted) return;
    const t   = this._ctx.currentTime + startTime;
    const osc = this._ctx.createOscillator();
    const vol = this._ctx.createGain();
    osc.connect(vol);
    vol.connect(this._ctx.destination);
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, t);
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  _noise(duration, gain = 0.15) {
    if (!this._ctx || this._muted) return;
    const bufferSize = this._ctx.sampleRate * duration;
    const buffer     = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src  = this._ctx.createBufferSource();
    const vol  = this._ctx.createGain();
    const filt = this._ctx.createBiquadFilter();
    src.buffer = buffer;
    filt.type  = 'lowpass';
    filt.frequency.setValueAtTime(600, this._ctx.currentTime);
    src.connect(filt);
    filt.connect(vol);
    vol.connect(this._ctx.destination);
    vol.gain.setValueAtTime(gain, this._ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);
    src.start();
  }

  // ── Sound effects ─────────────────────────────────────────

  /** Player rescued a victim. */
  rescue() {
    this._tone(523, 'sine', 0.12, 0.3);
    this._tone(659, 'sine', 0.12, 0.3, 0.1);
    this._tone(784, 'sine', 0.2,  0.3, 0.22);
  }

  /** Correct answer to a question. */
  correct() {
    this._tone(880, 'sine', 0.08, 0.3);
    this._tone(1046,'sine', 0.15, 0.3, 0.09);
  }

  /** Wrong answer. */
  wrong() {
    this._tone(200, 'sawtooth', 0.25, 0.3);
  }

  /** Picking up a collectible. */
  collect() {
    this._tone(1047, 'sine', 0.06, 0.25);
    this._tone(1319, 'sine', 0.08, 0.2, 0.06);
  }

  /** Victim countdown ticking. */
  tick() {
    this._tone(440, 'square', 0.05, 0.1);
  }

  /** Victim almost drowning – danger alert. */
  danger() {
    this._tone(330, 'square', 0.08, 0.2);
    this._tone(330, 'square', 0.08, 0.2, 0.12);
  }

  /** Shark collision stun. */
  sharkHit() {
    this._noise(0.3, 0.3);
    this._tone(110, 'sawtooth', 0.35, 0.25);
  }

  /** Level complete jingle. */
  levelComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._tone(f, 'sine', 0.2, 0.4, i * 0.15));
  }

  /** Game over sound. */
  gameOver() {
    const notes = [440, 370, 330, 220];
    notes.forEach((f, i) => this._tone(f, 'sine', 0.3, 0.35, i * 0.18));
  }

  /** Wave splash ambient burst. */
  splash() {
    this._noise(0.4, 0.08);
  }

  /** Button tap feedback. */
  tap() {
    this._tone(800, 'sine', 0.05, 0.2);
  }

  // ── Background ambient ────────────────────────────────────

  startAmbient() {
    if (!this._ctx || this._muted || this._bgOscillators.length) return;

    // Low ocean rumble
    const rumble = this._ctx.createOscillator();
    const rumbleGain = this._ctx.createGain();
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(55, this._ctx.currentTime);
    rumble.frequency.linearRampToValueAtTime(65, this._ctx.currentTime + 4);
    rumble.frequency.linearRampToValueAtTime(55, this._ctx.currentTime + 8);
    rumbleGain.gain.setValueAtTime(0.06, this._ctx.currentTime);
    rumble.connect(rumbleGain);
    rumbleGain.connect(this._ctx.destination);
    rumble.start();

    this._bgOscillators.push(rumble);
    this._bgGain = rumbleGain;
  }

  stopAmbient() {
    this._bgOscillators.forEach(osc => { try { osc.stop(); } catch {} });
    this._bgOscillators = [];
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) this.stopAmbient();
    return this._muted;
  }

  isMuted() { return this._muted; }
}

// Singleton
export const audio = new AudioSystem();
