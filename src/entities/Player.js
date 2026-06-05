// ============================================================
//  Player – Humanoid rescue swimmer.
//
//  Speed stack (multiplicative):
//    BASE_SPEED  ×  carryMult  ×  boostMult  ×  slowFactor
//
//  States:
//    normal  – default
//    slowed  – wave/jellyfish/seaweed/net hit (blue tint)
//    boosted – flippers/board/torpedo (gold tint + speed lines)
//    stunned – shark collision (red tint, no movement)
// ============================================================
import { CONFIG } from '../config.js';
import { audio }  from '../systems/AudioSystem.js';

const SWIM_FRAMES    = ['player_swim1', 'player_swim2'];
const BOOST_FRAMES   = ['player_boosted'];
const FRAME_INTERVAL = 220; // ms per stroke frame

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, baseSpeed = this._baseSpeed) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._baseSpeed = baseSpeed;
    this.setDepth(10).setScale(0.85).setCollideWorldBounds(true);
    this.body.setCircle(20, 20, 18);
    this.body.setMaxVelocity(this._baseSpeed * 2.5, this._baseSpeed * 2.5);

    // ── Speed state ───────────────────────────────────────────
    this._stunUntil      = 0;
    this._slowUntil      = 0;
    this._slowFactor     = 1;    // < 1 when slowed
    this._boostUntil     = 0;
    this._boostFactor    = 1;    // > 1 when boosted
    this._carrySpeedMult = 1;    // set by GameScene (0.72 or 0.42)

    // ── Animation ─────────────────────────────────────────────
    this._frameIdx      = 0;
    this._lastFrameTime = 0;
    this._moving        = false;
    this._boosted       = false;

    // ── Wake trail ────────────────────────────────────────────
    this._emitter = scene.add.particles(0, 0, 'particle', {
      follow: this, frequency: 75, lifespan: 380,
      alpha: { start: 0.4, end: 0 }, scale: { start: 0.55, end: 0 },
      speed: { min: 8, max: 22 }, tint: 0x90CAF9,
      blendMode: 'ADD', depth: 9,
    });

    // Boost-mode trail (golden)
    this._boostEmitter = scene.add.particles(0, 0, 'particle', {
      follow: this, frequency: 30, lifespan: 300,
      alpha: { start: 0.7, end: 0 }, scale: { start: 0.9, end: 0 },
      speed: { min: 20, max: 60 }, tint: 0xFFD600,
      blendMode: 'ADD', depth: 9, emitting: false,
    });

    this._splashEmitter = scene.add.particles(0, 0, 'splash', {
      follow: this, frequency: 350, lifespan: 280,
      alpha: { start: 0.8, end: 0 }, scale: { start: 0.5, end: 0.2 },
      speed: { min: 20, max: 40 }, depth: 11, emitting: false,
    });

    // ── Speed-effect HUD label (shown briefly on screen) ──────
    // Managed by GameScene via applyBoost / applySlow
  }

  // ── Frame update ──────────────────────────────────────────
  update(joystick) {
    const now    = Date.now();
    const vec    = joystick.getVector();
    const moving = vec.magnitude > 0.08;

    // ── Stunned ────────────────────────────────────────────
    if (now < this._stunUntil) {
      this.setVelocity(0, 0);
      this._moving  = false;
      this._boosted = false;
      this.setTexture('player_idle');
      return;
    }

    // ── Compute effective speed ────────────────────────────
    const isBoosted = now < this._boostUntil;
    const isSlowed  = now < this._slowUntil;

    let spd = this._baseSpeed * this._carrySpeedMult;
    if (isBoosted) spd *= this._boostFactor;
    if (isSlowed)  spd *= this._slowFactor;
    // Clamp: minimum 5% base speed (never fully frozen by slow+carry)
    spd = Math.max(spd, this._baseSpeed * 0.05);

    // ── Boost ended transition ────────────────────────────
    if (!isBoosted && this._boosted) {
      this._boosted = false;
      this.clearTint();
      this._boostEmitter.emitting = false;
      this.body.setMaxVelocity(this._baseSpeed * 2, this._baseSpeed * 2);
    }

    if (moving) {
      this.setVelocity(vec.x * spd, vec.y * spd);
      this._moving = true;

      if (vec.x < -0.1)     this.setFlipX(true);
      else if (vec.x > 0.1) this.setFlipX(false);

      const targetAngle = vec.y * 18;
      this.setAngle(Phaser.Math.Linear(this.angle, targetAngle, 0.15));

      const interval = isBoosted ? 110 : 220; // faster animation when boosted
      if (now - this._lastFrameTime > interval) {
        this._frameIdx = (this._frameIdx + 1) % SWIM_FRAMES.length;
        // Use boosted texture when boosted
        this.setTexture(isBoosted ? 'player_boosted' : SWIM_FRAMES[this._frameIdx]);
        this._lastFrameTime = now;
        this._splashEmitter.emitting = true;
      }
    } else {
      this.setVelocity(0, 0);
      this.setAngle(Phaser.Math.Linear(this.angle, 0, 0.1));
      if (this._moving) {
        this.setTexture('player_idle');
        this._splashEmitter.emitting = false;
      }
      this._moving = false;
    }
  }

  // ── PUBLIC EFFECTS ────────────────────────────────────────

  /**
   * Apply a speed SLOW (wave, jellyfish, seaweed, net).
   * @param {number} factor   – multiply speed by this (e.g. 0.35)
   * @param {number} duration – ms
   * @param {number} [tint]   – hex tint while slowed
   */
  applySlow(factor, duration, tint = 0x90CAF9) {
    // Only apply if it's worse than current slow
    if (Date.now() < this._slowUntil && factor > this._slowFactor) return;
    this._slowFactor = factor;
    this._slowUntil  = Date.now() + duration;
    this.setTint(tint);
    this.scene.time.delayedCall(duration, () => {
      if (Date.now() >= this._slowUntil) this.clearTint();
    });
  }

  /**
   * Apply a speed BOOST (flippers, board, torpedo).
   * @param {number} factor   – multiply speed by this (e.g. 1.55)
   * @param {number} duration – ms
   */
  applyBoost(factor, duration) {
    this._boostFactor = factor;
    this._boostUntil  = Date.now() + duration;
    this._boosted     = true;
    this.body.setMaxVelocity(this._baseSpeed * factor * 1.2, this._baseSpeed * factor * 1.2);

    // Golden tint
    this.setTint(0xFFD600);
    this._boostEmitter.emitting = true;

    this.scene.time.delayedCall(duration, () => {
      if (Date.now() >= this._boostUntil) {
        this._boosted = false;
        this.clearTint();
        this._boostEmitter.emitting = false;
        this.body.setMaxVelocity(this._baseSpeed * 2, this._baseSpeed * 2);
      }
    });
  }

  applyStun(duration) {
    this._stunUntil = Date.now() + duration;
    audio.sharkHit();
    this.setTint(0xFF5252);
    this.scene.cameras.main.shake(280, 0.013);
    this._boostEmitter.emitting = false;

    this.scene.add.particles(this.x, this.y - 30, 'star', {
      lifespan: 600, speed: { min: 30, max: 80 },
      scale: { start: 0.5, end: 0 }, quantity: 5, emitting: false,
    }).explode(5, this.x, this.y - 30);

    this.scene.time.delayedCall(duration, () => this.clearTint());
  }

  rescueFlash() {
    this.scene.tweens.add({
      targets: this, alpha: { from: 0.25, to: 1 },
      duration: 110, yoyo: true, repeat: 3,
    });
  }

  isBoosted()  { return Date.now() < this._boostUntil; }
  isSlowed()   { return Date.now() < this._slowUntil; }
  isStunned()  { return Date.now() < this._stunUntil; }

  destroy() {
    try { this._emitter.destroy(); }       catch {}
    try { this._boostEmitter.destroy(); }  catch {}
    try { this._splashEmitter.destroy(); } catch {}
    super.destroy();
  }
}
