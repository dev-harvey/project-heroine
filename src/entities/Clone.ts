import * as Phaser from "phaser";
import Player from "./Player";

import { CLONE_CONFIG } from "../utils/constants";
import { Dash } from "../skills/Dash";
import AttackIndicator from "./AttackIndicator";
import Ally from "./Ally";

export default class Clone extends Ally implements IClone {
  declare gameScene: ICloneGameScene;

  declare textureKey: string;

  targetPlayer: Player;

  protected readonly maxTotalHealth: number = CLONE_CONFIG.MAXTOTAL_HEALTH;
  protected readonly maxTotalDamage: number = CLONE_CONFIG.MAXTOTAL_ATTACK_DAMAGE;

  declare attack: ICloneAttack;
  declare movement: ICloneMovement;
  declare health: ICloneHealth;

  protected onDeath() {
    this.attack.detectionZone.destroy();
    this.attack.attackIndicator.destroy();
    super.onDeath();
  }

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, player: Player) {
    super(scene, x, y, textureKey);

    this.targetPlayer = player;
    this.id = "clone";
    this.entityType = "clone";

    this.setDepth(CLONE_CONFIG.DEPTH);
    this.setBodySize(CLONE_CONFIG.BODY_SIZE.x, CLONE_CONFIG.BODY_SIZE.y, true);
    this.body.setMass(CLONE_CONFIG.MASS);
    this.setCollideWorldBounds(true);

    this.setTint(CLONE_CONFIG.TINT);
    this.setBlendMode("OVERLAY");

    this.movement = {
      speed: CLONE_CONFIG.SPEED.BASE,
      facingDir: "right",
    };

    this.health = {
      current: CLONE_CONFIG.MAXHP,
      max: CLONE_CONFIG.MAXHP,
    };

    this.attack = {
      ...this.attack,
      damage: CLONE_CONFIG.ATTACK_DAMAGE,
      cooldownMax: CLONE_CONFIG.ATTACK_COOLDOWN,
      dir: "right",
      range: CLONE_CONFIG.ATTACK_RANGE,
      attackIndicator: new AttackIndicator(scene, this, CLONE_CONFIG.TINT),
      hitEnemies: new Set(),
    };

    this.skills = {
      dash: new Dash(this, CLONE_CONFIG.DASH_DURATION, CLONE_CONFIG.DASH_DISTANCE, CLONE_CONFIG.DASH_COOLDOWN),
    };

    this.setEntityState("reposition");
  }

  updateMovement(): void {
    if (this.isInEntityState("attack", "stunned", "dash", "dead")) return;

    const cloneCenter = this.getCenter();
    const anchorPosition = this.targetPlayer.anchor.position;
    const distance = Phaser.Math.Distance.Between(anchorPosition.x, anchorPosition.y, cloneCenter.x, cloneCenter.y);
    let speed = this.movement.speed;

    if (distance < 2) {
      this.setEntityState('idle');
      speed = 0;
    } else if (distance < 10) {
      this.setEntityState('idle');
      speed = CLONE_CONFIG.SPEED.DEADZONE;
    } else if (this.entityState === "reposition") {
      speed = CLONE_CONFIG.SPEED.REPOSITIONING;
    }

    this.gameScene.physics.moveToObject(this, anchorPosition, speed);
    this.updateFacingDir(anchorPosition);
    this.updateMovementState();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
