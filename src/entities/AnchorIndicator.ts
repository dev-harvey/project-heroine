import * as Phaser from "phaser";

import { GAME_COLORS, PLAYER_CONFIG } from "../utils/constants";
import Player from "./Player";

export default class AnchorIndicator extends Phaser.Physics.Arcade.Sprite {
  public targetPlayer: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    super(scene, player.x, player.y, "anchor-indicator");
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.targetPlayer = player;

    this.setCollideWorldBounds(true);
    this.setDepth(PLAYER_CONFIG.DEPTH);

    this.setDisplaySize(48, 36);

    this.setTint(GAME_COLORS.GOLD);
    this.setBlendMode("ADD");

    this.play("anchor-indicator");
  }

  update() {
    this.scene.tweens.add({ targets: this, x: this.targetPlayer.anchorIndicatorPosition.x, y: this.targetPlayer.anchorIndicatorPosition.y, duration: 50, ease: "linear" });
  }
}
