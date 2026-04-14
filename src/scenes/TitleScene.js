class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.input.setDefaultCursor('default');

    const W = 960, H = 540;
    const mono = '"Courier New", Courier, monospace';
    const t = (sz, col, stroke = false) => ({
      fontSize: `${sz}px`, fill: col, fontFamily: mono,
      ...(stroke ? { stroke: '#000000', strokeThickness: 4 } : {}),
    });

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0618);

    // Subtle grid lines
    const g = this.add.graphics();
    g.lineStyle(1, 0x1a0a2e, 1);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);

    // Title
    this.add.text(W / 2, 160, 'PROJECT HEROINE', {
      ...t(64, '#ffffff', true),
      strokeThickness: 6,
      stroke: '#330066',
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, 220, 'an arena roguelite', t(16, '#664488'))
      .setOrigin(0.5, 0.5);

    // Horizontal rule
    const hr = this.add.graphics();
    hr.lineStyle(1, 0x553366, 0.8);
    hr.lineBetween(W / 2 - 200, 248, W / 2 + 200, 248);

    // START button
    const startBtn = this.add.text(W / 2, 310, '[ START GAME ]', {
      ...t(30, '#ffd700', true),
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setStyle({ fill: '#ffffff' }));
    startBtn.on('pointerout',  () => startBtn.setStyle({ fill: '#ffd700' }));
    startBtn.on('pointerdown', () => this._start(false));

    // DEBUG button
    const debugBtn = this.add.text(W / 2, 370, '[ DEBUG MODE ]', {
      ...t(16, '#555555'),
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    debugBtn.on('pointerover', () => debugBtn.setStyle({ fill: '#aa66cc' }));
    debugBtn.on('pointerout',  () => debugBtn.setStyle({ fill: '#555555' }));
    debugBtn.on('pointerdown', () => this._start(true));

    // Keyboard shortcut
    this.input.keyboard.once('keydown-ENTER', () => this._start(false));
    this.input.keyboard.once('keydown-SPACE', () => this._start(false));

    // Version / flavour text
    this.add.text(W / 2, H - 16, 'Milestone 3', t(11, '#333333')).setOrigin(0.5, 1);
  }

  _start(debug) {
    this.scene.start('GameScene', { debug });
  }
}
