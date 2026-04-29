import * as Phaser from "phaser";

import { GAME_CONFIG } from "../utils/constants";
import { angleToDir } from "../utils/utils";
import Entity from "./Entity";

// TODO: make enemies path to a point near the player, and they attack when they hit the line and are in attack range since they only attack in four directions it locks them to attacking at the exact angle. Might make attacking look less janky.

abstract class Enemy extends Entity implements IEnemy {
  declare protected gameScene: IEnemyGameScene;
  declare movement: IEnemyMovement;
  declare attack: IEnemyAttack;
  declare health: IEnemyHealth;
  
  lastAttacker?: "player" | "clone";

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.gameScene = scene as IEnemyGameScene;

    this.setCollideWorldBounds(true);
    this.setDepth(4);

    // TODO: enemy defaults, might not be needed with entity having defaults
    this.movement = {
      speed: 100,
      facingDir: "left"
    }
    this.attack = {
      damage: 1,
      range: 50,
      cooldown: 0,
      cooldownMax: 50,
      detectionZone: scene.physics.add.image(x, y, ""),
      dir: "left"
    }
    this.attack.detectionZone.body.enable = false;
  }

  // ── Shared methods ────────────────────────────────────────────────────


  die(): void {
    if (this.entityState === "dead") return;
    this.setEntityState("dead");
    // TODO: Add death animation
    this.gameScene.onEnemyKilled(this);
    this.destroy();
  }

  // Returns the closer of player/clone (clone must be alive to be considered)
  protected selectTarget(player: IPlayer, clone?: IClone | null): IAlly {
    if (!clone?.active || clone.entityState === "dead") return player;
    const dp = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const dc = Phaser.Math.Distance.Between(this.x, this.y, clone.x, clone.y);

    const target = dc < dp ? clone : player;
    return target;
  }

  // Clamps position to the playable arena area
  protected clampToBounds(): void {
    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;
    this.x = Phaser.Math.Clamp(this.x, GAME_WALL_X, GAME_WIDTH - GAME_WALL_X);
    this.y = Phaser.Math.Clamp(this.y, GAME_WALL_Y, GAME_HEIGHT - GAME_WALL_Y);
  }

  update(time: number, delta: number, player?: IPlayer, clone?: IClone | null): void {
    super.update(time, delta);
  }
}

export default Enemy;
