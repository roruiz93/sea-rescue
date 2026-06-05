// ============================================================
//  SEA RESCUE – Game Configuration
// ============================================================

export const CONFIG = {
  // ── Viewport ──────────────────────────────────────────────
  WIDTH: 414,
  HEIGHT: 896,
  BG_COLOR: 0x0a2040,

  // ── Physics ───────────────────────────────────────────────
  PLAYER_BASE_SPEED: 160,
  RESCUE_RANGE:      72,   // px – distance to auto-pickup victim
  COLLECT_RANGE:     55,   // px – distance to collect item

  // ── Gameplay ──────────────────────────────────────────────
  LIVES:            3,
  QUESTION_TIMEOUT: 12,   // seconds to answer a question

  // ── World margins ─────────────────────────────────────────
  MARGIN: { top: 160, bottom: 200, left: 40, right: 40 },

  // ── Score ─────────────────────────────────────────────────
  SCORE: {
    RESCUE_BASE:            100,
    SPEED_BONUS_THRESHOLD:  10,  // s – rescued in < this → bonus
    SPEED_BONUS:            50,
    QUESTION_CORRECT_PTS:   50,
    QUESTION_TIME_BONUS:    8,   // extra seconds on correct answer
    COLLECTIBLE_PTS:        20,
  },

  // ── Level definitions ─────────────────────────────────────
  //   hazards: true → spawn slow-items from level 3+
  LEVELS: [
    // L1 – Tutorial
    { victims: 2, victimTime: 35, waves: 0, sharks: false, hazards: false, questionDiff: 'easy',   spawnDelay: 4000, playerSpeed: 160 },
    // L2
    { victims: 3, victimTime: 30, waves: 1, sharks: false, hazards: false, questionDiff: 'easy',   spawnDelay: 3500, playerSpeed: 175 },
    // L3 – Hazard items appear!
    { victims: 3, victimTime: 28, waves: 2, sharks: false, hazards: true,  questionDiff: 'medium', spawnDelay: 3000, playerSpeed: 190 },
    // L4
    { victims: 4, victimTime: 25, waves: 2, sharks: false, hazards: true,  questionDiff: 'medium', spawnDelay: 2800, playerSpeed: 205 },
    // L5
    { victims: 4, victimTime: 22, waves: 3, sharks: true,  hazards: true,  questionDiff: 'medium', spawnDelay: 2500, playerSpeed: 215 },
    // L6
    { victims: 5, victimTime: 20, waves: 3, sharks: true,  hazards: true,  questionDiff: 'hard',   spawnDelay: 2200, playerSpeed: 225 },
    // L7+
    { victims: 5, victimTime: 18, waves: 4, sharks: true,  hazards: true,  questionDiff: 'hard',   spawnDelay: 2000, playerSpeed: 240 },
  ],

  // ── Carry & Oxygen ────────────────────────────────────────
  OXYGEN_MAX:        8,    // seconds before drowning when carrying 2+
  CARRY_SPEED_MULT:  0.72, // ×speed with 1 victim (un poco más lento)
  CARRY_SPEED_MULT2: 0.42, // ×speed with 2 victims
  CARRY_OFFSET_X:    32,
  CARRY_OFFSET_Y:   -10,

  // ── Rescue zone ───────────────────────────────────────────
  RESCUE_ZONE_HEIGHT: 95,

  // ── Waves ─────────────────────────────────────────────────
  WAVE: {
    SPEED:       60,
    WIDTH:       414,
    HEIGHT:      28,
    SLOW_FACTOR: 0.35,  // speed multiplied by this while slowed
    DURATION:    4000,  // ms of slow effect (4 segundos)
  },

  // ── Shark ─────────────────────────────────────────────────
  SHARK: {
    SPEED:         80,
    STUN_DURATION: 1200,
  },

  // ── Hazard collectibles (slow) – appear from level 3 ──────
  HAZARD: {
    JELLYFISH: { slowFactor: 0.35, duration: 3500 }, // medusa – stun + slow
    SEAWEED:   { slowFactor: 0.20, duration: 5000 }, // algas  – very slow
    NET:       { slowFactor: 0.10, duration: 4000 }, // red de pesca – nearly stops
  },

  // ── Boost collectibles (speed-up) ─────────────────────────
  BOOST: {
    FLIPPERS: { factor: 1.55, duration: 6000  }, // patas de rana  ×1.55 por 6 s
    BOARD:    { factor: 1.30, duration: 5000  }, // tabla          ×1.30 por 5 s
    TORPEDO:  { factor: 2.0,  duration: 3500  }, // torpedo        ×2.0  por 3.5 s (corto pero brutal)
  },

  // ── Colors ────────────────────────────────────────────────
  COLORS: {
    OCEAN_DEEP:   0x0a2040,
    OCEAN_MID:    0x0d3b6e,
    OCEAN_LIGHT:  0x1565c0,
    WAVE:         0x42a5f5,
    PLAYER:       0xf9a825,
    VICTIM:       0xef5350,
    SHARK:        0x546e7a,
    COLLECTIBLE:  0x26c6da,
    UI_BG:        0x000000,
    UI_TEXT:      0xffffff,
    CORRECT:      0x4caf50,
    WRONG:        0xf44336,
    TIMER_OK:     0x4caf50,
    TIMER_WARN:   0xffc107,
    TIMER_DANGER: 0xf44336,
  },
};

export function getLevelConfig(level) {
  const idx      = Math.min(level - 1, CONFIG.LEVELS.length - 1);
  const base     = CONFIG.LEVELS[idx];
  const overflow = Math.max(0, level - CONFIG.LEVELS.length);
  return {
    ...base,
    victims:    base.victims    + overflow,
    victimTime: Math.max(12, base.victimTime - overflow * 1.5),
  };
}
