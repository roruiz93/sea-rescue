// ============================================================
//  GameScene – Core gameplay with carry-to-shore mechanic.
//
//  FLOW:
//   1. Victims appear in the ocean with individual countdowns.
//   2. Player swims to a victim → auto-picks them up (timer PAUSES).
//   3. Player carries them to the RESCUE ZONE (shore/boat).
//   4. On arrival → question appears → victim rescued → points.
//   5. Carrying 2 at once → OXYGEN countdown starts (8 s).
//      Player must drop one ("Soltar") before oxygen runs out.
//   6. Dropped victim stays at drop position, timer RESUMES.
//   7. If oxygen hits 0 → lose a life, drop both victims.
//   8. If any victim's timer hits 0 → victim drowns → lose a life.
//   9. Level complete when N rescues done; game over when lives = 0.
// ============================================================
import { CONFIG, getLevelConfig }   from '../config.js';
import { Player }                   from '../entities/Player.js';
import { Victim }                   from '../entities/Victim.js';
import { ObstacleManager }          from '../entities/Obstacle.js';
import { CollectibleManager, BoostCollectible, HazardCollectible } from '../entities/Collectible.js';
import { VirtualJoystick }          from '../utils/VirtualJoystick.js';
import { ScoreSystem }              from '../systems/ScoreSystem.js';
// (ScoreSystem also provides static clearSession / loadSession)
import { audio }                    from '../systems/AudioSystem.js';
import { getRandomQuestion }        from '../data/questions.js';
import { AdMobManager }             from '../managers/AdMobManager.js';

