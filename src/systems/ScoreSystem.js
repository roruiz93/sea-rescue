// ============================================================
//  ScoreSystem – Tracks score, combos, and best scores.
//  Persists via localStorage so scores survive between sessions.
// ============================================================
import { CONFIG } from '../config.js';

const LS_KEY      = 'sea_rescue_scores';
const SESSION_KEY = 'sea_rescue_session';

export class ScoreSystem {
  constructor() {
    this.reset();
    this._stored = this._load();
  }

  reset() {
    this.score   = 0;
    this.combo   = 0;           // consecutive rescues without missing
    this.rescues = 0;
    this.level   = 1;
    this._rescueStart = 0;      // timestamp of when current victim appeared
  }

  /** Call when a new victim spawns – records spawn time for speed bonus. */
  markVictimSpawn() {
    this._rescueStart = Date.now();
  }

  /**
   * Award points for a successful rescue.
   * @param {boolean} questionCorrect
   * @returns {number} points awarded this rescue
   */
  onRescue(questionCorrect) {
    const SC = CONFIG.SCORE;
    let pts = SC.RESCUE_BASE;

    // Speed bonus
    const elapsed = (Date.now() - this._rescueStart) / 1000;
    if (elapsed < SC.SPEED_BONUS_THRESHOLD) {
      pts += SC.SPEED_BONUS;
    }

    // Question bonus
    if (questionCorrect) {
      pts += SC.QUESTION_CORRECT_PTS;
    }

    // Combo multiplier (x1.5 from 3+ combo)
    this.combo++;
    if (this.combo >= 3) {
      pts = Math.round(pts * 1.5);
    }

    this.score   += pts;
    this.rescues += 1;
    return pts;
  }

  /** Call when player misses a victim (drowns). Resets combo. */
  onMiss() {
    this.combo = 0;
  }

  /** Points for picking up a collectible. */
  onCollectible() {
    const pts = CONFIG.SCORE.COLLECTIBLE_PTS;
    this.score += pts;
    return pts;
  }

  // ── Persistence ───────────────────────────────────────────

  // ── Session persistence ───────────────────────────────────

  /**
   * Persist the current mid-game state so the player can resume later.
   * Call this on level complete and on pause → menu.
   */
  saveSession(level, lives) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        level,
        lives,
        score:   this.score,
        rescues: this.rescues,
        combo:   this.combo,
        date:    Date.now(),
      }));
    } catch { /* storage unavailable */ }
  }

  /** Returns saved session or null if none exists. */
  static loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  /** Delete the saved session (after game over or deliberate new game). */
  static clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  /** Restore internal state from a saved session object. */
  restoreSession(session) {
    this.score   = session.score   ?? 0;
    this.rescues = session.rescues ?? 0;
    this.combo   = session.combo   ?? 0;
    this.level   = session.level   ?? 1;
  }

  /** Save the current run if it's a new high score. */
  saveIfBest() {
    const entry = {
      score:   this.score,
      level:   this.level,
      rescues: this.rescues,
      date:    new Date().toLocaleDateString(),
    };

    if (!this._stored.best || this.score > this._stored.best.score) {
      this._stored.best = entry;
    }
    this._stored.history = (this._stored.history || []);
    this._stored.history.unshift(entry);
    if (this._stored.history.length > 10) this._stored.history.length = 10;

    this._save();
  }

  getBest() {
    return this._stored.best || null;
  }

  getHistory() {
    return this._stored.history || [];
  }

  _load() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch {
      return {};
    }
  }

  _save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this._stored));
    } catch { /* storage full or unavailable */ }
  }
}
