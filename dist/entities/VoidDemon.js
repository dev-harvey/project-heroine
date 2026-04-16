class VoidDemon extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'demon-idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setDepth(4);
        // Body 150×144, centered horizontally in 256px frame
        this.setBodySize(150, 144);
        this.setOffset(53, 0);
        this.setScale(0.7);
        this.body.setMass(20);
        this._dead = false;
        // Stats
        this.maxHp = 10;
        this.hp = this.maxHp;
        this.speed = 45;
        this.breathDamage = 3;
        this.breathRange = 170;
        // State
        this._facingAngle = 0;
        this._isWindingUp = false;
        this._isFiring = false;
        this._breathCooldown = Phaser.Math.Between(2000, 4000);
        // Graphics for breath preview and fire cone
        this._previewGfx = scene.add.graphics().setDepth(5);
        this._coneGfx = scene.add.graphics().setDepth(5);
        this.play('demon-idle');
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
        this._previewGfx.destroy();
        this._coneGfx.destroy();
        (_b = (_a = this.scene).spawnDeathEffect) === null || _b === void 0 ? void 0 : _b.call(_a, this.x, this.y);
        (_d = (_c = this.scene).onEnemyKilled) === null || _d === void 0 ? void 0 : _d.call(_c, this);
        this.destroy();
    }
    _breathOrigin(angle) {
        const b = this.body;
        const bcx = b.x + b.width / 2;
        const bcy = b.y + b.height / 2;
        const hw = b.width / 2;
        const hh = b.height / 2;
        const c = Math.cos(angle), s = Math.sin(angle);
        const edgeDist = (hw * hh) / Math.sqrt((hw * s) ** 2 + (hh * c) ** 2);
        return { x: bcx + c * (edgeDist - 10), y: bcy + s * (edgeDist - 10) };
    }
    _drawShovel(gfx, angle, fillColor, fillAlpha, lineColor, lineAlpha) {
        const NH = 20, FH = 75, FD = 130, CTRL = 210, N = 16;
        const perp = angle + Math.PI / 2;
        const { x: ox, y: oy } = this._breathOrigin(angle);
        const fwdX = Math.cos(angle), fwdY = Math.sin(angle);
        const latX = Math.cos(perp), latY = Math.sin(perp);
        const hAx = ox + latX * NH, hAy = oy + latY * NH;
        const hBx = ox - latX * NH, hBy = oy - latY * NH;
        const fAx = ox + fwdX * FD + latX * FH, fAy = oy + fwdY * FD + latY * FH;
        const fBx = ox + fwdX * FD - latX * FH, fBy = oy + fwdY * FD - latY * FH;
        const cpx = ox + fwdX * CTRL, cpy = oy + fwdY * CTRL;
        const buildPath = () => {
            gfx.beginPath();
            gfx.moveTo(hAx, hAy);
            gfx.lineTo(fAx, fAy);
            for (let i = 1; i <= N; i++) {
                const t = i / N, mt = 1 - t;
                gfx.lineTo(mt * mt * fAx + 2 * mt * t * cpx + t * t * fBx, mt * mt * fAy + 2 * mt * t * cpy + t * t * fBy);
            }
            gfx.lineTo(hBx, hBy);
            gfx.closePath();
        };
        gfx.clear();
        if (fillAlpha > 0) {
            gfx.fillStyle(fillColor, fillAlpha);
            buildPath();
            gfx.fillPath();
        }
        if (lineAlpha > 0) {
            gfx.lineStyle(2, lineColor, lineAlpha);
            buildPath();
            gfx.strokePath();
        }
    }
    _inShovel(tx, ty) {
        const NH = 20, FH = 75, FD = 130, CTRL = 210;
        const { x: ox, y: oy } = this._breathOrigin(this._facingAngle);
        const c = Math.cos(this._facingAngle), s = Math.sin(this._facingAngle);
        const dx = tx - ox, dy = ty - oy;
        const lx = dx * c + dy * s;
        const ly = -dx * s + dy * c;
        if (lx < 0)
            return false;
        if (lx <= FD) {
            return Math.abs(ly) <= NH + (FH - NH) * (lx / FD);
        }
        if (Math.abs(ly) > FH)
            return false;
        const t = (FH - ly) / (2 * FH);
        const lxCurve = FD * (1 - 2 * t + 2 * t * t) + 2 * t * (1 - t) * CTRL;
        return lx <= lxCurve;
    }
    _startBreath() {
        this._isWindingUp = true;
        this.play('demon-attack-no-breath', true);
        this.setTint(0xff8800);
        this._drawShovel(this._previewGfx, this._facingAngle, 0xffcc88, 0.4, 0, 0);
        this.scene.time.delayedCall(500, () => {
            if (!this.active || this._dead)
                return;
            this._isWindingUp = false;
            this._isFiring = true;
            this.clearTint();
            this._previewGfx.clear();
            this._fireBreath();
        });
    }
    _fireBreath() {
        var _a, _b, _c;
        const angle = this._facingAngle;
        const DURATION = 700;
        const progress = { t: 0 };
        this.scene.tweens.add({
            targets: progress, t: 1, duration: DURATION,
            onUpdate: () => {
                const a = 1 - progress.t;
                this._drawShovel(this._coneGfx, angle, 0xff4400, 0.18 * a, 0xff8800, a);
            },
            onComplete: () => {
                this._coneGfx.clear();
                this._isFiring = false;
                if (this.active && !this._dead)
                    this.play('demon-idle', true);
            },
        });
        const { x: ox, y: oy } = this._breathOrigin(angle);
        for (let i = 0; i < 9; i++) {
            this.scene.time.delayedCall(i * 55, () => {
                var _a;
                if (!((_a = this.scene) === null || _a === void 0 ? void 0 : _a.tweens) || !this.active)
                    return;
                const a = angle + (Math.random() - 0.5) * (Math.PI / 3);
                const r = Math.random() * this.breathRange;
                const spr = this.scene.add.sprite(ox + Math.cos(a) * r, oy + Math.sin(a) * r, 'demon-breath')
                    .setScale(0.48).setAlpha(0.85)
                    .setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
                spr.play('demon-breath');
                spr.once('animationcomplete', () => {
                    var _a;
                    if (!((_a = this.scene) === null || _a === void 0 ? void 0 : _a.tweens)) {
                        spr.destroy();
                        return;
                    }
                    this.scene.tweens.add({ targets: spr, alpha: 0, duration: 150, onComplete: () => spr.destroy() });
                });
            });
        }
        const targets = [this.scene.player];
        if (((_a = this.scene.clone) === null || _a === void 0 ? void 0 : _a.active) && !this.scene.clone._dead)
            targets.push(this.scene.clone);
        for (const t of targets) {
            if (this._inShovel(t.x, t.y))
                (_c = (_b = t).takeDamage) === null || _c === void 0 ? void 0 : _c.call(_b, this.breathDamage);
        }
    }
    update(_time, delta, player, clone) {
        if (!this.active || this._dead || !player || player.hp <= 0)
            return;
        this.x = Phaser.Math.Clamp(this.x, 38, 922);
        this.y = Phaser.Math.Clamp(this.y, 38, 502);
        this._breathCooldown = Math.max(0, this._breathCooldown - delta);
        if (this._isWindingUp) {
            this._drawShovel(this._previewGfx, this._facingAngle, 0xffcc88, 0.4, 0, 0);
            this.setVelocity(0, 0);
            return;
        }
        if (this._isFiring) {
            this.setVelocity(0, 0);
            return;
        }
        const cloneAlive = (clone === null || clone === void 0 ? void 0 : clone.active) && !clone._dead;
        let target = player;
        if (cloneAlive) {
            const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);
            if (dc < dp)
                target = clone;
        }
        this._facingAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        this.setFlipX(target.x >= this.x);
        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        if (dist <= this.breathRange && this._breathCooldown <= 0) {
            this._breathCooldown = Phaser.Math.Between(3500, 5000);
            this.setVelocity(0, 0);
            this._startBreath();
            return;
        }
        if (dist > this.breathRange) {
            const a = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
            const snap8 = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
            this.setVelocity(Math.cos(snap8) * this.speed, Math.sin(snap8) * this.speed);
        }
        else {
            this.setVelocity(0, 0);
        }
        this.play('demon-idle', true);
    }
}
window.VoidDemon = VoidDemon;
export default VoidDemon;
