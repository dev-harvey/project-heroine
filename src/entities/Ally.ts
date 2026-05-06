import * as Phaser from "phaser";
import Entity from "./Entity";
import { getMouseDirFromTarget, syncAttackZone } from "../utils/utils";

abstract class Ally extends Entity implements IAlly {
  declare textureKey: string;

  declare movement: IPlayerMovement;

  protected readonly maxTotalHealth: number = 9;
  protected readonly maxTotalDamage: number = 9;

  declare health: IPlayerHealth;
  setMaxHp(value: number) {
    this.health.max = Math.min(this.maxTotalHealth, value);
  }
  declare attack: IPlayerAttack;
  setAttackDamage(value: number): void {
    this.attack.damage = Math.min(this.maxTotalDamage, value);
  }

  declare skills: IPlayerSkills;
  anchor: IPlayerAnchor;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);

    this.killCount = 0;
  }

  tryAttack(): boolean {
    if (!super.tryAttack()) return false;
    
    this.attack.dir = getMouseDirFromTarget(this);
    
    if (!this.setEntityState("attack")) return false;
    this.emit("attack", this.attack.dir);

    return true;
  }

  tryDash(dir?: OctoDir): boolean {
    if (this.skills.dash.cooldownTimer !== 0 || this.isInEntityState("attack", "stunned", "dead", "dash")) return false;
    this.skills.dash.dir = dir;
    this.setEntityState("dash");
    return true;
  }
}

export default Ally;
