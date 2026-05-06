import { Skill } from "./Skill";
import { getMouseDirFromTarget } from "../utils/utils";

export class Dash extends Skill implements IDash {
  protected player: IPlayer;
  protected target: IEntity;

  private duration: number;
  private distance: number;
  private dir: OctoDir;

  constructor(target: IEntity, duration: number, distance: number, cooldown: number) {
    super(cooldown);
    this.target = target;
    this.duration = duration;
    this.distance = distance;
  }

  public execute(dir?: OctoDir): void {
    if (this.cooldownTimer) return;
    const dashDir = this.dir ?? getMouseDirFromTarget(this.target, "octo");
    const moveDir = {
      x: 0,
      y: 0,
    };
    switch (dashDir) {
      case "up":
        moveDir.x = 0;
        moveDir.y = -1;
        break;
      case "down":
        moveDir.x = 0;
        moveDir.y = 1;
        break;
      case "left":
        moveDir.x = -1;
        moveDir.y = 0;
        break;
      case "right":
        moveDir.x = 1;
        moveDir.y = 0;
        break;
      case "up-left":
        moveDir.x = -1;
        moveDir.y = -1;
        break;
      case "up-right":
        moveDir.x = 1;
        moveDir.y = -1;
        break;
      case "down-left":
        moveDir.x = -1;
        moveDir.y = 1;
        break;
      case "down-right":
        moveDir.x = 1;
        moveDir.y = 1;
        break;
      default:
        moveDir.x = 0;
        moveDir.y = 1;
        break;
    }
    /* 
      Ensure octo dashes aren't faster than cardinal ones.
      Calculate the length of the vector and divide by it to get a "Unit Vector".
    */
    const vectorLength = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y) || 1;
    const dashSpeed = this.distance / (this.duration / 1000);
    const vx = (moveDir.x / vectorLength) * dashSpeed;
    const vy = (moveDir.y / vectorLength) * dashSpeed;
    this.target.body.setVelocity(vx, vy);

    this.target.emit("dash", vx, vy, dashDir);

    this._cooldownTimer = this._cooldown;

    this.target.scene.time.delayedCall(this.duration, () => {
      this.target.setEntityState("idle");
      this.dir = undefined;
    });
    
    
    
  }

  update(delta: number): void {
    this._cooldownTimer = Math.max(0, this.cooldownTimer - delta);
  }
}
