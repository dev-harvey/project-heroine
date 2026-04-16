import * as Phaser from 'phaser';

class HellHound extends Phaser.Physics.Arcade.Sprite implements IEnemy {
  _dead: boolean;

  maxHp:        number;
  hp:           number;
  speed:        number;
  attackDamage: number;
  attackRange:  number;

  attackCooldown: number;
  _isAttacking:   boolean;
  attackDir:      AttackDir;
  _attackFlash:   boolean;

  lastAttacker?: string;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene as any, x, y, 'hound-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this.setBodySize(45, 29);
    this.setOffset(12, 19);
    (this.body as Phaser.Physics.Arcade.Body).setMass(2);

    this._dead = false;

    this.maxHp        = 1;
    this.hp           = this.maxHp;
    this.speed        = 135;
    this.attackDamage = 1;
    this.attackRange  = 48;

    this.attackCooldown = Phaser.Math.Between(900, 1500);
    this._isAttacking   = false;
    this.attackDir      = 'right';
    this._attackFlash   = false;

    this.play('hound-idle');
  }

  takeDamage(amount: number): void {
    if (this._dead) return;
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) this._die();
  }

  _die(): void {
    if (this._dead) return;
    this._dead = true;
    (this.scene as any).spawnDeathEffect?.(this.x, this.y);
    (this.scene as any).onEnemyKilled?.(this);
    this.destroy();
  }

  update(_time: number, delta: number, player: ITarget, clone?: ITarget | null): void {
    if (!this.active || !player || player.hp <= 0) return;

    this.x = Phaser.Math.Clamp(this.x, 38, 922);
    this.y = Phaser.Math.Clamp(this.y, 38, 502);

    const cloneAlive = clone?.active && !clone._dead;
    let target: ITarget = player;
    if (cloneAlive) {
      const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      const dc = Phaser.Math.Distance.Between(this.x, this.y, clone!.x, clone!.y);
      if (dc < dp) target = clone!;
    }

    this.attackCooldown -= delta;

    const dist         = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const DIRS: AttackDir[] = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];

    this.setFlipX(target.x >= this.x);
    this.attackDir = DIRS[((Math.round(angleToTarget / (Math.PI / 4)) % 8) + 8) % 8];

    if (this._isAttacking) {
      this.setVelocity(0, 0);
      return;
    }

    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);

      if (this.attackCooldown <= 0) {
        const cd = Phaser.Math.Between(1000, 1600);
        this.attackCooldown = cd;
        this._isAttacking   = true;
        this.play('hound-attack', true);

        this._attackFlash = true;
        this.scene.time.delayedCall(120, () => {
          this._attackFlash = false;
          if (this.active && !this._dead) target.takeDamage(this.attackDamage);
        });

        this.once('animationcomplete', () => {
          if (this.active && !this._dead) this.play('hound-idle', true);
        });
        this.scene.time.delayedCall(cd, () => { if (this.active) this._isAttacking = false; });
      } else {
        this.play('hound-idle', true);
      }
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
    this.play('hound-run', true);
  }
}

(window as any).HellHound = HellHound;

export default HellHound;
