// Persistent progression — survives scene transitions, resets on page refresh
(window as any).Progression = (window as any).Progression || {
  bonusMaxHp: 0,
  bonusDamage: 0,
  bonusCloneHp: 0,
  dashCooldownBonus: 0,
  goldBoost: 1,
};

(window as any).Gold = (window as any).Gold || { total: 0 };

// Session stats — reset on page refresh, persist across runs
(window as any).Session = (window as any).Session || { runs: 0, highestWave: 0, totalKills: 0 };

import * as Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import GameScene from './scenes/GameScene';
import GameOverScene from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#0d0618',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false, // TODO: can I make this automatically true in the debug mode?
    },
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game(config);
