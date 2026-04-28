import * as Phaser from "phaser";
import Player from "./Player";

import { CLONE_CONFIG, PLAYER_CONFIG } from "../utils/constants";
import { Dash } from "../skills/Dash";
import AttackIndicator from "./AttackIndicator";
import { angleToDir, syncAttackZone } from "../utils/utils";

class Clone extends Phaser.Physics.Arcade.Sprite {
  // Stats
  baseHp: number;
  baseAtk: number;
  hp: number;
  speed: number;

  // State
  dead: boolean;

  targetPlayer: Player;
  private repositioning: boolean;

  isAttacking: boolean;
  attackCooldown: number;
  attackDir: OctoDir;
  attackIndicator: AttackIndicator;
  attackDetectionZone: Phaser.Physics.Arcade.Image;
  attackRange: number;
  hitEnemies: Set<Phaser.GameObjects.GameObject>;

  killCount: number;

  dash: Dash;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, opts: CloneOptions = {}) {
    super(scene as any, x, y, "player-idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.targetPlayer = player;

    this.setCollideWorldBounds(true);
    this.setDepth(CLONE_CONFIG.DEPTH);

    this.setBodySize(CLONE_CONFIG.BODY_SIZE.x, CLONE_CONFIG.BODY_SIZE.y, true);

    this.body.setMass(CLONE_CONFIG.MASS);

    this.setTint(CLONE_CONFIG.TINT);
    this.setBlendMode("OVERLAY");

    // ── Stats
    this.baseHp = CLONE_CONFIG.MAXHP;
    this.hp = this.baseHp;
    this.speed = CLONE_CONFIG.SPEED.BASE;

    this.killCount = 0;

    this.baseAtk = CLONE_CONFIG.ATTACK_DAMAGE;

    // ── State
    this.dead = false;
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackDir = "right";
    this.hitEnemies = new Set();

    this.dash = new Dash(this.targetPlayer, this, CLONE_CONFIG.DASH_DURATION, CLONE_CONFIG.DASH_DISTANCE, CLONE_CONFIG.DASH_COOLDOWN);

    this.repositioning = false;

    // ── Attack zone
    this.attackRange = CLONE_CONFIG.ATTACK_RANGE;
    this.attackDetectionZone = scene.physics.add.image(x, y, "");
    this.attackDetectionZone.body.enable = false;

    this.attackIndicator = new AttackIndicator(scene, this, CLONE_CONFIG.TINT);

    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (anim.key.startsWith("player-attack")) {
        if (frame.index === CLONE_CONFIG.ATTACK_FRAMES.START) {
          syncAttackZone(this);
          this.attackDetectionZone.body.enable = true;
        }
        if (frame.index === CLONE_CONFIG.ATTACK_FRAMES.END) {
          this.attackDetectionZone.body.enable = false;
          this.hitEnemies.clear();
        }
      }
    });

    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith("player-attack")) {
        this.isAttacking = false;
        (this.attackDetectionZone).body.enable = false;
      }
    });

    this.play("player-idle");
  }

  

  // ─── Dynamic stats ──────────────────────────────────────────────────────────
  get maxHp(): number {
    return Math.min(CLONE_CONFIG.MAXTOTAL_HP, this.baseHp + Math.floor(this.killCount / 3));
  }
  get attackDamage(): number {
    return Math.min(CLONE_CONFIG.MAXTOTAL_ATTACK_DAMAGE, this.baseAtk + Math.floor(this.killCount / 3));
  }

  startReposition(): void {
    this.repositioning = true;
  }

  onKill(): void {
    this.killCount++;
    if (this.hp < this.maxHp) this.hp = Math.min(this.hp + 1, this.maxHp);
  }

  doAttack(): void {
    if (this.dead || this.isAttacking || this.attackCooldown > 0) return;

    const ptr = this.scene.input.activePointer;

    this.repositioning = false;
    this.attackDir = angleToDir(Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY), "octo");
    this.isAttacking = true;
    this.attackCooldown = CLONE_CONFIG.ATTACK_COOLDOWN;
    this.hitEnemies.clear();
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
    if (this.dead || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);
    (this.scene as any).spawnDamageNumber?.(this.x, this.y - 16, amount, "#bb66ff");

    this.setTint(0xff4444);
    this.scene.tweens.addCounter({
      from: 0,
      to: 3,
      duration: 200,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        if (!this.active) return;
        const cycle = Math.floor((tween as any).getValue()) % 2;
        this.setTint(cycle === 0 ? 0xff4444 : 0xffffff);
      },
      onComplete: () => {
        if (this.active) {
          this.setTint(CLONE_CONFIG.TINT);
          this.setAlpha(1);
        }
      },
    });

    if (this.hp <= 0) {
      this.dead = true;
      this.setVelocity(0, 0);
      this.scene.time.delayedCall(50, () => this.onDeath());
    }
  }

  private onDeath(): void {
    if (!this.active) return;

    (this.scene as any).onCloneDeath?.(this.killCount);

    const b = this.body as Phaser.Physics.Arcade.Body;
    const bcx = this.x - this.displayWidth / 2 + b.offset.x * this.scaleX + b.halfWidth;
    const bcy = this.y - this.displayHeight / 2 + b.offset.y * this.scaleY + b.halfHeight;
    const fx = this.scene.add.sprite(bcx, bcy, "enemy-death").setDepth(6).setTint(CLONE_CONFIG.TINT);
    fx.play("enemy-death-anim");
    fx.once("animationcomplete", () => {
      if (fx.active) fx.destroy();
    });

    this.dismiss();
  }

  dismiss(): void {
    if (!this.active) return;
    
    if (this.attackDetectionZone) {
      this.attackDetectionZone.body.enable = false;
      this.attackDetectionZone.destroy();
    }
    if (this.attackIndicator) {
      this.attackIndicator.body.enable = false;
      this.attackIndicator.destroy();
    }
    this.destroy();
  }

  update(_time: number, delta: number): void {
    if (!this.active || this.dead) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dash.update(delta);

    if (this.isAttacking) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.dash.isActive) {
      return;
    }

    const cloneCenter = this.getCenter();
    const anchorPosition = this.targetPlayer.anchorPosition;
    const distance = Phaser.Math.Distance.Between(anchorPosition.x, anchorPosition.y, cloneCenter.x, cloneCenter.y);
    let speed = this.speed;

    // TODO: These speeds should be in constants
    if (distance < 2) {
      this.repositioning = false;
      speed = 0;
    } else if (distance < 10) {
      this.repositioning = false;
      speed = CLONE_CONFIG.SPEED.DEADZONE;
    } else if (this.repositioning) {
      speed = CLONE_CONFIG.SPEED.REPOSITIONING;
    }

    this.scene.physics.moveToObject(this, anchorPosition, speed);

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
  }
}

export default Clone;
