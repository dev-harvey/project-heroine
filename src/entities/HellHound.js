class HellHound extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hound-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    // Physics body matched to visible sprite area across all frames (64×48)
    this.setBodySize(45, 29);
    this.setOffset(12, 19);

    this._dead = false;

    // Stats
    this.maxHp        = 1;
    this.hp           = this.maxHp;
    this.speed        = 135;
    this.attackDamage = 1;
    this.attackRange  = 48;

    // Timers (ms)
    this.attackCooldown = Phaser.Math.Between(900, 1500);

    this.play('hound-idle');
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
    this.scene.spawnDeathEffect(this.x, this.y);
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta, player, clone) {
    if (!this.active || !player || player.hp <= 0) return;

    this.x = Phaser.Math.Clamp(this.x, 38, 922);
    this.y = Phaser.Math.Clamp(this.y, 38, 502);

    // Pick the nearest living target
    const cloneAlive = clone?.active && !clone._dead;
    let target = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);
      if (dc < dp) target = clone;
    }

    this.attackCooldown -= delta;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    // Always face the target
    this.setFlipX(target.x < this.x);

    // ── In attack range ──────────────────────────────────────────────────────
    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);
      this.play('hound-idle', true);

      if (this.attackCooldown <= 0) {
        this.attackCooldown = Phaser.Math.Between(1000, 1600);
        target.takeDamage(this.attackDamage);
      }
      return;
    }

    // ── Chase target ─────────────────────────────────────────────────────────
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    this.play('hound-run', true);
  }
}
