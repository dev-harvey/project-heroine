import * as Phaser from "phaser";
import { angleToDir } from "../utils/utils";

abstract class Entity extends Phaser.Physics.Arcade.Sprite implements IEntity {
  protected gameScene: IEntityGameScene;
  movement: IEntityMovement;
  health: IEntityHealth;
  attack: IEntityAttack;

  abstract animKey: string;

  private _entityState: EntityState = "idle";
  get entityState() {
    return this._entityState;
  }
  protected setEntityState(next: EntityState): void {
    if (this.entityState === next) return;
    this._entityState = next;
    switch (next) {
      case "idle":
        this.play(`${this.animKey}-idle`, true);
        break;
      case "walk":
        this.play(`${this.animKey}-walk-${this.movement.facingDir}`, true);
        break;
      case "hurt":
        this.play(`${this.animKey}-hurt-${this.movement.facingDir}`);
        this.setVelocity(0, 0);
        break;
      case "attack":
        this.play(`${this.animKey}-attack-${this.attack.dir}`);
        break;
      case "stunned":
        this.play(`${this.animKey}-idle`, true);
        this.setVelocity(0, 0);
        break;
      case "dead":
        this.play(`${this.animKey}-death`);
        break;
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this.gameScene = scene as IEntityGameScene;

    this.movement = {
      speed: 100,
      facingDir: "left",
    };
    this.health = {
      current: 1,
      max: 2,
    };
    this.attack = {
      damage: 1,
      range: 50,
      cooldown: 0,
      cooldownMax: 50,
      detectionZone: scene.physics.add.image(x, y, ""),
      dir: "left",
    };
    this.attack.detectionZone.body.enable = false;
  }

  /* Protected Methods */

  protected updateMovementState() {
    if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
      this.play(`${this.animKey}-walk-${this.movement.facingDir}`, true);
      this.setEntityState("walk");
    } else {
      this.play(`${this.animKey}-idle`, true);
      this.setEntityState("idle");
    }
  }

  protected updateFacingDir(target: XYPosition): void;
  protected updateFacingDir(vx: number, vy: number): void;
  protected updateFacingDir(targetOrVx: XYPosition | number, vy?: number): void {
    if (typeof targetOrVx === "number") {
      if (targetOrVx === 0 && vy === 0) return;
      this.movement.facingDir = angleToDir(Math.atan2(vy!, targetOrVx));
    } else {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, targetOrVx.x, targetOrVx.y);
      this.movement.facingDir = angleToDir(angle);
    }
  }

  updateMovement(): void {
    this.updateMovementState();
  }

  /* Public Methods */

  takeDamage(amount: number): void {
    if (this.entityState === "dead") return;
    this.setEntityState("hurt");
    this.health.current -= amount;

    this.scene.time.delayedCall(100, () => {
      if (this.active) this.setEntityState("idle");
    });
    if (this.health.current <= 0) this.die();
  }

  die(): void {}

  update(time: number, delta: number): void {
    if (this.entityState === "dead") return;
    this.attack.cooldown = Math.max(0, this.attack.cooldown - delta);
    if (this.entityState === "attack" || this.entityState === "stunned") return;
    this.updateMovement();
  }
}

export default Entity;
