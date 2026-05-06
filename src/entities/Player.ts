import * as Phaser from "phaser";

import { CLONE_CONFIG, PLAYER_CONFIG } from "../utils/constants";
import { getAnchorPosition, getMouseDirFromTarget, getAnchorOctoOffset, syncAttackZone } from "../utils/utils";
import { Dash } from "../skills/Dash";
import AnchorIndicator from "../indicators/AnchorIndicator";
import AttackIndicator from "../indicators/AttackIndicator";
import Ally from "./Ally";

export default class Player extends Ally implements IPlayer {  
  declare textureKey: string;

  protected readonly maxTotalHealth: number = PLAYER_CONFIG.MAXTOTAL_HEALTH;
  protected readonly maxTotalDamage: number = PLAYER_CONFIG.MAXTOTAL_ATTACK_DAMAGE;

  declare movement: IPlayerMovement;
  declare health: IPlayerHealth;
  declare attack: IPlayerAttack;
  declare skills: IPlayerSkills;
  declare anchor: IPlayerAnchor;

  private inputControls: IPlayerInput;

  protected onDeath() {
    this.setVelocity(0, 0);
    this.play(`${this.textureKey}-death`);
  }

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);

    this.id = "player";
    this.entityType = "player";

    this.setBodySize(PLAYER_CONFIG.BODY_SIZE.x, PLAYER_CONFIG.BODY_SIZE.y, true);
    this.body.setMass(PLAYER_CONFIG.MASS);
    this.setDepth(PLAYER_CONFIG.DEPTH);
    this.setCollideWorldBounds(true);

    this.movement = {
      speed: PLAYER_CONFIG.SPEED,
      facingDir: "right",
    };

    this.health = {
      current: PLAYER_CONFIG.MAXHP,
      max: PLAYER_CONFIG.MAXHP,
    };

    this.attack = {
      ...this.attack,
      damage: PLAYER_CONFIG.ATTACK_DAMAGE,
      cooldownMax: PLAYER_CONFIG.ATTACK_COOLDOWN,
      dir: "right",
      range: PLAYER_CONFIG.ATTACK_RANGE,
      attackIndicator: new AttackIndicator(scene, this),
      frames: {
        start: PLAYER_CONFIG.ATTACK_FRAMES.START,
        end: PLAYER_CONFIG.ATTACK_FRAMES.END
      }
    };

    this.skills = {
      dash: new Dash(this, PLAYER_CONFIG.DASH_DURATION, PLAYER_CONFIG.DASH_DISTANCE, PLAYER_CONFIG.DASH_COOLDOWN),
    };

    this.anchor = {
      position: { x: this.x, y: this.y },
      offset: getAnchorOctoOffset(-90, CLONE_CONFIG.ANCHOR_OFFSET),
      indicatorPosition: { x: this.x, y: this.y },
      indicator: new AnchorIndicator(scene, this),
    };

    /* START BIND CONTROLS */

    this.inputControls = {
      cursors: scene.input.keyboard.createCursorKeys(),
      wasd: scene.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
      }) as WasdKeys,
      shiftKey: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };

    scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (ptr.leftButtonDown()) {
        this.tryAttack();
      }
    });

    this.inputControls.shiftKey.on("down", () => {
      this.tryDash();
    });

    /* END BIND CONTROLS */
  }

  tryDie(): boolean {
    return this.setEntityState("dead");
  }

  updateMovement(): void {
    const left = this.inputControls.wasd.left.isDown || this.inputControls.cursors.left.isDown;
    const right = this.inputControls.wasd.right.isDown || this.inputControls.cursors.right.isDown;
    const up = this.inputControls.wasd.up.isDown || this.inputControls.cursors.up.isDown;
    const down = this.inputControls.wasd.down.isDown || this.inputControls.cursors.down.isDown;
    const velocity = new Phaser.Math.Vector2(0, 0);
    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;
    velocity.normalize().scale(this.movement.speed);
    this.setVelocity(velocity.x, velocity.y);
    this.updateFacingDir(velocity.x, velocity.y);

    super.updateMovement();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    const playerPosition = { x: this.x, y: this.y };
    this.anchor.position = getAnchorPosition(playerPosition, playerPosition, this.anchor.offset);
    const ptr = this.scene.input.activePointer;
    this.anchor.indicatorPosition = getAnchorPosition(playerPosition, { x: ptr.x, y: ptr.y });
  }
}
