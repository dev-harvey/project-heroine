class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(5);
    this.setScale(1.5);

    // Stats
    this.maxHp        = 5;
    this.hp           = this.maxHp;
    this.speed        = 160;
    this.attackDamage = 1;

    // State
    this.isAttacking    = false;
    this.attackCooldown = 0;
    this.isInvincible   = false;
    this.facingRight    = true;   // set by movement, not mouse
    this.attackDir      = 'right'; // 'up' | 'down' | 'left' | 'right'
    this.hitEnemies     = new Set();

    // Dash
    this.isDashing        = false;
    this.dashCooldown     = 0;
    this.dashCooldownMax  = 1200;

    // 30×60 world px exactly (20×40 local × scale 1.5). Offset centres on character then shifts sprite 2px right.
    this.setBodySize(20, 40);
    this.setOffset(55, 25);

    // Keyboard — movement only
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Mouse — attack on left click
    scene.input.on('pointerdown', (ptr) => {
      if (ptr.leftButtonDown()) this.doAttack();
    });

    // Dash — SHIFT
    this._shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this._shiftKey.on('down', () => { if (this.active) this._doDash(); });

    // Attack zone (physics-enabled, invisible)
    this.attackZone = scene.add.zone(x, y, 60, 60);
    scene.physics.add.existing(this.attackZone);
    this.attackZone.body.setSize(60, 60);
    this.attackZone.body.enable = false;

    // Restore facing and rotation after swing completes
    this.on('animationcomplete', (anim) => {
      if (anim.key === 'player-attack') {
        this.isAttacking = false;
        this.attackZone.body.enable = false;
        this.setAngle(0);
        this.setFlipX(!this.facingRight);
      }
    });

    this.play('player-idle');
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

  doAttack() {
    if (this.isAttacking || this.attackCooldown > 0) return;

    this.attackDir = this._mouseToCardinal();
    this.isAttacking = true;
    this.attackCooldown = 420;
    this.hitEnemies.clear();
    this.emit('attack', this.attackDir);
    this.setVelocity(0, 0);

    // Body always plays the horizontal attack animation in the facing direction.
    // A separate slash sprite is spawned at the attack zone for the visual effect.
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

    // Open hitbox during active frames (80–280 ms)
    this.scene.time.delayedCall(80, () => {
      this._syncAttackZone();
      this.attackZone.body.enable = true;
      this._spawnSlash();
    });
    this.scene.time.delayedCall(280, () => {
      this.attackZone.body.enable = false;
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
      .setAngle(angle);
    spr.play(key);
    spr.once('animationcomplete', () => { if (spr.active) spr.destroy(); });
  }

  takeDamage(amount) {
    if (this.isInvincible || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;

    // Floating damage number
    if (this.scene.spawnDamageNumber) {
      this.scene.spawnDamageNumber(this.x, this.y - 16, amount, '#ff2222', 26);
    }

    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.2, to: 1 },
      duration: 120,
      repeat: 3,
      onComplete: () => {
        this.setAlpha(1);
        this.isInvincible = false;
      }
    });

    this.scene.cameras.main.shake(120, 0.008);

    if (this.hp <= 0) {
      this.scene.time.delayedCall(300, () => this.scene.onPlayerDeath());
    }
  }

  // ─── Dash ──────────────────────────────────────────────────────────────────

  _doDash() {
    if (this.isDashing || this.dashCooldown > 0 || this.isAttacking) return;

    // Direction: current velocity if moving, otherwise facing
    let vx = 0, vy = 0;
    const left  = this.wasd.left.isDown  || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up    = this.wasd.up.isDown    || this.cursors.up.isDown;
    const down  = this.wasd.down.isDown  || this.cursors.down.isDown;

    if (left)  vx -= 1;
    if (right) vx += 1;
    if (up)    vy -= 1;
    if (down)  vy += 1;

    if (vx === 0 && vy === 0) {
      vx = this.facingRight ? 1 : -1;
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    vx = (vx / len) * 500;
    vy = (vy / len) * 500;

    this.isDashing    = true;
    this.isInvincible = true;
    this.dashCooldown = this.dashCooldownMax;
    this.setVelocity(vx, vy);

    // Notify scene so clone can mirror the dash
    this.emit('dash', vx, vy);

    // Trailing particle emitter — use (0,0) so follow: this isn't double-added
    const emitter = this.scene.add.particles(0, 0, 'dash-particle', {
      follow:    this,
      speed:     { min: 20, max: 60 },
      scale:     { start: 0.7, end: 0 },
      alpha:     { start: 0.8, end: 0 },
      tint:      0x88ccff,
      blendMode: 'ADD',
      lifespan:  200,
      frequency: 18,
      quantity:  3,
    }).setDepth(3);

    // White flash
    this.scene.tweens.add({
      targets: this, alpha: { from: 0.3, to: 1 },
      duration: 80, repeat: 2,
      onComplete: () => { if (this.active) this.setAlpha(1); },
    });

    this.scene.time.delayedCall(200, () => {
      if (!this.active) return;
      this.isDashing    = false;
      this.isInvincible = false;
      emitter.stop();
      this.scene.time.delayedCall(250, () => emitter.destroy());
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Snap mouse angle to nearest cardinal direction. */
  _mouseToCardinal() {
    const ptr = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY);
    const deg = Phaser.Math.RadToDeg(angle); // -180 to +180

    // 45° sectors: right [-45,45), down [45,135), left [135,180]+[-180,-135), up [-135,-45)
    if (deg >= -45 && deg < 45)   return 'right';
    if (deg >= 45  && deg < 135)  return 'down';
    if (deg >= -135 && deg < -45) return 'up';
    return 'left';
  }

  /** Position and size the attack zone for the current attack direction. */
  _syncAttackZone() {
    // Drive position entirely from body edges so zone always touches body exactly.
    // Zone is 60×60; setPosition sets zone centre (origin 0.5,0.5).
    // Horizontal: left/right edge of body → zone centre ±30; top of zone = top of body.
    // Vertical:   top/bottom edge of body → zone centre ±30; zone centred on body centre x.
    const b    = this.body;
    const bcx  = b.x + b.width  / 2;  // body centre x
    const HALF = 30;                   // half of 60px zone
    this.attackZone.body.setSize(60, 60);
    switch (this.attackDir) {
      case 'right': this.attackZone.setPosition(b.right  + HALF, b.top    + HALF); break;
      case 'left':  this.attackZone.setPosition(b.left   - HALF, b.top    + HALF); break;
      case 'up':    this.attackZone.setPosition(bcx,              b.top    - HALF); break;
      case 'down':  this.attackZone.setPosition(bcx,              b.bottom + HALF); break;
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.hp <= 0) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dashCooldown   = Math.max(0, this.dashCooldown - delta);

    // Lock movement during dash
    if (this.isDashing) {
      this._syncAttackZone();
      return;
    }

    // Lock movement while swinging
    if (this.isAttacking) {
      this.setVelocity(0, 0);
      this._syncAttackZone();
      return;
    }

    // ── Movement ─────────────────────────────────────────────────────────────
    const left  = this.wasd.left.isDown  || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up    = this.wasd.up.isDown    || this.cursors.up.isDown;
    const down  = this.wasd.down.isDown  || this.cursors.down.isDown;

    let vx = 0, vy = 0;
    if (left)  vx -= this.speed;
    if (right) vx += this.speed;
    if (up)    vy -= this.speed;
    if (down)  vy += this.speed;

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    this.setVelocity(vx, vy);

    // Facing set by horizontal movement only
    if      (vx > 0) { this.facingRight = true;  this.setFlipX(false); }
    else if (vx < 0) { this.facingRight = false; this.setFlipX(true);  }

    // Animation
    if (vx !== 0 || vy !== 0) {
      this.play('player-run', true);
    } else {
      this.play('player-idle', true);
    }

    this._syncAttackZone();
  }
}
