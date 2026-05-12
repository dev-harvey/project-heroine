import * as Phaser from "phaser";
import { GAME_COLORS, GAME_CONFIG } from "../utils/constants";
import { colorToHex } from "../utils/utils";

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(data: GameOverData = {}): void {
    this.input.setDefaultCursor("default");

    const wave = data.wave ?? 0;
    const kills = data.kills ?? 0;
    const cloneKills = data.cloneKills ?? 0;

    const W = GAME_CONFIG.GAME_WIDTH,
      H = GAME_CONFIG.GAME_HEIGHT;
    const mono = '"Courier New", Courier, monospace';
    const t = (sz: number, col: string, stroke = false) => ({ fontSize: `${sz}px`, fill: col, fontFamily: "Oswald, sans-serif", ...(stroke ? { stroke: "#000000", strokeThickness: 3 } : {}) });

    this.add.rectangle(W / 2, H / 2, W, H, GAME_COLORS.MIDNIGHT, 1).setDepth(0);

    const row = (lx: number, rx: number, y: number, label: string, val: any, lCol: string, sz = 20) => {
      this.add
        .text(lx, y, `${label}: ${String(val)}`, t(sz, lCol))
        .setOrigin(0.5, 0.5)
        .setDepth(2);
    };

    const hdr = (x: number, y: number, label: string) => {
      this.add
        .text(x, y, label, t(32, colorToHex(GAME_COLORS.SILVER)))
        .setOrigin(0.5, 0.5)
        .setDepth(2);
    };

    const LX = W / 4,
      LR = W / 2,
      LC = (LX * 2 + LR) / 2;
    let ly = 60;

    this.add
      .text(LC, ly, "YOU DIED", { ...t(100, colorToHex(GAME_COLORS.CRIMSON)) })
      .setOrigin(0.5, 0)
      .setDepth(2);
    ly += 160;

    const respawnBtn = this.add
      .text(LC, ly, "RESPAWN", { ...t(48, colorToHex(GAME_COLORS.JADE)) })
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    respawnBtn.on("pointerover", () => respawnBtn.setStyle({ fill: "#ffffff" }));
    respawnBtn.on("pointerout", () => respawnBtn.setStyle({ fill: colorToHex(GAME_COLORS.JADE) }));
    respawnBtn.on("pointerdown", () => this.respawn());
    this.input.keyboard.once("keydown-ENTER", () => this.respawn());
    this.input.keyboard.once("keydown-SPACE", () => this.respawn());
    ly += 100;

    hdr(LC, ly, "THIS RUN");
    ly += 38;
    for (const [label, val] of [
      ["Waves Survived", wave],
      ["Player Kills", kills],
      ["Clone Kills", cloneKills],
    ] as [string, number][]) {
      row(W / 2, LR, ly, label, val, colorToHex(GAME_COLORS.SILVER));
      ly += 28;
    }
  }

  private respawn(): void {
    this.scene.start("TitleScene");
  }
}
