// ============================================================
//  GraphicsFactory – Procedural humanoid sprites for Sea Rescue.
//  All sprites drawn with Phaser Graphics → generateTexture.
//  Perspective: slight top-down angle (common in mobile 2D).
// ============================================================
import { CONFIG } from '../config.js';
const C = CONFIG.COLORS;

export class GraphicsFactory {

  static generateAll(scene) {
    GraphicsFactory.playerSwim1(scene);
    GraphicsFactory.playerSwim2(scene);
    GraphicsFactory.playerIdle(scene);
    GraphicsFactory.playerBoosted(scene); // yellow/orange glow when boosted
    GraphicsFactory.victimDrown(scene);
    GraphicsFactory.victimAlert(scene);   // frantic – near death
    GraphicsFactory.victimRescued(scene); // safe, held by swimmer
    GraphicsFactory.shark(scene);
    GraphicsFactory.wave(scene);
    GraphicsFactory.collectibleFloat(scene);
    GraphicsFactory.collectibleGoggles(scene);
    // ── Boost items ──────────────────
    GraphicsFactory.boostFlippers(scene);
    GraphicsFactory.boostBoard(scene);
    GraphicsFactory.boostTorpedo(scene);
    // ── Hazard items (slow) ──────────
    GraphicsFactory.hazardJellyfish(scene);
    GraphicsFactory.hazardSeaweed(scene);
    GraphicsFactory.hazardNet(scene);
    GraphicsFactory.boat(scene);
    GraphicsFactory.oceanTile(scene);
    GraphicsFactory.oceanFoam(scene);
    GraphicsFactory.star(scene);
    GraphicsFactory.particle(scene);
    GraphicsFactory.splash(scene);
  }

  // ── SHARED DRAWING HELPERS ──────────────────────────────────

  /**
   * Draws a humanoid figure onto a Graphics object.
   * @param {Phaser.GameObjects.Graphics} g
   * @param {object} opts
   *   cx, cy        – center of torso
   *   dir           – 1 (right) | -1 (left)  swimming direction
   *   skinColor     – hex
   *   suitColor     – hex
   *   capColor      – hex (swim cap)
   *   armAngle1     – angle (radians) of leading arm
   *   armAngle2     – angle (radians) of trailing arm
   *   legAngle1     – angle (radians) of leading leg
   *   legAngle2     – angle (radians) of trailing leg
   *   scale         – overall scale (default 1)
   */
  static _drawSwimmer(g, opts) {
    const {
      cx, cy,
      dir       = 1,
      skinColor = 0xFFCBA4,
      suitColor = 0xE53935,
      capColor  = 0xFFB300,
      armAngle1 = -0.4,
      armAngle2 =  0.5,
      legAngle1 =  0.3,
      legAngle2 = -0.2,
      scale     = 1,
    } = opts;

    const s = scale;

    // ── Body (torso) ──────────────────────────────────────────
    // Suit
    g.fillStyle(suitColor, 1);
    g.fillEllipse(cx, cy, 18 * s, 26 * s);
    // Suit outline
    g.lineStyle(1.5, darken(suitColor, 0.3), 1);
    g.strokeEllipse(cx, cy, 18 * s, 26 * s);

    // ── Head ─────────────────────────────────────────────────
    const headX = cx + dir * 14 * s;
    const headY = cy - 4 * s;
    // Neck
    g.lineStyle(4 * s, skinColor, 1);
    g.lineBetween(cx + dir * 6 * s, cy - 6 * s, headX, headY);
    // Head
    g.fillStyle(skinColor, 1);
    g.fillCircle(headX, headY, 11 * s);
    g.lineStyle(1, darken(skinColor, 0.2), 1);
    g.strokeCircle(headX, headY, 11 * s);
    // Swim cap
    g.fillStyle(capColor, 1);
    g.fillEllipse(headX, headY - 4 * s, 18 * s, 13 * s);
    // Goggles
    g.lineStyle(2 * s, 0x1565C0, 1);
    g.strokeEllipse(headX + dir * 3 * s, headY + 1 * s, 8 * s, 6 * s);
    // Face dot (eye visible from side)
    g.fillStyle(0x1565C0, 1);
    g.fillCircle(headX + dir * 5 * s, headY + 2 * s, 1.5 * s);

    // ── Arms ─────────────────────────────────────────────────
    const armLen = 22 * s;
    const armW   = 4 * s;
    const shoulderX = cx + dir * 4 * s;
    const shoulderY = cy - 8 * s;

    // Leading arm (stretched forward in direction of travel)
    const la = armAngle1 * dir;
    g.lineStyle(armW, skinColor, 1);
    g.lineBetween(
      shoulderX, shoulderY,
      shoulderX + Math.cos(la) * armLen * dir,
      shoulderY + Math.sin(la) * armLen,
    );
    // Hand
    g.fillStyle(skinColor, 1);
    g.fillCircle(
      shoulderX + Math.cos(la) * armLen * dir,
      shoulderY + Math.sin(la) * armLen,
      4 * s,
    );

    // Trailing arm
    const ta = armAngle2 * dir;
    g.lineStyle(armW, skinColor, 0.85);
    g.lineBetween(
      cx - dir * 4 * s, shoulderY,
      cx - dir * 4 * s + Math.cos(ta) * armLen * dir,
      shoulderY + Math.sin(ta) * armLen,
    );

    // ── Legs (kicking) ───────────────────────────────────────
    const legLen  = 20 * s;
    const legW    = 5 * s;
    const hipX    = cx;
    const hipY    = cy + 10 * s;
    // Suit shorts
    g.fillStyle(darken(suitColor, 0.15), 1);
    g.fillEllipse(hipX, hipY, 14 * s, 10 * s);

    // Leg 1
    g.lineStyle(legW, skinColor, 1);
    g.lineBetween(
      hipX + 4 * s, hipY,
      hipX + 4 * s - Math.cos(legAngle1) * legLen * 0.4,
      hipY + Math.sin(legAngle1) * legLen,
    );
    // Foot 1
    g.fillStyle(0x546E7A, 1); // fin color
    g.fillEllipse(
      hipX + 4 * s - Math.cos(legAngle1) * legLen * 0.4,
      hipY + Math.sin(legAngle1) * legLen,
      9 * s, 5 * s,
    );

    // Leg 2
    g.lineStyle(legW, skinColor, 0.85);
    g.lineBetween(
      hipX - 4 * s, hipY,
      hipX - 4 * s + Math.cos(legAngle2) * legLen * 0.3,
      hipY + Math.sin(legAngle2 + 0.3) * legLen,
    );
    // Foot 2
    g.fillStyle(0x455A64, 1);
    g.fillEllipse(
      hipX - 4 * s + Math.cos(legAngle2) * legLen * 0.3,
      hipY + Math.sin(legAngle2 + 0.3) * legLen,
      8 * s, 4 * s,
    );

    // ── Wake splash around body ───────────────────────────────
    g.fillStyle(0x90CAF9, 0.25);
    g.fillEllipse(cx, cy + 4 * s, 44 * s, 18 * s);
  }

