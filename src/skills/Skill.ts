export class Skill implements ISkill {
  protected _cooldown: number;
  protected _cooldownTimer: number;

  public get cooldown() : number {
    return this._cooldown;
  }

  public get cooldownTimer() : number {
    return this._cooldownTimer;
  }

  constructor(cooldown: number) {
    this._cooldown = cooldown;
    this._cooldownTimer = 0;
  }
}