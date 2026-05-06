import * as Phaser from "phaser";

import Entity from "./Entity";
import { angleToDir } from "../utils/utils";

export default abstract class Enemy extends Entity implements IEnemy {
  protected physics: Phaser.Physics.Arcade.ArcadePhysics;

  protected currentTarget: IAlly | null;
  protected targetPlayer: IPlayer | null;
  protected targetClone: IClone | null;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);

    this.entityType = "enemy";

    this.physics = scene.physics;

    this.currentTarget = null;
    this.targetPlayer = null;
    this.targetClone = null;
  }

  tryAttack(): boolean {
    if (!this.currentTarget) return;
    if (!super.tryAttack()) return false;

    this.attack.dir = angleToDir(Phaser.Math.Angle.Between(this.x, this.y, this.currentTarget.x, this.currentTarget.y));

    if (!this.setEntityState("attack")) return false;
    this.emit("attack", this.attack.dir);

    return true;
  }

  protected selectTarget(): IAlly {
    if (!this.targetClone?.active || this.targetClone.entityState === "dead") return this.targetPlayer;
    const dp = Phaser.Math.Distance.Between(this.x, this.y, this.targetPlayer.x, this.targetPlayer.y);
    const dc = Phaser.Math.Distance.Between(this.x, this.y, this.targetClone.x, this.targetClone.y);

    const target = dc < dp ? this.targetClone : this.targetPlayer;
    return target;
  }

  updateMovement(): void {
    if (!this.currentTarget) return;
    this.physics.moveToObject(this, this.currentTarget, this.movement.speed);
    this.updateFacingDir(this.currentTarget);
    super.updateMovement();
  }

  update(time: number, delta: number, player?: IPlayer, clone?: IClone | null): void {
    if (player !== undefined) this.targetPlayer = player;
    if (clone !== undefined) this.targetClone = clone;
    this.currentTarget = this.selectTarget();
    super.update(time, delta);

    const distanceToTargetEdge = Phaser.Math.Distance.Between(this.x, this.y, this.currentTarget.x, this.currentTarget.y) - this.currentTarget.body.halfWidth;
    if (distanceToTargetEdge < this.attack.range) {
      this.tryAttack();
    }
  }
}
