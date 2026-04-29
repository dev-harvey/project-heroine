import * as Phaser from "phaser";
import Player from "./Player";
import Entity from "./Entity";

import { CLONE_CONFIG } from "../utils/constants";
import { Dash } from "../skills/Dash";
import AttackIndicator from "./AttackIndicator";
import { angleToDir, syncAttackZone } from "../utils/utils";

class Clone extends Entity implements IClone {
  declare gameScene: ICloneGameScene;

  animKey: string;

  killCount: number;

  dash: Dash;

  targetPlayer: Player;
  private repositioning: boolean;

  declare attack: ICloneAttack;
  declare movement: ICloneMovement;
  declare health: ICloneHealth;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, "player-idle");

    this.animKey = "player";
    this.targetPlayer = player;

    this.setDepth(CLONE_CONFIG.DEPTH);
    this.setBodySize(CLONE_CONFIG.BODY_SIZE.x, CLONE_CONFIG.BODY_SIZE.y, true);
    this.body.setMass(CLONE_CONFIG.MASS);
    this.setTint(CLONE_CONFIG.TINT);
    this.setBlendMode("OVERLAY");

    this.killCount = 0;

    this.movement = { speed: CLONE_CONFIG.SPEED.BASE, facingDir: "right" };

    this.health = {
      current: CLONE_CONFIG.MAXHP,
      max: CLONE_CONFIG.MAXHP,
    };

    this.dash = new Dash(this.targetPlayer, this, CLONE_CONFIG.DASH_DURATION, CLONE_CONFIG.DASH_DISTANCE, CLONE_CONFIG.DASH_COOLDOWN);

    this.attack = {
      ...this.attack,
      damage: CLONE_CONFIG.ATTACK_DAMAGE,
      cooldownMax: CLONE_CONFIG.ATTACK_COOLDOWN,
      dir: "right",
      range: CLONE_CONFIG.ATTACK_RANGE,
      attackIndicator: new AttackIndicator(scene, this, CLONE_CONFIG.TINT),
      hitEnemies: new Set(),
    };

    this.repositioning = false;

    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (anim.key.startsWith("player-attack")) {
        if (frame.index === CLONE_CONFIG.ATTACK_FRAMES.START) {
          syncAttackZone(this);
          this.attack.detectionZone.body.enable = true;
        }
        if (frame.index === CLONE_CONFIG.ATTACK_FRAMES.END) {
          this.attack.detectionZone.body.enable = false;
          this.attack.hitEnemies.clear();
        }
      }
    });

    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith("player-attack")) {
        this.attack.detectionZone.body.enable = false;
        this.setEntityState("idle");
      }
    });

    this.play("player-idle");
  }

  startReposition(): void {
    this.repositioning = true;
  }

  onKill(): void {
    this.killCount++;
    this.health.max = Math.min(CLONE_CONFIG.MAXTOTAL_HP, CLONE_CONFIG.MAXHP + Math.floor(this.killCount / 3));
    this.attack.damage = Math.min(CLONE_CONFIG.MAXTOTAL_ATTACK_DAMAGE, CLONE_CONFIG.ATTACK_DAMAGE + Math.floor(this.killCount / 3));
    if (this.health.current < this.health.max) {
      this.health.current = Math.min(this.health.current + 1, this.health.max);
    }
  }

  setAttackDamage(value: number): void {
    this.attack.damage = Math.min(CLONE_CONFIG.MAXTOTAL_ATTACK_DAMAGE, value);
  }

  doAttack(): void {
    if (this.entityState === "dead" || this.entityState === "attack" || this.attack.cooldown > 0) return;

    const ptr = this.gameScene.input.activePointer;

    this.repositioning = false;
    this.attack.dir = angleToDir(Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY), "octo");
    this.setEntityState("attack");
    this.attack.cooldown = this.attack.cooldownMax;
    this.attack.hitEnemies.clear();
    this.setVelocity(0, 0);

    if (["up", "up-right", "up-left"].includes(this.attack.dir)) {
      this.play("player-attack-up", true);
    } else if (["down", "down-right", "down-left"].includes(this.attack.dir)) {
      this.play("player-attack-down", true);
    } else if (["left"].includes(this.attack.dir)) {
      this.play("player-attack-left", true);
    } else {
      this.play("player-attack-right", true);
    }
  }

  takeDamage(amount: number): void {
    if (this.entityState === "dead" || this.health.current <= 0) return;

    this.health.current = Math.max(0, this.health.current - amount);
    this.gameScene.spawnDamageNumber?.(this.x, this.y - 16, amount, "#bb66ff");

    this.setTint(0xff4444);
    this.gameScene.tweens.addCounter({
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

    if (this.health.current <= 0) {
      this.setEntityState("dead");
      this.setVelocity(0, 0);
      this.gameScene.time.delayedCall(50, () => this.onDeath());
    }
  }

  private onDeath(): void {
    if (!this.active) return;

    this.gameScene.onCloneDeath(this.killCount, "fell");

    const b = this.body as Phaser.Physics.Arcade.Body;
    const bcx = this.x - this.displayWidth / 2 + b.offset.x * this.scaleX + b.halfWidth;
    const bcy = this.y - this.displayHeight / 2 + b.offset.y * this.scaleY + b.halfHeight;
    const fx = this.gameScene.add.sprite(bcx, bcy, "enemy-death").setDepth(6).setTint(CLONE_CONFIG.TINT);
    fx.play("enemy-death-anim");
    fx.once("animationcomplete", () => {
      if (fx.active) fx.destroy();
    });

    this.dismiss();
  }

  dismiss(): void {
    if (!this.active) return;

    this.attack.detectionZone.body.enable = false;
    this.attack.detectionZone.destroy();
    this.attack.attackIndicator.body.enable = false;
    this.attack.attackIndicator.destroy();
    this.destroy();
  }

  updateMovement() {
    const cloneCenter = this.getCenter();
    const anchorPosition = this.targetPlayer.anchor.position;
    const distance = Phaser.Math.Distance.Between(anchorPosition.x, anchorPosition.y, cloneCenter.x, cloneCenter.y);
    let speed = this.movement.speed;

    if (distance < 2) {
      this.repositioning = false;
      speed = 0;
    } else if (distance < 10) {
      this.repositioning = false;
      speed = CLONE_CONFIG.SPEED.DEADZONE;
    } else if (this.repositioning) {
      speed = CLONE_CONFIG.SPEED.REPOSITIONING;
    }

    this.gameScene.physics.moveToObject(this, anchorPosition, speed);
    this.updateFacingDir(anchorPosition);
    this.updateMovementState();
  }

  update(time: number, delta: number): void {
    this.dash.update(delta);
    super.update(time, delta);
  }
}

export default Clone;
