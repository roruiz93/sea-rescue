// ============================================================
//  Collectible.js
//
//  Two categories:
//   BOOST   – speed-up items (flippers, board, torpedo)
//   HAZARD  – slow-down items (jellyfish, seaweed, net)
//             Only spawn from level 3+.
//
//  Each item floats, bobs, and can trigger a bonus question
//  when picked up (boosts only; hazards just apply the effect).
// ============================================================
import { CONFIG }            from '../config.js';
import { audio }             from '../systems/AudioSystem.js';
import { getRandomQuestion } from '../data/questions.js';

// ── Item definitions ─────────────────────────────────────────

const BOOST_TYPES = [
  {
    key: 'flippers', label: '🥽 ¡Patas de rana!',
    color: 0x00BCD4, glowColor: 0x00E5FF,
    boost: CONFIG.BOOST.FLIPPERS,
    triggerQuestion: true,
    hud: '🥽 TURBO x1.5',
  },
  {
    key: 'boost_board', label: '🏄 ¡Tabla!',
    color: 0x4CAF50, glowColor: 0x69F0AE,
    boost: CONFIG.BOOST.BOARD,
    triggerQuestion: true,
    hud: '🏄 BOOST x1.3',
  },
  {
    key: 'torpedo', label: '🚀 ¡Torpedo!',
    color: 0xF44336, glowColor: 0xFF6D00,
    boost: CONFIG.BOOST.TORPEDO,
    triggerQuestion: true,
    hud: '🚀 TORPEDO x2',
  },
];

const HAZARD_TYPES = [
  {
    key: 'jellyfish', label: '🪼 ¡Medusa!',
    color: 0xBA68C8, glowColor: 0xEA80FC,
    hazard: CONFIG.HAZARD.JELLYFISH,
    hud: '🪼 ¡Medusa! -65%',
  },
  {
    key: 'seaweed', label: '🌿 ¡Algas!',
    color: 0x388E3C, glowColor: 0x69F0AE,
    hazard: CONFIG.HAZARD.SEAWEED,
    hud: '🌿 ¡Atrapado! -80%',
  },
  {
    key: 'net', label: '🕸 ¡Red!',
    color: 0xF57F17, glowColor: 0xFFAB40,
    hazard: CONFIG.HAZARD.NET,
    hud: '🕸 ¡Red de pesca! -90%',
  },
];

// ── Base Collectible class ────────────────────────────────────

