import Clone from "../entities/Clone";
import { getMouseDirectionFromTarget } from "../utils/utils";

export class Dash {
  private _player: Phaser.Physics.Arcade.Sprite;
  private _target: Phaser.Physics.Arcade.Sprite;
  private _isReady: boolean = true;

  private _duration: number;
  private _distance: number;
  private _cooldown: number;
  private _cooldownTimer: number;

  public get isActive() : boolean {
    return !this._isReady;
  }
  
  public get cooldown() : number {
    return this._cooldown;
  }
  
  public get cooldownTimer() : number {
    return this._cooldownTimer;
  }

  constructor(player: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite, duration: number, distance: number, cooldown: number) {
    this._player = player
    this._target = target;
    this._duration = duration;
    this._distance = distance;
    this._cooldown = cooldown;
    this._cooldownTimer = 0;
  }

  public execute() {
    if (!this._isReady || this.cooldownTimer) return;
    this._isReady = false;
    // TODO: the clone insteance shouldn't also get the mouse direction, it could just use the players if we save it somewhere or something
    const mouseDir = (this._target === this._player) ? getMouseDirectionFromTarget(this._target) : getMouseDirectionFromTarget(this._player);
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
    const dashSpeed = this._distance / (this._duration / 1000);
    const vx = (moveDir.x / vectorLength) * dashSpeed;
    const vy = (moveDir.y / vectorLength) * dashSpeed;
    this._target.setVelocity(vx, vy);

    this._target.emit("dash", vx, vy);

    // Flicker the player character to indicate invincibility/dash
    this._target.scene.tweens.add({
      targets: this,
      alpha: { from: 0, to: 1 },
      duration: this._duration,
      repeat: 0,
      ease: "easeOutQuad",
      onComplete: () => {
        this._target.setAlpha(1);
        this._cooldownTimer = this._cooldown;
        this._isReady = true;
      },
    });
  }

  update(delta: number): void {
    this._cooldownTimer = Math.max(0, this.cooldownTimer - delta);
  }
}
