class HellHound extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'hound-idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setDepth(4);
        // Physics body matched to visible sprite area across all frames (64×48)
        this.setBodySize(45, 29);
        this.setOffset(12, 19);
        this.body.setMass(2);
        this._dead = false;
        // Stats
        this.maxHp = 1;
        this.hp = this.maxHp;
        this.speed = 135;
        this.attackDamage = 1;
        this.attackRange = 48;
        // Timers (ms)
        this.attackCooldown = Phaser.Math.Between(900, 1500);
        this._isAttacking = false;
        this.attackDir = 'right';
        this._attackFlash = false;
        this.play('hound-idle');
    }
    takeDamage(amount) {
        if (this._dead)
            return;
        this.hp -= amount;
        this.setTint(0xff5555);
        this.scene.time.delayedCall(120, () => { if (this.active)
            this.clearTint(); });
        if (this.hp <= 0)
            this._die();
    }
    _die() {
        var _a, _b, _c, _d;
        if (this._dead)
            return;
        this._dead = true;
        (_b = (_a = this.scene).spawnDeathEffect) === null || _b === void 0 ? void 0 : _b.call(_a, this.x, this.y);
        (_d = (_c = this.scene).onEnemyKilled) === null || _d === void 0 ? void 0 : _d.call(_c, this);
        this.destroy();
    }
    update(time, delta, player, clone) {
        if (!this.active || !player || player.hp <= 0)
            return;
        this.x = Phaser.Math.Clamp(this.x, 38, 922);
        this.y = Phaser.Math.Clamp(this.y, 38, 502);
        const cloneAlive = (clone === null || clone === void 0 ? void 0 : clone.active) && !(clone === null || clone === void 0 ? void 0 : clone._dead);
        let target = player;
        if (cloneAlive) {
            const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);
            if (dc < dp)
                target = clone;
        }
        this.attackCooldown -= delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const DIRS = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
        // Sprite naturally faces LEFT — flip when target is to the right
        // Also track attackDir every frame for the debug indicator
        this.setFlipX(target.x >= this.x);
        this.attackDir = DIRS[((Math.round(angleToTarget / (Math.PI / 4)) % 8) + 8) % 8];
        // Stay idle for full cooldown after melee attack
        if (this._isAttacking) {
            this.setVelocity(0, 0);
            return;
        }
        // ── In attack range
        if (dist <= this.attackRange) {
            this.setVelocity(0, 0);
            if (this.attackCooldown <= 0) {
                const cd = Phaser.Math.Between(1000, 1600);
                this.attackCooldown = cd;
                this._isAttacking = true;
                this.play('hound-attack', true);
                this._attackFlash = true;
                this.scene.time.delayedCall(120, () => {
                    var _a, _b;
                    this._attackFlash = false;
                    if (this.active && !this._dead) {
                        (_b = (_a = target).takeDamage) === null || _b === void 0 ? void 0 : _b.call(_a, this.attackDamage);
                    }
                });
                this.once('animationcomplete', () => {
                    if (this.active && !this._dead)
                        this.play('hound-idle', true);
                });
                this.scene.time.delayedCall(cd, () => { if (this.active)
                    this._isAttacking = false; });
            }
            else {
                this.play('hound-idle', true);
            }
            return;
        }
        // ── Chase target
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
        this.play('hound-run', true);
    }
}
window.HellHound = HellHound;
export default HellHound;
