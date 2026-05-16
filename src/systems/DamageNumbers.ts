import * as Phaser from "phaser";
import { DEPTH, GAME_CONFIG, UI_CONFIG } from "../utils/constants";
import { colorToHex } from "../utils/utils";
import { eventBus, GameEvents } from "./EventBus";
import GameScene from "../scenes/GameScene";

export default class DamageNumbers {
  private scene: GameScene;
  private onEntityHurtHandler = (payload: GameEvents["entity:hurt"]) => this.spawnDamageNumber(payload.entity, payload.amount);

  constructor(scene: GameScene) {
    this.scene = scene;

    eventBus.on("entity:hurt", this.onEntityHurtHandler);
  }

  private spawnDamageNumber(entity: IEntity, amount: number) {
    const drift = Phaser.Math.Between(-10, 10);
    const entityHeight = entity.body.height;
    const txt = this.scene.add
      .text(entity.x, entity.y - entityHeight, `${amount}`, {
        fontSize: `12px`,
        color: "#ffffff",
        fontFamily: UI_CONFIG.BODY_FONT,
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.FLOATING)
      .setScale(0);
    this.scene.uiCamera?.ignore(txt);

    if (entity.isEntityType("player")) {
      txt.setColor(colorToHex(GAME_CONFIG.DAMAGE_NUMBERS_COLORS.PLAYER));
    } else if (entity.isEntityType("clone")) {
      txt.setColor(colorToHex(GAME_CONFIG.DAMAGE_NUMBERS_COLORS.CLONE));
    } else if (entity.isEntityType("enemy")) {
      txt.setColor(colorToHex(GAME_CONFIG.DAMAGE_NUMBERS_COLORS.ENEMY));
    }

    this.scene.tweens.chain({
      tweens: [
        {
          targets: txt,
          scale: { from: 0, to : 1 },
          duration: 150,
          ease: "Back.easeOut",
        },
        {
          targets: txt,
          y: txt.y - entityHeight,
          x: txt.x + drift,
          alpha: { from: 1, to: 0 },
          scale: { from: 1, to: 0 },
          duration: 400,
          ease: "Sine.easeIn",
          onComplete: () => txt.destroy(),
        },
      ],
    });
  }

  destroyEvents() {
    eventBus.off("entity:hurt", this.onEntityHurtHandler);
  }
}
