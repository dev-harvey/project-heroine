class MutantToad extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'toad-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    // Physics body centred in the 80×64 frame
    this.setBodySize(48, 38);
    this.setOffset(16, 14);

    // Stats
    this.maxHp        = 3;
    this.hp           = this.maxHp;
    this.speed        = 70;
    this.attackDamage = 1;
    this.attackRange  = 55;

    // Timers (ms)
    this.attackCooldown = Phaser.Math.Between(1200, 2000);
    this.jumpCooldown   = Phaser.Math.Between(2500, 4500);
    this.isJumping      = false;

    this.play('toad-idle');
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

  update(time, delta, player, clone) {
    if (!this.active || !player || player.hp <= 0) return;

    // Pick the nearest living target
    const cloneAlive = clone?.active && !clone._dead;
    let target = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);
      if (dc < dp) target = clone;
    }

    this.attackCooldown -= delta;
    this.jumpCooldown   -= delta;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    // Always face the target
    this.setFlipX(target.x < this.x);

    // ── In attack range ──────────────────────────────────────────────────────
    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);

      if (this.attackCooldown <= 0) {
        this.attackCooldown = Phaser.Math.Between(1400, 2000);
        this.play('toad-attack', true);
        target.takeDamage(this.attackDamage);

        this.once('animationcomplete', () => {
          if (this.active) this.play('toad-idle', true);
        });
      } else if (!this.anims.currentAnim || !this.anims.currentAnim.key.includes('attack')) {
        this.play('toad-idle', true);
      }
      return;
    }

    // ── Jump lunge ───────────────────────────────────────────────────────────
    if (!this.isJumping && this.jumpCooldown <= 0 && dist < 320) {
      this.isJumping    = true;
      this.jumpCooldown = Phaser.Math.Between(3000, 5500);

      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.setVelocity(Math.cos(angle) * 230, Math.sin(angle) * 230);
      this.play('toad-jump', true);

      this.scene.time.delayedCall(380, () => {
        if (this.active) {
          this.isJumping = false;
          this.setVelocity(0, 0);
          this.play('toad-idle', true);
        }
      });
      return;
    }

    // ── Walk toward target ───────────────────────────────────────────────────
    if (!this.isJumping) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

      if (!this.anims.currentAnim || !this.anims.currentAnim.key.includes('attack')) {
        this.play('toad-idle', true);
      }
    }
  }
}
