class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data) {
    // Restore system cursor — game scene hides it
    this.input.setDefaultCursor('default');

    const wave          = data?.wave          ?? 0;
    const kills         = data?.kills         ?? 0;
    const cloneKills    = data?.cloneKills    ?? 0;
    const playerAtk     = data?.playerAtk     ?? 1;
    const playerMaxHp   = data?.playerMaxHp   ?? 5;
    const healGiven     = data?.healGiven     ?? 0;
    const permHpGained  = data?.permHpGained  ?? 0;
    const permAtkGained = data?.permAtkGained ?? 0;
    const runGold       = data?.runGold       ?? 0;

    const W = 960, H = 540;
    const mono = '"Courier New", Courier, monospace';
    const t = (sz, col, stroke = false) => ({
      fontSize: `${sz}px`, fill: col, fontFamily: mono,
      ...(stroke ? { stroke: '#000000', strokeThickness: 3 } : {}),
    });

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0618, 1).setDepth(0);

    // Vertical divider
    const div = this.add.graphics().setDepth(1);
    div.lineStyle(1, 0x553366, 0.8);
    div.lineBetween(W / 2, 8, W / 2, H - 8);

    // ── Helper: horizontal rule ───────────────────────────────────────────────
    const hr = (x, y, w) => {
      const g = this.add.graphics().setDepth(2);
      g.lineStyle(1, 0x553366, 0.7);
      g.lineBetween(x, y, x + w, y);
    };

    // ── Helper: stat row (left-aligned label, right-aligned value) ────────────
    const row = (lx, rx, y, label, val, lCol, vCol, sz = 15) => {
      this.add.text(lx, y, label, t(sz, lCol)).setOrigin(0, 0.5).setDepth(2);
      this.add.text(rx, y, String(val), t(sz, vCol)).setOrigin(1, 0.5).setDepth(2);
    };

    // ── Helper: section header ────────────────────────────────────────────────
    const hdr = (x, y, label) => {
      this.add.text(x, y, label, t(12, '#999999')).setOrigin(0.5, 0.5).setDepth(2);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LEFT COLUMN  (x: 18 … 462)
    // ─────────────────────────────────────────────────────────────────────────
    const LX = 18;   // left edge
    const LR = 462;  // right edge (for value alignment)
    const LC = (LX + LR) / 2; // centre

    let ly = 16;

    // Title
    this.add.text(LC, ly, 'YOU DIED', {
      ...t(54, '#dd2233', true), strokeThickness: 6,
    }).setOrigin(0.5, 0).setDepth(2);
    ly += 62;

    // Respawn button
    const respawnBtn = this.add.text(LC, ly, '[ RESPAWN ]', {
      ...t(26, '#ffd700', true),
    }).setOrigin(0.5, 0).setDepth(2).setInteractive({ useHandCursor: true });
    respawnBtn.on('pointerover',  () => respawnBtn.setStyle({ fill: '#ffffff' }));
    respawnBtn.on('pointerout',   () => respawnBtn.setStyle({ fill: '#ffd700' }));
    respawnBtn.on('pointerdown',  () => this._respawn());
    this.input.keyboard.once('keydown-ENTER', () => this._respawn());
    this.input.keyboard.once('keydown-SPACE', () => this._respawn());
    ly += 38;

    hr(LX, ly, LR - LX); ly += 14;

    // This Run
    hdr(LC, ly, 'THIS RUN'); ly += 18;
    for (const [label, val, col] of [
      ['Waves Survived', wave,       '#ffffff'],
      ['Total Kills',    kills,      '#aaffaa'],
      ['Clone Kills',    cloneKills, '#dd99ff'],
      ['Gold Earned',    runGold,    '#ffd700'],
    ]) { row(LX, LR, ly, label, val, '#cccccc', col); ly += 22; }

    hr(LX, ly + 2, LR - LX); ly += 16;

    // Session
    hdr(LC, ly, 'SESSION'); ly += 18;
    for (const [label, val, col] of [
      ['Total Runs',     window.Session?.runs        ?? 0, '#ffffff'],
      ['Highest Wave',   window.Session?.highestWave ?? 0, '#ffd700'],
      ['Lifetime Kills', window.Session?.totalKills  ?? 0, '#aaffaa'],
    ]) { row(LX, LR, ly, label, val, '#cccccc', col); ly += 22; }

    hr(LX, ly + 2, LR - LX); ly += 16;

    // Player
    hdr(LC, ly, 'PLAYER'); ly += 18;
    row(LX, LR, ly, 'Max HP',  playerMaxHp, '#cccccc', '#ff8899'); ly += 22;
    row(LX, LR, ly, 'Attack',  playerAtk,   '#cccccc', '#ffcc66'); ly += 22;

    hr(LX, ly + 2, LR - LX); ly += 16;

    // Clone
    hdr(LC, ly, 'CLONE'); ly += 18;
    if (cloneKills > 0) {
      for (const [label, val, col] of [
        ['Kills Scored',        cloneKills,     '#dd99ff'],
        ['HP Healed to Player', healGiven,      '#44ffaa'],
        ['Perm Max HP Granted', permHpGained,   '#44ffaa'],
        ['Perm ATK Granted',    permAtkGained,  '#ffcc66'],
        ['Peak Attack',         1 + cloneKills, '#ffcc66'],
      ]) { row(LX, LR, ly, label, val, '#cccccc', col, 14); ly += 20; }
    } else {
      this.add.text(LC, ly, 'Clone was never used', t(13, '#555555')).setOrigin(0.5, 0.5).setDepth(2);
      ly += 20;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RIGHT COLUMN  (x: 490 … 950)
    // ─────────────────────────────────────────────────────────────────────────
    const RX = 498;   // left edge of right column
    const RR = 950;   // right edge
    const RC = (RX + RR) / 2;

    let ry = 16;

    this.add.text(RC, ry, 'UPGRADE SHOP', {
      ...t(20, '#ffd700', true),
    }).setOrigin(0.5, 0).setDepth(2);
    ry += 30;

    // Gold icon + text (centred together)
    const goldIconX = RC - 46;
    this.add.sprite(goldIconX, ry + 7, 'gems', 134).setOrigin(0, 0.5).setDepth(2).setScale(0.9);
    this._goldDisplay = this.add.text(goldIconX + 18, ry, `Gold: ${window.Gold?.total ?? 0}`, t(14, '#ffd700'))
      .setOrigin(0, 0).setDepth(2);
    ry += 24;

    hr(RX, ry, RR - RX); ry += 12;

    // Upgrade rows
    const upgrades = [
      {
        label: 'Extra Life',       desc: '+1 permanent Max HP',
        cost: 3,  color: '#ff8899',
        apply:  () => { window.Progression.bonusMaxHp  += 1; },
        max: null, count: () => 0,
      },
      {
        label: 'Sharpened Blade',  desc: '+1 permanent ATK',
        cost: 3,  color: '#ffcc66',
        apply:  () => { window.Progression.bonusDamage += 1; },
        max: null, count: () => 0,
      },
      {
        label: 'Clone Resilience', desc: 'Clone starts with +1 HP',
        cost: 5,  color: '#dd99ff',
        apply:  () => { window.Progression.bonusCloneHp = (window.Progression.bonusCloneHp || 0) + 1; },
        max: null, count: () => 0,
      },
      {
        label: 'Faster Dash',      desc: 'Dash cooldown -200ms',
        cost: 8,  color: '#88ddff',
        apply:  () => { window.Progression.dashCooldownBonus = (window.Progression.dashCooldownBonus || 0) + 200; },
        max: 3,   count: () => Math.floor((window.Progression.dashCooldownBonus || 0) / 200),
      },
      {
        label: 'Gold Boost',       desc: '+25% gold from clone kills',
        cost: 10, color: '#ffd700',
        apply:  () => { window.Progression.goldBoost = ((window.Progression.goldBoost || 1) * 1.25); },
        max: 3,   count: () => Math.round(Math.log((window.Progression.goldBoost || 1)) / Math.log(1.25)),
      },
    ];

    this._shopRows = [];
    for (const upg of upgrades) {
      this._buildShopRow(RX, RR, ry, upg, t);
      ry += 52;
    }

    // ── Owned upgrades ────────────────────────────────────────────────────────
    hr(RX, ry, RR - RX); ry += 14;
    hdr(RC, ry, 'OWNED UPGRADES'); ry += 18;

    // One fixed row per upgrade type — shown/hidden as upgrades are purchased
    const ownedDefs = [
      {
        key:   'bonusMaxHp',
        label: 'Extra Life',       color: '#ff8899',
        desc:  () => `+${window.Progression.bonusMaxHp} Max HP`,
        active: () => (window.Progression.bonusMaxHp || 0) > 0,
      },
      {
        key:   'bonusDamage',
        label: 'Sharpened Blade',  color: '#ffcc66',
        desc:  () => `+${window.Progression.bonusDamage} ATK`,
        active: () => (window.Progression.bonusDamage || 0) > 0,
      },
      {
        key:   'bonusCloneHp',
        label: 'Clone Resilience', color: '#dd99ff',
        desc:  () => `+${window.Progression.bonusCloneHp} Clone HP`,
        active: () => (window.Progression.bonusCloneHp || 0) > 0,
      },
      {
        key:   'dashCooldownBonus',
        label: 'Faster Dash',      color: '#88ddff',
        desc:  () => { const n = Math.floor((window.Progression.dashCooldownBonus||0)/200); return `-${window.Progression.dashCooldownBonus}ms (×${n})`; },
        active: () => (window.Progression.dashCooldownBonus || 0) > 0,
      },
      {
        key:   'goldBoost',
        label: 'Gold Boost',       color: '#ffd700',
        desc:  () => { const n = Math.round(Math.log(window.Progression.goldBoost||1)/Math.log(1.25)); return `×${(window.Progression.goldBoost||1).toFixed(2)} (×${n})`; },
        active: () => (window.Progression.goldBoost || 1) > 1,
      },
    ];

    // Pre-create one label+value text pair per upgrade; 'None yet' placeholder
    const noneText = this.add.text(RC, ry, 'None yet', t(13, '#555555')).setOrigin(0.5, 0.5).setDepth(2);
    const ownedRows = ownedDefs.map((def, i) => {
      const rowY = ry + i * 20;
      const lbl = this.add.text(RX, rowY, def.label, t(13, def.color)).setOrigin(0, 0.5).setDepth(2).setVisible(false);
      const val = this.add.text(RR, rowY, '',         t(12, '#888888')).setOrigin(1, 0.5).setDepth(2).setVisible(false);
      return { def, lbl, val };
    });

    this._refreshOwnedUpgrades = () => {
      let anyActive = false;
      let slot = 0;
      for (const r of ownedRows) {
        if (r.def.active()) {
          anyActive = true;
          const rowY = ry + slot * 20;
          r.lbl.setY(rowY).setText(r.def.label).setVisible(true);
          r.val.setY(rowY).setText(r.def.desc()).setVisible(true);
          slot++;
        } else {
          r.lbl.setVisible(false);
          r.val.setVisible(false);
        }
      }
      noneText.setVisible(!anyActive);
    };

    this._refreshOwnedUpgrades();
  }

  // ─── Shop row ─────────────────────────────────────────────────────────────

  _buildShopRow(lx, rx, y, upg, t) {
    const canAfford = () => (window.Gold?.total ?? 0) >= upg.cost;
    const atMax     = () => upg.max !== null && upg.count() >= upg.max;

    this.add.text(lx,      y + 13, upg.label, t(14, upg.color)).setOrigin(0, 0.5).setDepth(2);
    this.add.text(lx,      y + 30, upg.desc,  t(11, '#777777')).setOrigin(0, 0.5).setDepth(2);
    this.add.sprite(rx - 90, y + 22, 'gems', 134).setOrigin(0, 0.5).setDepth(2).setScale(0.85);
    this.add.text(rx - 75, y + 22, `${upg.cost}`, t(13, '#ffd700')).setOrigin(0, 0.5).setDepth(2);

    const buyBtn = this.add.text(rx, y + 22, '[ BUY ]', t(14, '#ffffff'))
      .setOrigin(1, 0.5).setDepth(2);

    const g = this.add.graphics().setDepth(2);
    g.lineStyle(1, 0x553366, 0.6);
    g.lineBetween(lx, y + 48, rx, y + 48);

    const refresh = () => {
      if (atMax()) {
        buyBtn.setText('[ MAX ]').setStyle({ fill: '#444444' }).removeInteractive();
      } else if (canAfford()) {
        buyBtn.setStyle({ fill: '#44ff88' }).setInteractive({ useHandCursor: true });
      } else {
        buyBtn.setStyle({ fill: '#555555' }).removeInteractive();
      }
    };

    refresh();

    buyBtn.on('pointerover', () => { if (canAfford() && !atMax()) buyBtn.setStyle({ fill: '#ffffff' }); });
    buyBtn.on('pointerout',  () => refresh());
    buyBtn.on('pointerdown', () => {
      if (!canAfford() || atMax()) return;
      window.Gold.total -= upg.cost;
      upg.apply();
      this._goldDisplay.setText(`Gold: ${window.Gold.total}`);
      this._shopRows.forEach(r => r());
      if (this._refreshOwnedUpgrades) this._refreshOwnedUpgrades();
    });

    this._shopRows.push(refresh);
  }

  _respawn() {
    this.scene.start('TitleScene');
  }
}