  // ── PLAYER SPRITES (3 animation frames) ────────────────────

  static playerSwim1(scene) {
    const W = 80, H = 72;
    const g = scene.add.graphics();
    GraphicsFactory._drawSwimmer(g, {
      cx: W / 2, cy: H / 2,
      dir: 1,
      suitColor: 0xF57F17,
      capColor:  0xFFEE58,
      skinColor: 0xFFCBA4,
      armAngle1: -0.25,  // leading arm stretched forward
      armAngle2:  1.2,   // trailing arm back/up
      legAngle1:  0.4,   // kick up
      legAngle2: -0.1,   // kick down
    });
    g.generateTexture('player_swim1', W, H);
    g.destroy();
  }

  static playerSwim2(scene) {
    const W = 80, H = 72;
    const g = scene.add.graphics();
    GraphicsFactory._drawSwimmer(g, {
      cx: W / 2, cy: H / 2,
      dir: 1,
      suitColor: 0xF57F17,
      capColor:  0xFFEE58,
      skinColor: 0xFFCBA4,
      armAngle1: -0.55,  // leading arm entering water
      armAngle2:  0.8,   // trailing arm pulling back
      legAngle1: -0.2,   // kick down
      legAngle2:  0.5,   // kick up
    });
    g.generateTexture('player_swim2', W, H);
    g.destroy();
  }

  static playerIdle(scene) {
    // Player treading water – upright position
    const W = 56, H = 80;
    const g = scene.add.graphics();
    const cx = W / 2, cy = H / 2 - 4;
    const skin = 0xFFCBA4, suit = 0xF57F17;

    // Water ripple
    g.fillStyle(0x90CAF9, 0.2);
    g.fillEllipse(cx, cy + 22, 48, 16);

    // Body
    g.fillStyle(suit, 1);
    g.fillEllipse(cx, cy + 4, 18, 24);
    g.lineStyle(1.5, darken(suit, 0.3), 1);
    g.strokeEllipse(cx, cy + 4, 18, 24);

    // Shorts
    g.fillStyle(darken(suit, 0.2), 1);
    g.fillEllipse(cx, cy + 14, 16, 10);

    // Head
    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 14, 13);
    g.lineStyle(1, darken(skin, 0.2), 1);
    g.strokeCircle(cx, cy - 14, 13);

