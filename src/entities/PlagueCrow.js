class PlagueCrow extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'crow-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    // Physics body matched to visible sprite area across all frames (48×48)
    this.setBodySize(28, 45);
    this.setOffset(12, 1);
    this.body.setMass(1);

    this._dead = false;

    // Stats
    this.maxHp        = 2;
    this.hp           = this.maxHp;
    this.speed        = 55;
    this.attackDamage = 2;

    // Timers (ms)
    this.shootCooldown = Phaser.Math.Between(1500, 3000);

    // Active projectiles fired by this crow
    this._projectiles = [];

    this.play('crow-idle');
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
    this._destroyProjectiles();
    this.scene.spawnDeathEffect(this.x, this.y);
    this.scene.onEnemyKilled(this);
    this.destroy();
  }

  _destroyProjectiles() {
    this._projectiles.forEach(p => { if (p.active) p.destroy(); });
    this._projectiles = [];
  }

  // ─── Shooting ──────────────────────────────────────────────────────────────

  _shoot(target) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const speed = 200;

    // Small projectile circle
    const proj = this.scene.add.circle(this.x, this.y, 5, 0x8833aa).setDepth(6);
    this.scene.physics.add.existing(proj);
    proj.body.setCircle(5);
    proj.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.body.setCollideWorldBounds(true);
    proj.body.onWorldBounds = true;

    this._projectiles.push(proj);

    // Destroy on world bounds hit
    proj.body.world.on('worldbounds', (body) => {
      if (body.gameObject === proj && proj.active) proj.destroy();
    });

    // Register overlap with player and clone
    this.scene.physics.add.overlap(proj, this.scene.player, () => {
      if (!proj.active) return;
      proj.destroy();
      this.scene.player.takeDamage(this.attackDamage);
    });

    if (this.scene.clone?.active) {
      this.scene.physics.add.overlap(proj, this.scene.clone, () => {
        if (!proj.active) return;
        proj.destroy();
        this.scene.clone?.takeDamage(this.attackDamage);
      });
    }

    // Auto-destroy after 3 s (safety)
    this.scene.time.delayedCall(3000, () => { if (proj.active) proj.destroy(); });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta, player, clone) {
    if (!this.active || !player || player.hp <= 0) return;

    // Hard clamp to arena bounds (wall = 28px, add 10px margin)
    this.x = Phaser.Math.Clamp(this.x, 38, 922);
    this.y = Phaser.Math.Clamp(this.y, 38, 502);

    // Pick nearest living target
    const cloneAlive = clone?.active && !clone._dead;
    let target = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);
      if (dc < dp) target = clone;
    }

    this.shootCooldown -= delta;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    this.setFlipX(target.x >= this.x);

    // ── Too close — flee ─────────────────────────────────────────────────────
    if (dist < 100) {
      const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
      const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed * 1.4, Math.sin(snap8) * this.speed * 1.4);
      this.play('crow-fly', true);
      return;
    }

    // ── Shoot ────────────────────────────────────────────────────────────────
    if (this.shootCooldown <= 0) {
      this.shootCooldown = Phaser.Math.Between(2000, 3000);
      this._shoot(target);
    }

    // ── Kite: stay in preferred range 200–320 px ──────────────────────────────
    if (dist < 200) {
      // Too close — back away
      const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
      const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
      this.play('crow-fly', true);
    } else if (dist > 320) {
      // Too far — move in
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
      this.play('crow-fly', true);
    } else {
      // In range — hover
      this.setVelocity(0, 0);
      this.play('crow-idle', true);
    }
  }
}
