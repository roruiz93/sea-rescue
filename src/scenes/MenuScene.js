// ============================================================
//  MenuScene – Main menu.
//  On load, checks localStorage for a saved session and asks
//  the player if they want to continue or start from level 1.
// ============================================================
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { audio }       from '../systems/AudioSystem.js';
import { CONFIG }      from '../config.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this._scoreSystem = new ScoreSystem();
  }

  create() {
    const { width: W, height: H } = this.scale;

    // ── Background ────────────────────────────────────────────
    this.add.tileSprite(0, 0, W, H, 'ocean_tile').setOrigin(0);

    for (let i = 0; i < 3; i++) {
      const strip = this.add.image(W / 2, 200 + i * 120, 'wave').setAlpha(0.6);
      this.tweens.add({
        targets: strip,
        x: { from: -W / 2, to: W * 1.5 },
        duration: 4000 + i * 1200,
        repeat: -1, ease: 'Linear',
      });
    }

    // ── Title ─────────────────────────────────────────────────
    this.add.rectangle(W / 2, H * 0.22, W * 0.85, 80, 0x000000, 0.45)
      .setStrokeStyle(2, 0x42a5f5);

    this.add.text(W / 2, H * 0.18, 'SEA', {
      fontSize: '52px', fontFamily: 'Arial Black, Arial',
      color: '#42a5f5', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.26, 'RESCUE', {
      fontSize: '52px', fontFamily: 'Arial Black, Arial',
      color: '#f9a825', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.34, '¡Salva vidas en el océano!', {
      fontSize: '16px', fontFamily: 'Arial', color: '#e0f7fa',
      stroke: '#00000088', strokeThickness: 3,
    }).setOrigin(0.5);

    // ── Boat ──────────────────────────────────────────────────
    const boat = this.add.image(W / 2, H * 0.46, 'boat').setScale(1.4);
    this.tweens.add({ targets: boat, y: `+=8`, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Best score ────────────────────────────────────────────
    const best = this._scoreSystem.getBest();
    if (best) {
      this.add.text(W / 2, H * 0.57, `🏆  Récord: ${best.score} pts  (Nivel ${best.level})`, {
        fontSize: '14px', fontFamily: 'Arial', color: '#ffd600',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
    }

    // ── Buttons ───────────────────────────────────────────────
    this._createButton(W / 2, H * 0.68, '▶  JUGAR', 0x1565c0, 0x42a5f5, () => {
      audio.tap();
      const session = ScoreSystem.loadSession();
      if (session && this._sessionValid(session)) {
        // Partida guardada → preguntar
        this._showResumeDialog(session);
      } else {
        // Primera vez o sin sesión → directo
        this.scene.start('GameScene', { level: 1 });
      }
    });

    this._createButton(W / 2, H * 0.78, '❓  CÓMO JUGAR', 0x4a148c, 0xab47bc, () => {
      audio.tap();
      this._showHelp();
    });

    this._muteBtn = this._createButton(W - 50, H - 50, '🔊', 0x263238, 0x546e7a, () => {
      const muted = audio.toggleMute();
      this._muteBtn.label.setText(muted ? '🔇' : '🔊');
    }, 60, 40);

    this.add.text(W / 2, H - 20, 'v1.0 – Sea Rescue', {
      fontSize: '11px', fontFamily: 'Arial', color: '#546e7a',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => audio.init(), this);
  }

  // ── Session resume dialog ─────────────────────────────────

  /** Returns true if the session exists and is less than 7 days old. */
  _sessionValid(session) {
    const age = Date.now() - (session.date ?? 0);
    if (age > 7 * 24 * 60 * 60 * 1000) {
      ScoreSystem.clearSession();
      return false;
    }
    return true;
  }

  _showResumeDialog(session) {
    const { width: W, height: H } = this.scale;

    // Backdrop
    const overlay = this.add.container(0, 0).setDepth(60);
    overlay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72));

    // Panel
    const panel = this.add.rectangle(W / 2, H / 2, W * 0.88, 360, 0x0d3b6e)
      .setStrokeStyle(3, 0xf9a825);
    overlay.add(panel);

    // Icon + title
    overlay.add(this.add.text(W / 2, H / 2 - 148, '🌊', { fontSize: '44px' }).setOrigin(0.5));
    overlay.add(this.add.text(W / 2, H / 2 - 100, '¡PARTIDA GUARDADA!', {
      fontSize: '20px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#f9a825', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5));

    // Session info
    const timeAgo = this._formatAge(session.date);
    const infoLines = [
      `📊 Nivel ${session.level}`,
      `⭐ ${session.score} puntos`,
      `❤️  ${'❤️ '.repeat(session.lives ?? 3).trim()}`,
      `🕐 Hace ${timeAgo}`,
    ];
    infoLines.forEach((line, i) => {
      overlay.add(this.add.text(W / 2, H / 2 - 48 + i * 36, line, {
        fontSize: '15px', fontFamily: 'Arial', color: '#e0f7fa',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5));
    });

    // ── CONTINUE button ───────────────────────────────────────
    const continueBtn = this._createButton(
      W / 2, H / 2 + 108,
      `▶  CONTINUAR — Nivel ${session.level}`,
      0x1b5e20, 0x43a047,
      () => {
        audio.tap();
        overlay.destroy();
        const score = new ScoreSystem();
        score.restoreSession(session);
        this.scene.start('GameScene', {
          level: session.level,
          score,
          lives: session.lives ?? CONFIG.LIVES,
        });
      }, 280, 52,
    );
    continueBtn.setDepth(61);
    overlay.add(continueBtn);

    // ── NEW GAME button ───────────────────────────────────────
    const newBtn = this._createButton(
      W / 2, H / 2 + 170,
      '🔄  Empezar desde cero',
      0x7f0000, 0xef5350,
      () => {
        audio.tap();
        ScoreSystem.clearSession();
        overlay.destroy();
        this.scene.start('GameScene', { level: 1 });
      }, 260, 46, '15px',
    );
    newBtn.setDepth(61);
    overlay.add(newBtn);

    // Fly-in animation
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 350, ease: 'Cubic.easeOut' });
    panel.setScale(0.85);
    this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
  }

  // ── Helpers ───────────────────────────────────────────────

  _formatAge(timestamp) {
    const secs = Math.floor((Date.now() - timestamp) / 1000);
    if (secs < 60)   return `${secs} segundos`;
    if (secs < 3600) return `${Math.floor(secs / 60)} minutos`;
    if (secs < 86400)return `${Math.floor(secs / 3600)} horas`;
    return `${Math.floor(secs / 86400)} días`;
  }

  _createButton(x, y, text, bg, bgHover, onTap, w = 230, h = 52, fs = '19px') {
    const container = this.add.container(x, y);

    const rect = this.add.rectangle(0, 0, w, h, bg)
      .setStrokeStyle(2, bgHover)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: fs, fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    container.add([rect, label]);
    container.label = label;

    rect.on('pointerover',  () => rect.setFillStyle(bgHover));
    rect.on('pointerout',   () => rect.setFillStyle(bg));
    rect.on('pointerdown',  () => {
      this.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.94, duration: 80, yoyo: true });
    });
    rect.on('pointerup', () => onTap());

    return container;
  }

  _showHelp() {
    const { width: W, height: H } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(50);
    overlay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75));

    const panel = this.add.rectangle(W / 2, H / 2, W * 0.88, H * 0.78, 0x0d3b6e)
      .setStrokeStyle(2, 0x42a5f5);
    overlay.add(panel);

    overlay.add(this.add.text(W / 2, H * 0.18, '¿CÓMO JUGAR?', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold', color: '#f9a825',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5));

    const lines = [
      '🕹️  Joystick para nadar',
      '🆘  Llega a las víctimas y llévalas a la playa',
      '🏖  Zona verde = zona de rescate (borde inferior)',
      '❓  Responde preguntas para ganar tiempo extra',
      '🌊  Olas → -65% velocidad 4 segundos',
      '🥽  Patas de rana / torpedo → velocidad x2',
      '🪼  Medusa / algas / red → te ralentizan (nivel 3+)',
      '💨  Llevar 2 víctimas → cuenta de oxígeno (8 s)',
      '🔥  Combo x1.5 pts con 3 rescates seguidos',
    ];

    lines.forEach((line, i) => {
      overlay.add(this.add.text(W / 2, H * 0.27 + i * 44, line, {
        fontSize: '13px', fontFamily: 'Arial', color: '#e0f7fa',
        wordWrap: { width: W * 0.78 }, align: 'center',
      }).setOrigin(0.5));
    });

    const closeBtn = this._createButton(W / 2, H * 0.88, '✔  ENTENDIDO', 0x1b5e20, 0x43a047, () => {
      audio.tap();
      overlay.destroy();
    });
    closeBtn.setDepth(51);
    overlay.add(closeBtn);
  }
}
