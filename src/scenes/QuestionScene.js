// ============================================================
//  QuestionScene – Modal overlay for trivia questions.
//  Launched on top of (paused) GameScene.
//  Emits the result via the onResult callback in scene data.
// ============================================================
import { CONFIG } from '../config.js';
import { audio }  from '../systems/AudioSystem.js';

const C = CONFIG.COLORS;

const CATEGORY_ICONS = {
  natacion:  '🏊',
  anatomia:  '🫀',
  oceano:    '🌊',
  adivinanza:'🧩',
  general:   '🌍',
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [0x1565c0, 0x6a1b9a, 0x1b5e20, 0x7f0000];

export class QuestionScene extends Phaser.Scene {
  constructor() { super('QuestionScene'); }

  init(data) {
    this._question  = data.question;
    this._onResult  = data.onResult;    // (correct: boolean) => void
    this._answered  = false;
    this._timeLeft  = CONFIG.QUESTION_TIMEOUT;
  }

  create() {
    const { width: W, height: H } = this.scale;
    const q = this._question;

    // ── Dark backdrop ─────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(0);

    // ── Panel ─────────────────────────────────────────────────
    const panelW = W * 0.9, panelH = H * 0.78;
    const panelX = W / 2, panelY = H / 2;

    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x0d3b6e, 1)
      .setStrokeStyle(3, 0x42a5f5).setDepth(1);

    // Panel fly-in
    panel.setScale(0.85);
    this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.easeOut' });

    // ── Category icon + timer row ─────────────────────────────
    const icon = CATEGORY_ICONS[q.category] || '❓';
    this.add.text(panelX - panelW / 2 + 20, panelY - panelH / 2 + 22, icon, {
      fontSize: '28px',
    }).setDepth(2);

    // Category label
    this.add.text(panelX - panelW / 2 + 56, panelY - panelH / 2 + 30,
      q.category.toUpperCase(), {
        fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#90caf9',
      }
    ).setDepth(2);

    // Timer text (top-right)
    this._timerText = this.add.text(
      panelX + panelW / 2 - 16, panelY - panelH / 2 + 22,
      `${this._timeLeft}s`, {
        fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
        color: '#ffd600', stroke: '#000000', strokeThickness: 2,
      }
    ).setOrigin(1, 0).setDepth(2);

    // Timer bar background
    const barY = panelY - panelH / 2 + 62;
    const barW = panelW - 40;
    this.add.rectangle(panelX, barY, barW, 8, 0x000000, 0.6).setDepth(2);
    this._timerBar = this.add.rectangle(
      panelX - barW / 2, barY, barW, 8, 0x4caf50
    ).setOrigin(0, 0.5).setDepth(3);

    // ── Question text ─────────────────────────────────────────
    const qY = panelY - panelH / 2 + 100;
    this.add.text(panelX, qY, q.question, {
      fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
      wordWrap: { width: panelW - 40 },
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(2);

    // ── Answer buttons ────────────────────────────────────────
    const btnW     = panelW - 36;
    const btnH     = 52;
    const startY   = panelY - panelH / 2 + 230;
    const gap      = 60;

    this._answerBtns = [];

    q.options.forEach((text, i) => {
      const btnY = startY + i * gap;
      const btn  = this._makeAnswerBtn(
        panelX, btnY, btnW, btnH,
        `${OPTION_LABELS[i]}  ${text}`,
        OPTION_COLORS[i],
        () => this._answer(i),
      );
      this._answerBtns.push(btn);
    });

    // ── Tip text (hidden until answer) ────────────────────────
    this._tipText = this.add.text(panelX, panelY + panelH / 2 - 32, '', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#ffe082', wordWrap: { width: panelW - 30 }, align: 'center',
    }).setOrigin(0.5).setDepth(4).setAlpha(0);

    // ── Countdown timer ───────────────────────────────────────
    this._timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this._tick,
      callbackScope: this,
      loop: true,
    });
  }

  // ── Timer countdown ───────────────────────────────────────
  _tick() {
    if (this._answered) return;
    this._timeLeft--;
    this._timerText.setText(`${Math.max(0, this._timeLeft)}s`);

    const ratio = this._timeLeft / CONFIG.QUESTION_TIMEOUT;
    this._timerBar.width = (CONFIG.WIDTH * 0.9 - 40) * Math.max(0, ratio);

    if (ratio > 0.5) {
      this._timerBar.setFillStyle(0x4caf50);
      this._timerText.setColor('#ffd600');
    } else if (ratio > 0.25) {
      this._timerBar.setFillStyle(0xffc107);
      this._timerText.setColor('#ffc107');
    } else {
      this._timerBar.setFillStyle(0xf44336);
      this._timerText.setColor('#f44336');
    }

    if (this._timeLeft <= 0) {
      this._answer(-1); // timeout = wrong
    }
  }

  // ── Handle answer selection ───────────────────────────────
  _answer(selectedIndex) {
    if (this._answered) return;
    this._answered = true;
    this._timerEvent.remove();

    const q       = this._question;
    const correct = selectedIndex === q.correct;

    // Disable all buttons
    this._answerBtns.forEach((btn, i) => {
      btn.bg.disableInteractive();
      if (i === q.correct) {
        btn.bg.setFillStyle(0x1b5e20); // correct = green
      } else if (i === selectedIndex) {
        btn.bg.setFillStyle(0x7f0000); // wrong selection = red
      } else {
        btn.bg.setAlpha(0.4);
      }
    });

    // Result visual
    const resultIcon = correct ? '✅' : (selectedIndex === -1 ? '⏰' : '❌');
    const resultMsg  = correct
      ? '¡Correcto! +8 segundos extra'
      : (selectedIndex === -1 ? '¡Se acabó el tiempo!' : '¡Incorrecto!');
    const resultColor = correct ? '#4caf50' : '#f44336';

    const { width: W, height: H } = this.scale;

    this.add.text(W / 2, H / 2 - 20, resultIcon, { fontSize: '52px' }).setOrigin(0.5).setDepth(10);
    this.add.text(W / 2, H / 2 + 42, resultMsg, {
      fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold',
      color: resultColor, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Show tip
    if (q.tip) {
      this._tipText.setText(`💡 ${q.tip}`).setAlpha(1);
    }

    if (correct) audio.correct();
    else         audio.wrong();

    // Close after a moment
    this.time.delayedCall(2000, () => {
      this._timerEvent?.remove();
      this.scene.stop('QuestionScene');
      this._onResult?.(correct);
    });
  }

  // ── Answer button factory ─────────────────────────────────
  _makeAnswerBtn(x, y, w, h, text, bgColor, onTap) {
    const bg = this.add.rectangle(x, y, w, h, bgColor)
      .setStrokeStyle(1.5, 0xffffff, 0.4)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(x, y, text, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
      wordWrap: { width: w - 20 },
    }).setOrigin(0.5).setDepth(3);

    bg.on('pointerover',  () => { if (!this._answered) bg.setAlpha(0.8); });
    bg.on('pointerout',   () => { if (!this._answered) bg.setAlpha(1); });
    bg.on('pointerdown',  () => {
      if (!this._answered) {
        this.tweens.add({ targets: [bg, label], scaleX: 0.96, scaleY: 0.96, duration: 60, yoyo: true });
      }
    });
    bg.on('pointerup',    () => { if (!this._answered) onTap(); });

    return { bg, label };
  }
}
