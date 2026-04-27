import * as Phaser from "phaser";
import Player from "../entities/Player";
import Clone from "../entities/Clone";
import { UI_CONFIG } from "../utils/constants";

interface IGameScene extends Phaser.Scene {
  player: Player;
  clone: Clone | null;
  cursorSprite: Phaser.GameObjects.Image;
}

export default class GameUI {
  private _scene: IGameScene;
  private _player: Player;
  private _clone: Clone;

  private _playerContainer: {
    hpContainer: Phaser.GameObjects.Container;
  }

  constructor(scene: IGameScene, player: Player, clone: Clone) {
    this._scene = scene;
    this._player = player;
    this._clone = clone;
    this._build();
  }

  private _build(): void {
    this._buildCursor();
    this._buildPlayerStats();
  }

  private _buildCursor(): void {
    this._scene.input.setDefaultCursor("none");
    this._scene.cursorSprite = this._scene.add.image(0, 0, "cursor-sword").setOrigin(0.95, 0).setDepth(100).setScrollFactor(0);
  }

  private _buildPlayerStats() {
    this._playerContainer = {
      hpContainer: this._scene.add.container(36, 16).setDepth(20)
    };
    this._rebuildHearts();
  }

  private _rebuildHearts(): void {
    this._playerContainer.hpContainer.removeAll(true);
    for (let i = 0; i < this._player.maxHp; i++) {
      const filled = i < this._player.hp;
      this._playerContainer.hpContainer.add(
        filled
          ? this._scene.add
              .image(i * 32, 0, "heart")
              .setScale(0.5)
              .setOrigin(0, 0)
              .setDepth(100)
              .setScrollFactor(0)
          : this._scene.add
              .image(i * 32, 0, "heart-empty")
              .setScale(0.5)
              .setOrigin(0, 0)
              .setDepth(100)
              .setScrollFactor(0),
      );
    }
  }

  // TODO: pass in optional params for stroke and font. Potentially actually pass a config object that I can type as an interface.
  private makeText(x: number, y: number, content: string, size: number, color: string): Phaser.GameObjects.Text {
    return this._scene.add.text(x, y, content, {
      fontSize: `${size}px`,
      color: color,
      fontFamily: UI_CONFIG.BODY_FONT,
      stroke: "#000000",
      strokeThickness: 1,
    });
  }

  public rebuildHearts() {
    this._rebuildHearts();
  }
}
