import * as Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();

    const base = 'game-assets/';

    // Player spritesheets (128px wide frames, 64px tall)
    this.load.spritesheet('player-idle',   base + 'characters/player/Bridge%20Heroine/Heroine%20base/Spritesheets/idle.png',   { frameWidth: 128, frameHeight: 64 });
    this.load.spritesheet('player-run',    base + 'characters/player/Bridge%20Heroine/Heroine%20base/Spritesheets/run.png',    { frameWidth: 128, frameHeight: 64 });
    this.load.spritesheet('player-attack', base + 'characters/player/Bridge%20Heroine/Heroine%20base/Spritesheets/attack.png', { frameWidth: 128, frameHeight: 64 });

    // Mutant Toad spritesheets (80px wide frames, 64px tall)
    this.load.spritesheet('toad-idle',   base + 'characters/enemies/mutant-toad/Spritesheets/mutant-toad-idle.png',   { frameWidth: 80, frameHeight: 64 });
    this.load.spritesheet('toad-jump',   base + 'characters/enemies/mutant-toad/Spritesheets/mutant-toad-jump.png',   { frameWidth: 80, frameHeight: 64 });
    this.load.spritesheet('toad-attack', base + 'characters/enemies/mutant-toad/Spritesheets/mutant-toad-attack.png', { frameWidth: 80, frameHeight: 64 });

    // Hell Hound spritesheets (64px wide frames, 48px tall)
    this.load.spritesheet('hound-idle',   base + 'characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-idle.png',   { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet('hound-run',    base + 'characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-run.png',    { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet('hound-attack', base + 'characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-attack.png', { frameWidth: 64, frameHeight: 48 });

    // Enemy death effect (64×64 per frame — 8 frames)
    this.load.spritesheet('enemy-death', base + 'effects/EnemyDeath/enemy-death.png', { frameWidth: 64, frameHeight: 64 });

    // Dash spark trail (63×32 per frame — 5 frames)
    this.load.spritesheet('dash-spark', base + 'effects/dash-spark.png', { frameWidth: 63, frameHeight: 32 });

    // Plague Crow
    this.load.spritesheet('crow-fly',  base + 'characters/enemies/plague-crow/plague-crow-fly.png',  { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('crow-idle', base + 'characters/enemies/plague-crow/plague-crow-idle.png', { frameWidth: 48, frameHeight: 48 });

    // Void Demon
    this.load.spritesheet('demon-idle',             base + 'characters/enemies/void-demon/Spritesheets/demon-idle.png',             { frameWidth: 256, frameHeight: 144 });
    this.load.spritesheet('demon-attack-no-breath', base + 'characters/enemies/void-demon/Spritesheets/demon-attack-no-breath.png', { frameWidth: 256, frameHeight: 144 });
    this.load.spritesheet('demon-breath',           base + 'characters/enemies/void-demon/Spritesheets/breath-fire.png',            { frameWidth: 100, frameHeight: 96  });

    // Slash effects (52×56 per frame × 5; 65×40 per frame × 5)
    this.load.spritesheet('slash-upward',     base + 'effects/slashes/slash-upward.png',     { frameWidth: 52, frameHeight: 56 });
    this.load.spritesheet('slash-horizontal', base + 'effects/slashes/slash-horizontal.png', { frameWidth: 65, frameHeight: 40 });

    // Custom cursor
    this.load.image('cursor-dagger', base + 'weapons/Dagger/dagger.png');

    // Gems — load as spritesheet; each gem cell is 16×16 (frame 0 = top-left)
    this.load.spritesheet('gems', base + 'ui/gems-spritesheet.png', { frameWidth: 16, frameHeight: 16 });

    // Cursor sword
    this.load.image('cursor-sword', base + 'weapons/fantasy%20weapons%20set/PNG/1.png');

    // Environment
    this.load.spritesheet('top-down-forest-tileset', base + 'environments/top-down-forest-tileset.png', { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    const pg = this.make.graphics({ x: 0, y: 0 });
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture('dash-particle', 8, 8);
    pg.destroy();

    this.createAnimations();
    // this.scene.start('TitleScene');
    this.scene.start('GameScene', { debug: true });
  }

  createLoadingBar(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, 400, 20, 0x333333);
    const bar = this.add.rectangle(w / 2 - 200, h / 2, 0, 20, 0xffd700).setOrigin(0, 0.5);
    this.add.text(w / 2, h / 2 - 40, 'Loading...', { fontSize: '24px', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 400 * value;
    });
  }

  createAnimations(): void {
    this.anims.create({ key: 'player-idle', frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'player-run', frames: this.anims.generateFrameNumbers('player-run', { start: 0, end: 6 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'player-attack', frames: this.anims.generateFrameNumbers('player-attack', { start: 0, end: 4 }), frameRate: 14, repeat: 0 });

    this.anims.create({ key: 'toad-idle', frames: this.anims.generateFrameNumbers('toad-idle', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'toad-jump', frames: this.anims.generateFrameNumbers('toad-jump', { start: 0, end: 3 }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'toad-attack', frames: this.anims.generateFrameNumbers('toad-attack', { start: 0, end: 2 }), frameRate: 10, repeat: 0 });

    this.anims.create({ key: 'hound-idle', frames: this.anims.generateFrameNumbers('hound-idle', { start: 0, end: 10 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'hound-run', frames: this.anims.generateFrameNumbers('hound-run', { start: 0, end: 4 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: 'hound-attack', frames: this.anims.generateFrameNumbers('hound-attack', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });

    this.anims.create({ key: 'crow-fly', frames: this.anims.generateFrameNumbers('crow-fly', { start: 0, end: 1 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'crow-idle', frames: this.anims.generateFrameNumbers('crow-idle', { start: 0, end: 2 }), frameRate: 6, repeat: -1 });

    this.anims.create({ key: 'demon-idle', frames: this.anims.generateFrameNumbers('demon-idle', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'demon-attack-no-breath', frames: this.anims.generateFrameNumbers('demon-attack-no-breath', { start: 0, end: 17 }), frameRate: 13, repeat: -1 });
    this.anims.create({ key: 'demon-breath', frames: this.anims.generateFrameNumbers('demon-breath', { start: 0, end: 7 }), frameRate: 12, repeat: 0 });

    this.anims.create({ key: 'slash-upward', frames: this.anims.generateFrameNumbers('slash-upward', { start: 0, end: 4 }), frameRate: 50, repeat: 0 });
    this.anims.create({ key: 'slash-horizontal', frames: this.anims.generateFrameNumbers('slash-horizontal', { start: 0, end: 4 }), frameRate: 50, repeat: 0 });

    this.anims.create({ key: 'enemy-death-anim', frames: this.anims.generateFrameNumbers('enemy-death', { start: 0, end: 7 }), frameRate: 14, repeat: 0 });
    this.anims.create({ key: 'dash-spark', frames: this.anims.generateFrameNumbers('dash-spark', { start: 0, end: 4 }), frameRate: 25, repeat: 0 });
  }
}

// expose for legacy runtime
(window as any).BootScene = BootScene;
