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
    // this.scene.start('TitleScene');
    this.scene.start("GameScene", { debug: true });
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
    /* Player Idle */
    this.anims.create({ key: "player-idle", frames: this.anims.generateFrameNumbers("player-idle", { start: 0, end: 39 }), frameRate: 6, repeat: -1 });

    this.anims.create({ key: "player-walk-down", frames: this.anims.generateFrameNumbers("player-walk", { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-walk-left", frames: this.anims.generateFrameNumbers("player-walk", { start: 6, end: 11 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-walk-right", frames: this.anims.generateFrameNumbers("player-walk", { start: 12, end: 17 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-walk-up", frames: this.anims.generateFrameNumbers("player-walk", { start: 18, end: 23 }), frameRate: 6, repeat: -1 });

    this.anims.create({ key: "player-run-down", frames: this.anims.generateFrameNumbers("player-run", { start: 0, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-run-left", frames: this.anims.generateFrameNumbers("player-run", { start: 8, end: 15 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-run-right", frames: this.anims.generateFrameNumbers("player-run", { start: 16, end: 23 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: "player-run-up", frames: this.anims.generateFrameNumbers("player-run", { start: 24, end: 31 }), frameRate: 6, repeat: -1 });

    this.anims.create({ key: "player-attack-down", frames: this.anims.generateFrameNumbers("player-attack", { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "player-attack-left", frames: this.anims.generateFrameNumbers("player-attack", { start: 8, end: 15 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "player-attack-right", frames: this.anims.generateFrameNumbers("player-attack", { start: 16, end: 23 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "player-attack-up", frames: this.anims.generateFrameNumbers("player-attack", { start: 24, end: 31 }), frameRate: 16, repeat: 0 });

    this.anims.create({ key: "player-hurt-down", frames: this.anims.generateFrameNumbers("player-hurt", { start: 0, end: 4 }), frameRate: 20, repeat: 0 });
    this.anims.create({ key: "player-hurt-left", frames: this.anims.generateFrameNumbers("player-hurt", { start: 5, end: 9 }), frameRate: 20, repeat: 0 });
    this.anims.create({ key: "player-hurt-right", frames: this.anims.generateFrameNumbers("player-hurt", { start: 10, end: 14 }), frameRate: 20, repeat: 0 });
    this.anims.create({ key: "player-hurt-up", frames: this.anims.generateFrameNumbers("player-hurt", { start: 15, end: 19 }), frameRate: 20, repeat: 0 });

    this.anims.create({ key: "player-death", frames: this.anims.generateFrameNumbers("player-death", { start: 0, end: 6 }), frameRate: 6, repeat: 0 });

    /** EFFECTS **/
    
    this.anims.create({ key: "anchor-indicator", frames: this.anims.generateFrameNumbers("anchor-indicator", { start: 0, end: 7 }), frameRate: 8, repeat: -1 });

    this.anims.create({ key: "attack-indicator", frames: this.anims.generateFrameNumbers("attack-indicator", { start: 0, end: 5 }), frameRate: 10, repeat: 0 });

    /*** ENEMIES ***/

    /* Orc 01 - OrcBasic */

    this.anims.create({ key: "orc-basic-idle", frames: this.anims.generateFrameNumbers("orc-basic-idle", { start: 0, end: 3 }), frameRate: 12, repeat: -1 });
    
    this.anims.create({ key: "orc-basic-walk-down", frames: this.anims.generateFrameNumbers("orc-basic-walk", { start: 0, end: 5 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-walk-up", frames: this.anims.generateFrameNumbers("orc-basic-walk", { start: 6, end: 11 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-walk-left", frames: this.anims.generateFrameNumbers("orc-basic-walk", { start: 12, end: 17 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-walk-right", frames: this.anims.generateFrameNumbers("orc-basic-walk", { start: 18, end: 23 }), frameRate: 16, repeat: 0 });

    this.anims.create({ key: "orc-basic-run-down", frames: this.anims.generateFrameNumbers("orc-basic-run", { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-run-up", frames: this.anims.generateFrameNumbers("orc-basic-run", { start: 8, end: 15 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-run-left", frames: this.anims.generateFrameNumbers("orc-basic-run", { start: 16, end: 23 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-run-right", frames: this.anims.generateFrameNumbers("orc-basic-run", { start: 24, end: 31 }), frameRate: 16, repeat: 0 });

    this.anims.create({ key: "orc-basic-attack-down", frames: this.anims.generateFrameNumbers("orc-basic-attack", { start: 0, end: 7 }), frameRate: 8, repeat: 0 });
    this.anims.create({ key: "orc-basic-attack-up", frames: this.anims.generateFrameNumbers("orc-basic-attack", { start: 8, end: 15 }), frameRate: 8, repeat: 0 });
    this.anims.create({ key: "orc-basic-attack-left", frames: this.anims.generateFrameNumbers("orc-basic-attack", { start: 16, end: 23 }), frameRate: 8, repeat: 0 });
    this.anims.create({ key: "orc-basic-attack-right", frames: this.anims.generateFrameNumbers("orc-basic-attack", { start: 24, end: 31 }), frameRate: 8, repeat: 0 });

    this.anims.create({ key: "orc-basic-hurt-down", frames: this.anims.generateFrameNumbers("orc-basic-hurt", { start: 0, end: 5 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-hurt-up", frames: this.anims.generateFrameNumbers("orc-basic-hurt", { start: 6, end: 11 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-hurt-left", frames: this.anims.generateFrameNumbers("orc-basic-hurt", { start: 12, end: 17 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: "orc-basic-hurt-right", frames: this.anims.generateFrameNumbers("orc-basic-hurt", { start: 18, end: 23 }), frameRate: 16, repeat: 0 });

    this.anims.create({ key: "orc-basic-death", frames: this.anims.generateFrameNumbers("orc-basic-death", { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
  }
}