class BaseCollectible extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.key);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setDepth(5);
    this.body.setCircle(20, 2, 2);

    this._def       = def;
    this._collected = false;
    this._glowPhase = 0;

    // Bob
    scene.tweens.add({
      targets: this, y: `+=10`, duration: 1100,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Gentle rotation
    scene.tweens.add({
      targets: this, angle: 12, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Label above item
    this._label = scene.add.text(x, y - 38, def.label, {
      fontSize: '11px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#' + def.color.toString(16).padStart(6, '0'),
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11).setAlpha(0.9);

    // Glow ring
    this._glow = scene.add.graphics().setDepth(4);
  }

  update() {
    if (this._collected) return;
    this._label.setPosition(this.x, this.y - 38);
    this._glowPhase += 0.05;
    const r = 26 + Math.sin(this._glowPhase) * 5;
    const a = 0.2 + Math.sin(this._glowPhase) * 0.15;
    this._glow.clear();
    this._glow.lineStyle(2.5, this._def.glowColor, a);
    this._glow.strokeCircle(this.x, this.y, r);
  }

  isCollected() { return this._collected; }

  _doCollect() {
    this._collected = true;
    this._label.destroy();
    this._glow.destroy();
    // Burst particles
    this.scene.add.particles(this.x, this.y, 'particle', {
      lifespan: 450, speed: { min: 50, max: 120 },
      scale: { start: 0.8, end: 0 },
      tint: this._def.glowColor,
      quantity: 10, emitting: false,
    }).explode(10, this.x, this.y);

    this.scene.tweens.add({
      targets: this, y: `-=40`, alpha: 0, duration: 380,
      onComplete: () => { try { this.destroy(); } catch {} },
    });
  }

  destroyAll() {
    try { this._label.destroy(); } catch {}
    try { this._glow.destroy(); } catch {}
    if (this.scene) try { this.destroy(); } catch {}
  }
}

// ── BOOST Collectible ─────────────────────────────────────────

export class BoostCollectible extends BaseCollectible {
  constructor(scene, x, y, difficulty = 'easy') {
    const def = Phaser.Utils.Array.GetRandom(BOOST_TYPES);
    super(scene, x, y, def);
    this._difficulty = difficulty;
  }

  /**
   * Collect this boost.
   * @returns {{ type:'boost', factor:number, duration:number, hud:string, question:object|null }}
   */
  collect() {
    if (this._collected) return null;
    audio.collect();
    const question = this._def.triggerQuestion
      ? getRandomQuestion('any')
      : null;
    this._doCollect();
    return {
      type:     'boost',
      factor:   this._def.boost.factor,
      duration: this._def.boost.duration,
      hud:      this._def.hud,
      question,
    };
  }
}

// ── HAZARD Collectible ────────────────────────────────────────

export class HazardCollectible extends BaseCollectible {
  constructor(scene, x, y) {
    const def = Phaser.Utils.Array.GetRandom(HAZARD_TYPES);
    super(scene, x, y, def);
    // Hazards float more frantically
    this.scene.tweens.add({
      targets: this, scaleX: { from: 1, to: 0.88 },
      duration: 600, yoyo: true, repeat: -1,
    });
  }

  /**
   * Collect (player swims into it).
   * @returns {{ type:'hazard', slowFactor:number, duration:number, hud:string }}
   */
  collect() {
    if (this._collected) return null;
    audio.sharkHit?.() ?? audio.wrong();
    this._doCollect();
    return {
      type:       'hazard',
      slowFactor: this._def.hazard.slowFactor,
      duration:   this._def.hazard.duration,
      hud:        this._def.hud,
    };
  }
}

// ── Manager ──────────────────────────────────────────────────

export class CollectibleManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {Phaser.Physics.Arcade.Group} group
   * @param {string} difficulty
   * @param {boolean} spawnHazards  – true from level 3+
   */
  constructor(scene, group, difficulty, spawnHazards = false) {
    this._scene        = scene;
    this._group        = group;
    this._difficulty   = difficulty;
    this._spawnHazards = spawnHazards;
    this._items        = [];

    this._spawnInitial();

    // Replenish every 8 s
    this._respawnTimer = scene.time.addEvent({
      delay: 8000, callback: this._maybeSpawn,
      callbackScope: this, loop: true,
    });

    // If hazards active, also spawn a hazard every 12 s
    if (spawnHazards) {
      this._hazardTimer = scene.time.addEvent({
        delay: 12000, callback: this._spawnHazard,
        callbackScope: this, loop: true,
      });
    }
  }

  _spawnInitial() {
    const boostCount = Phaser.Math.Between(2, 3);
    for (let i = 0; i < boostCount; i++) this._spawnBoost();

    if (this._spawnHazards) {
      this._spawnHazard();
    }
  }

  _maybeSpawn() {
    const active = this._items.filter(c => !c.isCollected()).length;
    if (active < 5) this._spawnBoost();
  }

  _spawnBoost() {
    const { x, y } = this._randomPos();
    const c = new BoostCollectible(this._scene, x, y, this._difficulty);
    this._group.add(c);
    this._items.push(c);
  }

  _spawnHazard() {
    const { x, y } = this._randomPos();
    const c = new HazardCollectible(this._scene, x, y);
    this._group.add(c);
    this._items.push(c);
  }

  _randomPos() {
    const m = CONFIG.MARGIN;
    return {
      x: Phaser.Math.Between(m.left + 30, CONFIG.WIDTH  - m.right  - 30),
      y: Phaser.Math.Between(m.top  + 60, CONFIG.HEIGHT - CONFIG.RESCUE_ZONE_HEIGHT - 80),
    };
  }

  update() {
    this._items.forEach(c => { if (!c.isCollected()) c.update(); });
    this._items = this._items.filter(c => c.scene != null && !c.isCollected());
  }

  destroyAll() {
    this._respawnTimer?.remove();
    this._hazardTimer?.remove();
    this._items.forEach(c => { try { c.destroyAll(); } catch {} });
    this._items = [];
  }
}
