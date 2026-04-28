import Clone from "../entities/Clone";
import { getMouseDirFromTarget } from "../utils/utils";

export class Dash {
  private player: Phaser.Physics.Arcade.Sprite;
  private target: Phaser.Physics.Arcade.Sprite;
  private isReady: boolean = true;

  private duration: number;
  private distance: number;
  private _cooldown: number;
  private _cooldownTimer: number;

  public get isActive() : boolean {
    return !this.isReady;
  }

  public get cooldown() : number {
    return this._cooldown;
  }

  public get cooldownTimer() : number {
    return this._cooldownTimer;
  }

  constructor(player: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite, duration: number, distance: number, cooldown: number) {
    this.player = player
    this.target = target;
    this.duration = duration;
    this.distance = distance;
    this._cooldown = cooldown;
    this._cooldownTimer = 0;
  }

  public execute() {
    if (!this.isReady || this.cooldownTimer) return;
    this.isReady = false;
    const mouseDir = (this.target === this.player) ? getMouseDirFromTarget(this.target) : getMouseDirFromTarget(this.player);
    const moveDir = {
      x: 0,
      y: 0,
    };
    switch (mouseDir) {
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
    this.target.setVelocity(vx, vy);

    this.target.emit("dash", vx, vy);

    this._cooldownTimer = this._cooldown;

    // Flicker the player character to indicate invincibility/dash
    this.target.scene.tweens.add({
      targets: this.target,
      alpha: { from: 0, to: 1 },
      duration: this.duration,
      repeat: 0,
      ease: "easeOutQuad",
      onComplete: () => {
        this.target.setAlpha(1);
        this.isReady = true;
      },
    });
  }

  update(delta: number): void {
    this._cooldownTimer = Math.max(0, this.cooldownTimer - delta);
  }
}
