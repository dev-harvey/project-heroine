import * as Phaser from "phaser";

import { PLAYER_CONFIG as playerConfig } from "../utils/Constants";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  maxHp: number;
  hp: number;
  speed: number;
  attackDamage: number;

  isAttacking: boolean;
  attackCooldown: number;
  attackCooldownMax: number;
  isInvincible: boolean;
  attackDir: AttackDir;
  hitEnemies: Set<Phaser.GameObjects.GameObject>;

  isDashing: boolean;
  dashCooldown: number;
  dashCooldownMax: number;

  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: WasdKeys;
  _shiftKey: Phaser.Input.Keyboard.Key;

  attackDetectionZone: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene as any, x, y, "player-idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(playerConfig.DEPTH);

    this.setBodySize(playerConfig.BODY_SIZE.x, playerConfig.BODY_SIZE.y, true);

    this.body.setMass(playerConfig.MASS);

    this.maxHp = playerConfig.MAXHP;
    this.hp = this.maxHp;
    this.speed = playerConfig.SPEED;

    this.attackDamage = playerConfig.ATTACK_DAMAGE;
    this.attackCooldown = 0;
    this.attackCooldownMax = playerConfig.ATTACK_COOLDOWN;

    this.isAttacking = false;
    this.attackDir = "right";

    this.attackDetectionZone = scene.physics.add.sprite(x, y, "");
    this.attackDetectionZone.body.enable = false;

    this.isDashing = false;

    this.dashCooldown = 0;
    this.dashCooldownMax = playerConfig.DASH_COOLDOWN;

    this.isInvincible = false;
    this.hitEnemies = new Set();

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as WasdKeys;

    scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (ptr.leftButtonDown()) this.doAttack();
    });

    this._shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this._shiftKey.on("down", () => {
      if (this.active) this._doDash();
    });

    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (anim.key.startsWith("player-attack")) {
        if (frame.index === 4) {
          this._syncAttackZone();
          this.attackDetectionZone.body.enable = true;
        }
        if (frame.index === 7) {
          this.attackDetectionZone.body.enable = false;
          this.hitEnemies.clear();
        }
      }
    });

    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith("player-attack")) {
        this.isAttacking = false;
        this.attackDetectionZone.body.enable = false;
      }
    });

    this.play("player-idle");
  }

  doAttack(): void {
    if (this.isAttacking || this.attackCooldown > 0) return;

    this.attackDir = this._mouseToDir();
    this.isAttacking = true;
    this.attackCooldown = playerConfig.ATTACK_COOLDOWN;
    this.hitEnemies.clear(); /* <- Gemini do I need this? */
    this.emit("attack", this.attackDir);
    this.setVelocity(0, 0);

    if (["up", "up-right", "up-left"].includes(this.attackDir)) {
      this.play("player-attack-up", true);
    } else if (["down", "down-right", "down-left"].includes(this.attackDir)) {
      this.play("player-attack-down", true);
    } else if (["left"].includes(this.attackDir)) {
      this.play("player-attack-left", true);
    } else {
      this.play("player-attack-right", true);
    }
  }

  takeDamage(amount: number): void {
    if (this.isInvincible || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;

    (this.scene as any).spawnDamageNumber?.(this.x, this.y - 16, amount, "#ff2222", 26);

    this.setTint(0xff4444);
    this.scene.tweens.addCounter({
      from: 0,
      to: 3,
      duration: 200,
      repeat: 0,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const cycle = Math.floor((tween as any).getValue()) % 2;
        this.setTint(cycle === 0 ? 0xff4444 : 0xffffff);
      },
      onComplete: () => {
        this.clearTint();
        this.setAlpha(1);
        this.isInvincible = false;
      },
    });

    if (this.hp <= 0) {
      this.scene.time.delayedCall(100, () => (this.scene as any).onPlayerDeath?.());
    }
  }

  _doDash(): void {
    if (this.isDashing || this.dashCooldown > 0 || this.isAttacking) return;

    let vx = 0,
      vy = 0;
    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    vx = (vx / len) * 500;
    vy = (vy / len) * 500;

    this.isDashing = true;
    this.isInvincible = true;
    this.dashCooldown = this.dashCooldownMax;
    this.setVelocity(vx, vy);

    this.emit("dash", vx, vy);

    const b = this.body as Phaser.Physics.Arcade.Body;
    const nx = vx / 500;
    const ny = vy / 500;
    const bcx = b.x + b.width / 2;
    const bcy = b.y + b.height / 2;
    const spawnX = bcx - nx * (b.width / 2);
    const spawnY = bcy - ny * (b.height / 2);

    const spark = this.scene.add.sprite(spawnX, spawnY, "dash-spark").setDepth(4).setOrigin(0.5, 0.5).setRotation(Math.atan2(vy, vx));
    spark.play("dash-spark");
    spark.once("animationcomplete", () => {
      if (spark.active) spark.destroy();
    });

    this.scene.tweens.add({ targets: spark, x: spawnX + nx * 60, y: spawnY + ny * 60, duration: 200, ease: "Linear" });
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0, to: 1 },
      duration: 100,
      repeat: 1,
      onComplete: () => {
        if (this.active) this.setAlpha(1);
      },
    });

    this.scene.time.delayedCall(200, () => {
      if (!this.active) return;
      this.isDashing = false;
      this.isInvincible = false;
    });
  }

  _mouseToDir(): AttackDir {
    const ptr = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY);
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -22.5 && deg < 22.5) return "right";
    if (deg >= 22.5 && deg < 67.5) return "down-right";
    if (deg >= 67.5 && deg < 112.5) return "down";
    if (deg >= 112.5 && deg < 157.5) return "down-left";
    if (deg >= -67.5 && deg < -22.5) return "up-right";
    if (deg >= -112.5 && deg < -67.5) return "up";
    if (deg >= -157.5 && deg < -112.5) return "up-left";
    return "left";
  }

  _syncAttackZone(): void {
    const b = this.body as Phaser.Physics.Arcade.Body;
    const bcx = b.x + b.width / 2;
    const bcy = b.y + b.height / 2;
    this.attackDetectionZone.body.setSize(playerConfig.ATTACK_DETECTION_ZONE.w, playerConfig.ATTACK_DETECTION_ZONE.h);
    this.attackDetectionZone.setPosition(bcx, bcy);
  }

  _inAttackZone(tx: number, ty: number): boolean {
    const b = this.body as Phaser.Physics.Arcade.Body;
    if (!b) return false;
    const NH = 15,
      FH = 30,
      FD = 50,
      CTRL = 70;
    const R2 = 0.7071067811865476;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const DCONF: Record<AttackDir, DirConfig> = {
      right: { fx: 1, fy: 0, ox: b.right, oy: cy },
      left: { fx: -1, fy: 0, ox: b.left, oy: cy },
      up: { fx: 0, fy: -1, ox: cx, oy: b.top },
      down: { fx: 0, fy: 1, ox: cx, oy: b.bottom },
      "up-right": { fx: R2, fy: -R2, ox: b.right, oy: b.top },
      "up-left": { fx: -R2, fy: -R2, ox: b.left, oy: b.top },
      "down-right": { fx: R2, fy: R2, ox: b.right, oy: b.bottom },
      "down-left": { fx: -R2, fy: R2, ox: b.left, oy: b.bottom },
    };
    const cfg = DCONF[this.attackDir];
    if (!cfg) return false;
    const { fx, fy, ox, oy } = cfg;
    const px = -fy,
      py = fx;
    const dx = tx - ox,
      dy = ty - oy;
    const lx = dx * fx + dy * fy;
    const ly = dx * px + dy * py;
    if (lx < 0) return false;
    if (lx <= FD) return Math.abs(ly) <= NH + (FH - NH) * (lx / FD);
    if (Math.abs(ly) > FH) return false;
    const t = (FH - ly) / (2 * FH);
    const lxCurve = FD * (1 - 2 * t + 2 * t * t) + 2 * t * (1 - t) * CTRL;
    return lx <= lxCurve;
  }

  update(_time: number, delta: number): void {
    if (this.hp <= 0) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);

    if (this.isDashing) {
      this._syncAttackZone();
      return;
    }
    if (this.isAttacking) {
      this.setVelocity(0, 0);
      this._syncAttackZone();
      return;
    }

    /* Two can be pressed at once which is why this isn't enabled. Probably in the long run should rewrite for a getPressedMovementButtons function */
    // const inputDirection = (this.wasd.left.isDown || this.cursors.left.isDown) ? 'left' : (this.wasd.right.isDown || this.cursors.right.isDown) ? 'right' : (this.wasd.up.isDown || this.cursors.up.isDown) ? 'up' : (this.wasd.down.isDown || this.cursors.down.isDown) ? 'down' : 'idle';

    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;

    const velocity = new Phaser.Math.Vector2(0, 0);

    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;

    velocity.normalize().scale(this.speed);

    /* Can investigate setAcceleration if  I want smoother movement. */
    this.setVelocity(velocity.x, velocity.y);

    let direction = "idle";
    const body = this.body;

    if (body.velocity.length() > 0) {
      if (Math.abs(body.velocity.x) > Math.abs(body.velocity.y)) {
        // Horizontal movement is dominant
        direction = body.velocity.x > 0 ? "right" : "left";
      } else {
        // Vertical movement is dominant
        direction = body.velocity.y > 0 ? "down" : "up";
      }
    }

    if ((body.velocity.x !== 0 || body.velocity.y !== 0) && direction !== "idle") {
      this.play(`player-run-${direction}`, true);
    } else {
      this.play("player-idle", true);
    }

    this._syncAttackZone();
  }
}

(window as any).Player = Player;
