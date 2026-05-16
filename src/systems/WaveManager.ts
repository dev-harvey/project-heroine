import * as Phaser from "phaser";
import { eventBus, GameEvents } from "./EventBus";

export default class WaveManager {
  private clock: Phaser.Time.Clock;
  private enemiesRemaining: number;
  private betweenWaves: boolean;

  public currentWave: number;

  private onEntityDeathHandler = (payload: GameEvents["entity:death"]) => this.onEntityDeath(payload.entity);

  constructor(clock: Phaser.Time.Clock) {
    this.clock = clock;
    this.enemiesRemaining = 0;
    this.betweenWaves = true;

    this.currentWave = 0;

    eventBus.on("entity:death", this.onEntityDeathHandler);
  }

  start(): void {
    this.clock.delayedCall(800, () => this.launchWave());
  }

  private launchWave(): void {
    this.currentWave++;
    this.betweenWaves = false;
    this.enemiesRemaining = this.currentWave * 4;
    eventBus.emit("wave:start", { waveNumber: this.currentWave });
  }

  private onEntityDeath(entity: IEntity) {
    if (entity.isEntityType("enemy")) {
      this.onEnemyKilled();
    }
  }

  onEnemyKilled(): void {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);

    if (this.enemiesRemaining === 0 && !this.betweenWaves) {
      this.betweenWaves = true;
      this.clock.delayedCall(2000, () => this.launchWave());
    }
  }

  destroyEvents() {
    eventBus.off("entity:death", this.onEntityDeathHandler);
  }
}
