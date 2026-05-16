import * as Phaser from "phaser";

export interface GameEvents {
  "clone:summoned": { clone: IClone };
  "clone:dismissed": { clone: IClone };
  "entity:dash": {entity: IEntity, entityType: string; direction: OctoDir };
  "entity:attack": {entity: IEntity, entityType: string; direction: CardinalDir };
  "entity:death": { entity: IEntity; entityType: string; };
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
