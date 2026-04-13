class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
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
    this.load.spritesheet('hound-idle', base + 'characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-idle.png', { frameWidth: 64, frameHeight: 48 });
    this.load.spritesheet('hound-run',  base + 'characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-run.png',  { frameWidth: 64, frameHeight: 48 });

    // Enemy death effect (48px wide frames, 48px tall — 8 frames)
    this.load.spritesheet('enemy-death', base + 'effects/EnemyDeath/spritesheet.png', { frameWidth: 48, frameHeight: 48 });

    // Environment — loaded both ways so M2 can build a proper tilemap
    this.load.image('dungeon-tileset', base + 'environments/single-dungeon-crawler/PNG/dungeon-tileset.png');
    this.load.spritesheet('dungeon-tiles-sheet', base + 'environments/single-dungeon-crawler/PNG/dungeon-tileset.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    this.createAnimations();
    this.scene.start('GameScene');
  }

  createLoadingBar() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const barBg = this.add.rectangle(w / 2, h / 2, 400, 20, 0x333333);
    const bar   = this.add.rectangle(w / 2 - 200, h / 2, 0, 20, 0xffd700).setOrigin(0, 0.5);
    this.add.text(w / 2, h / 2 - 40, 'Loading...', { fontSize: '24px', fill: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 400 * value;
    });
  }

  createAnimations() {
    // ── Player ──────────────────────────────────────────────
    this.anims.create({
      key: 'player-idle',
      frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player-run',
      frames: this.anims.generateFrameNumbers('player-run', { start: 0, end: 6 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'player-attack',
      frames: this.anims.generateFrameNumbers('player-attack', { start: 0, end: 4 }),
      frameRate: 14,
      repeat: 0
    });

    // ── Mutant Toad ─────────────────────────────────────────
    this.anims.create({
      key: 'toad-idle',
      frames: this.anims.generateFrameNumbers('toad-idle', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'toad-jump',
      frames: this.anims.generateFrameNumbers('toad-jump', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'toad-attack',
      frames: this.anims.generateFrameNumbers('toad-attack', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: 0
    });

    // ── Hell Hound ──────────────────────────────────────────
    this.anims.create({
      key: 'hound-idle',
      frames: this.anims.generateFrameNumbers('hound-idle', { start: 0, end: 10 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'hound-run',
      frames: this.anims.generateFrameNumbers('hound-run', { start: 0, end: 4 }),
      frameRate: 12,
      repeat: -1
    });

    // ── Effects ─────────────────────────────────────────────
    this.anims.create({
      key: 'enemy-death-anim',
      frames: this.anims.generateFrameNumbers('enemy-death', { start: 0, end: 7 }),
      frameRate: 14,
      repeat: 0
    });
  }
}
