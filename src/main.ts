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
import { GAME_CONFIG } from './utils/constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.GAME_WIDTH,
  height: GAME_CONFIG.GAME_HEIGHT,
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

const font = new FontFace('Oswald', 'url(game-assets/fonts/Oswald/Oswald-VariableFont_wght.ttf)');
font.load().then((loaded) => {
  document.fonts.add(loaded);
  new Phaser.Game(config);
});
