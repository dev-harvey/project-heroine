import * as Phaser from "phaser";
import GameUI from "./GameUI";

/** Subset of GameScene that WaveManager needs. */
interface IWaveScene extends Phaser.Scene {
  ui: GameUI;
  waveText?: Phaser.GameObjects.Text;
  spawnWave?(toadCount: number, houndCount: number, crowCount: number, demonCount: number): void;
}

export default class WaveManager {
  private scene: IWaveScene;
  private enemiesRemaining: number;
  private betweenWaves: boolean;

  public currentWave: number;

  constructor(scene: IWaveScene) {
    this.scene = scene;
    this.enemiesRemaining = 0;
    this.betweenWaves = true;

    this.currentWave = 0;
  }

  start(): void {
    this.scene.time.delayedCall(800, () => this.launchWave());
  }

  private launchWave(): void {
    this.currentWave++;
    this.betweenWaves = false;

    const toadCount = 2 + Math.floor(this.currentWave * 1.3);
    const houndCount = Math.floor(this.currentWave * 0.8);
    const crowCount = this.currentWave >= 2 ? 1 + Math.floor((this.currentWave - 2) * 0.6) : 0;
    const demonCount = this.currentWave >= 3 ? Math.floor((this.currentWave - 3) * 0.5) + 1 : 0;

    this.enemiesRemaining = toadCount + houndCount + crowCount + demonCount;

    this.scene.ui.updateHudPhase(`WAVE ${this.currentWave}`);
    this.scene.spawnWave?.(toadCount, houndCount, crowCount, demonCount);
  }

  // onEnemyKilled(): void {
  //   this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);

  //   if (this.enemiesRemaining === 0 && !this.betweenWaves) {
  //     this.betweenWaves = true;
  //     this.scene.time.delayedCall(2800, () => this.launchWave());
  //   }
  // }
}