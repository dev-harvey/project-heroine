class StoneKnight extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'dragon-fly');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);
    this.setScale(0.56);
    this.setFlipX(true);

    // Physics body matched to visible sprite area across all frames (192×176, scale 0.56)
    // setBodySize/setOffset use local (pre-scale) units; world size = value × 0.56
    this.setBodySize(180, 150);
    this.setOffset(6, 10);

    this._dead = false;

    // Stats
    this.maxHp        = 10;
    this.hp           = this.maxHp;
    this.speed        = 45;
    this.meleeDamage  = 1;
    this.breathDamage = 3;
    this.meleeRange   = 65;
    this.breathRange  = 170;   // depth of the fire rectangle

    // State
    this._facingAngle     = 0;
    this._isWindingUp     = false;
    this._isFiring        = false;
    this._breathCooldown  = Phaser.Math.Between(2000, 4000);
    this._meleeCooldown   = 0;
    this.attackDir        = 'right';
    this._isAttacking     = false;

    // Cone visual — drawn into scene, cleaned up on death
    this._coneGfx = scene.add.graphics().setDepth(5);

    this.play('dragon-fly');
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

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
    this._coneGfx.destroy();
    this.scene.spawnDeathEffect(this.x, this.y);
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  // ─── Breath weapon ─────────────────────────────────────────────────────────

  _startBreath() {
    this._isWindingUp = true;

    // Orange wind-up flash
    this.setTint(0xff8800);

    this.scene.time.delayedCall(500, () => {
      if (!this.active) return;
      this._isWindingUp = false;
      this._isFiring    = true;
      this.clearTint();
      this._fireBreath();
    });
  }

  /** Snap a continuous angle to the nearest cardinal direction string. */
  _snapCardinal(angle) {
    const deg = Phaser.Math.RadToDeg(angle);
    const n   = ((deg % 360) + 360) % 360;
    if (n < 45 || n >= 315) return 'right';
    if (n < 135)             return 'down';
    if (n < 225)             return 'left';
    return 'up';
  }

  /** Return { rx, ry, rw, rh } — top-left origin + size — for the fire rectangle. */
  _breathRect(cardinal) {
    const D = this.breathRange;  // depth (length)
    const W = 110;               // width (perpendicular)
    switch (cardinal) {
      case 'right': return { rx: this.x,     ry: this.y - W / 2, rw: D, rh: W };
      case 'left':  return { rx: this.x - D, ry: this.y - W / 2, rw: D, rh: W };
      case 'down':  return { rx: this.x - W / 2, ry: this.y,     rw: W, rh: D };
      case 'up':    return { rx: this.x - W / 2, ry: this.y - D, rw: W, rh: D };
    }
  }

  _fireBreath() {
    const cardinal = this._snapCardinal(this._facingAngle);
    const { rx, ry, rw, rh } = this._breathRect(cardinal);
    const DURATION = 700;

    // ── Rectangle outline (animated fade) ───────────────────────────────────
    const progress = { t: 0 };
    this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration: DURATION,
      onUpdate: () => {
        const alpha = 1 - progress.t;
        this._coneGfx.clear();
        this._coneGfx.fillStyle(0xff4400, 0.18 * alpha);
        this._coneGfx.fillRect(rx, ry, rw, rh);
        this._coneGfx.lineStyle(2, 0xff8800, alpha);
        this._coneGfx.strokeRect(rx, ry, rw, rh);
      },
      onComplete: () => {
        this._coneGfx.clear();
        this._isFiring = false;
      },
    });

    // ── Fire sprites scattered within the rectangle ───────────────────────
    const COUNT = 9;
    for (let i = 0; i < COUNT; i++) {
      const sx = rx + Phaser.Math.Between(10, rw - 10);
      const sy = ry + Phaser.Math.Between(10, rh - 10);
      // Stagger spawns slightly so they don't all pop at once
      this.scene.time.delayedCall(i * 55, () => {
        if (!this.scene?.tweens) return;
        const spr = this.scene.add.sprite(sx, sy, 'dragon-breath')
          .setScale(0.48)
          .setAlpha(0.85)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(6);
        spr.play('dragon-breath');
        spr.once('animationcomplete', () => {
          if (!this.scene?.tweens) { spr.destroy(); return; }
          this.scene.tweens.add({
            targets: spr, alpha: 0, duration: 150,
            onComplete: () => spr.destroy(),
          });
        });
      });
    }

    // ── Damage — check if any target's centre falls inside the rectangle ──
    const targets = [this.scene.player];
    if (this.scene.clone?.active && !this.scene.clone._dead) {
      targets.push(this.scene.clone);
    }
    for (const t of targets) {
      if (t.x >= rx && t.x <= rx + rw && t.y >= ry && t.y <= ry + rh) {
        t.takeDamage(this.breathDamage);
      }
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta, player, clone) {
    if (!this.active || !player || player.hp <= 0) return;

    this.x = Phaser.Math.Clamp(this.x, 38, 922);
    this.y = Phaser.Math.Clamp(this.y, 38, 502);

    this._breathCooldown = Math.max(0, this._breathCooldown - delta);
    this._meleeCooldown  = Math.max(0, this._meleeCooldown  - delta);

    // Pick nearest living target
    const cloneAlive = clone?.active && !clone._dead;
    let target = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x,  clone.y);
      if (dc < dp) target = clone;
    }

    // Always track facing angle (used by cone)
    this._facingAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.setFlipX(target.x >= this.x);

    // Lock during wind-up and fire
    if (this._isWindingUp || this._isFiring) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    // Breath — takes priority when in range and off cooldown
    if (dist <= this.breathRange && this._breathCooldown <= 0) {
      this._breathCooldown = Phaser.Math.Between(3500, 5000);
      this.setVelocity(0, 0);
      this._startBreath();
      return;
    }

    // Melee chomp — only when breath is unavailable and very close
    if (dist <= this.meleeRange && this._meleeCooldown <= 0) {
      this._meleeCooldown = 1200;
      this.setVelocity(0, 0);
      const DIRS = ['right','down-right','down','down-left','left','up-left','up','up-right'];
      this.attackDir    = DIRS[((Math.round(this._facingAngle / (Math.PI / 4)) % 8) + 8) % 8];
      this._isAttacking = true;
      this.scene.time.delayedCall(300, () => { if (this.active) this._isAttacking = false; });
      target.takeDamage(this.meleeDamage);
      return;
    }

    // Chase
    const a = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.setVelocity(Math.cos(a) * this.speed, Math.sin(a) * this.speed);
    this.play('dragon-fly', true);
  }
}
