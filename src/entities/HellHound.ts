import * as Phaser from "phaser";
import { GAME_CONFIG } from "../utils/constants";

class HellHound extends Phaser.Physics.Arcade.Sprite implements IEnemy {
  dead: boolean;

  maxHp: number;
  hp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;

  attackCooldown: number;
  private isAttacking: boolean;
  attackDir: AttackDir;
  private attackFlash: boolean;

  lastAttacker?: string;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene as any, x, y, "orc-01-idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this.setBodySize(45, 29);
    this.setOffset(12, 19);
    (this.body as Phaser.Physics.Arcade.Body).setMass(2);

    this.dead = false;

    this.maxHp = 1;
    this.hp = this.maxHp;
    this.speed = 135;
    this.attackDamage = 1;
    this.attackRange = 48;

    this.attackCooldown = Phaser.Math.Between(900, 1500);
    this.isAttacking = false;
    this.attackDir = "right";
    this.attackFlash = false;

    this.play("orc-01-idle");
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    (this.scene as any).spawnDeathEffect?.(this.x, this.y);
    (this.scene as any).onEnemyKilled?.(this);
    this.destroy();
  }

  update(_time: number, delta: number, player: ITarget, clone?: ITarget | null): void {
    if (!this.active || !player || player.hp <= 0) return;

    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;
    this.x = Phaser.Math.Clamp(this.x, GAME_WALL_X, GAME_WIDTH - GAME_WALL_X);
    this.y = Phaser.Math.Clamp(this.y, GAME_WALL_Y, GAME_HEIGHT - GAME_WALL_Y);

    const cloneAlive = clone?.active && !clone.dead;
    let target: ITarget = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone!.x, clone!.y);
      if (dc < dp) target = clone!;
    }

    this.attackCooldown -= delta;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const DIRS: AttackDir[] = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];

    this.setFlipX(target.x >= this.x);
    this.attackDir = DIRS[((Math.round(angleToTarget / (Math.PI / 4)) % 8) + 8) % 8];

    if (this.isAttacking) {
      this.setVelocity(0, 0);
      return;
    }

    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);

      if (this.attackCooldown <= 0) {
        const cd = Phaser.Math.Between(1000, 1600);
        this.attackCooldown = cd;
        this.isAttacking = true;
        this.play("orc-01-attack", true);

        this.attackFlash = true;
        this.scene.time.delayedCall(120, () => {
          this.attackFlash = false;
          if (this.active && !this.dead) target.takeDamage(this.attackDamage);
        });

        this.once("animationcomplete", () => {
          if (this.active && !this.dead) this.play("orc-01-idle", true);
        });
        this.scene.time.delayedCall(cd, () => {
          if (this.active) this.isAttacking = false;
        });
      } else {
        this.play("orc-01-idle", true);
      }
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
    this.play("orc-01-walk", true);
  }
}

(window as any).HellHound = HellHound;

export default HellHound;
