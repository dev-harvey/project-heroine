// Persistent progression — survives scene transitions, resets on page refresh
window.Progression = window.Progression || {
  bonusMaxHp:         0,   // permanent max HP bonus from banked clone kills
  bonusDamage:        0,   // permanent attack damage bonus
  bonusCloneHp:       0,   // Clone Resilience upgrade: clone starts with +N HP
  dashCooldownBonus:  0,   // Faster Dash upgrade: reduces dash cooldown (ms)
  goldBoost:          1,   // Gold Boost upgrade: multiplier on gold per clone kill
};

window.Gold = window.Gold || { total: 0 };

// Session stats — reset on page refresh, persist across runs
window.Session = window.Session || { runs: 0, highestWave: 0, totalKills: 0 };

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

// eslint-disable-next-line no-unused-vars
const game = new Phaser.Game(config);
