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
    default: 'arcade'
  },
  scene: [BootScene, TitleScene, GameScene, GameOverScene],
};

const font = new FontFace('Oswald', 'url(game-assets/fonts/Oswald/Oswald-VariableFont_wght.ttf)');
font.load().then((loaded) => {
  document.fonts.add(loaded);
  new Phaser.Game(config);
});
