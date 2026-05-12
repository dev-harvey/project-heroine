import * as Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.createLoadingBar();

    const base = "game-assets/";

    /* Player */
    this.load.spritesheet("player-idle", base + "characters/player/idle.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("player-walk", base + "characters/player/walk.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("player-run", base + "characters/player/run.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("player-attack", base + "characters/player/attack.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("player-hurt", base + "characters/player/hurt.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("player-death", base + "characters/player/death.png", { frameWidth: 64, frameHeight: 64 });

    /* Orc-01 */
    this.load.spritesheet("orc-basic-idle", base + "characters/enemies/orc-basic/idle.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("orc-basic-walk", base + "characters/enemies/orc-basic/walk.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("orc-basic-run", base + "characters/enemies/orc-basic/run.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("orc-basic-attack", base + "characters/enemies/orc-basic/attack.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("orc-basic-hurt", base + "characters/enemies/orc-basic/hurt.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("orc-basic-death", base + "characters/enemies/orc-basic/death.png", { frameWidth: 64, frameHeight: 64 });

    /* Effects */
    this.load.spritesheet("anchor-indicator", base + "effects/anchor-indicator.png", { frameWidth: 128, frameHeight: 96 });
    this.load.spritesheet("attack-indicator", base + "effects/attack-indicator.png", { frameWidth: 32, frameHeight: 32 });

    /* UI Assets */

    this.load.image("cursor", base + "ui/cursor-01.png");

    this.load.image("heart", base + "ui/heart.png");
    this.load.image("heart-empty", base + "ui/heart-empty.png");

    this.load.image("attack-icon", base + "ui/sword-01.png");

    /* Environment Assets */

    this.load.spritesheet("top-down-forest-tileset", base + "environments/top-down-forest-tileset.png", { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    this.createAnimations();
    this.scene.start("TitleScene");
  }

  createLoadingBar(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, 400, 20, 0x333333);
    const bar = this.add.rectangle(w / 2 - 200, h / 2, 0, 20, 0xffd700).setOrigin(0, 0.5);
    this.add.text(w / 2, h / 2 - 40, "Loading...", { fontSize: "24px", color: "#ffffff", fontFamily: "monospace" }).setOrigin(0.5);

    this.load.on("progress", (value: number) => {
      bar.width = 400 * value;
    });
  }

  createAnimations(): void {
    const createDirectional = (prefix: string, action: string, texture: string, framesPerDir: number, frameRate: number, repeat: number, dirs: readonly string[]) => {
      dirs.forEach((dir, i) => {
        const start = i * framesPerDir;
        this.anims.create({
          key: `${prefix}-${action}-${dir}`,
          frames: this.anims.generateFrameNumbers(texture, { start, end: start + framesPerDir - 1 }),
          frameRate,
          repeat,
        });
      });
    };

    /* Player */
    const playerDirs = ["down", "left", "right", "up"];
    this.anims.create({ key: "player-idle", frames: this.anims.generateFrameNumbers("player-idle", { start: 0, end: 39 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-death", frames: this.anims.generateFrameNumbers("player-death", { start: 0, end: 6 }), frameRate: 6, repeat: 0 });
    createDirectional("player", "walk", "player-walk", 6, 6, -1, playerDirs);
    createDirectional("player", "run", "player-run", 8, 6, -1, playerDirs);
    createDirectional("player", "attack", "player-attack", 8, 16, 0, playerDirs);
    createDirectional("player", "hurt", "player-hurt", 5, 20, 0, playerDirs);

    /* Effects */
    this.anims.create({ key: "anchor-indicator", frames: this.anims.generateFrameNumbers("anchor-indicator", { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: "attack-indicator", frames: this.anims.generateFrameNumbers("attack-indicator", { start: 0, end: 5 }), frameRate: 10, repeat: 0 });

    /* Orc Basic */
    const orcDirs = ["down", "up", "left", "right"];
    this.anims.create({ key: "orc-basic-idle", frames: this.anims.generateFrameNumbers("orc-basic-idle", { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: "orc-basic-death", frames: this.anims.generateFrameNumbers("orc-basic-death", { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
    createDirectional("orc-basic", "walk", "orc-basic-walk", 6, 16, 0, orcDirs);
    createDirectional("orc-basic", "run", "orc-basic-run", 8, 16, 0, orcDirs);
    createDirectional("orc-basic", "attack", "orc-basic-attack", 8, 8, 0, orcDirs);
    createDirectional("orc-basic", "hurt", "orc-basic-hurt", 6, 16, 0, orcDirs);
  }
}
