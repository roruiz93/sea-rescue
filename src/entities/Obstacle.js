// ============================================================
//  Obstacle – Waves (horizontal bands) and Sharks.
//  Waves slow the player; sharks stun them.
// ============================================================
import { CONFIG } from '../config.js';

// ──────────────────────────────────────────────────────────────
//  Wave
// ──────────────────────────────────────────────────────────────
export class Wave extends Phaser.Physics.Arcade.Image {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} y      starting Y position
   * @param {number} speed  pixels per second (positive = down)
   */
  constructor(scene, y, speed) {
    super(scene, CONFIG.WIDTH / 2, y, 'wave');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(6);
    this.setAlpha(0);  // fade in

    // Physics body matches the full-width strip
    this.body.setSize(CONFIG.WIDTH, CONFIG.WAVE.HEIGHT);
    this.body.allowGravity = false;
    this.body.setImmovable(true);

    this._speed  = speed;
    this._active = true;

    // Direction reversal
    this.body.setVelocityY(speed);

    // Foam overlay
    this._foam = scene.add.tileSprite(
      CONFIG.WIDTH / 2, y - CONFIG.WAVE.HEIGHT / 2 + 4,
      CONFIG.WIDTH, 16, 'foam'
    ).setDepth(7).setAlpha(0);

    // Fade in
    scene.tweens.add({
      targets: [this, this._foam],
      alpha: 1,
      duration: 400,
    });
  }

  update() {
    if (!this._active) return;

    const y = this.y;
    this._foam.y = y - CONFIG.WAVE.HEIGHT / 2 + 4;

    // Bounce between HUD bottom and rescue zone top
    const topLimit    = 90;
    const bottomLimit = CONFIG.HEIGHT - CONFIG.RESCUE_ZONE_HEIGHT - 10;
    if (y > bottomLimit) {
      this.body.setVelocityY(-Math.abs(this._speed));
    } else if (y < topLimit) {
      this.body.setVelocityY(Math.abs(this._speed));
    }
  }

  destroyAll() {
    this._foam.destroy();
    this.destroy();
  }
}

// ──────────────────────────────────────────────────────────────
//  Shark
// ──────────────────────────────────────────────────────────────
export class Shark extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} speed
   */
  constructor(scene, x, y, speed) {
    super(scene, x, y, 'shark');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(7);
    this.body.setSize(60, 24).setOffset(8, 10);
    this.body.allowGravity = false;

    this._speed  = speed;
    this._target = null;     // set to player for homing mode

    // Start moving horizontally
    const dir = Math.random() < 0.5 ? 1 : -1;
    this.body.setVelocityX(speed * dir);
    if (dir < 0) this.setFlipX(true);

    // Vertical drift
    this._driftTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(1500, 3000),
      callback: this._changeDrift,
      callbackScope: this,
      loop: true,
    });

    // Fin wave animation (scale pulse)
    scene.tweens.add({
      targets: this,
      scaleY:  { from: 1, to: 1.06 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _changeDrift() {
    const vy = Phaser.Math.Between(-30, 30);
    this.body.setVelocityY(vy);
  }

  /** Loosely home toward the player. */
  setTarget(player) {
    this._target = player;
  }

  update() {
    // Keep within bounds, flip on X walls
    const x = this.x;
    if (x < 60) {
      this.body.setVelocityX(Math.abs(this._speed));
      this.setFlipX(false);
    } else if (x > CONFIG.WIDTH - 60) {
      this.body.setVelocityX(-Math.abs(this._speed));
      this.setFlipX(true);
    }

    // Clamp Y to play area (between HUD and rescue zone)
    const topEdge    = 90;
    const bottomEdge = CONFIG.HEIGHT - CONFIG.RESCUE_ZONE_HEIGHT - 20;
    if (this.y < topEdge) {
      this.body.setVelocityY(Math.abs(this.body.velocity.y) + 10);
    } else if (this.y > bottomEdge) {
      this.body.setVelocityY(-Math.abs(this.body.velocity.y) - 10);
    }

    // Slight homing toward player
    if (this._target) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this._target.x, this._target.y);
      const hx = Math.cos(angle) * this._speed;
      const hy = Math.sin(angle) * this._speed * 0.3;
      this.body.setVelocityX(hx);
      this.body.setVelocityY(hy);
      this.setFlipX(hx < 0);
    }
  }

  destroyAll() {
    this._driftTimer?.remove();
    this.destroy();
  }
}

// ──────────────────────────────────────────────────────────────
//  ObstacleManager – Spawns and manages waves + sharks.
// ──────────────────────────────────────────────────────────────
export class ObstacleManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ waves: number, sharks: boolean }} levelCfg
   * @param {Phaser.Physics.Arcade.Group} waveGroup
   * @param {Phaser.Physics.Arcade.Group} sharkGroup
   */
  constructor(scene, levelCfg, waveGroup, sharkGroup) {
    this._scene      = scene;
    this._waveGroup  = waveGroup;
    this._sharkGroup = sharkGroup;
    this._waves      = [];
    this._sharks     = [];

    this._spawnWaves(levelCfg.waves);
    if (levelCfg.sharks) this._spawnSharks();
  }

  _spawnWaves(count) {
    const step = (CONFIG.HEIGHT - CONFIG.MARGIN.top - CONFIG.MARGIN.bottom) / (count + 1);
    for (let i = 0; i < count; i++) {
      const y     = CONFIG.MARGIN.top + step * (i + 1);
      const speed = CONFIG.WAVE.SPEED * (0.7 + Math.random() * 0.6);
      const wave  = new Wave(this._scene, y, speed * (Math.random() < 0.5 ? 1 : -1));
      this._waveGroup.add(wave);
      this._waves.push(wave);
    }
  }

  _spawnSharks() {
    const count = Phaser.Math.Between(1, 2);
    for (let i = 0; i < count; i++) {
      const x     = Phaser.Math.Between(CONFIG.MARGIN.left + 60, CONFIG.WIDTH - CONFIG.MARGIN.right - 60);
      const y     = Phaser.Math.Between(CONFIG.MARGIN.top + 60, CONFIG.HEIGHT - CONFIG.MARGIN.bottom - 60);
      const speed = CONFIG.SHARK.SPEED * (0.8 + Math.random() * 0.4);
      const shark = new Shark(this._scene, x, y, speed);
      this._sharkGroup.add(shark);
      this._sharks.push(shark);
    }
  }

  setPlayerTarget(player) {
    this._sharks.forEach(s => s.setTarget(player));
  }

  update() {
    this._waves.forEach(w => w.update());
    this._sharks.forEach(s => s.update());
  }

  destroyAll() {
    this._waves.forEach(w => w.destroyAll());
    this._sharks.forEach(s => s.destroyAll());
    this._waves  = [];
    this._sharks = [];
  }
}
