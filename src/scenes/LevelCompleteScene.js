// ============================================================
//  LevelCompleteScene – Shown when all victims are rescued.
// ============================================================
import { audio } from '../systems/AudioSystem.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() { super('LevelCompleteScene'); }

  init(data) {
    this._level   = data.level;
    this._score   = data.score;
    this._lives   = data.lives;
    this._rescued = data.rescued;
    this._total   = data.total;
  }

  create() {
    const { width: W, height: H } = this.scale;

    // Background
    this.add.rectangle(0, 0, W, H, 0x0a2040).setOrigin(0);

    // Stars burst effect
    for (let i = 0; i < 16; i++) {
      const star = this.add.image(
        Phaser.Math.Between(30, W - 30),
        Phaser.Math.Between(30, H - 30),
        'star'
      ).setScale(0).setAlpha(0);

      this.tweens.add({
        targets: star,
        scale:   { from: 0, to: Phaser.Math.FloatBetween(0.6, 1.4) },
        alpha:   { from: 0, to: 1 },
        delay:   Phaser.Math.Between(0, 600),
        duration: 400,
        ease:    'Back.easeOut',
      });
    }

    // Panel
    const panel = this.add.rectangle(W / 2, H * 0.42, W * 0.88, H * 0.6, 0x0d3b6e)
      .setStrokeStyle(3, 0xffd600);

    // Fade in panel (no scaleY clip that would hide stats)
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 350, ease: 'Cubic.easeOut' });

    // Title
    this.add.text(W / 2, H * 0.15, '¡NIVEL COMPLETADO!', {
      fontSize: '28px', fontFamily: 'Arial Black, Arial', fontStyle: 'bold',
      color: '#ffd600', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.24, `Nivel ${this._level}`, {
      fontSize: '20px', fontFamily: 'Arial', color: '#90caf9',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Stats
    const statsY = H * 0.36;
    const lines  = [
      { label: '🆘  Rescatados',  value: `${this._rescued} / ${this._total}` },
      { label: '⭐  Puntuación',   value: `${this._score.score}` },
      { label: '❤️  Vidas',        value: '❤️ '.repeat(this._lives).trim() },
      { label: '🔥  Mejor racha',  value: `${this._score.combo} rescates` },
    ];

    lines.forEach((l, i) => {
      this.add.text(W * 0.2, statsY + i * 46, l.label, {
        fontSize: '16px', fontFamily: 'Arial', color: '#e0f7fa',
      }).setOrigin(0, 0.5);
      this.add.text(W * 0.82, statsY + i * 46, l.value, {
        fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffd600',
      }).setOrigin(1, 0.5);
    });

    // Perfect bonus
    if (this._rescued === this._total) {
      const bonus = this.add.text(W / 2, H * 0.67, '🏆 ¡RESCATE PERFECTO!', {
        fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#ffd600', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: bonus, alpha: 1, delay: 400, duration: 500 });
    }

    // Next level button
    this._addBtn(W / 2, H * 0.8, `▶  Nivel ${this._level + 1}`, 0x1565c0, 0x42a5f5, () => {
      audio.tap();
      this.scene.start('GameScene', {
        level: this._level + 1,
        score: this._score,
        lives: this._lives,
      });
    });

    // Menu button
    this._addBtn(W / 2, H * 0.89, '🏠  Menú', 0x263238, 0x546e7a, () => {
      audio.tap();
      this.scene.start('MenuScene');
    }, 160, 40, '14px');
  }

  _addBtn(x, y, text, bg, hover, cb, w = 220, h = 50, fs = '18px') {
    const rect = this.add.rectangle(x, y, w, h, bg)
      .setStrokeStyle(2, hover)
      .setInteractive({ useHandCursor: true });
    const lbl  = this.add.text(x, y, text, {
      fontSize: fs, fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    rect.on('pointerover',  () => rect.setFillStyle(hover));
    rect.on('pointerout',   () => rect.setFillStyle(bg));
    rect.on('pointerup',    () => cb());
  }
}
