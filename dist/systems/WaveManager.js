export default class WaveManager {
    constructor(scene) {
        this.scene = scene;
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.betweenWaves = true;
    }
    // Call once to kick off the first wave
    start() {
        this.scene.time.delayedCall(800, () => this._launchWave());
    }
    // ─── Internal ──────────────────────────────────────────────────────────────
    _launchWave() {
        var _a, _b, _c, _d;
        this.currentWave++;
        this.betweenWaves = false;
        const toadCount = 2 + Math.floor(this.currentWave * 1.3);
        const houndCount = Math.floor(this.currentWave * 0.8);
        const crowCount = this.currentWave >= 2 ? 1 + Math.floor((this.currentWave - 2) * 0.6) : 0;
        const demonCount = this.currentWave >= 3 ? Math.floor((this.currentWave - 3) * 0.5) + 1 : 0;
        this.enemiesRemaining = toadCount + houndCount + crowCount + demonCount;
        (_b = (_a = this.scene).showAnnouncement) === null || _b === void 0 ? void 0 : _b.call(_a, `Wave ${this.currentWave}`, '#ffd700');
        if (this.scene.waveText)
            this.scene.waveText.setText(`Wave ${this.currentWave}`);
        (_d = (_c = this.scene).spawnWave) === null || _d === void 0 ? void 0 : _d.call(_c, toadCount, houndCount, crowCount, demonCount);
    }
    // ─── Called by GameScene whenever an enemy is killed ──────────────────────
    onEnemyKilled() {
        var _a, _b;
        this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
        if (this.enemiesRemaining === 0 && !this.betweenWaves) {
            this.betweenWaves = true;
            (_b = (_a = this.scene).showAnnouncement) === null || _b === void 0 ? void 0 : _b.call(_a, 'Wave Clear!', '#aaffaa');
            this.scene.time.delayedCall(2800, () => this._launchWave());
        }
    }
}
// Expose globally for the legacy script-based runtime (index.html loading dist/*.js).
window.WaveManager = WaveManager;
