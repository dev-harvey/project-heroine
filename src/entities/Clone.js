class Clone extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);
    this.setTint(0x9966ff);
    this.setAlpha(0);

    this._killCount = 0;
    this.hp         = 3;
    this._dead      = false;

    // Anchor offset: set by GameScene at summon time (mouse direction)
    this.anchorOffsetX = -110;
    this.anchorOffsetY = 0;

    // State
    this.isAttacking    = false;
    this.attackCooldown = 0;
    this.facingRight    = true;
    this.attackDir      = 'right';
    this.hitEnemies     = new Set();

    this.setBodySize(40, 44);
    this.setOffset(44, 10);

    this.attackZone = scene.add.zone(x, y, 72, 52);
    scene.physics.add.existing(this.attackZone);
    this.attackZone.body.setSize(72, 52);
    this.attackZone.body.enable = false;

    this.on('animationcomplete', (anim) => {
      if (anim.key === 'player-attack') {
        this.isAttacking = false;
        this.attackZone.body.enable = false;
        this.setAngle(0);
        this.setFlipX(!this.facingRight);
      }
    });

    this.play('player-idle');
    scene.tweens.add({ targets: this, alpha: 0.9, duration: 350, ease: 'Power2' });
  }

  // ─── Dynamic stats (+1 per kill) ──────────────────────────────────────────

  get killCount()    { return this._killCount; }
  /** +1 max HP every 3 kills (starts at 3). */
  get maxHp()        { return 3 + Math.floor(this._killCount / 3); }
  /** +1 ATK every kill (starts at 1). */
  get attackDamage() { return 1 + this._killCount; }
  get speed()        { return 160 + Math.min(this._killCount * 3, 60); }

  // ─── Kill registration ─────────────────────────────────────────────────────

  onKill() {
    const oldMax = this.maxHp;
    this._killCount++;
    const newMax = this.maxHp;
    // Only heal clone when a new max HP tier is reached (every 3rd kill)
    if (newMax > oldMax) {
      this.hp = Math.min(this.hp + 1, newMax);
    }
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

  doAttack(dir) {
    if (this._dead || this.isAttacking || this.attackCooldown > 0) return;

    this.attackDir = dir;
    this.isAttacking = true;
    this.attackCooldown = 420;
    this.hitEnemies.clear();
    this.setVelocity(0, 0);
    this.play('player-attack', true);

    switch (this.attackDir) {
      case 'right': this.setAngle(0); this.setFlipX(false); break;
      case 'left':  this.setAngle(0); this.setFlipX(true);  break;
      case 'up':
      case 'down':
        this.setAngle(0);
        this.setFlipX(!this.facingRight);
        break;
    }

    this.scene.time.delayedCall(80, () => {
      if (!this.active || this._dead) return;
      this._syncAttackZone();
      this.attackZone.body.enable = true;
    });
    this.scene.time.delayedCall(280, () => {
      if (this.active) this.attackZone.body.enable = false;
    });
  }

  takeDamage(amount) {
    if (this._dead || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);

    if (this.scene.spawnDamageNumber) {
      this.scene.spawnDamageNumber(this.x, this.y - 16, amount, '#bb66ff');
    }

    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.2, to: 0.9 },
      duration: 100, repeat: 2,
      onComplete: () => { if (this.active) this.setAlpha(0.9); },
    });

    if (this.hp <= 0) {
      this._dead = true;
      this.scene.time.delayedCall(200, () => this._onDeath());
    }
  }

  _onDeath() {
    if (!this.active) return;
    this.scene.onCloneDeath(this._killCount);
    this.dismiss();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _syncAttackZone() {
    const REACH = 54;
    switch (this.attackDir) {
      case 'right': this.attackZone.body.setSize(72, 52); this.attackZone.setPosition(this.x + REACH, this.y); break;
      case 'left':  this.attackZone.body.setSize(72, 52); this.attackZone.setPosition(this.x - REACH, this.y); break;
      case 'up':    this.attackZone.body.setSize(52, 72); this.attackZone.setPosition(this.x, this.y - REACH); break;
      case 'down':  this.attackZone.body.setSize(52, 72); this.attackZone.setPosition(this.x, this.y + REACH); break;
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  dismiss() {
    if (!this.active) return;
    this.setActive(false).setVisible(false);
    if (this.attackZone) {
      this.attackZone.body.enable = false;
      this.attackZone.destroy();
      this.attackZone = null;
    }
    this.destroy();
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta, player) {
    if (!this.active || this._dead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    if (this.isAttacking) {
      this.setVelocity(0, 0);
      this._syncAttackZone();
      return;
    }

    const targetX = player.x + this.anchorOffsetX;
    const targetY = player.y + this.anchorOffsetY;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 8) {
      const spd = this.speed;
      this.setVelocity((dx / dist) * spd, (dy / dist) * spd);
      this.play('player-run', true);
    } else {
      this.setVelocity(0, 0);
      this.play('player-idle', true);
    }

    this.facingRight = player.facingRight;
    this.setFlipX(!this.facingRight);
    this._syncAttackZone();
  }
}
