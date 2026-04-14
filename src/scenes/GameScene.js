class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(data) {
    this._debugMode = !!(data?.debug);

    this.killCount          = 0;
    this.clone              = null;
    this._totalCloneKills   = 0;
    this._totalHealGiven    = 0;   // total HP healed to player from clone expiry
    this._totalPermHp       = 0;   // total permanent maxHP gained from clone expiry
    this._totalPermAtk      = 0;   // total permanent ATK gained from clone expiry

    // Gold earned this run (carries to death screen; window.Gold persists globally)
    this._runGold = 0;

    this._buildWorld();
    this._buildPlayer();
    this._buildGroups();
    this._buildPhysics();
    this._buildUI();
    this._buildArrowsAndPreview();

    if (this._debugMode) {
      this._buildDebugPanel();
    } else {
      this._buildWaveManager();
    }

    this._buildCloneControls();
  }

  update(time, delta) {
    if (!this.player.active) return;

    // Custom cursor follows pointer in screen space
    const ptr = this.input.activePointer;
    this.cursorSprite.setPosition(ptr.x, ptr.y);

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

    if (this._debugMode) {
      const alive = this.enemies.getChildren().filter(e => e.active).length;
      if (this._debugCountText) this._debugCountText.setText(`Enemies: ${alive}`);
      this._drawDebugHitboxes();
    }
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
    this.player.on('dash', (vx, vy) => {
      if (this.clone?.active) this.clone.doDash(vx, vy);

      // Disable player ↔ enemy blocking collision for the dash window
      if (this.playerEnemyCollider) this.playerEnemyCollider.active = false;
      if (this.cloneEnemyCollider)  this.cloneEnemyCollider.active  = false;
      this.time.delayedCall(320, () => {
        if (this.playerEnemyCollider) this.playerEnemyCollider.active = true;
        if (this.cloneEnemyCollider)  this.cloneEnemyCollider.active  = true;
      });
    });

    // Apply permanent Progression bonuses
    this.player.maxHp        += window.Progression.bonusMaxHp  || 0;
    this.player.hp            = this.player.maxHp;
    this.player.attackDamage += window.Progression.bonusDamage || 0;

    // Apply Faster Dash upgrade
    const dashBonus = window.Progression.dashCooldownBonus || 0;
    if (dashBonus > 0) {
      this.player.dashCooldownMax = Math.max(300, this.player.dashCooldownMax - dashBonus);
    }
  }

  _buildGroups() {
    this.enemies = this.physics.add.group();
  }

  _buildPhysics() {
    this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player.attackZone, this.enemies, this._onAttackHit, null, this);
  }

  _buildUI() {
    const mono = '"Courier New", Courier, monospace';
    const s = (sz, col) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    // ── Custom cursor (game only — GameOverScene restores default) ────────────
    this.input.setDefaultCursor('none');
    // Sword tip is at upper-right of the 32×33 image (≈ x=29, y=0)
    this.cursorSprite = this.add.image(0, 0, 'cursor-sword')
      .setScale(1.1).setAngle(-45).setOrigin(0.9, 0).setDepth(100).setScrollFactor(0);

    // ── Left HUD: Player ──────────────────────────────────────────────────────
    this.hpContainer = this.add.container(36, 16).setDepth(20);
    this._rebuildHearts();

    this.atkText = this.add.text(36, 46, 'ATK: 1', {
      ...s(20, '#ffcc44'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0).setDepth(20);

    // ── Left HUD: Clone (hidden until summoned) ───────────────────────────────
    this.cloneHpContainer = this.add.container(36, 72).setDepth(20);

    this.cloneAtkText = this.add.text(36, 96, '', {
      ...s(19, '#dd88ff'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0).setDepth(20).setVisible(false);

    this.cloneKillsText = this.add.text(36, 120, '', {
      ...s(18, '#ffee55'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0).setDepth(20).setVisible(false);

    // ── Dash card (bottom-left) ───────────────────────────────────────────────
    const CARD_X = 14, CARD_Y = 510, CARD_W = 154, CARD_H = 51;
    this.dashCardBg = this.add.rectangle(CARD_X, CARD_Y, CARD_W, CARD_H, 0x0a0616, 0.88)
      .setOrigin(0, 0.5).setDepth(19);
    const dashBorder = this.add.graphics().setDepth(19);
    dashBorder.lineStyle(1, 0x44ccff, 0.6);
    dashBorder.strokeRect(CARD_X, CARD_Y - CARD_H / 2, CARD_W, CARD_H);
    this.dashIcon = this.add.sprite(CARD_X + 24, CARD_Y, 'player-idle', 0)
      .setScale(0.42).setTint(0x44ccff).setDepth(21);
    this.dashLabel = this.add.text(CARD_X + 46, CARD_Y - 10, 'DASH', {
      fontSize: '22px', fill: '#44ccff', fontFamily: mono,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(21);
    this.dashHint = this.add.text(CARD_X + 46, CARD_Y + 10, 'SHIFT', {
      fontSize: '14px', fill: '#336688', fontFamily: mono,
    }).setOrigin(0, 0.5).setDepth(21);
    const BAR_Y = CARD_Y + CARD_H / 2 - 4;
    this.add.rectangle(CARD_X + 2, BAR_Y, CARD_W - 4, 4, 0x112233, 1)
      .setOrigin(0, 0.5).setDepth(21);
    this.dashBarFill = this.add.rectangle(CARD_X + 2, BAR_Y, CARD_W - 4, 4, 0x44ccff, 1)
      .setOrigin(0, 0.5).setDepth(22);

    // ── Gold HUD ──────────────────────────────────────────────────────────────
    this.goldIcon = this.add.sprite(28, 147, 'gems', 134)
      .setOrigin(0, 0.5).setDepth(20).setScale(1.6);
    this.goldText = this.add.text(50, 147, `${window.Gold ? window.Gold.total : 0}g`, {
      ...s(19, '#ffd700'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(20);

    // ── Top centre / right ────────────────────────────────────────────────────
    this.waveText = this.add.text(480, 12, 'Wave 1', {
      ...s(27, '#ffd700'), stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(20);
    this.killText = this.add.text(928, 12, 'Kills: 0', {
      ...s(22, '#aaffaa'), stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(20);

    if (this._debugMode) {
      this.waveText.setVisible(false);
      this.killText.setVisible(false);
    }

    // ── Centre announcement ───────────────────────────────────────────────────
    this.announceText = this.add.text(480, 260, '', {
      ...s(62, '#ffd700'), stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(25).setAlpha(0);

    // ── Controls hint ─────────────────────────────────────────────────────────
    this.hintsText = this.add.text(
      480, 528,
      'WASD — Move    LClick — Attack    Shift — Dash    Space — Summon/Dismiss Clone    RClick — Reposition Clone',
      s(11, '#666666')
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

  // ─── Debug spawn panel ─────────────────────────────────────────────────────

  _buildDebugPanel() {
    const mono = '"Courier New", Courier, monospace';
    const t = (sz, col) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    const PW = 160, PX = 960 - PW; // right edge

    // Panel background
    this.add.rectangle(PX + PW / 2, 270, PW, 520, 0x0a0016, 0.85)
      .setDepth(30).setOrigin(0.5, 0.5);

    this.add.text(PX + PW / 2, 14, 'DEBUG', t(11, '#aa44cc'))
      .setOrigin(0.5, 0).setDepth(30);
    this.add.text(PX + PW / 2, 26, 'SPAWN MENU', t(9, '#664488'))
      .setOrigin(0.5, 0).setDepth(30);

    const entries = [
      { label: 'Mutant Toad',  col: '#88ff88', fn: () => this.spawnWave(1, 0, 0, 0) },
      { label: 'Hell Hound',   col: '#ff8844', fn: () => this.spawnWave(0, 1, 0, 0) },
      { label: 'Plague Crow',  col: '#88ccff', fn: () => this.spawnWave(0, 0, 1, 0) },
      { label: 'Void Dragon',  col: '#ff88ff', fn: () => this.spawnWave(0, 0, 0, 1) },
      { label: '3× Toads',     col: '#88ff88', fn: () => this.spawnWave(3, 0, 0, 0) },
      { label: '3× Hounds',    col: '#ff8844', fn: () => this.spawnWave(0, 3, 0, 0) },
      { label: '3× Crows',     col: '#88ccff', fn: () => this.spawnWave(0, 0, 3, 0) },
      { label: 'Clear All',    col: '#ff4455', fn: () => this._debugClearEnemies() },
    ];

    const BTN_H = 34, START_Y = 52;

    entries.forEach((entry, i) => {
      const by = START_Y + i * (BTN_H + 6);
      const bg = this.add.rectangle(PX + PW / 2, by + BTN_H / 2, PW - 12, BTN_H, 0x1a0a2e)
        .setDepth(30).setInteractive({ useHandCursor: true });

      this.add.text(PX + PW / 2, by + BTN_H / 2, entry.label, t(12, entry.col))
        .setOrigin(0.5, 0.5).setDepth(31);

      bg.on('pointerover',  () => { bg.setFillStyle(0x330066); });
      bg.on('pointerout',   () => { bg.setFillStyle(0x1a0a2e); });
      bg.on('pointerdown',  () => entry.fn());
    });

    // Enemy count indicator
    this._debugCountText = this.add.text(PX + PW / 2, START_Y + entries.length * (BTN_H + 6) + 4,
      'Enemies: 0', t(10, '#555555'))
      .setOrigin(0.5, 0).setDepth(30);

    // Back to title
    const backY = 510;
    const backBg = this.add.rectangle(PX + PW / 2, backY, PW - 12, 24, 0x1a0a2e)
      .setDepth(30).setInteractive({ useHandCursor: true });
    this.add.text(PX + PW / 2, backY, '← Title', t(11, '#666666'))
      .setOrigin(0.5, 0.5).setDepth(31);
    backBg.on('pointerover', () => backBg.setFillStyle(0x220033));
    backBg.on('pointerout',  () => backBg.setFillStyle(0x1a0a2e));
    backBg.on('pointerdown', () => this.scene.start('TitleScene'));

    // Graphics layer for hitbox outlines — drawn every frame in update()
    this._hitboxGfx = this.add.graphics().setDepth(50);
  }

  _debugClearEnemies() {
    this.enemies.getChildren().forEach(e => { if (e.active) e._die?.(); });
  }

  _drawDebugHitboxes() {
    const g = this._hitboxGfx;
    if (!g) return;
    g.clear();

    // Clear old labels
    if (this._debugLabels) this._debugLabels.forEach(t => t.destroy());
    this._debugLabels = [];

    const mono = '"Courier New", Courier, monospace';

    const drawBody = (sprite, color, label) => {
      if (!sprite?.active || !sprite.body) return;
      const b = sprite.body;
      const bw = Math.round(b.width), bh = Math.round(b.height);
      g.lineStyle(1, color, 0.9);
      g.strokeRect(b.x, b.y, bw, bh);
      if (label) {
        const txt = this.add.text(b.x + bw / 2, b.y - 2, `${label} ${bw}×${bh}`, {
          fontSize: '9px', fill: '#' + color.toString(16).padStart(6, '0'),
          fontFamily: mono, stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 1).setDepth(51);
        this._debugLabels.push(txt);
      }
    };

    const drawZone = (zone, color, label) => {
      if (!zone?.body) return;
      const b = zone.body;
      const bw = Math.round(b.width), bh = Math.round(b.height);
      // Dashed effect — draw as a slightly transparent filled rect + outline
      g.lineStyle(1, color, 0.5);
      g.strokeRect(zone.x - bw / 2, zone.y - bh / 2, bw, bh);
      if (label) {
        const txt = this.add.text(zone.x, zone.y, `${label} ${bw}×${bh}`, {
          fontSize: '9px', fill: '#' + color.toString(16).padStart(6, '0'),
          fontFamily: mono, stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(51);
        this._debugLabels.push(txt);
      }
    };

    // Player — cyan body + yellow attack zone (always visible)
    drawBody(this.player, 0x00ffff, 'player');
    drawZone(this.player.attackZone, 0xffff00, 'atk');

    // Clone — purple body + yellow attack zone
    if (this.clone?.active) {
      drawBody(this.clone, 0xcc66ff, 'clone');
      drawZone(this.clone.attackZone, 0xffdd00, 'atk');
    }

    // Enemies — colour by type
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      let col = 0xff4444;
      if (e instanceof HellHound)   col = 0xff8800;
      if (e instanceof PlagueCrow)  col = 0x88ccff;
      if (e instanceof StoneKnight) col = 0xff88ff;
      drawBody(e, col, e.constructor.name);
    });
  }

  _buildCloneControls() {
    // E key: summon / dismiss
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
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
    if (!entity.active || !entity.body) return;
    // Mirror _syncAttackZone exactly — use body edges directly.
    const b    = entity.body;
    const bcx  = b.x + b.width  / 2;
    const HALF = 30;
    let cx, cy;
    switch (dir) {
      case 'right': cx = b.right  + HALF; cy = b.top    + HALF; break;
      case 'left':  cx = b.left   - HALF; cy = b.top    + HALF; break;
      case 'up':    cx = bcx;             cy = b.top    - HALF; break;
      case 'down':  cx = bcx;             cy = b.bottom + HALF; break;
    }
    const rw = 60, rh = 60;
    const rx = cx - HALF, ry = cy - HALF;
    const zoneActive = entity.isAttacking && entity.attackZone?.body?.enable;
    if (zoneActive) {
      g.fillStyle(color, 0.35); g.fillRect(rx, ry, rw, rh);
      g.lineStyle(2, color, 0.95); g.strokeRect(rx, ry, rw, rh);
    } else {
      g.lineStyle(1, color, 0.28); g.strokeRect(rx, ry, rw, rh);
    }
  }

  // ─── Floating numbers ──────────────────────────────────────────────────────

  spawnDamageNumber(x, y, amount, color = '#ffffff', size = 19) {
    const jitter = Phaser.Math.Between(-12, 12);
    const txt = this.add.text(x + jitter, y, `${amount}`, {
      fontSize: `${size}px`, fill: color,
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

    this.clone = new Clone(this, spawnX, spawnY, {
      playerMaxHp: this.player.maxHp,
      playerAtk:   this.player.attackDamage,
      bonusHp:     window.Progression.bonusCloneHp || 0,
    });
    this.clone.anchorOffsetX = offX;
    this.clone.anchorOffsetY = offY;

    this.cloneEnemyCollider = this.physics.add.collider(this.clone, this.enemies);
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
      const GAP = 29;
      for (let i = 0; i < this.clone.maxHp; i++) {
        const filled = i < this.clone.hp;
        this.cloneHpContainer.add(
          this.add.text(i * GAP, 0, filled ? '♥' : '♡', {
            fontSize: '27px',
            fill: filled ? '#ff99ff' : '#884488',
            fontFamily: '"Courier New", Courier, monospace',
            stroke: '#000000', strokeThickness: 2,
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

  spawnWave(toadCount, houndCount, crowCount = 0, knightCount = 0) {
    for (let i = 0; i < toadCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new MutantToad(this, x, y), true);
    }
    for (let i = 0; i < houndCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new HellHound(this, x, y), true);
    }
    for (let i = 0; i < crowCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new PlagueCrow(this, x, y), true);
    }
    for (let i = 0; i < knightCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new StoneKnight(this, x, y), true);
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

    this.waveManager?.onEnemyKilled();
  }

  /**
   * Kill-count tier → bonus magnitude.
   * Tiers: 1+ → 1,  3+ → 2,  6+ → 3,  9+ → 4, etc. (+1 every 3 kills after the first)
   */
  _cloneKillTier(kills) {
    if (kills <= 0) return 0;
    if (kills < 3)  return 1;
    return 1 + Math.floor(kills / 3);
  }

  /**
   * Called when clone expires (killed by enemies or voluntarily dismissed via E).
   * Awards tiered bonuses to the player based on clone kill count:
   *   1 kill → +1 HP & +1 ATK,  3 kills → +2 HP & +2 ATK,
   *   6 kills → +3 HP & +3 ATK,  9 kills → +4 HP & +4 ATK, etc.
   * @param {number}  kills     - Clone kill count at time of expiry
   * @param {boolean} dismissed - true = E-key dismiss, false = killed by enemies
   */
  onCloneDeath(kills, dismissed = false) {
    this._totalCloneKills += kills;

    // Capture burst damage before clone is destroyed
    const burstDmg = this.clone ? this.clone.attackDamage : kills + 1;

    const tier = this._cloneKillTier(kills);

    // ── Tiered HP bonus: increase max HP and heal the player ──────────────
    let actualHeals = 0;
    if (tier > 0) {
      window.Progression.bonusMaxHp += tier;
      this.player.maxHp             += tier;
      this._totalPermHp             += tier;
      // Heal up to the new max
      const heal = Math.min(tier, this.player.maxHp - this.player.hp);
      this.player.hp += heal;
      actualHeals     = heal;
      if (heal > 0) this.spawnHealNumber(this.player.x, this.player.y - 20, heal);
    }

    // ── Tiered ATK bonus ─────────────────────────────────────────────────
    if (tier > 0) {
      window.Progression.bonusDamage += tier;
      this.player.attackDamage       += tier;
      this._totalPermAtk             += tier;
    }

    this._totalHealGiven += actualHeals;

    // Gold: 1 per kill (apply Gold Boost multiplier from Progression if present)
    const goldMultiplier = window.Progression.goldBoost || 1;
    const goldEarned     = Math.floor(kills * goldMultiplier);
    if (goldEarned > 0) {
      window.Gold.total += goldEarned;
      this._runGold     += goldEarned;
      this._updateGoldHUD();
    }

    // Build popup message
    const verb = dismissed ? 'dismissed' : 'fell';
    let msg;
    if (kills === 0) {
      msg = `Clone ${verb} — no kills`;
    } else {
      const nextTier     = this._cloneKillTier(kills + 1);
      const tierChanged  = nextTier > tier;
      const parts = [];
      if (tier > 0) parts.push(`+${tier} max HP`, `+${tier} ATK`);
      if (goldEarned > 0) parts.push(`+${goldEarned}g`);
      const bonus = parts.length > 0
        ? `  ${parts.join('  ')}`
        : `  (need ${3 - kills} more for tier 2)`;
      msg = `Clone ${verb} — ${kills} kills${bonus}`;
    }
    this.showBankingPopup(msg);

    // Clone burst — fires when clone expires with ≥ 5 kills
    if (kills >= 5 && this.clone) {
      this._cloneBurst(this.clone.x, this.clone.y, burstDmg);
    }

    this.clone = null;
    this.cloneEnemyCollider = null;
    this._updateCloneHUD();
  }

  _cloneBurst(cx, cy, dmg) {
    // Visual: full-screen expanding flash + ring
    const W = 960, H = 540;
    const MAX_R = Math.sqrt(W * W + H * H) / 2 + 100; // corner-to-corner + margin

    // Background flash
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xcc88ff, 0).setDepth(14);
    this.tweens.add({
      targets: flash,
      fillAlpha: { from: 0.35, to: 0 },
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Expanding ring
    const g = this.add.graphics().setDepth(15);
    this.tweens.add({
      targets: { r: 1 },
      r: MAX_R,
      duration: 500,
      ease: 'Power2',
      onUpdate: (tween, target) => {
        g.clear();
        const alpha = 1 - tween.progress;
        g.lineStyle(4, 0xcc88ff, alpha);
        g.strokeCircle(cx, cy, target.r);
      },
      onComplete: () => g.destroy(),
    });

    // Damage ALL active enemies — no range check
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      this.spawnDamageNumber(e.x, e.y - 10, dmg, '#cc88ff');
      e.takeDamage(dmg);
    });
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
    // Update session stats
    window.Session.runs++;
    window.Session.totalKills  += this.killCount;
    const currentWave = this.waveManager?.currentWave ?? 0;
    if (currentWave > window.Session.highestWave) {
      window.Session.highestWave = currentWave;
    }

    // Dismiss clone silently (no bonus — player is dead)
    if (this.clone?.active) {
      this.clone.dismiss();
      this.clone = null;
    }

    this.enemies.getChildren().forEach(e => e.setVelocity(0, 0));
    this.player.setActive(false).setVisible(false);
    this.player.attackZone.setActive(false);

    this.scene.start('GameOverScene', {
      wave:          currentWave,
      kills:         this.killCount,
      cloneKills:    this._totalCloneKills,
      playerAtk:     this.player.attackDamage,
      playerMaxHp:   this.player.maxHp,
      healGiven:     this._totalHealGiven,
      permHpGained:  this._totalPermHp,
      permAtkGained: this._totalPermAtk,
      runGold:       this._runGold,
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
    this.spawnDamageNumber(enemy.x, enemy.y - 10, dmg, '#ffff00', 26);
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
    this.spawnDamageNumber(enemy.x, enemy.y - 10, dmg, '#ffff00', 26);
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
        this.add.text(i * 29, 0, filled ? '♥' : '♡', {
          fontSize: '27px',
          fill: filled ? '#ff4466' : '#aa3355',
          fontFamily: '"Courier New", Courier, monospace',
          stroke: '#000000', strokeThickness: 2,
        })
      );
    }
  }

  _updateHPBar() {
    this._rebuildHearts();
    this.atkText.setText(`ATK: ${this.player.attackDamage}`);

    // Dash card
    const CARD_W = 150; // inner fill width (card 154 - 4px padding)
    if (this.player.dashCooldown > 0) {
      const pct = this.player.dashCooldown / this.player.dashCooldownMax;
      this.dashBarFill.setDisplaySize(Math.max(0, CARD_W * (1 - pct)), 3);
      this.dashLabel.setStyle({ fill: '#1a5566' });
      this.dashIcon.setTint(0x1a5566);
      this.dashCardBg.setFillStyle(0x060410, 0.88);
    } else {
      this.dashBarFill.setDisplaySize(CARD_W, 3);
      this.dashLabel.setStyle({ fill: '#44ccff' });
      this.dashIcon.setTint(0x44ccff);
      this.dashCardBg.setFillStyle(0x0a0616, 0.88);
    }
  }

  _updateGoldHUD() {
    this.goldText.setText(`${window.Gold.total}g`);
  }
}
