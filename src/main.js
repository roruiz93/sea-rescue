// ============================================================
//  Sea Rescue – Game Entry Point
//  Stack: Phaser 3 + Vite + Capacitor (Android)
// ============================================================
import Phaser from 'phaser';

import { BootScene }          from './scenes/BootScene.js';
import { MenuScene }          from './scenes/MenuScene.js';
import { GameScene }          from './scenes/GameScene.js';
import { QuestionScene }      from './scenes/QuestionScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { GameOverScene }      from './scenes/GameOverScene.js';
import { AdScene }            from './scenes/AdScene.js';
import { CONFIG }             from './config.js';

// ── Game configuration ────────────────────────────────────────
const config = {
  type: Phaser.AUTO,          // WebGL → Canvas fallback

  width:  CONFIG.WIDTH,
  height: CONFIG.HEIGHT,

  backgroundColor: CONFIG.BG_COLOR,

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Keep portrait orientation
    orientation: 'portrait',
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },   // top-down ocean – no gravity
      debug:   false,       // set true during development
    },
  },

  input: {
    activePointers: 3,      // Support multi-touch
  },

  // Scene order determines rendering priority (last = on top)
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    QuestionScene,
    LevelCompleteScene,
    GameOverScene,
    AdScene,
  ],

  parent: 'game-container',
  dom: {
    createContainer: false,
  },
};

// ── Boot the game ─────────────────────────────────────────────
const game = new Phaser.Game(config);

// Expose for debugging in dev mode
if (import.meta.env.DEV) {
  window.__game = game;
}

export default game;
