import * as Phaser from 'phaser';
import { GAME_COLORS, GAME_CONFIG } from '../utils/constants';
import { colorToHex } from '../utils/utils';

export default class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create(): void {
    this.input.setDefaultCursor('default');

    const W = GAME_CONFIG.GAME_WIDTH, H = GAME_CONFIG.GAME_HEIGHT;
    const mono = '"Courier New", Courier, monospace';
    const t = (sz: number, col: string, stroke = false) => ({
      fontSize: `${sz}px`, fill: col, fontFamily: 'Oswald, sans-serif',
      ...(stroke ? { stroke: '#000000', strokeThickness: 4 } : {}),
    });

    this.add.rectangle(W / 2, H / 2, W, H, GAME_COLORS.MIDNIGHT);

    const g = this.add.graphics();
    g.lineStyle(1, 0x1a0a2e, 1);
    for (let x = 0; x < W; x += 40) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 40) g.lineBetween(0, y, W, y);

    this.add.text(W / 2, 160, 'PROJECT HEROINE', { ...t(80, colorToHex(GAME_COLORS.GOLD)) }).setOrigin(0.5, 0.5);

    const startBtn = this.add.text(W / 2, 280, 'START GAME', { ...t(42, colorToHex(GAME_COLORS.JADE)) }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setStyle({ fill: '#ffffff' }));
    startBtn.on('pointerout',  () => startBtn.setStyle({ fill: colorToHex(GAME_COLORS.JADE) }));
    startBtn.on('pointerdown', () => this.start(false));

    const debugBtn = this.add.text(W / 2, 370, '[ DEBUG MODE ]', { ...t(24, colorToHex(GAME_COLORS.BARK)) }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    debugBtn.on('pointerover', () => debugBtn.setStyle({ fill: '#aa66cc' }));
    debugBtn.on('pointerout',  () => debugBtn.setStyle({ fill: '#555555' }));
    debugBtn.on('pointerdown', () => this.start(true));

    this.input.keyboard.once('keydown-ENTER', () => this.start(false));
    this.input.keyboard.once('keydown-SPACE', () => this.start(false));
  }

  private start(debug: boolean): void { this.scene.start('GameScene', { debug }); }
}