// ============================================================
//  GameOverScene – Displayed when the player runs out of lives.
// ============================================================
import { ScoreSystem }  from '../systems/ScoreSystem.js';
// Session is already cleared in GameScene._gameOver() before reaching here
import { audio }        from '../systems/AudioSystem.js';
import { AdMobManager } from '../managers/AdMobManager.js';

// Contador persistente de partidas para frecuencia del intersticial
let _gamesPlayed = 0;

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this._score   = data.score;
    this._level   = data.level;
    this._rescues = data.rescues;
    this._ssys    = new ScoreSystem();
  }

  create() {
    const { width: W, height: H } = this.scale;

    // Dark ocean background
    this.add.rectangle(0, 0, W, H, 0x050f1e).setOrigin(0);

    // Subtle ripple circles
    for (let i = 0; i < 5; i++) {
      const r = this.add.graphics().setAlpha(0);
      r.lineStyle(2, 0x1565c0, 0.4);
      r.strokeCircle(W / 2, H * 0.35, 50 + i * 30);
      this.tweens.add({
        targets: r,
        alpha:   { from: 0, to: 0.6 },
        scaleX:  { from: 0.5, to: 1.8 },
        scaleY:  { from: 0.5, to: 1.8 },
        delay:   i * 300,
        duration: 1500,
        repeat:  -1,
        ease:    'Cubic.easeOut',
      });
    }

    // "Game Over" title
    const titleY = H * 0.22;
    this.add.text(W / 2, titleY, 'GAME', {
      fontSize: '56px', fontFamily: 'Arial Black, Arial',
      color: '#ef5350', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(W / 2, titleY + 56, 'OVER', {
      fontSize: '56px', fontFamily: 'Arial Black, Arial',
      color: '#ef5350', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    // Panel
    const panelY = H * 0.6;
    this.add.rectangle(W / 2, panelY, W * 0.85, H * 0.38, 0x0d3b6e)
      .setStrokeStyle(2, 0x546e7a);

    // Stats
    const best = this._ssys.getBest();
    const isNew = best && this._score >= best.score;

    const lines = [
      { label: '🏅 Puntuación',        value: `${this._score}${isNew ? ' 🆕' : ''}` },
      { label: '📊 Nivel alcanzado',   value: `${this._level}` },
      { label: '🆘 Rescates totales',  value: `${this._rescues}` },
    ];

    if (best) {
      lines.push({ label: '🏆 Récord',   value: `${best.score}` });
    }

    lines.forEach((l, i) => {
      const y = panelY - H * 0.12 + i * 44;
      this.add.text(W * 0.14, y, l.label, {
        fontSize: '15px', fontFamily: 'Arial', color: '#e0f7fa',
      }).setOrigin(0, 0.5);
      this.add.text(W * 0.88, y, l.value, {
        fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffd600',
      }).setOrigin(1, 0.5);
    });

    // Encouragement
    const msgs = [
      '¡Sigue entrenando, rescatador!',
      '¡Las víctimas cuentan contigo!',
      '¡Cada segundo cuenta en el mar!',
      '¡Inténtalo de nuevo, eres un héroe!',
    ];
    this.add.text(W / 2, H * 0.82, Phaser.Utils.Array.GetRandom(msgs), {
      fontSize: '14px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#90caf9', stroke: '#000000', strokeThickness: 1,
      wordWrap: { width: W * 0.8 }, align: 'center',
    }).setOrigin(0.5);

    // Replay button
    this._btn(W / 2, H * 0.89, '🔄  Jugar de nuevo', 0x1b5e20, 0x43a047, () => {
      audio.tap();
      this.scene.start('GameScene', { level: 1 });
    });

    this._btn(W / 2, H * 0.96, '🏠  Menú', 0x1a237e, 0x3949ab, () => {
      audio.tap();
      this.scene.start('MenuScene');
    }, 170, 38, '14px');

    // Intersticial cada 3 partidas
    _gamesPlayed++;
    if (_gamesPlayed % 3 === 0) {
      this.time.delayedCall(800, () => AdMobManager.showInterstitial());
    }
  }

  _btn(x, y, text, bg, hover, cb, w = 240, h = 50, fs = '18px') {
    const r = this.add.rectangle(x, y, w, h, bg)
      .setStrokeStyle(2, hover).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, {
      fontSize: fs, fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    r.on('pointerover', () => r.setFillStyle(hover));
    r.on('pointerout',  () => r.setFillStyle(bg));
    r.on('pointerup',   () => cb());
  }
}