const C = CONFIG.COLORS;

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  // ── Init ──────────────────────────────────────────────────
  init(data) {
    this._level    = data.level   ?? 1;
    this._score    = data.score   ?? new ScoreSystem();
    this._lives    = data.lives   ?? CONFIG.LIVES;
    this._cfg      = getLevelConfig(this._level);

    // Victims
    this._victims         = [];      // all Victim instances this level
    this._carried         = [];      // currently carried victims (max 2)
    this._victimsSpawned  = 0;
    this._rescuedCount    = 0;

    // Oxygen (when carrying 2)
    this._oxygenLeft      = CONFIG.OXYGEN_MAX;
    this._oxygenActive    = false;

    // Question state
    this._questionActive  = false;
    this._questionQueue   = [];      // batch being processed after shore

    this._paused          = false;
  }

  // ── Create ────────────────────────────────────────────────
  create() {
    const { width: W, height: H } = this.scale;

    audio.init();
    audio.startAmbient();
    AdMobManager.showBanner();

    // ── World bounds (player can't leave the visible play area) ──
    // Top: 80 px (below HUD bar)
    // Bottom: full screen height so player CAN enter the rescue zone
    // Left/Right: flush with screen edges
    const playTop = 80;
    this.physics.world.setBounds(0, playTop, CONFIG.WIDTH, CONFIG.HEIGHT - playTop);

    // ── Ocean background ──────────────────────────────────────
    this._bgTile = this.add.tileSprite(0, 0, W, H, 'ocean_tile').setOrigin(0).setDepth(0);
    const grad = this.add.graphics().setDepth(1);
    grad.fillGradientStyle(C.OCEAN_DEEP, C.OCEAN_DEEP, C.OCEAN_MID, C.OCEAN_MID, 0.5);
    grad.fillRect(0, 0, W, H);

    // ── Rescue zone (shore/beach) ─────────────────────────────
    this._buildRescueZone(W, H);

    // ── Physics groups ────────────────────────────────────────
    this._waveGroup  = this.physics.add.staticGroup();
    this._sharkGroup = this.physics.add.group();
    this._collectibleGroup = this.physics.add.staticGroup();

    // ── Player ────────────────────────────────────────────────
    this._player = new Player(this, W / 2, H - CONFIG.RESCUE_ZONE_HEIGHT - 40, this._cfg.playerSpeed);

    // ── Obstacles ─────────────────────────────────────────────
    this._obstacles = new ObstacleManager(this, this._cfg, this._waveGroup, this._sharkGroup);
    this._obstacles.setPlayerTarget(this._player);

    // ── Collectibles (hazards only from level 3+) ─────────────
    this._collectibles = new CollectibleManager(
      this, this._collectibleGroup,
      this._cfg.questionDiff,
      this._cfg.hazards,   // ← boolean: spawn slow items?
    );

    // ── Overlaps ──────────────────────────────────────────────
    this.physics.add.overlap(this._player, this._waveGroup, () => {
      this._player.applySlow(CONFIG.WAVE.SLOW_FACTOR, CONFIG.WAVE.DURATION, 0x42A5F5);
      this._showEffectHUD('🌊 ¡Ola! -65% velocidad por 4s', '#90CAF9', CONFIG.WAVE.DURATION);
    });
    this.physics.add.overlap(this._player, this._sharkGroup, () => {
      this._player.applyStun(CONFIG.SHARK.STUN_DURATION);
      // Drop carried victims on shark stun
      this._dropAll();
    });

    // ── Virtual joystick ──────────────────────────────────────
    this._joystick = new VirtualJoystick(this, { x: 90, y: H - 90 });

    // ── HUD ───────────────────────────────────────────────────
    this._buildHUD(W, H);

    // ── Oxygen bar (hidden until needed) ─────────────────────
    this._buildOxygenBar(W);

    // ── Drop button (hidden until carrying 2) ─────────────────
    this._buildDropButton(W, H);

    // ── First victim spawn ────────────────────────────────────
    this._scheduleNextSpawn(1200);

    // ── Pause button ─────────────────────────────────────────
    this._buildPauseBtn(W, H);

    // ── Level banner ─────────────────────────────────────────
    this._showLevelBanner(W, H);
  }

  // ── Rescue zone (visual shore area) ──────────────────────
  _buildRescueZone(W, H) {
    const zH = CONFIG.RESCUE_ZONE_HEIGHT;
    const zY  = H - zH;

    // Sandy shore gradient
    const bg = this.add.graphics().setDepth(2);
    bg.fillGradientStyle(0x1565C0, 0x1565C0, 0xF9A825, 0xF9A825, 0.25);
    bg.fillRect(0, zY, W, zH);

    // Dashed border
    bg.lineStyle(3, 0x4CAF50, 0.85);
    bg.lineBetween(0, zY, W, zY);

    // Boat sprite centered
    this.add.image(W / 2, H - zH / 2 + 4, 'boat').setDepth(4).setScale(1.3).setAlpha(0.9);

    // Label
    this.add.text(W / 2, zY + 12, '🏖  ZONA DE RESCATE  🏖', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(4);

    // Pulsing green glow (shows player where to go)
    this._zoneGlow = this.add.graphics().setDepth(3);
    this._zoneGlowPhase = 0;

    // Store zone rect for overlap check
    this._rescueZoneY = zY;
  }

  // ── HUD ───────────────────────────────────────────────────
  _buildHUD(W, H) {
    // Top bar bg
    this.add.rectangle(W / 2, 40, W, 80, 0x000000, 0.55).setDepth(20).setScrollFactor(0);

    this._scoreText = this.add.text(12, 12, 'Pts: 0', {
      fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#F9A825', stroke: '#000000', strokeThickness: 2,
    }).setDepth(21).setScrollFactor(0);

    this._levelText = this.add.text(W / 2, 12, `Nivel ${this._level}`, {
      fontSize: '16px', fontFamily: 'Arial',
      color: '#E0F7FA', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(21).setScrollFactor(0);

    this._livesText = this.add.text(W - 12, 12, this._livesStr(), {
      fontSize: '20px', fontFamily: 'Arial',
    }).setOrigin(1, 0).setDepth(21).setScrollFactor(0);

    this._progressText = this.add.text(W / 2, 36, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#90CAF9',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(21).setScrollFactor(0);

    this._carryText = this.add.text(W / 2, 58, '', {
      fontSize: '13px', fontFamily: 'Arial', color: '#FFE082',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(21).setScrollFactor(0);

    this._comboText = this.add.text(W / 2, CONFIG.HEIGHT - 150, '', {
      fontSize: '24px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#FFD600', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21).setScrollFactor(0).setAlpha(0);

    this._effectBanner = null; // set by _showEffectHUD

    this._updateProgress();
  }

  // ── Oxygen bar ────────────────────────────────────────────
  _buildOxygenBar(W) {
    const barW = W * 0.7;
    const barX = W / 2;
    const barY = 82;

    // Container (hidden by default)
    this._oxygenContainer = this.add.container(0, 0).setDepth(22).setScrollFactor(0);

    const bg = this.add.rectangle(barX, barY, barW + 8, 22, 0x000000, 0.75)
      .setStrokeStyle(2, 0xFF5252);

    const label = this.add.text(barX - barW / 2 - 4, barY, '💨', {
      fontSize: '16px',
    }).setOrigin(1, 0.5);

    this._oxygenBarBg = this.add.rectangle(barX - barW / 2, barY, barW, 14, 0x263238)
      .setOrigin(0, 0.5);
    this._oxygenBar   = this.add.rectangle(barX - barW / 2, barY, barW, 14, 0x4CAF50)
      .setOrigin(0, 0.5);

    this._oxygenLabel = this.add.text(barX, barY - 18, '¡LLEVAS DOS! SUELTA A UNO', {
      fontSize: '12px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#FF5252', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    this._oxygenContainer.add([bg, label, this._oxygenBarBg, this._oxygenBar, this._oxygenLabel]);
    this._oxygenContainer.setAlpha(0);
    this._oxygenBarW = barW;
  }

  // ── "Soltar" drop button ──────────────────────────────────
  _buildDropButton(W, H) {
    const bx = W - 70, by = H - 150;
    this._dropContainer = this.add.container(bx, by).setDepth(22).setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, 110, 54, 0xB71C1C, 1)
      .setStrokeStyle(3, 0xFF5252)
      .setInteractive({ useHandCursor: true });

    const icon = this.add.text(0, -8, '🙋', { fontSize: '20px' }).setOrigin(0.5);
    const lbl  = this.add.text(0, 14, '¡SOLTAR!', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    this._dropContainer.add([bg, icon, lbl]);
    this._dropContainer.setAlpha(0);

    bg.on('pointerdown', () => {
      if (!this._oxygenActive) return;
      audio.tap();
      this._dropLastCarried();
    });

    // Flash tween for urgency
    this._dropFlash = this.tweens.add({
      targets: this._dropContainer,
      alpha: { from: 1, to: 0.4 },
      duration: 350, yoyo: true, repeat: -1,
      paused: true,
    });
  }

  _buildPauseBtn(W, H) {
    const btn = this.add.text(W - 46, H - CONFIG.RESCUE_ZONE_HEIGHT - 48, '⏸', {
      fontSize: '26px',
    }).setDepth(22).setScrollFactor(0).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this._togglePause());
  }

  // ── Level intro banner ────────────────────────────────────
  _showLevelBanner(W, H) {
    const bg  = this.add.rectangle(W / 2, H / 2, W, 100, 0x000000, 0.72).setDepth(30);
    const t1  = this.add.text(W / 2, H / 2 - 18, `NIVEL ${this._level}`, {
      fontSize: '38px', fontFamily: 'Arial Black, Arial',
      color: '#F9A825', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(31);
    const t2  = this.add.text(W / 2, H / 2 + 22, `¡Rescata ${this._cfg.victims} víctimas!`, {
      fontSize: '16px', fontFamily: 'Arial', color: '#E0F7FA',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(31);

    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: [bg, t1, t2], alpha: 0, duration: 400,
        onComplete: () => { bg.destroy(); t1.destroy(); t2.destroy(); },
      });
    });
  }

  // ── Victim spawning ───────────────────────────────────────
  _scheduleNextSpawn(delay) {
    // Only spawn more if we still need more rescues
    if (this._rescuedCount >= this._cfg.victims) return;
    this.time.delayedCall(delay, () => {
      if (!this.scene.isActive('GameScene')) return;
      this._spawnVictim();
    });
  }

  _spawnVictim() {
    if (this._rescuedCount >= this._cfg.victims) return;

    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const m = CONFIG.MARGIN;

    // Don't spawn near player or existing victims
    let x, y, tries = 0;
    do {
      x = Phaser.Math.Between(m.left + 30, W - m.right - 30);
      y = Phaser.Math.Between(m.top + 60, this._rescueZoneY - 80);
      tries++;
    } while (tries < 20 && (
      Phaser.Math.Distance.Between(x, y, this._player.x, this._player.y) < 130 ||
      this._victims.some(v => v.isAlive() && Phaser.Math.Distance.Between(x, y, v.x, v.y) < 80)
    ));

    const victim = new Victim(
      this, x, y,
      this._cfg.victimTime,
      () => this._onVictimDrowned(victim),
    );

    this._victims.push(victim);
    this._victimsSpawned++;
    this._updateProgress();

    // Attention arrow
    this._arrowToVictim(x, y);

    // Schedule next if still needed
    const active = this._victims.filter(v => v.isAlive()).length;
    if (active < 2 && this._rescuedCount < this._cfg.victims) {
      this._scheduleNextSpawn(this._cfg.spawnDelay);
    }
  }

  _arrowToVictim(vx, vy) {
    const arrow = this.add.text(vx, vy - 70, '▼', {
      fontSize: '20px', color: '#EF5350',
    }).setOrigin(0.5).setDepth(12);
    this.tweens.add({
      targets: arrow, y: vy - 50, alpha: 0, duration: 900,
      ease: 'Cubic.easeOut', onComplete: () => arrow.destroy(),
    });
  }

  // ── Victim drowns ─────────────────────────────────────────
  _onVictimDrowned(victim) {
    // Remove from carried if somehow carried (safety check)
    this._carried = this._carried.filter(v => v !== victim);

    this._lives--;
    this._score.onMiss();
    this._livesText.setText(this._livesStr());
    this._flashScreen(0xFF0000);
    audio.wrong();

    // Stop oxygen if we now have < 2 carried
    if (this._oxygenActive && this._carried.length < 2) this._stopOxygen();

    if (this._lives <= 0) {
      this.time.delayedCall(700, () => this._gameOver());
      return;
    }

    // Spawn a replacement victim
    this._scheduleNextSpawn(2000);
    this._updateProgress();
  }

  // ── Victim pickup (proximity, auto) ──────────────────────
  _checkPickup() {
    if (this._questionActive || this._paused) return;
    if (this._carried.length >= 2) return; // already at limit

    for (const v of this._victims) {
      if (!v.isPickable()) continue;
      const dist = Phaser.Math.Distance.Between(this._player.x, this._player.y, v.x, v.y);
      if (dist < CONFIG.RESCUE_RANGE) {
        this._pickupVictim(v);
        break;
      }
    }
  }

  _pickupVictim(victim) {
    victim.startCarry();
    this._carried.push(victim);
    this._player.rescueFlash();
    audio.rescue();
    this._updateCarryUI();

    // Carrying 2 → oxygen countdown begins!
    if (this._carried.length >= 2) {
      this._startOxygen();
    }
  }

  // ── Shore delivery ────────────────────────────────────────
  _checkRescueZone() {
    if (this._carried.length === 0 || this._questionActive) return;

    const py = this._player.y;
    if (py >= this._rescueZoneY) {
      this._deliverCarried();
    }
  }

  _deliverCarried() {
    this._stopOxygen();
    const batch = [...this._carried];
    this._carried = [];
    this._updateCarryUI();

    // Process rescue batch one by one (questions in sequence)
    this._processRescueBatch(batch);
  }

  _processRescueBatch(batch) {
    if (batch.length === 0) {
      // Done with this batch – check level
      this._updateProgress();
      if (this._rescuedCount >= this._cfg.victims) {
        this.time.delayedCall(800, () => this._levelComplete());
      } else {
        // Spawn more if needed
        const alive = this._victims.filter(v => v.isAlive()).length;
        if (alive === 0) this._scheduleNextSpawn(this._cfg.spawnDelay);
      }
      return;
    }

    const victim = batch.shift();
    victim.markRescued();
    this._rescuedCount++;
    this._score.markVictimSpawn();

    const pts = this._score.onRescue(false);
    this._scoreText.setText(`Pts: ${this._score.score}`);
    this._showFloatingScore(this._player.x, this._player.y - 60, pts, true);

    this._processRescueBatch(batch);
  }

  // ── Drop mechanics ────────────────────────────────────────

  /** Drop the most recently picked up victim (last in array). */
  _dropLastCarried() {
    if (this._carried.length === 0) return;
    const victim = this._carried.pop();
    // Drop slightly to the side of the player
    const ox = this._carried.length > 0 ? -50 : 50;
    victim.drop(this._player.x + ox, this._player.y - 20);
    this._updateCarryUI();
    if (this._oxygenActive && this._carried.length < 2) this._stopOxygen();
    this._showFloatingText(this._player.x, this._player.y - 80, '¡Soltado!', '#FF8A80');
  }

  /** Drop ALL carried victims (shark stun, oxygen death). */
  _dropAll() {
    this._carried.forEach((v, i) => {
      const ox = i === 0 ? 40 : -40;
      v.drop(this._player.x + ox, this._player.y + 20);
    });
    this._carried = [];
    this._updateCarryUI();
    this._stopOxygen();
  }

  // ── Oxygen system ─────────────────────────────────────────
  _startOxygen() {
    if (this._oxygenActive) return;
    this._oxygenActive = true;
    this._oxygenLeft   = CONFIG.OXYGEN_MAX;

    // Show oxygen bar + drop button
    this.tweens.add({ targets: this._oxygenContainer, alpha: 1, duration: 300 });
    this.tweens.add({ targets: this._dropContainer,   alpha: 1, duration: 300 });
    this._dropFlash.resume();

    // Camera danger pulse
    this.cameras.main.flash(200, 255, 80, 80, false);
  }

  _stopOxygen() {
    if (!this._oxygenActive) return;
    this._oxygenActive = false;
    this._oxygenLeft   = CONFIG.OXYGEN_MAX;

    this.tweens.add({ targets: this._oxygenContainer, alpha: 0, duration: 300 });
    this.tweens.add({ targets: this._dropContainer,   alpha: 0, duration: 300 });
    this._dropFlash.pause();
    this._oxygenBar.width = this._oxygenBarW;
    this._oxygenBar.setFillStyle(0x4CAF50);
  }

  _updateOxygen(delta) {
    if (!this._oxygenActive) return;

    this._oxygenLeft -= delta / 1000;
    const ratio = Math.max(0, this._oxygenLeft / CONFIG.OXYGEN_MAX);

    this._oxygenBar.width = this._oxygenBarW * ratio;
    if (ratio > 0.5)      this._oxygenBar.setFillStyle(0x4CAF50);
    else if (ratio > 0.25) this._oxygenBar.setFillStyle(0xFF9800);
    else                   this._oxygenBar.setFillStyle(0xF44336);

    // Vignette effect as oxygen drops
    if (ratio < 0.3) {
      this._flashScreen(0xFF0000, 0.06 * (1 - ratio));
    }

    if (this._oxygenLeft <= 0) {
      this._playerDrowning();
    }
  }

  _playerDrowning() {
    // Lose a life, drop all victims
    this._lives--;
    this._livesText.setText(this._livesStr());
    this._score.onMiss();
    this._dropAll();
    this._flashScreen(0x2196F3, 0.6);
    this.cameras.main.shake(400, 0.018);
    this._showFloatingText(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 60, '¡TE AHOGAS!', '#F44336');

    if (this._lives <= 0) {
      this.time.delayedCall(700, () => this._gameOver());
    }
  }

  // ── Collectible overlap ───────────────────────────────────
  _checkCollectibles() {
    const p = this._player;

    this._collectibleGroup.getChildren().forEach(c => {
      if (c.isCollected?.() !== false) return; // skip already collected
      const dist = Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y);
      if (dist >= CONFIG.COLLECT_RANGE) return;

      const result = c.collect();
      if (!result) return;

      // ── BOOST item ─────────────────────────────────────────
      if (result.type === 'boost') {
        this._player.applyBoost(result.factor, result.duration);
        this._score.onCollectible();
        this._scoreText.setText(`Pts: ${this._score.score}`);
        this._showFloatingScore(c.x, c.y, CONFIG.SCORE.COLLECTIBLE_PTS, true);
        this._showEffectHUD(result.hud, '#FFD600', result.duration);

        // Boost question
        if (result.question && !this._questionActive) {
          this._questionActive = true;
          this.scene.pause();
          this.scene.launch('QuestionScene', {
            question: result.question,
            onResult: (correct) => {
              this.scene.resume('GameScene');
              this._questionActive = false;
              if (correct) {
                // Extend boost on correct answer!
                this._player.applyBoost(result.factor, result.duration * 0.5);
                this._score.score += CONFIG.SCORE.QUESTION_CORRECT_PTS;
                this._scoreText.setText(`Pts: ${this._score.score}`);
                this._showFloatingScore(p.x, p.y - 50, CONFIG.SCORE.QUESTION_CORRECT_PTS, true);
              }
            },
          });
        }

      // ── HAZARD item ────────────────────────────────────────
      } else if (result.type === 'hazard') {
        // Tint: medusa→purple, seaweed→green, net→orange
        const tintMap = { jellyfish: 0xCE93D8, seaweed: 0x66BB6A, net: 0xFFB74D };
        const tint    = tintMap[c._def?.key] ?? 0x90CAF9;
        this._player.applySlow(result.slowFactor, result.duration, tint);
        this._showEffectHUD(result.hud, '#FF5252', result.duration);
        this._flashScreen(0x880088, 0.25);
        this.cameras.main.shake(180, 0.008);
      }
    });
  }

  // ── Speed-effect HUD banner ───────────────────────────────
  _showEffectHUD(text, color, duration) {
    const { width: W, height: H } = this.scale;
    // Remove existing effect banner
    if (this._effectBanner) {
      try { this._effectBanner.destroy(); } catch {}
    }
    this._effectBanner = this.add.text(W / 2, H * 0.12, text, {
      fontSize: '20px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#000000aa', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setDepth(28).setScrollFactor(0);

    this.tweens.add({
      targets: this._effectBanner,
      alpha: 0,
      delay: Math.min(duration - 400, 2500),
      duration: 400,
      onComplete: () => { try { this._effectBanner?.destroy(); } catch {} },
    });
  }

  // ── Speed modifier based on carry load ───────────────────
  _applyCarrySpeed() {
    const n = this._carried.length;
    if (n === 0) {
      this._player._carrySpeedMult = 1;
    } else if (n === 1) {
      this._player._carrySpeedMult = CONFIG.CARRY_SPEED_MULT;
    } else {
      this._player._carrySpeedMult = CONFIG.CARRY_SPEED_MULT2;
    }
  }

  // ── Zone glow pulse ───────────────────────────────────────
  _updateZoneGlow() {
    const carrying = this._carried.length > 0;
    const H = CONFIG.HEIGHT;
    const zH = CONFIG.RESCUE_ZONE_HEIGHT;
    const zY = this._rescueZoneY;

    this._zoneGlowPhase += 0.04;
    const a = carrying
      ? 0.25 + Math.sin(this._zoneGlowPhase) * 0.2   // bright pulsing
      : 0.06 + Math.sin(this._zoneGlowPhase) * 0.04; // dim idle

    this._zoneGlow.clear();
    this._zoneGlow.fillStyle(0x4CAF50, a);
    this._zoneGlow.fillRect(0, zY, CONFIG.WIDTH, zH);
  }

  // ── Carried victim positions ──────────────────────────────
  _updateCarriedPositions() {
    const px = this._player.x, py = this._player.y;
    const flip = this._player.flipX ? -1 : 1;

    this._carried.forEach((v, i) => {
      // First: to the side of the player; Second: to the other side
      const ox = (i === 0 ? 1 : -1) * flip * CONFIG.CARRY_OFFSET_X;
      const oy = CONFIG.CARRY_OFFSET_Y;
      v.updateCarriedPosition(px + ox, py + oy);
    });
  }

  // ── Update carry HUD ──────────────────────────────────────
  _updateCarryUI() {
    const n = this._carried.length;
    if (n === 0) {
      this._carryText.setText('');
    } else if (n === 1) {
      this._carryText.setText('🤝 Llevando 1 — ¡lleva a la zona de rescate!');
    } else {
      this._carryText.setText('⚠️ ¡Llevas 2! Suelta a uno o te ahogas');
    }
  }

  // ── Utility ───────────────────────────────────────────────
  _livesStr() { return '❤️ '.repeat(this._lives).trim() || '💀'; }

  _updateProgress() {
    const remaining = this._cfg.victims - this._rescuedCount;
    this._progressText.setText(
      `Rescatados: ${this._rescuedCount} / ${this._cfg.victims}  |  Faltan: ${Math.max(0, remaining)}`
    );
  }

  _showFloatingScore(x, y, pts, correct) {
    const color = correct ? '#4CAF50' : '#F9A825';
    const t = this.add.text(x, y, `+${pts}`, {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t, y: y - 65, alpha: 0, duration: 950, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _showFloatingText(x, y, text, color = '#ffffff') {
    const t = this.add.text(x, y, text, {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(26);
    this.tweens.add({
      targets: t, y: y - 50, alpha: 0, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _showCombo() {
    const c = this._score.combo;
    if (c < 2) return;
    this._comboText.setText(`🔥 COMBO x${c}`).setAlpha(1);
    this.tweens.add({ targets: this._comboText, alpha: 0, delay: 1300, duration: 500 });
  }

  _flashScreen(color, alpha = 0.45) {
    const { width: W, height: H } = this.scale;
    const r = this.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(40);
    this.tweens.add({ targets: r, alpha: 0, duration: 320, onComplete: () => r.destroy() });
  }

  // ── Pause ─────────────────────────────────────────────────
  _togglePause() {
    if (this._questionActive) return;
    this._paused = !this._paused;
    if (this._paused) {
      this.physics.pause();
      this._joystick.setVisible(false);
      this._showPauseOverlay();
    } else {
      this.physics.resume();
      this._joystick.setVisible(true);
      this._pauseOverlay?.destroy();
    }
  }

  _showPauseOverlay() {
    const { width: W, height: H } = this.scale;
    this._pauseOverlay = this.add.container(0, 0).setDepth(50);
    this._pauseOverlay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.68));
    this._pauseOverlay.add(
      this.add.text(W / 2, H / 2 - 50, 'PAUSA', {
        fontSize: '44px', fontFamily: 'Arial Black, Arial',
        color: '#F9A825', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5)
    );
    const resume = this.add.text(W / 2, H / 2 + 20, '▶  Continuar', {
      fontSize: '22px', fontFamily: 'Arial', color: '#4CAF50',
      backgroundColor: '#00000066', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resume.on('pointerup', () => this._togglePause());
    this._pauseOverlay.add(resume);

    const menu = this.add.text(W / 2, H / 2 + 82, '🏠  Menú', {
      fontSize: '18px', fontFamily: 'Arial', color: '#EF5350',
      backgroundColor: '#00000066', padding: { x: 16, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.on('pointerup', () => {
      audio.stopAmbient();
      // Save progress so player can resume from this level
      this._score.saveSession(this._level, this._lives);
      this._cleanup();
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });
    this._pauseOverlay.add(menu);
  }

  // ── Level complete / Game over ────────────────────────────
  _levelComplete() {
    audio.levelComplete();
    audio.stopAmbient();
    this._score.level = this._level;
    this._score.saveIfBest();
    this._score.saveSession(this._level + 1, this._lives);
    this._cleanup();

    const nextSceneData = {
      level:   this._level,
      score:   this._score,
      lives:   this._lives,
      rescued: this._rescuedCount,
      total:   this._cfg.victims,
    };

    // Show ad every 3 levels (levels 3, 6, 9, …)
    if (this._level % 3 === 0) {
      this.scene.launch('AdScene', {
        onComplete: () => this.scene.start('LevelCompleteScene', nextSceneData),
      });
      this.scene.pause('GameScene');
    } else {
      this.scene.start('LevelCompleteScene', nextSceneData);
    }
  }

  _gameOver() {
    audio.gameOver();
    audio.stopAmbient();
    AdMobManager.removeBanner();
    this._score.saveIfBest();
    ScoreSystem.clearSession(); // game over = no session to resume
    this._cleanup();
    this.scene.start('GameOverScene', {
      score:   this._score.score,
      level:   this._level,
      rescues: this._score.rescues,
    });
  }

  // ── Main update loop ──────────────────────────────────────
  update(time, delta) {
    if (this._paused || this._questionActive) return;

    // Scroll bg
    this._bgTile.tilePositionX += 0.3;
    this._bgTile.tilePositionY += 0.12;

    // Apply carry speed multiplier before player moves
    this._applyCarrySpeed();

    // Update player
    this._player.update(this._joystick);

    // Sync carried victims to player position
    this._updateCarriedPositions();

    // Zone glow
    this._updateZoneGlow();

    // Entity updates
    this._obstacles.update();
    this._collectibles.update();

    // Oxygen tick
    this._updateOxygen(delta);

    // Proximity checks
    this._checkPickup();
    this._checkRescueZone();
    this._checkCollectibles();
  }

  // ── Cleanup ───────────────────────────────────────────────
  _cleanup() {
    try { this._joystick.destroy(); } catch {}
    try { this._obstacles.destroyAll(); } catch {}
    try { this._collectibles.destroyAll(); } catch {}
    this._victims.forEach(v => { try { v.destroyAll(); } catch {} });
    this._victims = [];
    this._carried = [];
  }
}
