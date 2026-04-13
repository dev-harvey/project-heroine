// Persistent progression — survives scene transitions, resets on page refresh
window.Progression = window.Progression || {
  bonusMaxHp:  0,   // permanent max HP bonus from banked clone kills
  bonusDamage: 0,   // permanent attack damage bonus
};

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#0d0618',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, GameScene, GameOverScene],
};

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
