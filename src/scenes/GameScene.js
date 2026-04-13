class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create() {
    this.killCount = 0;

    this._buildWorld();
    this._buildPlayer();
    this._buildGroups();
    this._buildPhysics();
    this._buildUI();
    this._buildWaveManager();
  }

  update(time, delta) {
    if (!this.player.active) return;

    this.player.update(time, delta);
    this._updateHPBar();

    this.enemies.getChildren().forEach(e => {
      if (e.active) e.update(time, delta, this.player);
    });
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  _buildWorld() {
    const W = 960, H = 540, WALL = 28;
    const TILE = 32; // display size (16 px source × 2)

    // ── Outer background ────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0618).setDepth(0);

    // ── Floor: purple-stone tiles drawn with Graphics ────────────────────────
    // Colours sampled from the dungeon-crawler preview image
    const gFloor = this.add.graphics().setDepth(1);

    // Base stone fill
    gFloor.fillStyle(0x4a3569, 1);
    gFloor.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    // Stone-block grid (mortar lines)
    gFloor.lineStyle(1, 0x352548, 0.9);
    for (let x = WALL; x <= W - WALL; x += TILE) {
      gFloor.lineBetween(x, WALL, x, H - WALL);
    }
    for (let y = WALL; y <= H - WALL; y += TILE) {
      gFloor.lineBetween(WALL, y, W - WALL, y);
    }

    // Subtle highlight on alternate tiles (gives a slight stone relief)
    gFloor.fillStyle(0x503d72, 0.35);
    for (let col = 0; col * TILE < W - WALL * 2; col++) {
      for (let row = 0; row * TILE < H - WALL * 2; row++) {
        if ((col + row) % 2 === 0) {
          gFloor.fillRect(
            WALL + col * TILE + 1,
            WALL + row * TILE + 1,
            TILE - 2,
            TILE - 2
          );
        }
      }
    }

    // ── Walls ────────────────────────────────────────────────────────────────
    const gWall = this.add.graphics().setDepth(2);
    gWall.fillStyle(0x1a0a2e, 1);
    gWall.fillRect(0, 0,         W,    WALL);  // top
    gWall.fillRect(0, H - WALL,  W,    WALL);  // bottom
    gWall.fillRect(0, 0,         WALL, H);     // left
    gWall.fillRect(W - WALL, 0,  WALL, H);     // right

    // Wall inner edge (bright purple trim)
    gWall.lineStyle(2, 0x8855cc, 0.9);
    gWall.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    // Physics world bounds (inside walls)
    this.physics.world.setBounds(WALL, WALL, W - WALL * 2, H - WALL * 2);
  }

  _buildPlayer() {
    this.player = new Player(this, 480, 270);
  }

  _buildGroups() {
    this.enemies = this.physics.add.group();
  }

  _buildPhysics() {
    // Enemies and player can't overlap each other
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.enemies, this.enemies);

    // Player attack zone hits enemies
    this.physics.add.overlap(
      this.player.attackZone,
      this.enemies,
      this._onAttackHit,
      null,
      this
    );
  }

  _buildUI() {
    const style = (size, color) => ({
      fontSize: `${size}px`,
      fill: color,
      fontFamily: '"Courier New", Courier, monospace'
    });

    // Hearts (HP)
    this.hpContainer = this.add.container(36, 14).setDepth(20);
    this._rebuildHearts();

    // Wave label
    this.waveText = this.add.text(480, 12, 'Wave 1', style(18, '#ffd700'))
      .setOrigin(0.5, 0)
      .setDepth(20);

    // Kill counter
    this.killText = this.add.text(928, 12, 'Kills: 0', style(16, '#aaffaa'))
      .setOrigin(1, 0)
      .setDepth(20);

    // Centre announcement (wave start / wave clear)
    this.announceText = this.add.text(480, 260, '', {
      ...style(46, '#ffd700'),
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(25).setAlpha(0);

    // Controls hint (fades after first wave)
    this.hintsText = this.add.text(480, 520, 'WASD — Move    Left Click — Attack    (aim with mouse)', style(13, '#888888'))
      .setOrigin(0.5, 1)
      .setDepth(20);
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: this.hintsText, alpha: 0, duration: 1000 });
    });
  }

  _buildWaveManager() {
    this.waveManager = new WaveManager(this);
    this.waveManager.start();
  }

  // ─── Public API (called by entities / WaveManager) ─────────────────────────

  spawnWave(toadCount, houndCount) {
    for (let i = 0; i < toadCount; i++) {
      const [x, y] = this._spawnPoint();
      const toad = new MutantToad(this, x, y);
      this.enemies.add(toad, true); // true → add to scene display list
    }
    for (let i = 0; i < houndCount; i++) {
      const [x, y] = this._spawnPoint();
      const hound = new HellHound(this, x, y);
      this.enemies.add(hound, true);
    }
  }

  onEnemyKilled(enemy) {
    this.killCount++;
    this.killText.setText(`Kills: ${this.killCount}`);
    this.waveManager.onEnemyKilled();
  }

  spawnDeathEffect(x, y) {
    const sprite = this.add.sprite(x, y, 'enemy-death')
      .setDepth(6)
      .setScale(1.4);
    sprite.play('enemy-death-anim');
    sprite.once('animationcomplete', () => sprite.destroy());
  }

  showAnnouncement(text, color = '#ffd700') {
    this.announceText.setText(text).setStyle({ fill: color }).setAlpha(1);
    this.tweens.add({
      targets: this.announceText,
      alpha: 0,
      duration: 600,
      delay: 1400,
    });
  }

  onPlayerDeath() {
    // Stop all enemies
    this.enemies.getChildren().forEach(e => e.setVelocity(0, 0));
    this.player.setActive(false).setVisible(false);
    this.player.attackZone.setActive(false);

    this.scene.start('GameOverScene', {
      wave:  this.waveManager.currentWave,
      kills: this.killCount,
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  _onAttackHit(zone, enemy) {
    if (!this.player.isAttacking)          return;
    if (!this.player.attackZone.body.enable) return;
    if (this.player.hitEnemies.has(enemy)) return;

    this.player.hitEnemies.add(enemy);
    enemy.takeDamage(this.player.attackDamage);
  }

  _spawnPoint() {
    const side = Phaser.Math.Between(0, 3);
    const mx = Phaser.Math.Between;
    switch (side) {
      case 0: return [mx(50, 910), 48];   // top
      case 1: return [mx(50, 910), 492];  // bottom
      case 2: return [48,          mx(50, 492)]; // left
      default: return [912,        mx(50, 492)]; // right
    }
  }

  _rebuildHearts() {
    this.hpContainer.removeAll(true);
    for (let i = 0; i < this.player.maxHp; i++) {
      const filled = i < this.player.hp;
      this.hpContainer.add(
        this.add.text(i * 22, 0, filled ? '♥' : '♡', {
          fontSize: '20px',
          fill: filled ? '#ff4455' : '#553344',
          fontFamily: '"Courier New", Courier, monospace',
        })
      );
    }
  }

  _updateHPBar() {
    this._rebuildHearts();
  }
}
