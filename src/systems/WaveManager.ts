import * as Phaser from "phaser";
import GameUI from "./GameUI";

/** Subset of GameScene that WaveManager needs. */
interface IWaveScene extends Phaser.Scene {
  ui: GameUI;
  waveText?: Phaser.GameObjects.Text;
  spawnWave?(toadCount: number, houndCount: number, crowCount: number, demonCount: number): void;
}

export default class WaveManager {
  private _scene: IWaveScene;
  private _enemiesRemaining: number;
  private _betweenWaves: boolean;

  public currentWave: number;

  constructor(scene: IWaveScene) {
    this._scene = scene;
    this._enemiesRemaining = 0;
    this._betweenWaves = true;

    this.currentWave = 0;
  }

  start(): void {
    this._scene.time.delayedCall(800, () => this._launchWave());
  }

  _launchWave(): void {
    this.currentWave++;
    this._betweenWaves = false;

    const toadCount = 2 + Math.floor(this.currentWave * 1.3);
    const houndCount = Math.floor(this.currentWave * 0.8);
    const crowCount = this.currentWave >= 2 ? 1 + Math.floor((this.currentWave - 2) * 0.6) : 0;
    const demonCount = this.currentWave >= 3 ? Math.floor((this.currentWave - 3) * 0.5) + 1 : 0;

    this._enemiesRemaining = toadCount + houndCount + crowCount + demonCount;

    this._scene.ui.updateHudPhase(`WAVE ${this.currentWave}`);
    this._scene.spawnWave?.(toadCount, houndCount, crowCount, demonCount);
  }

  onEnemyKilled(): void {
    this._enemiesRemaining = Math.max(0, this._enemiesRemaining - 1);

    if (this._enemiesRemaining === 0 && !this._betweenWaves) {
      this._betweenWaves = true;
      this._scene.time.delayedCall(2800, () => this._launchWave());
    }
  }
}

window.WaveManager = WaveManager;
