class WaveManager {
  constructor(scene) {
    this.scene            = scene;
    this.currentWave      = 0;
    this.enemiesRemaining = 0;
    this.betweenWaves     = true;
  }

  // Call once to kick off the first wave
  start() {
    this.scene.time.delayedCall(800, () => this._launchWave());
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  _launchWave() {
    this.currentWave++;
    this.betweenWaves = false;

    // Enemy counts scale with wave number
    const toadCount  = 2 + Math.floor(this.currentWave * 1.3);
    const houndCount = Math.floor(this.currentWave * 0.8);

    this.enemiesRemaining = toadCount + houndCount;

    this.scene.showAnnouncement(`Wave ${this.currentWave}`, '#ffd700');
    this.scene.waveText.setText(`Wave ${this.currentWave}`);
    this.scene.spawnWave(toadCount, houndCount);
  }

  // ─── Called by GameScene whenever an enemy is killed ──────────────────────

  onEnemyKilled() {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);

    if (this.enemiesRemaining === 0 && !this.betweenWaves) {
      this.betweenWaves = true;
      this.scene.showAnnouncement('Wave Clear!', '#aaffaa');
      this.scene.time.delayedCall(2800, () => this._launchWave());
    }
  }
}
