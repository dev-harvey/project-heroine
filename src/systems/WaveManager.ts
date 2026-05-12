import * as Phaser from "phaser";
import GameUI from "./GameUI";

/** Subset of GameScene that WaveManager needs. */
interface IWaveScene extends Phaser.Scene {
  ui: GameUI;
  waveText?: Phaser.GameObjects.Text;
  spawnWave?(waveNumber: number): void;
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

    this.scene.ui.updateHudPhase(`WAVE ${this.currentWave}`);
    this.scene.spawnWave?.(this.currentWave);
    this.enemiesRemaining = this.currentWave * 4;
    
  }

  onEnemyKilled(): void {
    console.log('death');
    console.log(this.enemiesRemaining);
    console.log('-----');
    
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);

    if (this.enemiesRemaining === 0 && !this.betweenWaves) {
      this.betweenWaves = true;
      this.scene.time.delayedCall(2000, () => this.launchWave());
    }
  }
}