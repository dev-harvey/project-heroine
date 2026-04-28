import * as Phaser from "phaser";
import { GAME_CONFIG } from "../utils/constants";

class MutantToad extends Phaser.Physics.Arcade.Sprite implements IEnemy {
  _dead: boolean;

  maxHp: number;
  hp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;

  attackCooldown: number;
  _isAttacking: boolean;
  attackDir: AttackDir;

  _isLeaping: boolean;
  _isPausing: boolean;
  _attackFlash: boolean;

  lastAttacker?: string;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene as any, x, y, "toad-idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    this.setBodySize(48, 36);
    this.setOffset(15, 28);
    (this.body as Phaser.Physics.Arcade.Body).setMass(3);

    this._dead = false;

    this.maxHp = 2;
    this.hp = this.maxHp;
    this.speed = 150;
    this.attackDamage = 2;
    this.attackRange = 75;

    this.attackCooldown = Phaser.Math.Between(1000, 1500);
    this._isAttacking = false;
    this.attackDir = "right";

    this._isLeaping = false;
    this._isPausing = false;
    this._attackFlash = false;

    this.play("toad-idle");
  }

  takeDamage(amount: number): void {
    if (this._dead) return;
    this.hp -= amount;
    this.setTint(0xff5555);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this._die();
  }

  private _inShovel(tx: number, ty: number): boolean {
    if (!this.body) return false;
    const NH = 15,
      FH = 30,
      FD = 30,
      CTRL = 40;
    const b = this.body as Phaser.Physics.Arcade.Body;
    const R2 = 0.7071067811865476;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const DCONF: Record<AttackDir, DirConfig> = {
      right: { fx: 1, fy: 0, ox: b.right, oy: cy },
      left: { fx: -1, fy: 0, ox: b.left, oy: cy },
      up: { fx: 0, fy: -1, ox: cx, oy: b.top },
      down: { fx: 0, fy: 1, ox: cx, oy: b.bottom },
      "up-right": { fx: R2, fy: -R2, ox: b.right, oy: b.top },
      "up-left": { fx: -R2, fy: -R2, ox: b.left, oy: b.top },
      "down-right": { fx: R2, fy: R2, ox: b.right, oy: b.bottom },
      "down-left": { fx: -R2, fy: R2, ox: b.left, oy: b.bottom },
    };
    const cfg = DCONF[this.attackDir];
    if (!cfg) return false;
    const { fx, fy, ox, oy } = cfg;
    const px = -fy,
      py = fx;
    const dx = tx - ox,
      dy = ty - oy;
    const lx = dx * fx + dy * fy;
    const ly = dx * px + dy * py;
    if (lx < 0) return false;
    if (lx <= FD) return Math.abs(ly) <= NH + (FH - NH) * (lx / FD);
    if (Math.abs(ly) > FH) return false;
    const t = (FH - ly) / (2 * FH);
    const lxCurve = FD * (1 - 2 * t + 2 * t * t) + 2 * t * (1 - t) * CTRL;
    return lx <= lxCurve;
  }

  private _targetInShovel(target: ITarget): boolean {
    const b = target.body;
    if (!b) return false;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return [
      [cx, cy],
      [b.x, b.y],
      [b.right, b.y],
      [b.x, b.bottom],
      [b.right, b.bottom],
      [cx, b.y],
      [cx, b.bottom],
      [b.x, cy],
      [b.right, cy],
    ].some(([tx, ty]) => this._inShovel(tx, ty));
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

    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;
    this.x = Phaser.Math.Clamp(this.x, GAME_WALL_X, GAME_WIDTH - GAME_WALL_X);
    this.y = Phaser.Math.Clamp(this.y, GAME_WALL_Y, GAME_HEIGHT - GAME_WALL_Y);

    const cloneAlive = clone?.active && !clone._dead;
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

    if (this._isAttacking) {
      this.setVelocity(0, 0);
      (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      return;
    }
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(false);

    this.setFlipX(target.x < this.x);
    this.attackDir = DIRS[((Math.round(angleToTarget / (Math.PI / 4)) % 8) + 8) % 8];

    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);

      if (this._isLeaping) return;
      this._isPausing = false;

      if (this.attackCooldown <= 0) {
        this.attackCooldown = Phaser.Math.Between(1000, 1500);
        this._isAttacking = true;
        this.play("toad-attack", true);

        this.scene.time.delayedCall(300, () => {
          if (!this.active || this._dead) return;
          this._attackFlash = true;
          this.scene.time.delayedCall(120, () => {
            if (this.active) this._attackFlash = false;
          });
          if (this._targetInShovel(target)) target.takeDamage(this.attackDamage);
        });

        this.scene.time.delayedCall(800, () => {
          if (this.active) {
            this.play("toad-idle", true);
            this._isAttacking = false;
          }
        });
      } else {
        this.play("toad-idle", true);
      }
      return;
    }

    if (this._isLeaping || this._isPausing) return;

    const snap8 = Math.round(angleToTarget / (Math.PI / 4)) * (Math.PI / 4);
    this._isLeaping = true;
    this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
    this.play("toad-jump", true);

    this.scene.time.delayedCall(500, () => {
      if (!this.active || this._isAttacking) return;
      this._isLeaping = false;
      this._isPausing = true;
      this.setVelocity(0, 0);
      this.play("toad-idle", true);
      this.scene.time.delayedCall(300, () => {
        if (this.active) this._isPausing = false;
      });
    });
  }
}

window.MutantToad = MutantToad;

export default MutantToad;
