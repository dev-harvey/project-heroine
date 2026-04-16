import * as Phaser from 'phaser';

class Clone extends Phaser.Physics.Arcade.Sprite {
  // Stats
  _baseHp:  number;
  _baseAtk: number;
  _killCount: number;
  hp: number;

  // State
  _dead:         boolean;
  _isDashing:    boolean;
  isAttacking:   boolean;
  attackCooldown: number;
  facingRight:   boolean;
  attackDir:     AttackDir;
  hitEnemies:    Set<Phaser.GameObjects.GameObject>;

  anchorOffsetX: number;
  anchorOffsetY: number;
  _deadZoneR:    number;
  _driftSpeed:   number;
  _repositioning: boolean;

  attackZone: ZoneWithBody | null;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: CloneOptions = {}) {
    super(scene as any, x, y, 'player-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);
    this.setTint(0x76ff46);
    this.setAlpha(0);
    this.setScale(1.5);

    this.setBodySize(20, 40);
    this.setOffset(55, 25);
    (this.body as Phaser.Physics.Arcade.Body).setMass(10);

    // ── Stats
    this._baseHp   = Math.max(1, Math.floor((opts.playerMaxHp ?? 5) / 5) + (opts.bonusHp ?? 0));
    this._baseAtk  = Math.max(1, (opts.playerAtk ?? 1) * 2);
    this._killCount = 0;
    this.hp        = this._baseHp;

    // ── State
    this._dead         = false;
    this._isDashing    = false;
    this.isAttacking   = false;
    this.attackCooldown = 0;
    this.facingRight   = true;
    this.attackDir     = 'right';
    this.hitEnemies    = new Set();

    this.anchorOffsetX  = 0;
    this.anchorOffsetY  = -200;
    this._deadZoneR     = 4;
    this._driftSpeed    = 30;
    this._repositioning = false;

    // ── Attack zone
    this.attackZone = scene.add.zone(x, y, 60, 60) as unknown as ZoneWithBody;
    scene.physics.add.existing(this.attackZone);
    this.attackZone.body.setSize(60, 60);
    this.attackZone.body.enable = false;

    this.on('animationcomplete-player-attack', () => {
      this.isAttacking = false;
      if (this.attackZone) this.attackZone.body.enable = false;
      this.setAngle(0);
      this.setFlipX(!this.facingRight);
    });

    this.play('player-idle');
    scene.tweens.add({ targets: this, alpha: 0.9, duration: 350, ease: 'Power2' });

    try { (this as any).preFX.addGlow(0x76ff46, 1, 2); } catch (e) { /* canvas fallback */ }
  }

  // ─── Dynamic stats ──────────────────────────────────────────────────────────
  get killCount():    number { return this._killCount; }
  get maxHp():        number { return this._baseHp + Math.floor(this._killCount / 3); }
  get attackDamage(): number { return this._baseAtk + this._killCount; }
  get speed():        number { return (200 + Math.min(this._killCount * 3, 60)) * (this._repositioning ? 2 : 1); }

  startReposition(): void { this._repositioning = true; }

  onKill(): void {
    const oldMax = this.maxHp;
    this._killCount++;
    if (this.maxHp > oldMax) this.hp = Math.min(this.hp + 1, this.maxHp);
  }

  doDash(vx: number, vy: number): void {
    if (this._dead || !this.active) return;

    this._isDashing = true;
    this.setVelocity(vx, vy);

    const b      = this.body as Phaser.Physics.Arcade.Body;
    const nx     = vx / 500;
    const ny     = vy / 500;
    const bcx    = this.x - this.displayWidth  / 2 + b.offset.x * this.scaleX + b.halfWidth;
    const bcy    = this.y - this.displayHeight / 2 + b.offset.y * this.scaleY + b.halfHeight;
    const spawnX = bcx - nx * b.halfWidth;
    const spawnY = bcy - ny * b.halfHeight;

    const spark = this.scene.add.sprite(spawnX, spawnY, 'dash-spark')
      .setDepth(3).setOrigin(0.5, 0.5)
      .setRotation(Math.atan2(vy, vx))
      .setTint(0x76ff46);
    try { (spark as any).preFX.addGlow(0x76ff46, 1, 2); } catch (e) { /* canvas fallback */ }
    spark.play('dash-spark');
    spark.once('animationcomplete', () => { if (spark.active) spark.destroy(); });

    this.scene.tweens.add({ targets: spark, x: spawnX + nx * 60, y: spawnY + ny * 60, duration: 200, ease: 'Linear' });
    this.scene.tweens.add({
      targets: this, alpha: { from: 0, to: 0.9 }, duration: 100, repeat: 1,
      onComplete: () => { if (this.active) this.setAlpha(0.9); },
    });

    this.scene.time.delayedCall(200, () => { this._isDashing = false; });
  }

  doAttack(dir: AttackDir): void {
    if (this._dead || this.isAttacking || this.attackCooldown > 0) return;

    this.attackDir      = dir;
    this.isAttacking    = true;
    this.attackCooldown = 300;
    this.hitEnemies.clear();
    this.setVelocity(0, 0);

    if (['right', 'up-right', 'down-right'].includes(this.attackDir)) this.setFlipX(false);
    else if (['left', 'up-left', 'down-left'].includes(this.attackDir)) this.setFlipX(true);
    else this.setFlipX(!this.facingRight);
    this.play('player-attack', true);

    this.scene.time.delayedCall(50, () => {
      if (!this.active || this._dead || !this.attackZone) return;
      this._syncAttackZone();
      this.attackZone.body.enable = true;
      this._spawnSlash();
    });
    this.scene.time.delayedCall(150, () => { if (this.attackZone) this.attackZone.body.enable = false; });
  }

  private _spawnSlash(): void {
    const b   = this.body as Phaser.Physics.Arcade.Body;
    const bcx = b.x + b.width  / 2;
    const bcy = b.y + b.height / 2;
    const DIR_ANGLE: Record<AttackDir, number> = {
      right: 0, 'down-right': 45, down: 90, 'down-left': 135,
      left: 180, 'up-left': -135, up: -90, 'up-right': -45,
    };
    const angleDeg = DIR_ANGLE[this.attackDir] ?? 0;
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const REACH    = 40;
    const sx = bcx + Math.cos(angleRad) * REACH;
    const sy = bcy + Math.sin(angleRad) * REACH;

    const spr = this.scene.add.sprite(sx, sy, 'slash-upward')
      .setDepth(this.depth + 1).setAngle(angleDeg).setTint(0xcc88ff);
    spr.play('slash-upward');
    spr.once('animationcomplete', () => { if (spr.active) spr.destroy(); });
  }

  takeDamage(amount: number): void {
    if (this._dead || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);
    (this.scene as any).spawnDamageNumber?.(this.x, this.y - 16, amount, '#bb66ff');

    this.setTint(0xff4444);
    this.scene.tweens.addCounter({
      from: 0, to: 3, duration: 200,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        if (!this.active) return;
        const cycle = Math.floor((tween as any).getValue()) % 2;
        this.setTint(cycle === 0 ? 0xff4444 : 0xffffff);
      },
      onComplete: () => {
        if (this.active) { this.setTint(0x76ff46); this.setAlpha(0.9); }
      },
    });

    if (this.hp <= 0) {
      this._dead = true;
      this.setVelocity(0, 0);
      this.scene.time.delayedCall(50, () => this._onDeath());
    }
  }

  private _onDeath(): void {
    if (!this.active) return;

    (this.scene as any).onCloneDeath?.(this._killCount);

    const b   = this.body as Phaser.Physics.Arcade.Body;
    const bcx = this.x - this.displayWidth  / 2 + b.offset.x * this.scaleX + b.halfWidth;
    const bcy = this.y - this.displayHeight / 2 + b.offset.y * this.scaleY + b.halfHeight;
    const fx  = this.scene.add.sprite(bcx, bcy, 'enemy-death').setDepth(6).setTint(0x76ff46);
    fx.play('enemy-death-anim');
    fx.once('animationcomplete', () => { if (fx.active) fx.destroy(); });

    this.dismiss();
  }

  private _syncAttackZone(): void {
    if (!this.attackZone) return;
    const b   = this.body as Phaser.Physics.Arcade.Body;
    const bcx = b.x + b.width  / 2;
    const bcy = b.y + b.height / 2;
    this.attackZone.body.setSize(160, 160);
    this.attackZone.setPosition(bcx, bcy);
  }

  _inShovel(tx: number, ty: number): boolean {
    if (!this.body) return false;
    const NH = 15, FH = 30, FD = 50, CTRL = 70;
    const b  = this.body as Phaser.Physics.Arcade.Body;
    const R2 = 0.7071067811865476;
    const cx = b.x + b.width  / 2;
    const cy = b.y + b.height / 2;
    const DCONF: Record<AttackDir, DirConfig> = {
      right:        { fx:  1,  fy:  0,  ox: b.right, oy: cy       },
      left:         { fx: -1,  fy:  0,  ox: b.left,  oy: cy       },
      up:           { fx:  0,  fy: -1,  ox: cx,      oy: b.top    },
      down:         { fx:  0,  fy:  1,  ox: cx,      oy: b.bottom },
      'up-right':   { fx:  R2, fy: -R2, ox: b.right, oy: b.top    },
      'up-left':    { fx: -R2, fy: -R2, ox: b.left,  oy: b.top    },
      'down-right': { fx:  R2, fy:  R2, ox: b.right, oy: b.bottom },
      'down-left':  { fx: -R2, fy:  R2, ox: b.left,  oy: b.bottom },
    };
    const cfg = DCONF[this.attackDir];
    if (!cfg) return false;
    const { fx, fy, ox, oy } = cfg;
    const px = -fy, py = fx;
    const dx = tx - ox, dy = ty - oy;
    const lx = dx * fx + dy * fy;
    const ly = dx * px + dy * py;
    if (lx < 0) return false;
    if (lx <= FD) return Math.abs(ly) <= NH + (FH - NH) * (lx / FD);
    if (Math.abs(ly) > FH) return false;
    const t = (FH - ly) / (2 * FH);
    const lxCurve = FD * (1 - 2 * t + 2 * t * t) + 2 * t * (1 - t) * CTRL;
    return lx <= lxCurve;
  }

  dismiss(): void {
    if (!this.active) return;
    this.setActive(false).setVisible(false);
    if (this.attackZone) {
      this.attackZone.body.enable = false;
      this.attackZone.destroy();
      this.attackZone = null;
    }
    this.destroy();
  }

  update(_time: number, delta: number, player: ITarget): void {
    if (!this.active || this._dead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    if (this._isDashing)  { this._syncAttackZone(); return; }
    if (this.isAttacking) { this.setVelocity(0, 0); this._syncAttackZone(); return; }

    const targetX = player.x + this.anchorOffsetX;
    const targetY = player.y + this.anchorOffsetY;
    const dx      = targetX - this.x;
    const dy      = targetY - this.y;
    const dist    = Math.sqrt(dx * dx + dy * dy);

    const inDeadZone = dist <= this._deadZoneR;
    if (inDeadZone && this._repositioning) this._repositioning = false;

    if (!inDeadZone) {
      this.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
      this.play('player-run', true);
      if ((player as any).anims?.currentAnim?.key === 'player-run') this.anims.setProgress((player as any).anims.getProgress());
    } else if (dist > 0.5) {
      this.setVelocity((dx / dist) * this._driftSpeed, (dy / dist) * this._driftSpeed);
      this.play('player-run', true);
      if ((player as any).anims?.currentAnim?.key === 'player-run') this.anims.setProgress((player as any).anims.getProgress());
    } else {
      this.setVelocity(0, 0);
      this.play('player-idle', true);
      if ((player as any).anims?.currentAnim?.key === 'player-idle') this.anims.setProgress((player as any).anims.getProgress());
    }

    this.facingRight = (player as any).facingRight ?? this.facingRight;
    if (dist > 0.5) this.setFlipX(!this.facingRight);
    this._syncAttackZone();
  }
}

// Expose for legacy runtime while migration continues
(window as any).Clone = Clone;

export default Clone;
