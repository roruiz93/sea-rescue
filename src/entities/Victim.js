// ============================================================
//  Victim – Drowning person with a 4-state machine:
//
//   FLOATING  → normal in ocean, timer running, SOS arms up
//   CARRIED   → player carrying them, timer PAUSED, follows player
//   DROPPED   → released mid-ocean, timer RESUMES, SOS again
//   RESCUED   → delivered to shore  ✓
//   DROWNED   → timer hit 0  ✗
//
//  Timer is paused while carried so the victim stays alive.
//  When dropped the countdown resumes from the saved time.
// ============================================================
import { CONFIG } from '../config.js';
import { audio }  from '../systems/AudioSystem.js';

const C = CONFIG.COLORS;

const STATE = { FLOATING: 0, CARRIED: 1, DROPPED: 2, RESCUED: 3, DROWNED: 4 };

export class Victim extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, timeLimit, onDrown) {
    super(scene, x, y, 'victim');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(8).setScale(0.88);
    this.body.setCircle(20, 6, 8);

    this._timeLeft = timeLimit;
    this._maxTime  = timeLimit;
    this._onDrown  = onDrown;
    this._state    = STATE.FLOATING;
    this._id       = Math.random(); // unique id for debug

    // ── Timer bar ─────────────────────────────────────────────
    const bW = 46;
    this._barBg = scene.add.rectangle(x, y - 50, bW, 8, 0x000000, 0.65).setDepth(9);
    this._bar   = scene.add.rectangle(x - bW / 2, y - 50, bW, 8, C.TIMER_OK)
      .setOrigin(0, 0.5).setDepth(10);
    this._timerText = scene.add.text(x, y - 62, `${timeLimit}s`, {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // ── Help call text ────────────────────────────────────────
    const calls = ['¡AYUDA!', '¡SOCORRO!', '¡AUXILIO!', '¡HELP!'];
    this._helpText = scene.add.text(x, y - 76, Phaser.Utils.Array.GetRandom(calls), {
      fontSize: '11px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#FF5252', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // ── Carried indicator (hidden initially) ─────────────────
    this._carriedIcon = scene.add.text(x, y - 60, '🤝', {
      fontSize: '20px',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    // ── SOS ring ─────────────────────────────────────────────
    this._sosRing  = scene.add.graphics().setDepth(7);
    this._sosPhase = 0;

    // ── Splash particles ─────────────────────────────────────
    this._splash = scene.add.particles(x, y, 'particle', {
      frequency: 600, lifespan: 500,
      speed: { min: 12, max: 40 }, scale: { start: 0.5, end: 0 },
      tint: 0x42A5F5, alpha: { start: 0.7, end: 0 }, depth: 6,
    });

    // ── Bob animation (stopped during carry) ─────────────────
    this._bobTween = scene.tweens.add({
      targets: [this, this._barBg, this._bar, this._timerText, this._helpText],
      y: `+=9`, duration: 850,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Arm-wave scale pulse ──────────────────────────────────
    this._waveTween = scene.tweens.add({
      targets: this, scaleX: { from: 0.88, to: 0.76 },
      duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Countdown event ───────────────────────────────────────
    this._tickEvent = scene.time.addEvent({
      delay: 1000, callback: this._tick,
      callbackScope: this, loop: true,
    });
  }

  // ── Per-second countdown ──────────────────────────────────
  _tick() {
    if (this._state !== STATE.FLOATING && this._state !== STATE.DROPPED) return;

    this._timeLeft = Math.max(0, this._timeLeft - 1);
    this._timerText.setText(`${this._timeLeft}s`);

    const ratio = this._timeLeft / this._maxTime;
    this._bar.width = 46 * Math.max(0, ratio);

    if (ratio > 0.5) {
      this._bar.setFillStyle(C.TIMER_OK);
      this.setTexture('victim');
      this._bobTween.timeScale = 1;
      this._waveTween.timeScale = 1;
    } else if (ratio > 0.25) {
      this._bar.setFillStyle(C.TIMER_WARN);
      audio.tick();
      this._bobTween.timeScale = 1.5;
      this._waveTween.timeScale = 1.7;
    } else {
      this._bar.setFillStyle(C.TIMER_DANGER);
      this.setTexture('victim_alert');
      audio.danger();
      this._bobTween.timeScale = 2.4;
      this._waveTween.timeScale = 2.6;
      if (this._timeLeft <= 4) {
        this.scene?.cameras.main.flash(70, 255, 50, 50, false);
      }
    }

    // SOS ring
    this._sosPhase += 0.2;
    if (ratio <= 0.5) {
      const r = 30 + Math.sin(this._sosPhase) * 7;
      const a = 0.25 + Math.sin(this._sosPhase) * 0.2;
      this._sosRing.clear();
      this._sosRing.lineStyle(2.5, 0xEF5350, a);
      this._sosRing.strokeCircle(this.x, this.y, r);
    }

    if (this._timeLeft <= 0) this._drown();
  }

  // ── STATE TRANSITIONS ─────────────────────────────────────

  /**
   * Player picks this victim up.
   * Pauses their countdown, hides the urgency UI.
   */
  startCarry() {
    if (this._state !== STATE.FLOATING && this._state !== STATE.DROPPED) return;
    this._state = STATE.CARRIED;

    // Pause countdown (Phaser timer paused flag)
    this._tickEvent.paused = true;

    // Stop bob tween at its current position
    this._bobTween.pause();
    this._waveTween.pause();

    // Hide timer / SOS
    this._barBg.setAlpha(0);
    this._bar.setAlpha(0);
    this._timerText.setAlpha(0);
    this._helpText.setAlpha(0);
    this._sosRing.clear();
    this._splash.stop();

    // Show carried icon
    this._carriedIcon.setAlpha(1);

    // Tint green – safe for now
    this.clearTint();
    this.setTint(0x81D4FA);
    this.setTexture('victim_rescued');
    this.setScale(0.7);
  }

  /**
   * Player drops this victim at (x, y).
   * Resumes their countdown from where it was.
   */
  drop(x, y) {
    if (this._state !== STATE.CARRIED) return;
    this._state = STATE.DROPPED;

    // Place at drop position and sync UI
    this._placeAt(x, y);

    // Resume countdown
    this._tickEvent.paused = false;

    // Restore visuals
    this.clearTint();
    this.setTexture('victim');
    this.setScale(0.88);
    this._barBg.setAlpha(1);
    this._bar.setAlpha(1);
    this._timerText.setAlpha(1);
    this._helpText.setAlpha(1);
    this._carriedIcon.setAlpha(0);
    this._splash.resume();

    // Re-run tweens from current y
    this._bobTween.resume();
    this._waveTween.resume();

    // Splash feedback
    this.scene.add.particles(x, y, 'particle', {
      lifespan: 400, speed: { min: 30, max: 80 },
      scale: { start: 0.6, end: 0 }, tint: 0x42A5F5,
      quantity: 8, emitting: false,
    }).explode(8, x, y);
  }

  /**
   * Player delivered this victim to shore.
   * Called by GameScene when the rescue is confirmed.
   */
  markRescued() {
    if (this._state === STATE.RESCUED || this._state === STATE.DROWNED) return;
    this._state = STATE.RESCUED;
    this._stopAll();
    this.setTexture('victim_rescued');
    this.clearTint();
    this.setScale(0.88);

    // Show checkmark, float upward, then destroy
    this._barBg.setAlpha(0);
    this._bar.setAlpha(0);
    this._timerText.setAlpha(0);
    this._helpText.setAlpha(0);
    this._carriedIcon.setAlpha(0);

    this.scene.tweens.add({
      targets: this, y: this.y - 32, alpha: 0,
      duration: 700, delay: 200, ease: 'Cubic.easeOut',
      onComplete: () => { try { this.destroyAll(); } catch {} },
    });
  }

  // ── Position sync (called every frame while carried) ──────
  updateCarriedPosition(px, py) {
    if (this._state !== STATE.CARRIED) return;
    this.setPosition(px, py);
    this._carriedIcon.setPosition(px, py - 44);
  }

  // ── Internal ──────────────────────────────────────────────

  _placeAt(x, y) {
    this.setPosition(x, y);
    this._barBg.setPosition(x, y - 50);
    this._bar.setPosition(x - 23, y - 50);
    this._timerText.setPosition(x, y - 62);
    this._helpText.setPosition(x, y - 76);
    this._carriedIcon.setPosition(x, y - 44);
    this._splash.setPosition(x, y);
  }

  _drown() {
    if (this._state === STATE.DROWNED || this._state === STATE.RESCUED) return;
    this._state = STATE.DROWNED;
    this._stopAll();

    this.scene.tweens.add({
      targets: [this, this._barBg, this._bar, this._timerText, this._helpText],
      alpha: 0, y: `+=44`, duration: 700,
      onComplete: () => {
        this._onDrown?.();
        this.destroyAll();
      },
    });

    // Big splash
    this.scene.add.particles(this.x, this.y, 'particle', {
      lifespan: 700, speed: { min: 40, max: 110 },
      scale: { start: 1.1, end: 0 }, tint: 0x42A5F5,
      quantity: 20, emitting: false,
    }).explode(20, this.x, this.y);
  }

  _stopAll() {
    this._tickEvent?.remove();
    this._bobTween?.stop();
    this._waveTween?.stop();
    this._sosRing.clear();
    try { this._splash.stop(); } catch {}
  }

  // ── Extra time (question reward) ─────────────────────────
  addTime(seconds) {
    this._timeLeft = Math.min(this._timeLeft + seconds, this._maxTime + 12);
    this._timerText.setText(`${Math.ceil(this._timeLeft)}s`);
  }

  // ── Cleanup ───────────────────────────────────────────────
  destroyAll() {
    this._barBg.destroy();
    this._bar.destroy();
    this._timerText.destroy();
    this._helpText.destroy();
    this._carriedIcon.destroy();
    this._sosRing.destroy();
    try { this._splash.destroy(); } catch {}
    if (this.scene) this.destroy();
  }

  // ── State queries ─────────────────────────────────────────
  isFloating()  { return this._state === STATE.FLOATING; }
  isCarried()   { return this._state === STATE.CARRIED; }
  isDropped()   { return this._state === STATE.DROPPED; }
  isRescued()   { return this._state === STATE.RESCUED; }
  isDrowned()   { return this._state === STATE.DROWNED; }
  /** Can the player pick this up? */
  isPickable()  { return this._state === STATE.FLOATING || this._state === STATE.DROPPED; }
  /** Still active (not resolved) */
  isAlive()     { return this._state < STATE.RESCUED; }
  getTimeLeft() { return this._timeLeft; }
}
