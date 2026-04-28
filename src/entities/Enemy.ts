import * as Phaser from "phaser";
import { GAME_CONFIG } from "../utils/constants";
import { angleToDir } from "../utils/utils";

interface IGameScene extends Phaser.Scene {
  onEnemyKilled: (enemy: Enemy) => void;
}

abstract class Enemy extends Phaser.Physics.Arcade.Sprite implements IEnemy {
  private gameScene: IGameScene;
  animKey: string;
  dead: boolean;
  maxHp: number;
  hp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  protected isAttacking: boolean;
  attackDir: CardinalDir;
  facingDir: CardinalDir;
  lastAttacker?: "player" | "clone";

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.gameScene = scene as IGameScene;

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this.dead = false;
    this.maxHp = 1;
    this.hp = 1;
    this.speed = 100;
    this.attackDamage = 1;
    this.attackRange = 50;
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.attackDir = "left";
    this.facingDir = "left";
  }

  // ── Shared methods ────────────────────────────────────────────────────

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp -= amount;

    this.play(`${this.animKey}-hurt-${this.facingDir}`);
    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key.startsWith(`${this.animKey}-hurt`)) {
        
      }
    });

    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    // TODO: Add death animation
    this.gameScene.onEnemyKilled(this);
    this.destroy();
  }

  // Returns the closer of player/clone (clone must be alive to be considered)
  protected selectTarget(player: ITarget, clone?: ITarget | null): ITarget {
    if (!clone?.active || clone.dead) return player;
    const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);

    const target = dc < dp ? clone : player;
    this.updateFacingDir(target);
    return target;
  }

  // Clamps position to the playable arena area
  protected clampToBounds(): void {
    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;
    this.x = Phaser.Math.Clamp(this.x, GAME_WALL_X, GAME_WIDTH - GAME_WALL_X);
    this.y = Phaser.Math.Clamp(this.y, GAME_WALL_Y, GAME_HEIGHT - GAME_WALL_Y);
  }

  protected updateFacingDir(target: ITarget): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.facingDir = angleToDir(angle);
  }

  update(time: number, delta: number, player: ITarget, clone?: ITarget | null): void {
    if (this.dead) return;
    if (this.isAttacking) return;

    if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
      this.play(`${this.animKey}-run-${this.facingDir}`, true);
    } else {
      this.play(`${this.animKey}-idle`, true);
    }
  };
}

export default Enemy;
