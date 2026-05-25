import * as Phaser from "phaser";
import Player from "./Player";

import { CLONE_CONFIG, DEPTH } from "../utils/constants";
import { Dash } from "../skills/Dash";
import AttackIndicator from "../indicators/AttackIndicator";
import Ally from "./Ally";
import { eventBus, GameEvents } from "../systems/EventBus";

export default class Clone extends Ally implements IClone {
  declare textureKey: string;

  targetPlayer: Player;

  declare attack: ICloneAttack;
  declare movement: ICloneMovement;
  declare health: ICloneHealth;

  private onEntityAttackHandler = (payload: GameEvents["entity:attack"]) => this.onEntityAttack(payload.entity);
  private onEntityDashHandler = (payload: GameEvents["entity:dash"]) => this.onEntityDash(payload.entity, payload.direction);

  protected onDeath() {
    this.attack.attackIndicator.destroy();
    super.onDeath();
  }

  private physics: Phaser.Physics.Arcade.ArcadePhysics;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, player: Player) {
    super(scene, x, y, textureKey);

    this.physics = scene.physics;

    this.targetPlayer = player;
    this.id = "clone";
    this.entityType = "clone";

    this.setDepth(DEPTH.ACTORS + y);
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
      frames: {
        start: CLONE_CONFIG.ATTACK_FRAMES.START,
        end: CLONE_CONFIG.ATTACK_FRAMES.END,
      },
    };

    this.skills = {
      dash: new Dash(this, CLONE_CONFIG.DASH_DURATION, CLONE_CONFIG.DASH_DISTANCE, CLONE_CONFIG.DASH_COOLDOWN),
    };

    this.setEntityState("reposition");

    eventBus.on("entity:attack", this.onEntityAttackHandler);
    eventBus.on("entity:dash", this.onEntityDashHandler);

    this.on(Phaser.GameObjects.Events.DESTROY, () => {
      eventBus.off("entity:attack", this.onEntityAttackHandler);
      eventBus.off("entity:dash", this.onEntityDashHandler);
    });
  }

  updateMovement(): void {
    if (this.isInEntityState("attack", "stunned", "dash", "dead")) return;

    const cloneCenter = this.getCenter();
    const anchorPosition = this.targetPlayer.anchor.position;
    const distance = Phaser.Math.Distance.Between(anchorPosition.x, anchorPosition.y, cloneCenter.x, cloneCenter.y);
    let speed = this.movement.speed;

    if (distance < 3) {
      this.setVelocity(0, 0);
      this.setEntityState("idle");
      return;
    }

    const maxSpeed = this.entityState === "reposition" ? CLONE_CONFIG.SPEED.REPOSITIONING : CLONE_CONFIG.SPEED.BASE * 3;
    speed = Math.min(distance * 10, maxSpeed);

    this.physics.moveToObject(this, anchorPosition, speed);
    this.updateFacingDir(anchorPosition);

    super.updateMovement();
  }

  onEntityAttack(entity: IEntity) {
    if (entity === this.targetPlayer) {
      this.tryAttack();
    }
  }

  onEntityDash(entity: IEntity, direction: OctoDir) {
    if (entity === this.targetPlayer && direction) {
      this.tryDash(direction);
    }
  }

  registerKill() {
    this.targetPlayer.killCount++;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
  }
}
