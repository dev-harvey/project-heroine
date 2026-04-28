import * as Phaser from "phaser";
import { GAME_CONFIG } from "../utils/constants";

const DIRS: AttackDir[] = [
  "right", "down-right", "down", "down-left",
  "left", "up-left", "up", "up-right",
];

interface IGameScene extends Phaser.Scene {
  onEnemyKilled: (enemy: Enemy) => void;
}

abstract class Enemy extends Phaser.Physics.Arcade.Sprite implements IEnemy {
  _scene: IGameScene;
  _dead: boolean;
  maxHp: number;
  hp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  _isAttacking: boolean;
  attackDir: AttackDir;
  lastAttacker?: string;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this._scene = scene as IGameScene;

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this._dead = false;
    this.maxHp = 1;
    this.hp = 1;
    this.speed = 100;
    this.attackDamage = 1;
    this.attackRange = 50;
    this.attackCooldown = 0;
    this._isAttacking = false;
    this.attackDir = "right";
  }

  // ── Shared methods ────────────────────────────────────────────────────

  takeDamage(amount: number): void {
    if (this._dead) return;
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this._die();
  }

  _die(): void {
    if (this._dead) return;
    this._dead = true;
    // TODO: Add death animation
    this._scene.onEnemyKilled(this);
    this.destroy();
  }

  // Returns the closer of player/clone (clone must be alive to be considered)
  protected selectTarget(player: ITarget, clone?: ITarget | null): ITarget {
    if (!clone?.active || clone._dead) return player;
    const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);
    return dc < dp ? clone : player;
  }

  // Clamps position to the playable arena area
  protected clampToBounds(): void {
    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;
    this.x = Phaser.Math.Clamp(this.x, GAME_WALL_X, GAME_WIDTH - GAME_WALL_X);
    this.y = Phaser.Math.Clamp(this.y, GAME_WALL_Y, GAME_HEIGHT - GAME_WALL_Y);
  }

  // Converts a radian angle into one of 8 direction strings
  protected angleToDir(angle: number): AttackDir {
    return DIRS[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
  }

  // Every subclass must implement its own update loop
  abstract update(time: number, delta: number, player: ITarget, clone?: ITarget | null): void;
}

export default Enemy;