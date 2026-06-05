// ============================================================
//  VirtualJoystick – Touch/mouse joystick for mobile gameplay.
//
//  Usage:
//    const joy = new VirtualJoystick(scene, { x: 90, y: 760 });
//    // in update():
//    const { x, y, magnitude } = joy.getVector();
//    player.setVelocity(x * speed, y * speed);
//    joy.destroy();   // cleanup
// ============================================================

export class VirtualJoystick {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} opts
   * @param {number} opts.x          – Base center X (default 90)
   * @param {number} opts.y          – Base center Y (default 760)
   * @param {number} opts.baseRadius – Outer ring radius (default 55)
   * @param {number} opts.thumbRadius– Thumb ball radius (default 28)
   * @param {number} opts.depth      – Render depth (default 100)
   */
  constructor(scene, opts = {}) {
    this.scene  = scene;
    this.cx     = opts.x           ?? 90;
    this.cy     = opts.y           ?? 760;
    this.baseR  = opts.baseRadius  ?? 55;
    this.thumbR = opts.thumbRadius ?? 28;
    this.depth  = opts.depth       ?? 100;

    this._dx = 0;
    this._dy = 0;
    this._active   = false;
    this._pointerId = null;

    this._buildGraphics();
    this._registerInput();
  }

  // ── Build the visual elements ──────────────────────────────
  _buildGraphics() {
    // Outer ring
    this._base = this.scene.add.graphics();
    this._base.setDepth(this.depth);
    this._base.setScrollFactor(0);
    this._drawBase();

    // Thumb stick
    this._thumb = this.scene.add.graphics();
    this._thumb.setDepth(this.depth + 1);
    this._thumb.setScrollFactor(0);
    this._drawThumb(this.cx, this.cy);
  }

  _drawBase() {
    const g = this._base;
    g.clear();
    g.lineStyle(3, 0xffffff, 0.3);
    g.strokeCircle(this.cx, this.cy, this.baseR);
    g.fillStyle(0xffffff, 0.08);
    g.fillCircle(this.cx, this.cy, this.baseR);
  }

  _drawThumb(tx, ty) {
    const g = this._thumb;
    g.clear();

    // Shadow / glow
    g.fillStyle(0x000000, 0.2);
    g.fillCircle(tx + 3, ty + 3, this.thumbR);

    // Main ball
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(tx, ty, this.thumbR);

    // Inner highlight
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(tx - this.thumbR * 0.3, ty - this.thumbR * 0.3, this.thumbR * 0.45);

    // Directional arrows hint
    g.lineStyle(2, 0xffffff, 0.5);
    const arrowOff = this.thumbR * 0.5;
    // Up arrow
    g.lineBetween(tx, ty - arrowOff, tx, ty - arrowOff - 6);
    // Down arrow
    g.lineBetween(tx, ty + arrowOff, tx, ty + arrowOff + 6);
    // Left arrow
    g.lineBetween(tx - arrowOff, ty, tx - arrowOff - 6, ty);
    // Right arrow
    g.lineBetween(tx + arrowOff, ty, tx + arrowOff + 6, ty);
  }

  // ── Register input events ──────────────────────────────────
  _registerInput() {
    const input = this.scene.input;

    // Pointer down – only claim the pointer if it starts near the base
    this._onDown = (pointer) => {
      if (this._pointerId !== null) return;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.cx, this.cy);
      if (dist <= this.baseR * 1.4) {
        this._active    = true;
        this._pointerId = pointer.id;
        this._update(pointer.x, pointer.y);
      }
    };

    this._onMove = (pointer) => {
      if (!this._active || pointer.id !== this._pointerId) return;
      this._update(pointer.x, pointer.y);
    };

    this._onUp = (pointer) => {
      if (pointer.id !== this._pointerId) return;
      this._active    = false;
      this._pointerId = null;
      this._dx = 0;
      this._dy = 0;
      this._drawThumb(this.cx, this.cy);
    };

    input.on('pointerdown', this._onDown, this);
    input.on('pointermove', this._onMove, this);
    input.on('pointerup',   this._onUp,   this);
    input.on('pointerupoutside', this._onUp, this);
  }

  _update(px, py) {
    const dx   = px - this.cx;
    const dy   = py - this.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxD = this.baseR;

    if (dist > maxD) {
      this._dx = dx / dist;
      this._dy = dy / dist;
    } else {
      this._dx = dx / maxD;
      this._dy = dy / maxD;
    }

    const clampedDist = Math.min(dist, maxD);
    const tx = this.cx + (dx / (dist || 1)) * clampedDist;
    const ty = this.cy + (dy / (dist || 1)) * clampedDist;
    this._drawThumb(tx, ty);
  }

  // ── Public API ────────────────────────────────────────────

  /**
   * Returns normalised direction vector + magnitude [0..1].
   * @returns {{ x: number, y: number, magnitude: number }}
   */
  getVector() {
    const magnitude = Math.sqrt(this._dx * this._dx + this._dy * this._dy);
    return {
      x: this._dx,
      y: this._dy,
      magnitude: Math.min(magnitude, 1),
    };
  }

  isActive() {
    return this._active;
  }

  /** Move the joystick base position (e.g. for repositioning). */
  setPosition(x, y) {
    this.cx = x;
    this.cy = y;
    this._drawBase();
    this._drawThumb(x, y);
  }

  /** Show / hide the joystick. */
  setVisible(v) {
    this._base.setVisible(v);
    this._thumb.setVisible(v);
  }

  /** Remove all objects and listeners. */
  destroy() {
    this.scene.input.off('pointerdown',      this._onDown, this);
    this.scene.input.off('pointermove',      this._onMove, this);
    this.scene.input.off('pointerup',        this._onUp,   this);
    this.scene.input.off('pointerupoutside', this._onUp,   this);
    this._base.destroy();
    this._thumb.destroy();
  }
}
