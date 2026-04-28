import * as Phaser from 'phaser';
import { GAME_CONFIG } from '../utils/constants';

class PlagueCrow extends Phaser.Physics.Arcade.Sprite implements IEnemy {
  dead: boolean;

  maxHp:        number;
  hp:           number;
  speed:        number;
  attackDamage: number;
  attackDir:    AttackDir;

  shootCooldown: number;
  private projectiles: Phaser.GameObjects.Arc[];

  lastAttacker?: string;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene as any, x, y, 'crow-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this.setBodySize(28, 45);
    this.setOffset(12, 1);
    (this.body as Phaser.Physics.Arcade.Body).setMass(1);

    this.dead = false;

    this.maxHp        = 2;
    this.hp           = this.maxHp;
    this.speed        = 55;
    this.attackDamage = 2;
    this.attackDir    = 'right';

    this.shootCooldown = Phaser.Math.Between(1500, 3000);
    this.projectiles  = [];

    this.play('crow-idle');
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.destroyProjectiles();
    (this.scene as any).spawnDeathEffect?.(this.x, this.y);
    (this.scene as any).onEnemyKilled?.(this);
    this.destroy();
  }

  private destroyProjectiles(): void {
    this.projectiles.forEach(p => { if (p.active) p.destroy(); });
    this.projectiles = [];
  }

  private shoot(target: ITarget): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const speed = 200;

    const proj = this.scene.add.circle(this.x, this.y, 5, 0x8833aa).setDepth(6);
    this.scene.physics.add.existing(proj);
    const projBody = proj.body as Phaser.Physics.Arcade.Body;
    projBody.setCircle(5);
    projBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    projBody.setCollideWorldBounds(true);
    (projBody as any).onWorldBounds = true;

    this.projectiles.push(proj);

    (projBody as any).world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject === proj && proj.active) proj.destroy();
    });

    this.scene.physics.add.overlap(proj, (this.scene as any).player, () => {
      if (!proj.active) return;
      proj.destroy();
      (this.scene as any).player?.takeDamage(this.attackDamage);
    });

    if ((this.scene as any).clone?.active) {
      this.scene.physics.add.overlap(proj, (this.scene as any).clone, () => {
        if (!proj.active) return;
        proj.destroy();
        (this.scene as any).clone?.takeDamage(this.attackDamage);
      });
    }

    this.scene.time.delayedCall(3000, () => { if (proj.active) proj.destroy(); });
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

    this.shootCooldown -= delta;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    this.setFlipX(target.x >= this.x);

    if (dist < 100) {
      const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
      const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed * 1.4, Math.sin(snap8) * this.speed * 1.4);
      this.play('crow-fly', true);
      return;
    }

    if (this.shootCooldown <= 0) {
      this.shootCooldown = Phaser.Math.Between(2000, 3000);
      this.shoot(target);
    }

    if (dist < 200) {
      const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
      const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
      this.play('crow-fly', true);
    } else if (dist > 320) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
      this.play('crow-fly', true);
    } else {
      this.setVelocity(0, 0);
      this.play('crow-idle', true);
    }
  }
}

(window as any).PlagueCrow = PlagueCrow;

export default PlagueCrow;
