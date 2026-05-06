import * as Phaser from "phaser";
import { angleToDir, syncAttackZone } from "../utils/utils";

abstract class Entity extends Phaser.Physics.Arcade.Sprite implements IEntity {
  id: string;
  entityType: string;
  movement: IEntityMovement;
  health: IEntityHealth;
  attack: IEntityAttack;
  skills: IEntitySkills;

  killCount: number;

  protected textureKey: string;

  protected _entityState: EntityState = "idle";
  get entityState() {
    return this._entityState;
  }
  setEntityState(next: EntityState): boolean {
    if (this.entityState === next) return false;
    switch (next) {
      case "idle":
        if (this.isInEntityState("dead")) return false;
        break;
      case "walk":
        if (this.isInEntityState("dead", "stunned", "attack", "dash", "reposition")) return false;
        break;
      case "reposition":
        if (this.isInEntityState("dead", "stunned", "attack", "dash")) return false;
        break;
      case "attack":
        if (this.isInEntityState("dead", "stunned", "attack")) return false;
        break;
      case "dash":
        if (this.isInEntityState("dead", "stunned", "attack", "dash")) return false;
        break;
      case "hurt":
        if (this.isInEntityState("dead", "hurt", "dash")) return false;
        break;
      case "stunned":
        if (this.isInEntityState("dead")) return false;
        break;
      case "dead":
        break;
    }
    this._entityState = next;
    switch (next) {
      case "idle":
        this.onIdle();
        break;
      case "walk":
        this.onWalk();
        break;
      case "reposition":
        this.onReposition();
        break;
      case "attack":
        this.onAttack();
        break;
      case "dash":
        this.onDash();
        break;
      case "hurt":
        this.onHurt();
        break;
      case "stunned":
        this.onStunned();
        break;
      case "dead":
        this.onDeath();
        break;
    }
    return true;
  }

  /* State machine 'on-' functions */
  protected onIdle() {
    this.play(`${this.textureKey}-idle`, true);
  }
  protected onWalk() {
    this.play(`${this.textureKey}-walk-${this.movement.facingDir}`, true);
  }
  protected onReposition() {
    this.play(`${this.textureKey}-run-${this.movement.facingDir}`, true);
  }
  protected onAttack() {
    this.attack.cooldown = this.attack.cooldownMax;
    this.setVelocity(0, 0);
    this.play(`${this.textureKey}-attack-${this.attack.dir}`);
  }
  protected onDash() {
    if (this.skills?.dash === undefined) return;
    this.skills.dash.execute();
  }
  protected onHurt() {
    this.setVelocity(0, 0);
    this.attack.detectionZone.body.enable = false;
    this.play(`${this.textureKey}-hurt-${this.movement.facingDir}`);
  }
  protected onStunned() {
    this.setVelocity(0, 0);
    this.play(`${this.textureKey}-idle`, true);
  }
  protected onDeath() {
    this.setVelocity(0, 0);
    this.play(`${this.textureKey}-death`);
  }

  /* Non state machine on- functions */
  protected onDeathComplete() {
    this.scene.events.emit("death", this);
    this.attack.detectionZone.destroy();
    this.destroy();
  }
  protected onChangeDirection() {
    if (this.entityState === "reposition") {
      this.onReposition();
    } else {
      this.onWalk();
    }
  }
  protected onAttackFrameStart() {
    syncAttackZone(this);
    this.attack.detectionZone.body.enable = true;
  }
  protected onAttackFrameEnd() {
    this.attack.detectionZone.body.enable = false;
    this.attack.hitEnemies.clear();
  }
  protected onAttackComplete() {
    this.attack.detectionZone.body.enable = false;
    this.setEntityState("idle");
  }

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, `${textureKey}-idle`);
    this.textureKey = textureKey;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    /*
    this.setBodySize(PLAYER_CONFIG.BODY_SIZE.x, PLAYER_CONFIG.BODY_SIZE.y, true);
    this.body.setMass(PLAYER_CONFIG.MASS);
    this.setDepth(PLAYER_CONFIG.DEPTH);
    this.setCollideWorldBounds(true);
    */

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
      frames: {
        start: 2,
        end: 4,
      },
      hitEnemies: new Set(),
    };
    this.attack.detectionZone.body.enable = false;
    this.attack.detectionZone.setData("owner", this);

    this.on("animationupdate", (anim, frame) => {
      if (anim.key.startsWith(`${textureKey}-attack`)) {
        if (frame.index === this.attack.frames.start) {
          this.onAttackFrameStart();
        }
        if (frame.index === this.attack.frames.end) {
          this.onAttackFrameEnd();
        }
      }
    });

    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith(`${textureKey}-attack`)) {
        this.onAttackComplete();
      }
      if (anim.key.startsWith(`${textureKey}-hurt`)) {
        this.setEntityState("idle");
      }
      if (anim.key.startsWith(`${textureKey}-death`)) {
        this.onDeathComplete();
      }
    });
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

  protected isInEntityState(...states: EntityState[]): boolean {
    return states.includes(this.entityState);
  }

  movementEnabled(): boolean {
    return !this.isInEntityState("attack", "dash", "stunned", "dead", "hurt");
  }

  updateMovement(): void {
    this.updateMovementState();
  }

  protected updateMovementState() {
    if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
      if (this.isInEntityState("walk", "reposition")) {
        this.onChangeDirection();
      } else {
        this.setEntityState("walk");
      }
    } else {
      this.setEntityState("idle");
    }
  }

  tryAttack(): boolean {
    if (this.attack.cooldown > 0) return false;
    return true;
  }

  registerKill() {
    this.killCount++;
  }

  tryHurt(amount: number): boolean {
    this.health.current = Math.max(0, this.health.current - amount);
    if (this.health.current <= 0) {
      return this.setEntityState("dead");
    }
    return this.setEntityState("hurt");
  }

  tryDeath(): boolean {
    return this.setEntityState("dead");
  }

  update(time: number, delta: number): void {
    if (this.entityState === "dead") return;
    this.attack.cooldown = Math.max(0, this.attack.cooldown - delta);
    if (this.skills) {
      for (const skill of Object.values(this.skills)) {
        skill.update(delta);
      }
    }
    if (this.movementEnabled()) {
      this.updateMovement();
    }
  }
}

export default Entity;
