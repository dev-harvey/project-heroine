import * as Phaser from "phaser";

export interface GameEvents {
  "clone:summoned": { clone: IClone };
  "clone:dismissed": { clone: IClone };
  "entity:attack": { entity: IEntity; direction: CardinalDir };
  "entity:dash": { entity: IEntity; direction: OctoDir };
  "entity:death": { entity: IEntity };
  "entity:hurt": { entity: IEntity, attacker: IEntity, amount: number };
  "wave:start": { waveNumber: number };
}

class EventBus extends Phaser.Events.EventEmitter {
  emit<Key extends keyof GameEvents>(event: Key, payload: GameEvents[Key]): boolean {
    return super.emit(event, payload);
  }

  on<Key extends keyof GameEvents>(event: Key, handler: (payload: GameEvents[Key]) => void): this {
    return super.on(event, handler);
  }

  off<Key extends keyof GameEvents>(event: Key, handler?: (payload: GameEvents[Key]) => void): this {
    return super.off(event, handler);
  }
}

export const eventBus = new EventBus();
