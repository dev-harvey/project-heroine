// Persistent progression — survives scene transitions, resets on page refresh
window.Progression = window.Progression || {
    bonusMaxHp: 0,
    bonusDamage: 0,
    bonusCloneHp: 0,
    dashCooldownBonus: 0,
    goldBoost: 1,
};
window.Gold = window.Gold || { total: 0 };
// Session stats — reset on page refresh, persist across runs
window.Session = window.Session || { runs: 0, highestWave: 0, totalKills: 0 };
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    backgroundColor: '#0d0618',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
        },
    },
    scene: [BootScene, TitleScene, GameScene, GameOverScene],
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const game = new Phaser.Game(config);
