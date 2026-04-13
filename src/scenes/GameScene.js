class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create() {
    this.killCount          = 0;
    this.clone              = null;
    this._totalCloneKills   = 0;
    this._totalHealGiven    = 0;   // total HP healed to player from clone expiry
    this._totalPermHp       = 0;   // total permanent maxHP gained from clone expiry
    this._totalPermAtk      = 0;   // total permanent ATK gained from clone expiry

    this._buildWorld();
    this._buildPlayer();
    this._buildGroups();
    this._buildPhysics();
    this._buildUI();
    this._buildArrowsAndPreview();
    this._buildWaveManager();
    this._buildCloneControls();
  }

  update(time, delta) {
    if (!this.player.active) return;

    this.player.update(time, delta);
    this._updateHPBar();
    this._updateAttackVisuals();

    if (this.clone?.active) {
      this.clone.update(time, delta, this.player);
      this._updateCloneHUD();
    }

    this.enemies.getChildren().forEach(e => {
      if (e.active) e.update(time, delta, this.player, this.clone);
    });
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  _buildWorld() {
    const W = 960, H = 540, WALL = 28, TILE = 32;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0618).setDepth(0);

    const gFloor = this.add.graphics().setDepth(1);
    gFloor.fillStyle(0x4a3569, 1);
    gFloor.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    gFloor.lineStyle(1, 0x352548, 0.9);
    for (let x = WALL; x <= W - WALL; x += TILE) gFloor.lineBetween(x, WALL, x, H - WALL);
    for (let y = WALL; y <= H - WALL; y += TILE) gFloor.lineBetween(WALL, y, W - WALL, y);
    gFloor.fillStyle(0x503d72, 0.35);
    for (let col = 0; col * TILE < W - WALL * 2; col++) {
      for (let row = 0; row * TILE < H - WALL * 2; row++) {
        if ((col + row) % 2 === 0)
          gFloor.fillRect(WALL + col * TILE + 1, WALL + row * TILE + 1, TILE - 2, TILE - 2);
      }
    }

    const gWall = this.add.graphics().setDepth(2);
    gWall.fillStyle(0x1a0a2e, 1);
    gWall.fillRect(0, 0,        960,  WALL);
    gWall.fillRect(0, H - WALL, 960,  WALL);
    gWall.fillRect(0, 0,        WALL, H);
    gWall.fillRect(W - WALL, 0, WALL, H);
    gWall.lineStyle(2, 0x8855cc, 0.9);
    gWall.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    this.physics.world.setBounds(WALL, WALL, W - WALL * 2, H - WALL * 2);
  }

  _buildPlayer() {
    this.player = new Player(this, 480, 270);
    this.player.on('attack', (dir) => {
      if (this.clone?.active) this.clone.doAttack(dir);
    });
  }

  _buildGroups() {
    this.enemies = this.physics.add.group();
  }

  _buildPhysics() {
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player.attackZone, this.enemies, this._onAttackHit, null, this);
  }

  _buildUI() {
    const mono = '"Courier New", Courier, monospace';
    const s = (sz, col) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    // ── Left HUD: Player ──────────────────────────────────────────────────────
    this.hpContainer = this.add.container(36, 14).setDepth(20);
    this._rebuildHearts();

    this.atkText = this.add.text(36, 37, 'ATK: 1', s(15, '#ffaa44'))
      .setOrigin(0, 0).setDepth(20);

    // ── Left HUD: Clone (hidden until summoned) ───────────────────────────────
    this.cloneHpContainer = this.add.container(36, 57).setDepth(20);
    // starts empty; rebuilt in _updateCloneHUD

    this.cloneAtkText = this.add.text(36, 76, '', s(14, '#bb88ff'))
      .setOrigin(0, 0).setDepth(20).setVisible(false);

    this.cloneKillsText = this.add.text(36, 94, '', s(13, '#9966ff'))
      .setOrigin(0, 0).setDepth(20).setVisible(false);

    // ── Top centre / right ────────────────────────────────────────────────────
    this.waveText = this.add.text(480, 12, 'Wave 1', s(18, '#ffd700'))
      .setOrigin(0.5, 0).setDepth(20);
    this.killText = this.add.text(928, 12, 'Kills: 0', s(15, '#aaffaa'))
      .setOrigin(1, 0).setDepth(20);

    // ── Centre announcement ───────────────────────────────────────────────────
    this.announceText = this.add.text(480, 260, '', {
      ...s(46, '#ffd700'), stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(25).setAlpha(0);

    // ── Controls hint ─────────────────────────────────────────────────────────
    this.hintsText = this.add.text(
      480, 520,
      'WASD — Move    LClick — Attack    E — Summon/Dismiss Clone    RClick — Reposition Clone',
      s(12, '#666666')
    ).setOrigin(0.5, 1).setDepth(20);
    this.time.delayedCall(8000, () => {
      this.tweens.add({ targets: this.hintsText, alpha: 0, duration: 1000 });
    });
  }

  _buildArrowsAndPreview() {
    this.playerArrow  = this.add.graphics().setDepth(12);
    this.cloneArrow   = this.add.graphics().setDepth(11);
    this.playerHitbox = this.add.graphics().setDepth(8);
    this.cloneHitbox  = this.add.graphics().setDepth(7);
  }

  _buildWaveManager() {
    this.waveManager = new WaveManager(this);
    this.waveManager.start();
  }

  _buildCloneControls() {
    // E key: summon / dismiss
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
      .on('down', () => {
        if (!this.player.active) return;
        if (this.clone?.active) this._dismissClone();
        else                     this._summonClone();
      });

    // Right-click: reposition clone anchor toward mouse
    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (ptr) => {
      if (ptr.rightButtonDown() && this.clone?.active && this.player.active) {
        const angle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          ptr.worldX, ptr.worldY
        );
        const DIST = 110;
        this.clone.anchorOffsetX = Math.cos(angle) * DIST;
        this.clone.anchorOffsetY = Math.sin(angle) * DIST;
      }
    });
  }

  // ─── Attack visuals (arrows + hitbox preview) ──────────────────────────────

  _mouseCardinal() {
    const ptr = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ptr.worldX, ptr.worldY);
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -45 && deg < 45)   return 'right';
    if (deg >= 45  && deg < 135)  return 'down';
    if (deg >= -135 && deg < -45) return 'up';
    return 'left';
  }

  _updateAttackVisuals() {
    const dir = this._mouseCardinal();

    if (!this.player.active) {
      this.playerArrow.clear(); this.playerHitbox.clear();
    } else {
      this._drawArrow(this.playerArrow, this.player.x, this.player.y, dir, 0xffd700, this.player.isAttacking ? 0 : 0.9);
      this._drawHitboxPreview(this.playerHitbox, this.player, dir, 0xffd700);
    }

    if (this.clone?.active) {
      this._drawArrow(this.cloneArrow, this.clone.x, this.clone.y, dir, 0xcc88ff, this.clone.isAttacking ? 0 : 0.85);
      this._drawHitboxPreview(this.cloneHitbox, this.clone, dir, 0xcc88ff);
    } else {
      this.cloneArrow.clear(); this.cloneHitbox.clear();
    }
  }

  _drawArrow(g, cx, cy, dir, color, alpha) {
    g.clear();
    if (alpha <= 0) return;
    const D = 38, H = 14, W = 7;
    let tx, ty, bx1, by1, bx2, by2;
    switch (dir) {
      case 'right': tx=cx+D; ty=cy;   bx1=cx+D-H; by1=cy-W; bx2=cx+D-H; by2=cy+W; break;
      case 'left':  tx=cx-D; ty=cy;   bx1=cx-D+H; by1=cy-W; bx2=cx-D+H; by2=cy+W; break;
      case 'up':    tx=cx; ty=cy-D;   bx1=cx-W; by1=cy-D+H; bx2=cx+W; by2=cy-D+H; break;
      case 'down':  tx=cx; ty=cy+D;   bx1=cx-W; by1=cy+D-H; bx2=cx+W; by2=cy+D-H; break;
    }
    g.fillStyle(color, alpha);
    g.fillTriangle(tx, ty, bx1, by1, bx2, by2);
  }

  _drawHitboxPreview(g, entity, dir, color) {
    g.clear();
    if (!entity.active) return;
    const REACH = 54;
    let cx, cy, rw, rh;
    switch (dir) {
      case 'right': cx=entity.x+REACH; cy=entity.y;       rw=72; rh=52; break;
      case 'left':  cx=entity.x-REACH; cy=entity.y;       rw=72; rh=52; break;
      case 'up':    cx=entity.x;       cy=entity.y-REACH; rw=52; rh=72; break;
      case 'down':  cx=entity.x;       cy=entity.y+REACH; rw=52; rh=72; break;
    }
    const rx = cx - rw / 2, ry = cy - rh / 2;
    const zoneActive = entity.isAttacking && entity.attackZone?.body?.enable;
    if (zoneActive) {
      g.fillStyle(color, 0.35); g.fillRect(rx, ry, rw, rh);
      g.lineStyle(2, color, 0.95); g.strokeRect(rx, ry, rw, rh);
    } else {
      g.lineStyle(1, color, 0.28); g.strokeRect(rx, ry, rw, rh);
    }
  }

  // ─── Floating numbers ──────────────────────────────────────────────────────

  spawnDamageNumber(x, y, amount, color = '#ffffff') {
    const jitter = Phaser.Math.Between(-12, 12);
    const txt = this.add.text(x + jitter, y, `-${amount}`, {
      fontSize: '19px', fill: color,
      fontFamily: '"Courier New", Courier, monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: txt, y: txt.y - 46, alpha: { from: 1, to: 0 },
      duration: 850, ease: 'Power1',
      onComplete: () => txt.destroy(),
    });
  }

  spawnHealNumber(x, y, amount, color = '#44ffaa') {
    const txt = this.add.text(x, y, `+${amount}`, {
      fontSize: '20px', fill: color,
      fontFamily: '"Courier New", Courier, monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: txt, y: txt.y - 50, alpha: { from: 1, to: 0 },
      duration: 1100, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Clone management ──────────────────────────────────────────────────────

  _summonClone() {
    if (this.clone?.active) return;

    const ptr   = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ptr.worldX, ptr.worldY);
    const DIST  = 110;
    const offX  = Math.cos(angle) * DIST;
    const offY  = Math.sin(angle) * DIST;

    const spawnX = Phaser.Math.Clamp(this.player.x + offX, 50, 910);
    const spawnY = Phaser.Math.Clamp(this.player.y + offY, 50, 490);

    this.clone = new Clone(this, spawnX, spawnY);
    this.clone.anchorOffsetX = offX;
    this.clone.anchorOffsetY = offY;

    this.physics.add.collider(this.clone, this.enemies);
    this.physics.add.overlap(this.clone.attackZone, this.enemies, this._onCloneAttackHit, null, this);

    this._updateCloneHUD();
    this.showAnnouncement('Clone Summoned!', '#cc88ff');
  }

  /**
   * Voluntary dismiss — grants same bonuses as death.
   * Captures kills before destroying the object, then delegates to onCloneDeath.
   */
  _dismissClone() {
    if (!this.clone?.active) return;
    const kills = this.clone.killCount;
    this.clone.dismiss();          // destroy Phaser object first
    this.onCloneDeath(kills, true); // true = voluntary dismiss (different popup wording)
  }

  _updateCloneHUD() {
    // Rebuild purple hearts
    this.cloneHpContainer.removeAll(true);

    if (this.clone?.active) {
      const GAP = 20;
      for (let i = 0; i < this.clone.maxHp; i++) {
        const filled = i < this.clone.hp;
        this.cloneHpContainer.add(
          this.add.text(i * GAP, 0, filled ? '♥' : '♡', {
            fontSize: '18px',
            fill: filled ? '#cc88ff' : '#442255',
            fontFamily: '"Courier New", Courier, monospace',
          })
        );
      }
      this.cloneAtkText.setText(`ATK: ${this.clone.attackDamage}`).setVisible(true);
      this.cloneKillsText.setText(`Kills: ${this.clone.killCount}`).setVisible(true);
    } else {
      this.cloneAtkText.setVisible(false);
      this.cloneKillsText.setVisible(false);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  spawnWave(toadCount, houndCount) {
    for (let i = 0; i < toadCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new MutantToad(this, x, y), true);
    }
    for (let i = 0; i < houndCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new HellHound(this, x, y), true);
    }
  }

  onEnemyKilled(enemy) {
    this.killCount++;
    this.killText.setText(`Kills: ${this.killCount}`);

    if (enemy.lastAttacker === 'clone' && this.clone?.active) {
      // Clone kill: scale clone stats
      this.clone.onKill();
      this._updateCloneHUD();
    } else if (enemy.lastAttacker === 'player' && this.clone?.active) {
      // Player kill while clone active: restore 1 HP to clone
      if (this.clone.hp < this.clone.maxHp) {
        this.clone.hp = Math.min(this.clone.hp + 1, this.clone.maxHp);
        this.spawnHealNumber(this.clone.x, this.clone.y - 16, 1, '#cc88ff');
        this._updateCloneHUD();
      }
    }

    this.waveManager.onEnemyKilled();
  }

  /**
   * Called when clone expires (killed by enemies or voluntarily dismissed via E).
   * Awards per kill: +1 HP heal to player (immediate, capped at maxHp).
   * Awards per 3 kills: +1 permanent maxHp, +1 permanent ATK (via window.Progression).
   * @param {number}  kills     - Clone kill count at time of expiry
   * @param {boolean} dismissed - true = E-key dismiss, false = killed by enemies
   */
  onCloneDeath(kills, dismissed = false) {
    this._totalCloneKills += kills;

    // 1 HP heal per kill (immediate, capped at maxHp)
    const healAmt    = kills;
    const permHp     = Math.floor(kills / 3);
    const permAtk    = Math.floor(kills / 3);

    // Apply immediate HP heal
    let actualHeals = 0;
    if (healAmt > 0) {
      actualHeals = Math.min(healAmt, this.player.maxHp - this.player.hp);
      this.player.hp += actualHeals;
      if (actualHeals > 0) {
        this.spawnHealNumber(this.player.x, this.player.y - 20, actualHeals);
      }
    }

    // Apply permanent maxHp bonus
    if (permHp > 0) {
      window.Progression.bonusMaxHp += permHp;
      this.player.maxHp             += permHp;
      this._totalPermHp             += permHp;
    }

    // Apply permanent ATK bonus
    if (permAtk > 0) {
      window.Progression.bonusDamage += permAtk;
      this.player.attackDamage       += permAtk;
      this._totalPermAtk             += permAtk;
    }

    // Track for game-over screen
    this._totalHealGiven += actualHeals;

    // Build popup message
    const verb = dismissed ? 'dismissed' : 'fell';
    let msg;
    if (kills === 0) {
      msg = `Clone ${verb} — no kills`;
    } else {
      const parts = [];
      if (actualHeals > 0) parts.push(`+${actualHeals} HP`);
      if (permHp > 0)      parts.push(`+${permHp} max HP`);
      if (permAtk > 0)     parts.push(`+${permAtk} ATK`);
      const nextBonus = 3 - (kills % 3 || 3);
      const bonus = parts.length > 0
        ? `  ${parts.join('  ')}`
        : `  (${3 - kills % 3 || 3} more kills for perm bonus)`;
      msg = `Clone ${verb} — ${kills} kills${bonus}`;
    }
    this.showBankingPopup(msg);

    this.clone = null;
    this._updateCloneHUD();
  }

  spawnDeathEffect(x, y) {
    const sprite = this.add.sprite(x, y, 'enemy-death').setDepth(6).setScale(1.4);
    sprite.play('enemy-death-anim');
    sprite.once('animationcomplete', () => sprite.destroy());
  }

  showAnnouncement(text, color = '#ffd700') {
    this.announceText.setText(text).setStyle({ fill: color }).setAlpha(1);
    this.tweens.killTweensOf(this.announceText);
    this.tweens.add({ targets: this.announceText, alpha: 0, duration: 600, delay: 1400 });
  }

  showBankingPopup(msg) {
    const txt = this.add.text(480, 385, msg, {
      fontSize: '19px', fill: '#cc88ff',
      fontFamily: '"Courier New", Courier, monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(26);
    this.tweens.add({
      targets: txt, y: txt.y - 70, alpha: { from: 1, to: 0 },
      duration: 2400, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  onPlayerDeath() {
    // Dismiss clone silently (no bonus — player is dead)
    if (this.clone?.active) {
      this.clone.dismiss();
      this.clone = null;
    }

    this.enemies.getChildren().forEach(e => e.setVelocity(0, 0));
    this.player.setActive(false).setVisible(false);
    this.player.attackZone.setActive(false);

    this.scene.start('GameOverScene', {
      wave:          this.waveManager.currentWave,
      kills:         this.killCount,
      cloneKills:    this._totalCloneKills,
      playerAtk:     this.player.attackDamage,
      playerMaxHp:   this.player.maxHp,
      healGiven:     this._totalHealGiven,
      permHpGained:  this._totalPermHp,
      permAtkGained: this._totalPermAtk,
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  _onAttackHit(zone, enemy) {
    if (!this.player.isAttacking)           return;
    if (!this.player.attackZone.body.enable) return;
    if (this.player.hitEnemies.has(enemy))  return;

    this.player.hitEnemies.add(enemy);
    enemy.lastAttacker = 'player';
    const dmg = this.player.attackDamage;
    this.spawnDamageNumber(enemy.x, enemy.y - 10, dmg, '#ffaa44');
    enemy.takeDamage(dmg);
  }

  _onCloneAttackHit(zone, enemy) {
    if (!this.clone?.active)                  return;
    if (!this.clone.isAttacking)              return;
    if (!this.clone.attackZone?.body?.enable) return;
    if (this.clone.hitEnemies.has(enemy))     return;

    this.clone.hitEnemies.add(enemy);
    enemy.lastAttacker = 'clone';
    const dmg = this.clone.attackDamage;
    this.spawnDamageNumber(enemy.x, enemy.y - 10, dmg, '#cc88ff');
    enemy.takeDamage(dmg);
  }

  _spawnPoint() {
    const side = Phaser.Math.Between(0, 3);
    const mx = Phaser.Math.Between;
    switch (side) {
      case 0: return [mx(50, 910), 48];
      case 1: return [mx(50, 910), 492];
      case 2: return [48,          mx(50, 492)];
      default: return [912,        mx(50, 492)];
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
    this.atkText.setText(`ATK: ${this.player.attackDamage}`);
  }
}
