class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data) {
    const wave  = data?.wave  ?? 0;
    const kills = data?.kills ?? 0;

    const cx = 480, cy = 270;
    const mono = '"Courier New", Courier, monospace';

    // Dark overlay
    this.add.rectangle(cx, cy, 960, 540, 0x000000, 0.75);

    // Title
    this.add.text(cx, cy - 120, 'YOU DIED', {
      fontSize: '72px',
      fill: '#cc2233',
      fontFamily: mono,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Stats
    this.add.text(cx, cy - 10, `Waves Survived:  ${wave}`, {
      fontSize: '26px',
      fill: '#ffffff',
      fontFamily: mono,
    }).setOrigin(0.5);

    this.add.text(cx, cy + 38, `Enemies Killed:  ${kills}`, {
      fontSize: '26px',
      fill: '#aaffaa',
      fontFamily: mono,
    }).setOrigin(0.5);

    // Restart button
    const btn = this.add.text(cx, cy + 130, '[ PLAY AGAIN ]', {
      fontSize: '34px',
      fill: '#ffd700',
      fontFamily: mono,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setStyle({ fill: '#ffffff' }));
    btn.on('pointerout',   () => btn.setStyle({ fill: '#ffd700' }));
    btn.on('pointerdown',  () => this.scene.start('GameScene'));

    // Keyboard shortcut: Enter / Space to restart
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
