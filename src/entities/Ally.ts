import * as Phaser from "phaser";
import Entity from "./Entity";
import { getMouseDirFromTarget } from "../utils/utils";

abstract class Ally extends Entity implements IAlly {
  declare textureKey: string;

  declare movement: IAllyMovement;

  declare health: IAllyHealth;
  declare attack: IAllyAttack;
  declare skills: IAllySkills;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
  }

  calculateAttackDir(): CardinalDir {
    return getMouseDirFromTarget(this);
  }

  tryDash(dir?: OctoDir): boolean {
    if (this.skills.dash.cooldownTimer !== 0 || this.isInEntityState("attack", "stunned", "dead", "dash")) return false;
    this.skills.dash.dir = dir;
    this.setEntityState("dash");
    return true;
  }
}

export default Ally;
