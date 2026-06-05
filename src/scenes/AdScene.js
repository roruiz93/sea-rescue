// ============================================================
//  AdScene – Interstitial ad placeholder.
//  Shown every 3 levels, before LevelCompleteScene continues.
//
//  In production replace the _showAdPlaceholder() body with
//  your real ad SDK call (AdMob / Google Mobile Ads via Capacitor).
//
//  Flow:
//   1. Scene launches on top of everything.
//   2. Shows a full-screen "ad" placeholder.
//   3. A countdown starts (10 s).  Skip button is HIDDEN.
//   4. At 10 s the skip button appears — player can close.
//   5. onComplete callback fires → scene stops.
// ============================================================
import { audio } from '../systems/AudioSystem.js';

const SKIP_DELAY = 10; // seconds until skip button appears

export class AdScene extends Phaser.Scene {
  constructor() { super('AdScene'); }

  init(data) {
    this._onComplete = data.onComplete; // () => void
  }

  create() {
    const { width: W, height: H } = this.scale;

    // ── Dark overlay (blocks game underneath) ─────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.96).setDepth(0);

    // ── Ad placeholder area ───────────────────────────────────
    this._showAdPlaceholder(W, H);

    // ── Countdown label (top-right corner) ───────────────────
    this._countdownLeft = SKIP_DELAY;
    this._countdownText = this.add.text(W - 16, 16,
      `Saltar en ${this._countdownLeft}s`, {
        fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#aaaaaa', stroke: '#000000', strokeThickness: 2,
        backgroundColor: '#00000088',
        padding: { x: 8, y: 4 },
      }
    ).setOrigin(1, 0).setDepth(10);

    // ── Skip button (hidden for first 10 s) ───────────────────
    this._skipBtn = this._buildSkipBtn(W, H);
    this._skipBtn.setAlpha(0);

    // ── Tick every second ─────────────────────────────────────
    this._tickEvent = this.time.addEvent({
      delay: 1000,
      callback: this._tick,
      callbackScope: this,
      loop: true,
    });
  }

  // ── Countdown tick ────────────────────────────────────────
  _tick() {
    this._countdownLeft--;

    if (this._countdownLeft > 0) {
      this._countdownText.setText(`Saltar en ${this._countdownLeft}s`);
    } else {
      // Time's up → show skip button
      this._tickEvent.remove();
      this._countdownText.setText('');
      this.tweens.add({
        targets: this._skipBtn,
        alpha: 1,
        duration: 300,
        ease: 'Cubic.easeOut',
      });
    }
  }

  // ── Skip button ───────────────────────────────────────────
  _buildSkipBtn(W, H) {
    const container = this.add.container(W - 16, 16).setDepth(10);

    const bg = this.add.rectangle(0, 0, 130, 40, 0x212121)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(-4, 20, '✕  SALTAR', {
      fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(1, 0.5);

    container.add([bg, label]);

    bg.on('pointerover',  () => bg.setFillStyle(0x424242));
    bg.on('pointerout',   () => bg.setFillStyle(0x212121));
    bg.on('pointerdown',  () => {
      this.tweens.add({ targets: container, scaleX: 0.92, scaleY: 0.92, duration: 60, yoyo: true });
    });
    bg.on('pointerup', () => this._close());

    return container;
  }

  _close() {
    audio.tap();
    this._tickEvent?.remove();
    this.scene.stop('AdScene');
    this._onComplete?.();
  }

  // ── Ad placeholder ────────────────────────────────────────
  // Replace this method with your real AdMob integration.
  _showAdPlaceholder(W, H) {
    // ── Simulated ad card ─────────────────────────────────────
    const cardH = H * 0.72;
    const cardY = H / 2 - 20;

    // Card background
    this.add.rectangle(W / 2, cardY, W * 0.9, cardH, 0x1a1a2e)
      .setStrokeStyle(2, 0x444466).setDepth(1);

    // "PUBLICIDAD" badge
    this.add.rectangle(W / 2, cardY - cardH / 2 + 18, 120, 26, 0x333355)
      .setStrokeStyle(1, 0x555577).setDepth(2);
    this.add.text(W / 2, cardY - cardH / 2 + 18, 'PUBLICIDAD', {
      fontSize: '11px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#888899', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(3);

    // Placeholder graphic (animated waves + text)
    const gfx = this.add.graphics().setDepth(2);
    gfx.fillStyle(0x0d3b6e, 1);
    gfx.fillRect(W * 0.05, cardY - cardH / 2 + 36, W * 0.9, cardH - 110);

    // Animated wave bars (fake loading / visual interest)
    const bars = [];
    for (let i = 0; i < 6; i++) {
      const b = this.add.rectangle(
        W * 0.14 + i * (W * 0.13),
        cardY + 20,
        W * 0.09, 60,
        0x1565c0,
      ).setDepth(3);
      bars.push(b);
      this.tweens.add({
        targets: b,
        scaleY: { from: 0.3, to: 1.4 },
        duration: 500 + i * 80,
        yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Fake ad headline
    this.add.text(W / 2, cardY - cardH / 2 + cardH * 0.55, '¡Tu anuncio aquí!', {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3);

    this.add.text(W / 2, cardY - cardH / 2 + cardH * 0.65, 'Integra Google AdMob\ncon Capacitor para anuncios reales.', {
      fontSize: '13px', fontFamily: 'Arial', color: '#90caf9',
      align: 'center',
    }).setOrigin(0.5).setDepth(3);

    // Fake CTA button
    const ctaBg = this.add.rectangle(W / 2, cardY - cardH / 2 + cardH * 0.80, 200, 44, 0x1976d2)
      .setStrokeStyle(2, 0x42a5f5).setDepth(3)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, cardY - cardH / 2 + cardH * 0.80, 'Saber más →', {
      fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(4);
    ctaBg.on('pointerover', () => ctaBg.setFillStyle(0x1565c0));
    ctaBg.on('pointerout',  () => ctaBg.setFillStyle(0x1976d2));

    // ─ Integration hint at bottom ────────────────────────────
    this.add.text(W / 2, H - 28,
      'npm install @capacitor-community/admob', {
        fontSize: '10px', fontFamily: 'monospace', color: '#555566',
      }
    ).setOrigin(0.5).setDepth(2);
  }
}
