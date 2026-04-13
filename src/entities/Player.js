class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(5);

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

    // Physics body centred inside the 128×64 frame
    this.setBodySize(40, 44);
    this.setOffset(44, 10);

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

    // Attack zone (physics-enabled, invisible)
    this.attackZone = scene.add.zone(x, y, 72, 52);
    scene.physics.add.existing(this.attackZone);
    this.attackZone.body.setSize(72, 52);
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
    this.play('player-attack', true);

    // Flip sprite to match attack direction (no rotation for up/down)
    switch (this.attackDir) {
      case 'right': this.setAngle(0); this.setFlipX(false); break;
      case 'left':  this.setAngle(0); this.setFlipX(true);  break;
      case 'up':
      case 'down':
        this.setAngle(0);
        this.setFlipX(!this.facingRight);
        break;
    }

    // Open hitbox during active frames (80–280 ms)
    this.scene.time.delayedCall(80, () => {
      this._syncAttackZone();
      this.attackZone.body.enable = true;
    });
    this.scene.time.delayedCall(280, () => {
      this.attackZone.body.enable = false;
    });
  }

  takeDamage(amount) {
    if (this.isInvincible || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;

    // Floating damage number
    if (this.scene.spawnDamageNumber) {
      this.scene.spawnDamageNumber(this.x, this.y - 16, amount, '#ff4455');
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
    const REACH = 54;
    switch (this.attackDir) {
      case 'right':
        this.attackZone.body.setSize(72, 52);
        this.attackZone.setPosition(this.x + REACH, this.y);
        break;
      case 'left':
        this.attackZone.body.setSize(72, 52);
        this.attackZone.setPosition(this.x - REACH, this.y);
        break;
      case 'up':
        this.attackZone.body.setSize(52, 72);
        this.attackZone.setPosition(this.x, this.y - REACH);
        break;
      case 'down':
        this.attackZone.body.setSize(52, 72);
        this.attackZone.setPosition(this.x, this.y + REACH);
        break;
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this.hp <= 0) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

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