    // Swim cap
    g.fillStyle(0xFFEE58, 1);
    g.fillEllipse(cx, cy - 18, 22, 14);

    // Goggles
    g.lineStyle(2, 0x1565C0, 1);
    g.strokeEllipse(cx - 5, cy - 13, 8, 6);
    g.strokeEllipse(cx + 5, cy - 13, 8, 6);
    g.lineBetween(cx - 1, cy - 13, cx + 1, cy - 13);

    // Arms out to sides (treading)
    g.lineStyle(4, skin, 1);
    g.lineBetween(cx - 9, cy, cx - 24, cy - 8);
    g.lineBetween(cx + 9, cy, cx + 24, cy - 8);

    // Hands
    g.fillStyle(skin, 1);
    g.fillCircle(cx - 24, cy - 8, 4);
    g.fillCircle(cx + 24, cy - 8, 4);

    // Legs submerged (faded)
    g.lineStyle(5, skin, 0.5);
    g.lineBetween(cx - 4, cy + 16, cx - 6, cy + 36);
    g.lineBetween(cx + 4, cy + 16, cx + 6, cy + 36);

    g.generateTexture('player_idle', W, H);
    g.destroy();
  }

  // ── VICTIM SPRITES ──────────────────────────────────────────

  static victimDrown(scene) {
    // Person in water, arms raised – SOS position
    const W = 52, H = 80;
    const g = scene.add.graphics();
    const cx = W / 2, cy = H / 2 + 4;
    const skin = 0xFFCBA4;

    // Water around victim (splashing)
    g.fillStyle(0x42A5F5, 0.3);
    g.fillEllipse(cx, cy + 14, 46, 20);
    g.fillStyle(0xBBDEFB, 0.4);
    for (const [sx, sy] of [[-16, 8], [16, 8], [-8, 18], [10, 20]]) {
      g.fillEllipse(cx + sx, cy + sy, 10, 6);
    }

    // Torso (shirt – visible above water)
    g.fillStyle(0xEF5350, 1);
    g.fillEllipse(cx, cy + 2, 18, 20);
    g.lineStyle(1.5, 0xC62828, 1);
    g.strokeEllipse(cx, cy + 2, 18, 20);

    // Head
    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 16, 13);
    g.lineStyle(1, darken(skin, 0.2), 1);
    g.strokeCircle(cx, cy - 16, 13);

    // Hair (dark)
    g.fillStyle(0x4E342E, 1);
    g.fillEllipse(cx, cy - 22, 22, 10);

    // Open mouth (screaming for help)
    g.fillStyle(0xC62828, 1);
    g.fillEllipse(cx, cy - 12, 7, 5);
    g.fillStyle(0xFF8A80, 1);
    g.fillEllipse(cx, cy - 11, 5, 3);

    // Wide eyes (scared)
    g.fillStyle(0xFFFFFF, 1);
    g.fillEllipse(cx - 5, cy - 17, 6, 7);
    g.fillEllipse(cx + 5, cy - 17, 6, 7);
    g.fillStyle(0x3E2723, 1);
    g.fillCircle(cx - 5, cy - 16, 2.5);
    g.fillCircle(cx + 5, cy - 16, 2.5);

    // Both arms raised high – V shape
    g.lineStyle(5, skin, 1);
    // Left arm up-left
    g.lineBetween(cx - 8, cy - 4, cx - 22, cy - 28);
    // Right arm up-right
    g.lineBetween(cx + 8, cy - 4, cx + 22, cy - 28);

    // Hands
    g.fillStyle(skin, 1);
    g.fillCircle(cx - 22, cy - 28, 5);
    g.fillCircle(cx + 22, cy - 28, 5);

    // Lower body submerged (faded blue tint)
    g.fillStyle(0x1565C0, 0.3);
    g.fillEllipse(cx, cy + 18, 18, 22);

    g.generateTexture('victim', W, H);
    g.destroy();
  }

  static victimAlert(scene) {
    // More frantic version – flailing arms, mouth wider open
    const W = 52, H = 80;
    const g = scene.add.graphics();
    const cx = W / 2, cy = H / 2 + 4;
    const skin = 0xFFCBA4;

    // Larger splash
    g.fillStyle(0x42A5F5, 0.4);
    g.fillEllipse(cx, cy + 14, 52, 24);
    g.fillStyle(0xBBDEFB, 0.5);
    for (const [sx, sy] of [[-20, 4], [20, 4], [-10, 22], [12, 22], [0, 26]]) {
      g.fillEllipse(cx + sx, cy + sy, 12, 7);
    }

    // Torso (more submerged)
    g.fillStyle(0xEF5350, 1);
    g.fillEllipse(cx, cy + 6, 18, 16);

    // Head (lower in water)
    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 12, 13);
    g.fillStyle(0x4E342E, 1);
    g.fillEllipse(cx, cy - 18, 22, 10);

    // Screaming mouth
    g.fillStyle(0x880000, 1);
    g.fillEllipse(cx, cy - 8, 9, 7);

    // Panic eyes
    g.fillStyle(0xFFFFFF, 1);
    g.fillEllipse(cx - 5, cy - 13, 7, 8);
    g.fillEllipse(cx + 5, cy - 13, 7, 8);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - 5, cy - 12, 2.5);
    g.fillCircle(cx + 5, cy - 12, 2.5);

    // Arms flailing – wider/more horizontal
    g.lineStyle(5, skin, 1);
    g.lineBetween(cx - 8, cy - 2, cx - 26, cy - 18);
    g.lineBetween(cx + 8, cy - 2, cx + 26, cy - 18);
    g.fillStyle(skin, 1);
    g.fillCircle(cx - 26, cy - 18, 5);
    g.fillCircle(cx + 26, cy - 18, 5);

    // Lower body
    g.fillStyle(0x1565C0, 0.35);
    g.fillEllipse(cx, cy + 20, 18, 24);

    g.generateTexture('victim_alert', W, H);
    g.destroy();
  }

  static victimRescued(scene) {
    // Victim held by rescuer – calmer, arm around rescuer
    const W = 52, H = 80;
    const g = scene.add.graphics();
    const cx = W / 2, cy = H / 2 + 4;
    const skin = 0xFFCBA4;

    // Water calm
    g.fillStyle(0x42A5F5, 0.2);
    g.fillEllipse(cx, cy + 16, 48, 18);

    // Torso (green shirt = safe!)
    g.fillStyle(0x43A047, 1);
    g.fillEllipse(cx, cy + 2, 18, 22);

    // Head
    g.fillStyle(skin, 1);
    g.fillCircle(cx, cy - 15, 13);
    g.fillStyle(0x4E342E, 1);
    g.fillEllipse(cx, cy - 21, 22, 10);

    // Relieved expression
    g.fillStyle(0xC62828, 0.7);
    // Smile
    g.lineStyle(2.5, 0x8D4E00, 1);
    g.strokeEllipse(cx, cy - 11, 8, 5);

    // Calm eyes
    g.fillStyle(0x3E2723, 1);
    g.fillEllipse(cx - 5, cy - 16, 5, 4);
    g.fillEllipse(cx + 5, cy - 16, 5, 4);

    // One arm lowered, one across rescuer
    g.lineStyle(5, skin, 1);
    g.lineBetween(cx - 8, cy - 4, cx - 20, cy + 8); // arm down/relaxed
    g.lineBetween(cx + 8, cy - 4, cx + 22, cy - 8); // arm across

    g.fillStyle(skin, 1);
    g.fillCircle(cx - 20, cy + 8, 4);
    g.fillCircle(cx + 22, cy - 8, 4);

    // ✓ checkmark above head
    g.fillStyle(0x4CAF50, 1);
    g.fillCircle(cx, cy - 40, 10);
    g.lineStyle(3, 0xFFFFFF, 1);
    g.lineBetween(cx - 5, cy - 40, cx - 1, cy - 36);
    g.lineBetween(cx - 1, cy - 36, cx + 6, cy - 45);

    g.generateTexture('victim_rescued', W, H);
    g.destroy();
  }

  // ── PLAYER BOOSTED (speed powerup active) ─────────────────
  static playerBoosted(scene) {
    // Same as swim1 but with a golden/cyan tint and speed-lines
    const W = 80, H = 72;
    const g = scene.add.graphics();

    // Speed lines behind player
    g.lineStyle(3, 0xFFD600, 0.7);
    for (let i = 0; i < 4; i++) {
      const y = 20 + i * 10;
      g.lineBetween(0, y, 20, y);
    }

    GraphicsFactory._drawSwimmer(g, {
      cx: W / 2 + 4, cy: H / 2,
      dir: 1,
      suitColor: 0xFFD600,   // golden suit
      capColor:  0xFF6F00,
      skinColor: 0xFFCBA4,
      armAngle1: -0.15,      // arms fully stretched forward
      armAngle2:  1.4,
      legAngle1:  0.5,
      legAngle2: -0.3,
      scale: 0.95,
    });

    // Glow aura
    g.lineStyle(4, 0xFFD600, 0.4);
    g.strokeCircle(W / 2 + 4, H / 2, 30);

    g.generateTexture('player_boosted', W, H);
    g.destroy();
  }

  // ══════════════════════════════════════════════════════════
  //  BOOST ITEMS
  // ══════════════════════════════════════════════════════════

  // ── Patas de rana (flippers) ──────────────────────────────
  static boostFlippers(scene) {
    const W = 56, H = 44;
    const g = scene.add.graphics();

    // Left flipper
    g.fillStyle(0x00BCD4, 1);
    g.fillEllipse(14, 26, 20, 36);
    g.lineStyle(2, 0x00838F, 1);
    g.strokeEllipse(14, 26, 20, 36);
    // Foot strap
    g.fillStyle(0x006064, 1);
    g.fillRoundedRect(8, 10, 12, 8, 3);

    // Right flipper
    g.fillStyle(0x00BCD4, 1);
    g.fillEllipse(42, 26, 20, 36);
    g.lineStyle(2, 0x00838F, 1);
    g.strokeEllipse(42, 26, 20, 36);
    g.fillStyle(0x006064, 1);
    g.fillRoundedRect(36, 10, 12, 8, 3);

    // Shine on each flipper
    g.fillStyle(0xFFFFFF, 0.3);
    g.fillEllipse(11, 20, 6, 10);
    g.fillEllipse(39, 20, 6, 10);

    // Lightning bolt (speed)
    g.fillStyle(0xFFD600, 1);
    g.fillTriangle(25, 6, 30, 18, 27, 18);
    g.fillTriangle(27, 18, 32, 18, 27, 30);

    g.generateTexture('flippers', W, H);
    g.destroy();
  }

  // ── Tabla (kickboard boost) ────────────────────────────────
  static boostBoard(scene) {
    const W = 60, H = 38;
    const g = scene.add.graphics();

    // Board body
    g.fillStyle(0x4CAF50, 1);
    g.fillRoundedRect(4, 4, 52, 30, 8);
    g.lineStyle(2, 0x2E7D32, 1);
    g.strokeRoundedRect(4, 4, 52, 30, 8);

    // Speed stripes
    g.fillStyle(0xFFFFFF, 0.4);
    g.fillRoundedRect(14, 10, 6, 18, 2);
    g.fillRoundedRect(24, 10, 6, 18, 2);
    g.fillRoundedRect(34, 10, 6, 18, 2);

    // Arrow →
    g.fillStyle(0xFFD600, 1);
    g.fillTriangle(42, 11, 54, 19, 42, 27);

    g.generateTexture('boost_board', W, H);
    g.destroy();
  }

  // ── Torpedo (pool buoy / torpedo) ────────────────────────
  static boostTorpedo(scene) {
    const W = 72, H = 32;
    const g = scene.add.graphics();

    // Body
    g.fillStyle(0xF44336, 1);
    g.fillEllipse(36, 16, 68, 22);
    g.lineStyle(2, 0xB71C1C, 1);
    g.strokeEllipse(36, 16, 68, 22);

    // Yellow/black speed rings
    const ringColors = [0xFFD600, 0x212121, 0xFFD600];
    ringColors.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillRect(18 + i * 12, 6, 10, 20);
    });
    // Clip to ellipse (re-draw body outline)
    g.lineStyle(2, 0xB71C1C, 1);
    g.strokeEllipse(36, 16, 68, 22);

    // Nose cone
    g.fillStyle(0xB71C1C, 1);
    g.fillTriangle(66, 8, 66, 24, 72, 16);

    // Tail fins
    g.fillStyle(0xD32F2F, 1);
    g.fillTriangle(2, 16, 10, 4, 10, 16);
    g.fillTriangle(2, 16, 10, 28, 10, 16);

    // Lightning bolt overlay
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillTriangle(33, 8, 38, 16, 35, 16);
    g.fillTriangle(35, 16, 40, 16, 35, 24);

    g.generateTexture('torpedo', W, H);
    g.destroy();
  }

  // ══════════════════════════════════════════════════════════
  //  HAZARD ITEMS  (slow the player)
  // ══════════════════════════════════════════════════════════

  // ── Medusa (jellyfish) ────────────────────────────────────
  static hazardJellyfish(scene) {
    const W = 44, H = 52;
    const g = scene.add.graphics();

    // Tentacles (drawn first, behind bell)
    g.lineStyle(2, 0xCE93D8, 0.8);
    const tentacleOffsets = [-14, -8, -2, 4, 10, 16];
    tentacleOffsets.forEach(ox => {
      // Wavy line using multiple segments
      for (let i = 0; i < 4; i++) {
        const wave = (i % 2 === 0 ? 3 : -3);
        g.lineBetween(
          W / 2 + ox + wave,     24 + i * 6,
          W / 2 + ox - wave,     24 + (i + 1) * 6,
        );
      }
    });

    // Bell (body)
    g.fillStyle(0xBA68C8, 0.85);
    g.fillEllipse(W / 2, 14, 36, 28);
    g.lineStyle(2, 0x7B1FA2, 1);
    g.strokeEllipse(W / 2, 14, 36, 28);

    // Translucent inner dome
    g.fillStyle(0xE1BEE7, 0.45);
    g.fillEllipse(W / 2, 12, 26, 18);

    // Eyes (danger!)
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(W / 2 - 6, 12, 4);
    g.fillCircle(W / 2 + 6, 12, 4);
    g.fillStyle(0xFF1744, 1);
    g.fillCircle(W / 2 - 6, 12, 2.5);
    g.fillCircle(W / 2 + 6, 12, 2.5);

    // ⚠ symbol at top
    g.fillStyle(0xFF6F00, 1);
    g.fillTriangle(W / 2 - 7, 2, W / 2 + 7, 2, W / 2, -8);
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(W / 2 - 1, -5, 2, 4);
    g.fillRect(W / 2 - 1, 0,  2, 2);

    g.generateTexture('jellyfish', W, H);
    g.destroy();
  }

  // ── Algas (seaweed) ───────────────────────────────────────
  static hazardSeaweed(scene) {
    const W = 40, H = 60;
    const g = scene.add.graphics();

    // Multiple strands
    const strands = [
      { x: 10, color: 0x2E7D32 },
      { x: 20, color: 0x388E3C },
      { x: 30, color: 0x1B5E20 },
    ];

    strands.forEach(({ x, color }) => {
      g.lineStyle(5, color, 0.9);
      // Wavy strand from bottom to top
      for (let i = 0; i < 5; i++) {
        const wave = (i % 2 === 0 ? 5 : -5);
        g.lineBetween(x + wave, 55 - i * 10, x - wave, 45 - i * 10);
      }
      // Leaf tips
      g.fillStyle(color, 1);
      g.fillEllipse(x + (x < 20 ? -5 : 5), 8, 12, 8);
    });

    // Dark overlay hint
    g.fillStyle(0x000000, 0.1);
    g.fillRect(0, 0, W, H);

    // ⚠ warning dot
    g.fillStyle(0xFF6F00, 1);
    g.fillCircle(W - 8, 8, 6);
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(W - 9, 5, 2, 4);
    g.fillRect(W - 9, 10, 2, 2);

    g.generateTexture('seaweed', W, H);
    g.destroy();
  }

  // ── Red de pesca (fishing net) ────────────────────────────
  static hazardNet(scene) {
    const W = 52, H = 52;
    const g = scene.add.graphics();

    // Net background
    g.fillStyle(0xF57F17, 0.15);
    g.fillRect(4, 4, W - 8, H - 8);

    // Net grid lines
    g.lineStyle(2, 0xE65100, 0.75);
    const step = 10;
    for (let x = 4; x <= W - 4; x += step) {
      g.lineBetween(x, 4, x, H - 4);
    }
    for (let y = 4; y <= H - 4; y += step) {
      g.lineBetween(4, y, W - 4, y);
    }

    // Diagonal lines (diamond pattern)
    g.lineStyle(1.5, 0xBF360C, 0.5);
    for (let x = 4; x <= W - 4; x += step) {
      g.lineBetween(x, 4, x + step, H - 4);
      g.lineBetween(x, 4, x - step, H - 4);
    }

    // Corner floats (orange circles)
    g.fillStyle(0xFF6D00, 1);
    [[4,4],[W-4,4],[4,H-4],[W-4,H-4]].forEach(([cx,cy]) => {
      g.fillCircle(cx, cy, 5);
      g.lineStyle(1.5, 0xE65100, 1);
      g.strokeCircle(cx, cy, 5);
    });

    // ⚠ center warning
    g.fillStyle(0xFF6F00, 1);
    g.fillTriangle(W/2 - 8, H/2 + 6, W/2 + 8, H/2 + 6, W/2, H/2 - 6);
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(W/2 - 1, H/2 - 3, 2, 5);
    g.fillRect(W/2 - 1, H/2 + 3, 2, 2);

    g.generateTexture('net', W, H);
    g.destroy();
  }

  // ── OTHER SPRITES (unchanged, clean versions) ──────────────

  static shark(scene) {
    const g = scene.add.graphics();
    const W = 84, H = 44;

    // Shadow
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(44, 28, 72, 20);

    // Body
    g.fillStyle(0x607D8B, 1);
    g.fillEllipse(44, 22, 72, 28);

    // Belly (lighter)
    g.fillStyle(0xB0BEC5, 1);
    g.fillEllipse(44, 26, 60, 16);

    // Dorsal fin
    g.fillStyle(0x546E7A, 1);
    g.fillTriangle(36, 22, 48, 2, 56, 22);
    g.lineStyle(1.5, 0x37474F, 1);
    g.strokeTriangle(36, 22, 48, 2, 56, 22);

    // Pectoral fins
    g.fillStyle(0x546E7A, 1);
    g.fillTriangle(44, 26, 38, 38, 56, 32);
    g.fillTriangle(44, 26, 50, 38, 32, 32);

    // Tail
    g.fillStyle(0x546E7A, 1);
    g.fillTriangle(10, 8,  2, 22, 10, 38);

    // Eye
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(66, 18, 5);
    g.fillStyle(0x000000, 1);
    g.fillCircle(67, 18, 3);
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(68, 17, 1);

    // Teeth (menacing grin)
    g.lineStyle(1.5, 0xFFFFFF, 1);
    g.lineBetween(62, 25, 74, 23);
    // Teeth triangles
    for (let tx = 64; tx < 74; tx += 4) {
      g.fillStyle(0xFFFFFF, 1);
      g.fillTriangle(tx, 25, tx + 2, 29, tx + 4, 25);
    }

    // Outline
    g.lineStyle(2, 0x37474F, 1);
    g.strokeEllipse(44, 22, 72, 28);

    g.generateTexture('shark', W, H);
    g.destroy();
  }

  static wave(scene) {
    const g = scene.add.graphics();
    const W = CONFIG.WIDTH, H = CONFIG.WAVE.HEIGHT;
    g.fillStyle(0x1E88E5, 0.3);
    g.fillRect(0, 0, W, H);
    g.lineStyle(2, 0xBBDEFB, 0.6);
    for (let x = 0; x < W; x += 44) {
      g.strokeEllipse(x + 22, 7, 38, 10);
    }
    g.generateTexture('wave', W, H);
    g.destroy();
  }

  static collectibleFloat(scene) {
    const g = scene.add.graphics();
    const cx = 22, cy = 22;
    for (let i = 0; i < 4; i++) {
      const c = i % 2 === 0 ? 0xFF6600 : 0xFFFFFF;
      g.fillStyle(c, 1);
      g.slice(cx, cy, 18, Phaser.Math.DegToRad(i * 90), Phaser.Math.DegToRad((i + 1) * 90), false);
      g.fillPath();
    }
    // Shadow
    g.fillStyle(0x000000, 0.12);
    g.fillCircle(cx + 2, cy + 2, 18);
    // Inner
    g.fillStyle(0x0D3B6E, 1);
    g.fillCircle(cx, cy, 8);
    g.lineStyle(2, 0xCC4400, 1);
    g.strokeCircle(cx, cy, 18);
    g.generateTexture('float', 44, 44);
    g.destroy();
  }

  static collectibleGoggles(scene) {
    const g = scene.add.graphics();
    g.lineStyle(4, 0x1565C0, 1);
    g.lineBetween(2, 18, 46, 18);
    g.fillStyle(0x4FC3F7, 0.8);
    g.fillEllipse(13, 20, 18, 16);
    g.fillEllipse(37, 20, 18, 16);
    g.lineStyle(3, 0x1565C0, 1);
    g.strokeEllipse(13, 20, 18, 16);
    g.strokeEllipse(37, 20, 18, 16);
    g.lineBetween(22, 18, 28, 18);
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillEllipse(10, 16, 6, 5);
    g.fillEllipse(34, 16, 6, 5);
    g.generateTexture('goggles', 48, 36);
    g.destroy();
  }

  static collectibleBoard(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0x66BB6A, 1);
    g.fillRoundedRect(4, 4, 52, 28, 8);
    g.lineStyle(2, 0x388E3C, 1);
    g.strokeRoundedRect(4, 4, 52, 28, 8);
    g.fillStyle(0xFFFFFF, 0.45);
    g.fillRoundedRect(18, 12, 24, 8, 4);
    g.generateTexture('board', 60, 36);
    g.destroy();
  }

  static boat(scene) {
    const g = scene.add.graphics();
    const W = 96, H = 52;
    // Hull shadow
    g.fillStyle(0x000000, 0.15);
    g.fillRoundedRect(8, 26, W - 12, 22, { bl: 10, br: 10, tl: 2, tr: 2 });
    // Hull
    g.fillStyle(0xF57F17, 1);
    g.fillRoundedRect(4, 22, W - 8, 22, { bl: 10, br: 10, tl: 2, tr: 2 });
    g.lineStyle(2, 0xE65100, 1);
    g.strokeRoundedRect(4, 22, W - 8, 22, { bl: 10, br: 10, tl: 2, tr: 2 });
    // Red stripe
    g.lineStyle(4, 0xEF5350, 1);
    g.lineBetween(4, 30, W - 4, 30);
    // Cabin
    g.fillStyle(0xFFFFFF, 1);
    g.fillRoundedRect(26, 8, 44, 18, 5);
    g.lineStyle(2, 0xBDBDBD, 1);
    g.strokeRoundedRect(26, 8, 44, 18, 5);
    // Windows
    g.fillStyle(0x4FC3F7, 1);
    g.fillEllipse(38, 16, 10, 9);
    g.fillEllipse(54, 16, 10, 9);
    g.lineStyle(1.5, 0x1976D2, 1);
    g.strokeEllipse(38, 16, 10, 9);
    g.strokeEllipse(54, 16, 10, 9);
    // Red cross on roof
    g.fillStyle(0xEF5350, 1);
    g.fillRect(44, 2, 6, 12);
    g.fillRect(40, 6, 14, 4);
    g.generateTexture('boat', W, H);
    g.destroy();
  }

  static oceanTile(scene) {
    const g = scene.add.graphics();
    const W = 128, H = 128;
    g.fillStyle(0x0A2040, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x0D3B6E, 0.45);
    g.fillEllipse(64, 64, 110, 95);
    g.fillStyle(0x90CAF9, 0.08);
    const sparkles = [[18,28],[58,12],[102,48],[32,78],[85,88],[14,98],[108,18],[50,110],[92,68],[72,42]];
    sparkles.forEach(([x, y]) => g.fillCircle(x, y, 1.5));
    g.generateTexture('ocean_tile', W, H);
    g.destroy();
  }

  static oceanFoam(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0xFFFFFF, 0.55);
    for (let x = 0; x < 64; x += 10) g.fillEllipse(x + 5, 8, 12, 8);
    g.generateTexture('foam', 64, 16);
    g.destroy();
  }

  static star(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0xFFD600, 1);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? 14 : 6;
      pts.push({ x: 16 + r * Math.cos(angle), y: 16 + r * Math.sin(angle) });
    }
    g.fillPoints(pts, true);
    g.lineStyle(1, 0xF9A825, 1);
    g.strokePoints(pts, true);
    g.generateTexture('star', 32, 32);
    g.destroy();
  }

  static particle(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('particle', 12, 12);
    g.destroy();
  }

  static splash(scene) {
    const g = scene.add.graphics();
    g.fillStyle(0x90CAF9, 0.7);
    g.fillEllipse(20, 14, 32, 12);
    g.fillStyle(0xBBDEFB, 0.9);
    g.fillEllipse(12, 8, 8, 14);
    g.fillEllipse(28, 8, 8, 14);
    g.fillEllipse(20, 6, 6, 10);
    g.generateTexture('splash', 40, 28);
    g.destroy();
  }
}

// ── Utility: darken a hex color by factor (0..1) ──────────────
function darken(hex, factor) {
  const r = ((hex >> 16) & 0xFF) * (1 - factor);
  const g = ((hex >> 8)  & 0xFF) * (1 - factor);
  const b = (hex         & 0xFF) * (1 - factor);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
