class Clone extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} [opts]
   * @param {number} [opts.playerMaxHp=5]  - Player max HP; clone base HP = floor(playerMaxHp/5) + bonusHp
   * @param {number} [opts.playerAtk=1]   - Player ATK; clone base ATK = playerAtk * 2
   * @param {number} [opts.bonusHp=0]     - Extra HP from Clone Resilience upgrade
   */
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);
    this.setTint(0x9966ff);
    this.setAlpha(0);
    this.setScale(1.5);

    // Match player — same spritesheet and scale (128×64 × 1.5), 30×60 world px exactly
    this.setBodySize(20, 40);
    this.setOffset(55, 25);

    // ── Stats ─────────────────────────────────────────────────────────────────
    this._baseHp  = Math.max(1, Math.floor((opts.playerMaxHp || 5) / 5) + (opts.bonusHp || 0));
    this._baseAtk = Math.max(1, (opts.playerAtk || 1) * 2);
    this._killCount = 0;
    this.hp         = this._baseHp;

    // ── State ─────────────────────────────────────────────────────────────────
    this._dead        = false;
    this._isDashing   = false;
    this.isAttacking  = false;
    this.attackCooldown = 0;
    this.facingRight  = true;
    this.attackDir    = 'right';
    this.hitEnemies   = new Set();

    // Anchor offset: set by GameScene at summon time
    this.anchorOffsetX = -110;
    this.anchorOffsetY = 0;

    // ── Attack zone ───────────────────────────────────────────────────────────
    this.attackZone = scene.add.zone(x, y, 60, 60);
    scene.physics.add.existing(this.attackZone);
    this.attackZone.body.setSize(60, 60);
    this.attackZone.body.enable = false;

    // Key-specific event is unambiguous in Phaser 3.60
    this.on('animationcomplete-player-attack', () => {
      this.isAttacking = false;
      if (this.attackZone) this.attackZone.body.enable = false;
      this.setAngle(0);
      this.setFlipX(!this.facingRight);
    });

    this.play('player-idle');
    scene.tweens.add({ targets: this, alpha: 0.9, duration: 350, ease: 'Power2' });
  }

  // ─── Dynamic stats ─────────────────────────────────────────────────────────

  get killCount()    { return this._killCount; }
  get maxHp()        { return this._baseHp + Math.floor(this._killCount / 3); }
  get attackDamage() { return this._baseAtk + this._killCount; }
  get speed()        { return 160 + Math.min(this._killCount * 3, 60); }

  // ─── Kill registration ─────────────────────────────────────────────────────

  onKill() {
    const oldMax = this.maxHp;
    this._killCount++;
    if (this.maxHp > oldMax) {
      this.hp = Math.min(this.hp + 1, this.maxHp);
    }
  }

  // ─── Dash ──────────────────────────────────────────────────────────────────

  doDash(vx, vy) {
    if (this._dead || !this.active) return;

    this._isDashing = true;
    this.setVelocity(vx, vy);

    const emitter = this.scene.add.particles(0, 0, 'dash-particle', {
      follow:    this,
      speed:     { min: 20, max: 60 },
      scale:     { start: 0.7, end: 0 },
      alpha:     { start: 0.7, end: 0 },
      tint:      0xcc66ff,
      blendMode: 'ADD',
      lifespan:  200,
      frequency: 18,
      quantity:  3,
    }).setDepth(3);

    this.scene.tweens.add({
      targets: this, alpha: { from: 0.2, to: 0.9 },
      duration: 80, repeat: 2,
      onComplete: () => { if (this.active) this.setAlpha(0.9); },
    });

    this.scene.time.delayedCall(300, () => {
      this._isDashing = false;
      emitter.stop();
      this.scene.time.delayedCall(250, () => emitter.destroy());
    });
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

  doAttack(dir) {
    if (this._dead || this.isAttacking || this.attackCooldown > 0) return;

    this.attackDir   = dir;
    this.isAttacking = true;
    this.attackCooldown = 420;
    this.hitEnemies.clear();
    this.setVelocity(0, 0);

    switch (this.attackDir) {
      case 'right':
        this.setFlipX(false);
        this.play('player-attack', true);
        break;
      case 'left':
        this.setFlipX(true);
        this.play('player-attack', true);
        break;
      case 'up':
        this.setFlipX(!this.facingRight);
        this.play('player-attack', true);
        break;
      case 'down':
        this.setFlipX(!this.facingRight);
        this.play('player-attack', true);
        break;
    }

    this.scene.time.delayedCall(80, () => {
      if (!this.active || this._dead || !this.attackZone) return;
      this._syncAttackZone();
      this.attackZone.body.enable = true;
      this._spawnSlash();
    });
    this.scene.time.delayedCall(280, () => {
      if (this.attackZone) this.attackZone.body.enable = false;
    });
  }

  _spawnSlash() {
    const b    = this.body;
    const bcx  = b.x + b.width / 2;
    const HALF = 30;
    let sx, sy, key, flipX = false, angle = 0;

    switch (this.attackDir) {
      case 'right': sx = b.right  + HALF; sy = b.top + HALF; key = 'slash-upward';     flipX = false; break;
      case 'left':  sx = b.left   - HALF; sy = b.top + HALF; key = 'slash-upward';     flipX = true;  break;
      case 'up':    sx = bcx;             sy = b.top  - HALF; key = 'slash-horizontal'; angle = -90;   break;
      case 'down':  sx = bcx;             sy = b.bottom+HALF; key = 'slash-horizontal'; angle =  90;   break;
    }

    const spr = this.scene.add.sprite(sx, sy, key)
      .setDepth(this.depth + 1)
      .setFlipX(flipX)
      .setAngle(angle)
      .setTint(0xcc88ff);
    spr.play(key);
    spr.once('animationcomplete', () => { if (spr.active) spr.destroy(); });
  }

  takeDamage(amount) {
    if (this._dead || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);

    if (this.scene.spawnDamageNumber) {
      this.scene.spawnDamageNumber(this.x, this.y - 16, amount, '#bb66ff');
    }

    this.scene.tweens.add({
      targets: this, alpha: { from: 0.2, to: 0.9 },
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
    if (!this.attackZone) return;
    const REACH = 54;
    const b    = this.body;
    const bcx  = b.x + b.width  / 2;
    const HALF = 30;
    this.attackZone.body.setSize(60, 60);
    switch (this.attackDir) {
      case 'right': this.attackZone.setPosition(b.right  + HALF, b.top    + HALF); break;
      case 'left':  this.attackZone.setPosition(b.left   - HALF, b.top    + HALF); break;
      case 'up':    this.attackZone.setPosition(bcx,              b.top    - HALF); break;
      case 'down':  this.attackZone.setPosition(bcx,              b.bottom + HALF); break;
    }
  }

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

    if (this._isDashing) {
      this._syncAttackZone();
      return;
    }

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

    // Inherit player velocity so the offset is preserved during movement,
    // then add a correction impulse to snap back if drift accumulates.
    const pvx = player.body?.velocity?.x ?? 0;
    const pvy = player.body?.velocity?.y ?? 0;

    let cvx = 0, cvy = 0;
    if (dist > 4) {
      const corrSpeed = Math.min(this.speed, dist * 6);
      cvx = (dx / dist) * corrSpeed;
      cvy = (dy / dist) * corrSpeed;
    }

    this.setVelocity(pvx + cvx, pvy + cvy);

    const isMoving = Math.abs(pvx) > 8 || Math.abs(pvy) > 8 || dist > 20;
    if (isMoving) {
      this.play('player-run', true);
    } else if (!this.isAttacking) {
      this.play('player-idle', true);
    }

    this.facingRight = player.facingRight;
    this.setFlipX(!this.facingRight);
    this._syncAttackZone();
  }
}
