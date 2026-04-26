import * as Phaser from "phaser";

import { CLONE_CONFIG, DIAGONAL_VECTOR, GAME_CONFIG, PLAYER_CONFIG, PLAYER_CONFIG as playerConfig } from "../utils/constants";
import { getAnchorPosition, getMouseDirectionFromTarget, getAnchorOctoOffset } from "../utils/utils";
import { Dash } from "../skills/Dash";
import AnchorIndicator from "./AnchorIndicator";
import AttackIndicator from "./AttackIndicator";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  maxHp: number;
  hp: number;
  speed: number;
  attackDamage: number;

  isAttacking: boolean;
  attackCooldown: number;
  attackCooldownMax: number;
  isInvincible: boolean;
  attackDir: AttackDir;
  attackDetectionZone: Phaser.Physics.Arcade.Image;
  attackIndicator: AttackIndicator;
  hitEnemies: Set<Phaser.GameObjects.GameObject>;

  anchorPosition: XYPosition;
  anchorOffset: XYPosition;
  anchorIndicatorPosition: XYPosition;
  anchorIndicator: AnchorIndicator;

  dash: Dash;

  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: WasdKeys;
  _shiftKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(playerConfig.DEPTH);

    this.setBodySize(playerConfig.BODY_SIZE.x, playerConfig.BODY_SIZE.y, true);

    this.body.setMass(playerConfig.MASS);

    this.maxHp = playerConfig.MAXHP;
    this.hp = this.maxHp;
    this.speed = playerConfig.SPEED;

    this.attackDamage = playerConfig.ATTACK_DAMAGE;
    this.attackCooldown = 0;
    this.attackCooldownMax = playerConfig.ATTACK_COOLDOWN;

    this.isAttacking = false;
    this.attackDir = "right";

    this.attackDetectionZone = scene.physics.add.image(x, y, "");
    this.attackDetectionZone.body.enable = false;

    this.attackIndicator = new AttackIndicator(scene, this);

    this.anchorPosition = { x: this.x, y: this.y };
    this.anchorOffset = getAnchorOctoOffset(-90, CLONE_CONFIG.ANCHOR_OFFSET); // -90 means top left
    this.anchorIndicator = new AnchorIndicator(scene, this);
    this.anchorIndicatorPosition = { x: this.x, y: this.y };

    this.dash = new Dash(this, this, playerConfig.DASH_DURATION, playerConfig.DASH_DISTANCE, playerConfig.DASH_COOLDOWN);

    this.isInvincible = false;
    this.hitEnemies = new Set();

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

    this._shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this._shiftKey.on("down", () => {
      if (this.active) this.dash.execute();
    });

    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (anim.key.startsWith("player-attack")) {
        if (frame.index === 4) {
          this._syncAttackZone();
          this.attackDetectionZone.body.enable = true;
        }
        if (frame.index === 7) {
          this.attackDetectionZone.body.enable = false;
          this.hitEnemies.clear();
        }
      }
    });

    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith("player-attack")) {
        this.isAttacking = false;
        this.attackDetectionZone.body.enable = false;
      }
    });

    this.play("player-idle");
  }

  doAttack(): void {
    if (this.isAttacking || this.attackCooldown > 0) return;

    this.attackDir = getMouseDirectionFromTarget(this);
    this.isAttacking = true;
    this.attackCooldown = playerConfig.ATTACK_COOLDOWN;
    this.hitEnemies.clear();
    this.emit("attack", this.attackDir);
    this.setVelocity(0, 0);

    if (["up", "up-right", "up-left"].includes(this.attackDir)) {
      this.play("player-attack-up", true);
    } else if (["down", "down-right", "down-left"].includes(this.attackDir)) {
      this.play("player-attack-down", true);
    } else if (["left"].includes(this.attackDir)) {
      this.play("player-attack-left", true);
    } else {
      this.play("player-attack-right", true);
    }
  }

  takeDamage(amount: number): void {
    if (this.isInvincible || this.hp <= 0) return;

    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;

    (this.scene as any).spawnDamageNumber?.(this.x, this.y - 16, amount, "#ff2222", 26);

    this.setTint(0xff4444);
    this.scene.tweens.addCounter({
      from: 0,
      to: 3,
      duration: 200,
      repeat: 0,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const cycle = Math.floor((tween as any).getValue()) % 2;
        this.setTint(cycle === 0 ? 0xff4444 : 0xffffff);
      },
      onComplete: () => {
        this.clearTint();
        this.setAlpha(1);
        this.isInvincible = false;
      },
    });

    if (this.hp <= 0) {
      this.scene.time.delayedCall(100, () => (this.scene as any).onPlayerDeath?.());
    }
  }

  _syncAttackZone(): void {
    const b = this.body as Phaser.Physics.Arcade.Body;
    const bcx = b.x + b.width / 2;
    const bcy = b.y + b.height / 2;

    const radius = PLAYER_CONFIG.ATTACK_RANGE;

    this.attackDetectionZone.setPosition(bcx, bcy);
    this.attackDetectionZone.setSize(radius * 2, radius * 2);
    this.attackDetectionZone.body.setCircle(radius);
  }

  update(_time: number, delta: number): void {
    if (this.hp <= 0) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dash.update(delta);

    this._syncAttackZone();

    if (this.isAttacking) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.dash.isActive) {
      return;
    }

    /* Two can be pressed at once which is why this isn't enabled. 
    TODO: Probably in the long run should rewrite for a getPressedMovementButtons function */
    // const inputDirection = (this.wasd.left.isDown || this.cursors.left.isDown) ? 'left' : (this.wasd.right.isDown || this.cursors.right.isDown) ? 'right' : (this.wasd.up.isDown || this.cursors.up.isDown) ? 'up' : (this.wasd.down.isDown || this.cursors.down.isDown) ? 'down' : 'idle';

    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;

    const velocity = new Phaser.Math.Vector2(0, 0);

    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;

    velocity.normalize().scale(this.speed);

    /* Can investigate setAcceleration if  I want smoother movement. */
    this.setVelocity(velocity.x, velocity.y);

    let direction = "idle";
    const body = this.body;

    if (body.velocity.length() > 0) {
      if (Math.abs(body.velocity.x) > Math.abs(body.velocity.y)) {
        // Horizontal movement is dominant
        direction = body.velocity.x > 0 ? "right" : "left";
      } else {
        // Vertical movement is dominant
        direction = body.velocity.y > 0 ? "down" : "up";
      }
    }

    if ((body.velocity.x !== 0 || body.velocity.y !== 0) && direction !== "idle") {
      this.play(`player-run-${direction}`, true);
    } else {
      this.play("player-idle", true);
    }


    const playerPosition = { x: this.x, y: this.y };
    // TODO: Shouldn't pass playerPosition twice, it's a get around. This could all maybe move to the anchor file like I do it for attack indicator
    this.anchorPosition = getAnchorPosition(playerPosition, playerPosition, this.anchorOffset);

    const ptr = this.scene.input.activePointer;
    this.anchorIndicatorPosition = getAnchorPosition(playerPosition, { x: ptr.x, y: ptr.y });

    this._syncAttackZone();
  }
}

window.Player = Player;
