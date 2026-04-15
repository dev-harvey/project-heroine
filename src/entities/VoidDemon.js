class VoidDemon extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'demon-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);
    

    // Body 150×144, centered horizontally in 256px frame
    this.setBodySize(150, 144);
    this.setOffset(53, 0);

    this.setScale(0.7);

    this.body.setMass(20);

    this._dead = false;

    // ── Stats ─────────────────────────────────────────────────────────────────
    this.maxHp        = 10;
    this.hp           = this.maxHp;
    this.speed        = 45;
    this.breathDamage = 3;
    this.breathRange  = 170;

    // ── State ─────────────────────────────────────────────────────────────────
    this._facingAngle    = 0;
    this._isWindingUp    = false;
    this._isFiring       = false;
    this._breathCooldown = Phaser.Math.Between(2000, 4000);

    // Graphics for breath preview and fire cone
    this._previewGfx = scene.add.graphics().setDepth(5);
    this._coneGfx    = scene.add.graphics().setDepth(5);

    this.play('demon-idle');
  }

  // ─── Damage ────────────────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this._dead) return;
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) this._die();
  }

  _die() {
    if (this._dead) return;
    this._dead = true;
    this._previewGfx.destroy();
    this._coneGfx.destroy();
    this.scene.spawnDeathEffect(this.x, this.y);
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  // ─── Breath attack ─────────────────────────────────────────────────────────

  /** World point where the shovel originates — body edge inset 10px in facing direction. */
  _breathOrigin(angle) {
    const bcx = this.body.x + this.body.width  / 2;
    const bcy = this.body.y + this.body.height / 2;
    const hw  = this.body.width  / 2;
    const hh  = this.body.height / 2;
    const c = Math.cos(angle), s = Math.sin(angle);
    const edgeDist = (hw * hh) / Math.sqrt((hw * s) ** 2 + (hh * c) ** 2);
    return { x: bcx + c * (edgeDist - 10), y: bcy + s * (edgeDist - 10) };
  }

  /**
   * Draw the shovel shape for the breath attack.
   * NH=20 hilt half, FH=75 blade half, FD=130 far-corner depth, CTRL=210 → peak at 170px.
   */
  _drawShovel(gfx, angle, fillColor, fillAlpha, lineColor, lineAlpha) {
    const NH = 20, FH = 75, FD = 130, CTRL = 210, N = 16;
    const perp = angle + Math.PI / 2;
    const { x: ox, y: oy } = this._breathOrigin(angle);
    const fwdX = Math.cos(angle), fwdY = Math.sin(angle);
    const latX = Math.cos(perp),  latY = Math.sin(perp);

    const hAx = ox + latX * NH,              hAy = oy + latY * NH;
    const hBx = ox - latX * NH,              hBy = oy - latY * NH;
    const fAx = ox + fwdX * FD + latX * FH,  fAy = oy + fwdY * FD + latY * FH;
    const fBx = ox + fwdX * FD - latX * FH,  fBy = oy + fwdY * FD - latY * FH;
    const cpx = ox + fwdX * CTRL,            cpy = oy + fwdY * CTRL;

    const buildPath = () => {
      gfx.beginPath();
      gfx.moveTo(hAx, hAy);
      gfx.lineTo(fAx, fAy);
      for (let i = 1; i <= N; i++) {
        const t = i / N, mt = 1 - t;
        gfx.lineTo(
          mt * mt * fAx + 2 * mt * t * cpx + t * t * fBx,
          mt * mt * fAy + 2 * mt * t * cpy + t * t * fBy,
        );
      }
      gfx.lineTo(hBx, hBy);
      gfx.closePath();
    };

    gfx.clear();
    if (fillAlpha > 0) { gfx.fillStyle(fillColor, fillAlpha); buildPath(); gfx.fillPath(); }
    if (lineAlpha > 0) { gfx.lineStyle(2, lineColor, lineAlpha); buildPath(); gfx.strokePath(); }
  }

  /** True if world point (tx, ty) lies inside the shovel damage area. */
  _inShovel(tx, ty) {
    const NH = 20, FH = 75, FD = 130, CTRL = 210;
    const { x: ox, y: oy } = this._breathOrigin(this._facingAngle);
    const c = Math.cos(this._facingAngle), s = Math.sin(this._facingAngle);
    const dx = tx - ox, dy = ty - oy;
    const lx = dx * c + dy * s;   // depth along facing direction
    const ly = -dx * s + dy * c;  // lateral offset

    if (lx < 0) return false;

    if (lx <= FD) {
      // Flank region — linearly widens from hilt to far corners
      return Math.abs(ly) <= NH + (FH - NH) * (lx / FD);
    }

    // Blade region — bounded by quadratic bezier
    // ly(t) = FH*(1−2t)  →  t = (FH − ly) / (2*FH)
    if (Math.abs(ly) > FH) return false;
    const t = (FH - ly) / (2 * FH);
    const lxCurve = FD * (1 - 2 * t + 2 * t * t) + 2 * t * (1 - t) * CTRL;
    return lx <= lxCurve;
  }

  _startBreath() {
    this._isWindingUp = true;
    this.play('demon-attack-no-breath', true);
    this.setTint(0xff8800);
    this._drawShovel(this._previewGfx, this._facingAngle, 0xffcc88, 0.4, 0, 0);

    this.scene.time.delayedCall(500, () => {
      if (!this.active || this._dead) return;
      this._isWindingUp = false;
      this._isFiring    = true;
      this.clearTint();
      this._previewGfx.clear();
      this._fireBreath();
    });
  }

  _fireBreath() {
    const angle    = this._facingAngle;
    const DURATION = 700;

    // Animated fill fading over DURATION
    const progress = { t: 0 };
    this.scene.tweens.add({
      targets: progress, t: 1, duration: DURATION,
      onUpdate: () => {
        const a = 1 - progress.t;
        this._drawShovel(this._coneGfx, angle, 0xff4400, 0.18 * a, 0xff8800, a);
      },
      onComplete: () => {
        this._coneGfx.clear();
        this._isFiring = false;
        if (this.active && !this._dead) this.play('demon-idle', true);
      },
    });

    // Scatter fire sprites within the shovel area
    const { x: ox, y: oy } = this._breathOrigin(angle);
    for (let i = 0; i < 9; i++) {
      this.scene.time.delayedCall(i * 55, () => {
        if (!this.scene?.tweens || !this.active) return;
        const a  = angle + (Math.random() - 0.5) * (Math.PI / 3);
        const r  = Math.random() * this.breathRange;
        const spr = this.scene.add.sprite(ox + Math.cos(a) * r, oy + Math.sin(a) * r, 'demon-breath')
          .setScale(0.48).setAlpha(0.85)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
        spr.play('demon-breath');
        spr.once('animationcomplete', () => {
          if (!this.scene?.tweens) { spr.destroy(); return; }
          this.scene.tweens.add({ targets: spr, alpha: 0, duration: 150, onComplete: () => spr.destroy() });
        });
      });
    }

    // Apply damage to any target inside the shovel
    const targets = [this.scene.player];
    if (this.scene.clone?.active && !this.scene.clone._dead) targets.push(this.scene.clone);
    for (const t of targets) {
      if (this._inShovel(t.x, t.y)) t.takeDamage(this.breathDamage);
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(_time, delta, player, clone) {
    if (!this.active || this._dead || !player || player.hp <= 0) return;

    this.x = Phaser.Math.Clamp(this.x, 38, 922);
    this.y = Phaser.Math.Clamp(this.y, 38, 502);

    this._breathCooldown = Math.max(0, this._breathCooldown - delta);

    // ── Locked states — no movement, no target update ────────────────────────
    if (this._isWindingUp) {
      this._drawShovel(this._previewGfx, this._facingAngle, 0xffcc88, 0.4, 0, 0);
      this.setVelocity(0, 0);
      return;
    }

    if (this._isFiring) {
      this.setVelocity(0, 0);
      return;
    }

    // ── Pick nearest living target ───────────────────────────────────────────
    const cloneAlive = clone?.active && !clone._dead;
    let target = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x,  clone.y);
      if (dc < dp) target = clone;
    }

    this._facingAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.setFlipX(target.x >= this.x);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    // ── Breath ───────────────────────────────────────────────────────────────
    if (dist <= this.breathRange && this._breathCooldown <= 0) {
      this._breathCooldown = Phaser.Math.Between(3500, 5000);
      this.setVelocity(0, 0);
      this._startBreath();
      return;
    }

    // ── Chase to breath range ─────────────────────────────────────────────────
    if (dist > this.breathRange) {
      const a     = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const snap8 = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
    } else {
      this.setVelocity(0, 0);
    }
    this.play('demon-idle', true);
  }
}
