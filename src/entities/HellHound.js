class HellHound extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hound-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    // Physics body centred in the 64×48 frame
    this.setBodySize(38, 28);
    this.setOffset(13, 10);

    // Stats
    this.maxHp        = 2;
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
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });

    if (this.hp <= 0) this._die();
  }

  _die() {
    this.scene.spawnDeathEffect(this.x, this.y);
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta, player) {
    if (!this.active || !player || player.hp <= 0) return;

    this.attackCooldown -= delta;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Always face the player
    this.setFlipX(player.x < this.x);

    // ── In attack range ──────────────────────────────────────────────────────
    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);
      this.play('hound-idle', true);

      if (this.attackCooldown <= 0) {
        this.attackCooldown = Phaser.Math.Between(1000, 1600);
        player.takeDamage(this.attackDamage);
      }
      return;
    }

    // ── Chase player ─────────────────────────────────────────────────────────
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    this.play('hound-run', true);
  }
}
