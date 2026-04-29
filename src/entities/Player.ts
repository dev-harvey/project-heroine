import * as Phaser from "phaser";

import { CLONE_CONFIG, PLAYER_CONFIG } from "../utils/constants";
import { getAnchorPosition, getMouseDirFromTarget, getAnchorOctoOffset, syncAttackZone } from "../utils/utils";
import { Dash } from "../skills/Dash";
import AnchorIndicator from "./AnchorIndicator";
import AttackIndicator from "./AttackIndicator";
import Entity from "./Entity";

export default class Player extends Entity implements IPlayer {
  declare gameScene: IPlayerGameScene;
  
  animKey: string;

  declare movement: IPlayerMovement;

  declare health: IPlayerHealth;
  setMaxHp(value: number) {
    this.health.max = Math.min(PLAYER_CONFIG.MAXTOTAL_HP, value);
  }
  declare attack: IPlayerAttack;
  setAttackDamage(value: number): void {
    this.attack.damage = Math.min(PLAYER_CONFIG.MAXTOTAL_ATTACK_DAMAGE, value);
  }

  dash: Dash;
  anchor: IPlayerAnchor;

  killCount: number;

  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: WasdKeys;
  private shiftKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-idle");

    this.setDepth(PLAYER_CONFIG.DEPTH);
    this.setBodySize(PLAYER_CONFIG.BODY_SIZE.x, PLAYER_CONFIG.BODY_SIZE.y, true);
    this.body.setMass(PLAYER_CONFIG.MASS);

    this.animKey = "player";

    this.movement = {
      speed: PLAYER_CONFIG.SPEED,
      facingDir: "right",
    };

    this.health = {
      current: PLAYER_CONFIG.MAXHP,
      max: PLAYER_CONFIG.MAXHP,
    };

    this.dash = new Dash(this, this, PLAYER_CONFIG.DASH_DURATION, PLAYER_CONFIG.DASH_DISTANCE, PLAYER_CONFIG.DASH_COOLDOWN);

    this.attack = {
      ...this.attack,
      damage: PLAYER_CONFIG.ATTACK_DAMAGE,
      cooldownMax: PLAYER_CONFIG.ATTACK_COOLDOWN,
      dir: "right",
      range: PLAYER_CONFIG.ATTACK_RANGE,
      attackIndicator: new AttackIndicator(scene, this),
      hitEnemies: new Set(),
    };

    this.anchor = {
      position: { x: this.x, y: this.y },
      offset: getAnchorOctoOffset(-90, CLONE_CONFIG.ANCHOR_OFFSET),
      indicatorPosition: { x: this.x, y: this.y },
      indicator: new AnchorIndicator(scene, this),
    };

    this.killCount = 0;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as WasdKeys;

    scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (ptr.leftButtonDown()) this.doAttack();
    });

    this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.shiftKey.on("down", () => {
      if (this.active) this.dash.execute();
    });

    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (anim.key.startsWith("player-attack")) {
        if (frame.index === PLAYER_CONFIG.ATTACK_FRAMES.START) {
          syncAttackZone(this);
          this.attack.detectionZone.body.enable = true;
        }
        if (frame.index === PLAYER_CONFIG.ATTACK_FRAMES.END) {
          this.attack.detectionZone.body.enable = false;
          this.attack.hitEnemies.clear();
        }
      }
    });

    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith("player-attack")) {
        this.attack.detectionZone.body.enable = false;
        this.setEntityState("idle");
      }
    });
  }

  doAttack(): void {
    if (this.entityState === "attack" || this.entityState === "stunned" || this.entityState === "dead" || this.attack.cooldown > 0) return;

    this.attack.dir = getMouseDirFromTarget(this);
    this.setEntityState("attack");
    this.attack.cooldown = this.attack.cooldownMax;
    this.attack.hitEnemies.clear();
    this.emit("attack", this.attack.dir);
    this.setVelocity(0, 0);

    if (["up", "up-right", "up-left"].includes(this.attack.dir)) {
      this.play("player-attack-up", true);
    } else if (["down", "down-right", "down-left"].includes(this.attack.dir)) {
      this.play("player-attack-down", true);
    } else if (["left"].includes(this.attack.dir)) {
      this.play("player-attack-left", true);
    } else {
      this.play("player-attack-right", true);
    }
  }

  takeDamage(amount: number): void {
    if (this.health.current <= 0) return;

    this.health.current = Math.max(0, this.health.current - amount);

    this.gameScene.spawnDamageNumber?.(this.x, this.y - 16, amount, "#ff2222", 26);

    this.setTint(0xff4444);
    this.scene.tweens.addCounter({
      from: 0,
      to: 3,
      duration: 200,
      repeat: 0,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const cycle = Math.floor(tween.getValue()) % 2;
        this.setTint(cycle === 0 ? 0xff4444 : 0xffffff);
      },
      onComplete: () => {
        this.clearTint();
        this.setAlpha(1);
      },
    });

    if (this.health.current <= 0) {
      this.scene.time.delayedCall(100, () => (this.scene as any).onPlayerDeath?.());
    }
  }

  updateMovement() {
    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;
    const velocity = new Phaser.Math.Vector2(0, 0);
    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;
    velocity.normalize().scale(this.movement.speed);
    this.setVelocity(velocity.x, velocity.y);
    this.updateFacingDir(velocity.x, velocity.y);
    this.updateMovementState();
  }

  update(time: number, delta: number): void {
    this.dash.update(delta);

    super.update(time, delta);

    const playerPosition = { x: this.x, y: this.y };
    this.anchor.position = getAnchorPosition(playerPosition, playerPosition, this.anchor.offset);
    const ptr = this.scene.input.activePointer;
    this.anchor.indicatorPosition = getAnchorPosition(playerPosition, { x: ptr.x, y: ptr.y });
  }
}
