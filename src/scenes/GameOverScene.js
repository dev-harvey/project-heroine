class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data) {
    const wave         = data?.wave         ?? 0;
    const kills        = data?.kills        ?? 0;
    const cloneKills   = data?.cloneKills   ?? 0;
    const playerAtk    = data?.playerAtk    ?? 1;
    const playerMaxHp  = data?.playerMaxHp  ?? 5;
    const healGiven    = data?.healGiven    ?? 0;
    const permHpGained = data?.permHpGained ?? 0;
    const permAtkGained= data?.permAtkGained?? 0;

    const cx   = 480;
    const mono = '"Courier New", Courier, monospace';
    const s    = (sz, col) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    // Dark overlay
    this.add.rectangle(cx, 270, 960, 540, 0x000000, 0.82);

    const div = this.add.graphics();
    div.lineStyle(1, 0x553366, 0.8);

    let y = 38;

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(cx, y, 'YOU DIED', {
      ...s(68, '#cc2233'), stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5, 0);
    y += 78;

    // ── Play Again ───────────────────────────────────────────────────────────
    const btn = this.add.text(cx, y, '[ PLAY AGAIN ]', {
      ...s(30, '#ffd700'), stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setStyle({ fill: '#ffffff' }));
    btn.on('pointerout',   () => btn.setStyle({ fill: '#ffd700' }));
    btn.on('pointerdown',  () => this.scene.start('GameScene'));
    y += 46;

    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));

    div.lineBetween(cx - 220, y, cx + 220, y); y += 14;

    // ── Run Summary ──────────────────────────────────────────────────────────
    this.add.text(cx, y, 'RUN SUMMARY', s(14, '#888888')).setOrigin(0.5); y += 22;

    const summaryRows = [
      ['Waves Survived', wave,       '#ffffff'],
      ['Total Kills',    kills,      '#aaffaa'],
      ['Clone Kills',    cloneKills, '#cc88ff'],
    ];

    for (const [label, val, col] of summaryRows) {
      this.add.text(cx - 140, y, label, s(18, '#aaaaaa')).setOrigin(0, 0.5);
      this.add.text(cx + 140, y, String(val), s(18, col)).setOrigin(1, 0.5);
      y += 26;
    }

    div.lineBetween(cx - 220, y + 4, cx + 220, y + 4); y += 16;

    // ── Player Stats ─────────────────────────────────────────────────────────
    this.add.text(cx, y, 'PLAYER', s(14, '#888888')).setOrigin(0.5); y += 22;

    const playerRows = [
      ['Max HP',        playerMaxHp, '#ff8899'],
      ['Attack Damage', playerAtk,   '#ffaa44'],
    ];

    for (const [label, val, col] of playerRows) {
      this.add.text(cx - 140, y, label, s(17, '#aaaaaa')).setOrigin(0, 0.5);
      this.add.text(cx + 140, y, String(val), s(17, col)).setOrigin(1, 0.5);
      y += 25;
    }

    div.lineBetween(cx - 220, y + 4, cx + 220, y + 4); y += 16;

    // ── Clone Info ───────────────────────────────────────────────────────────
    this.add.text(cx, y, 'CLONE', s(14, '#888888')).setOrigin(0.5); y += 22;

    if (cloneKills > 0) {
      const peakAtk = 1 + cloneKills;

      const cloneRows = [
        ['Kills Scored',         cloneKills,    '#cc88ff'],
        ['HP Healed to Player',  healGiven,     '#44ffaa'],
        ['Perm Max HP Granted',  permHpGained,  '#44ffaa'],
        ['Perm ATK Granted',     permAtkGained, '#ffaa44'],
        ['Peak Attack',          peakAtk,       '#ffaa44'],
      ];
      for (const [label, val, col] of cloneRows) {
        this.add.text(cx - 140, y, label, s(16, '#aaaaaa')).setOrigin(0, 0.5);
        this.add.text(cx + 140, y, String(val), s(16, col)).setOrigin(1, 0.5);
        y += 24;
      }
    } else {
      this.add.text(cx, y, 'Clone was never used this run', s(15, '#555555')).setOrigin(0.5);
      y += 24;
    }
  }
}
