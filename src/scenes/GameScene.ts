import * as Phaser from "phaser";
import Player from "../entities/Player";
import Clone from "../entities/Clone";
import MutantToad from "../entities/MutantToad";
import HellHound from "../entities/HellHound";
import PlagueCrow from "../entities/PlagueCrow";
import VoidDemon from "../entities/VoidDemon";
import WaveManager from "../systems/WaveManager";

import { CLONE_CONFIG as cloneConfig, GAME_CONFIG as gameConfig } from "../utils/Constants";

export default class GameScene extends Phaser.Scene {
  // Core objects
  player!: Player;
  clone: Clone | null = null;
  enemies!: Phaser.Physics.Arcade.Group;
  waveManager!: WaveManager;
  cursorSprite!: Phaser.GameObjects.Image;

  // Colliders
  playerEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;
  cloneEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;

  // UI
  hpContainer!: Phaser.GameObjects.Container;
  cloneHpContainer!: Phaser.GameObjects.Container;
  atkText!: Phaser.GameObjects.Text;
  cloneAtkText!: Phaser.GameObjects.Text;
  cloneKillsText!: Phaser.GameObjects.Text;
  waveText!: Phaser.GameObjects.Text;
  killText!: Phaser.GameObjects.Text;
  announceText!: Phaser.GameObjects.Text;
  hintsText!: Phaser.GameObjects.Text;
  dashCardBg!: Phaser.GameObjects.Rectangle;
  dashBarFill!: Phaser.GameObjects.Rectangle;
  dashLabel!: Phaser.GameObjects.Text;
  dashIcon!: Phaser.GameObjects.Sprite;
  goldIcon!: Phaser.GameObjects.Sprite;
  goldText!: Phaser.GameObjects.Text;

  // Arrows & preview graphics
  playerAttackIndicator!: Phaser.GameObjects.Graphics;
  cloneAttackIndicator!: Phaser.GameObjects.Graphics;
  anchorIndicator!: Phaser.GameObjects.Graphics;

  // Stats
  killCount: number = 0;
  _totalCloneKills: number = 0;
  _totalHealGiven: number = 0;
  _totalPermHp: number = 0;
  _totalPermAtk: number = 0;
  _runGold: number = 0;

  // Debug
  _debugMode: boolean = false;
  _debugCountText: Phaser.GameObjects.Text | null = null;
  _hitboxGfx!: Phaser.GameObjects.Graphics;
  _debugLabels: Phaser.GameObjects.Text[] = [];
  _showOverlapZone: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(data: GameSceneData = {}): void {
    this._debugMode = !!data.debug;

    this.killCount = 0;
    this.clone = null;
    this._totalCloneKills = 0;
    this._totalHealGiven = 0;
    this._totalPermHp = 0;
    this._totalPermAtk = 0;
    this._runGold = 0;

    this._buildWorld();
    this._buildPlayer();
    this._buildGroups();
    this._buildPhysics();
    this._buildUI();
    this._buildIndicators();

    if (this._debugMode) this._buildDebugPanel();
    else this._buildWaveManager();

    this._buildCloneControls();
  }

  update(time: number, delta: number): void {
    if (!this.player.active) return;

    const ptr = this.input.activePointer;
    this.cursorSprite.setPosition(ptr.x, ptr.y);

    this.player.update(time, delta);
    this._updateHPBar();
    this._updateAttackVisuals();

    if (this.clone?.active) {
      this.clone.update(time, delta);
      this._updateCloneHUD();
      // if (this.cloneEnemyCollider && !this.clone._repositioning) this.cloneEnemyCollider.active = true;
    }

    this._updateAnchorIndicator();

    this.enemies.getChildren().forEach((e: any) => {
      if (e.active) e.update(time, delta, this.player, this.clone);
    });

    if (this._debugMode) {
      const alive = this.enemies.getChildren().filter((e: any) => e.active).length;
      if (this._debugCountText) this._debugCountText.setText(`Enemies: ${alive}`);
      this._drawDebugAttackZonees();
    }
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  _buildWorld(): void {
    const W = gameConfig.GAME_WIDTH,
      H = gameConfig.GAME_HEIGHT,
      WALL = gameConfig.GAME_WALL,
      TILE = gameConfig.GAME_TILE;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0618).setDepth(0);

    const gFloor = this.add.graphics().setDepth(1);
    gFloor.fillStyle(0x888888, 1);
    gFloor.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    for (let col = 0; col * TILE < W - WALL * 2; col++) {
      for (let row = 0; row * TILE < H - WALL * 2; row++) {
        let textureFrame = 62; // edit this to change the texture. 62 = plain grass
        this.add
          .image(WALL + col * TILE, WALL + row * TILE, "top-down-forest-tileset", textureFrame)
          .setOrigin(0, 0)
          .setDepth(1);
      }
    }

    const gWall = this.add.graphics().setDepth(2);
    gWall.fillStyle(0x1a0a2e, 1);
    gWall.fillRect(0, 0, 960, WALL);
    gWall.fillRect(0, H - WALL, 960, WALL);
    gWall.fillRect(0, 0, WALL, H);
    gWall.fillRect(W - WALL, 0, WALL, H);
    gWall.lineStyle(2, 0x8855cc, 0.9);
    gWall.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    this.physics.world.setBounds(WALL, WALL, W - WALL * 2, H - WALL * 2);
  }

  _buildPlayer(): void {
    this.player = new Player(this, 480, 270);
    this.player.on("attack", () => {
      if (this.clone?.active) this.clone.doAttack();
    });
    this.player.on("dash", (vx: number, vy: number) => {
      if (this.clone?.active) this.clone.doDash(vx, vy);
      if (this.playerEnemyCollider) this.playerEnemyCollider.active = false;
      if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = false;
      this.time.delayedCall(320, () => {
        if (this.playerEnemyCollider) this.playerEnemyCollider.active = true;
        if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = true;
      });
    });

    const prog = window.Progression;
    this.player.maxHp += prog.bonusMaxHp || 0;
    this.player.hp = this.player.maxHp;
    this.player.attackDamage += prog.bonusDamage || 0;

    const dashBonus = prog.dashCooldownBonus || 0;
    if (dashBonus > 0) {
      this.player.dashCooldownMax = Math.max(300, this.player.dashCooldownMax - dashBonus);
    }
  }

  _buildGroups(): void {
    this.enemies = this.physics.add.group();
  }

  _buildPhysics(): void {
    console.log("building physics");

    this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player.attackZone, this.enemies, this._onAttackHit, undefined, this);
  }

  _buildUI(): void {
    const mono = '"Courier New", Courier, monospace';
    const s = (sz: number, col: string) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    this.input.setDefaultCursor("none");
    this.cursorSprite = this.add.image(0, 0, "cursor-sword").setScale(1.1).setAngle(-45).setOrigin(0.9, 0).setDepth(100).setScrollFactor(0);

    this.hpContainer = this.add.container(36, 16).setDepth(20);
    this._rebuildHearts();

    this.atkText = this.add
      .text(36, 46, "ATK: 1", {
        ...s(20, "#ffcc44"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0)
      .setDepth(20);

    this.cloneHpContainer = this.add.container(36, 72).setDepth(20);

    this.cloneAtkText = this.add
      .text(36, 96, "", {
        ...s(19, "#dd88ff"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0)
      .setDepth(20)
      .setVisible(false);

    this.cloneKillsText = this.add
      .text(36, 120, "", {
        ...s(18, "#ffee55"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0)
      .setDepth(20)
      .setVisible(false);

    const CARD_X = 14,
      CARD_Y = 510,
      CARD_W = 154,
      CARD_H = 51;
    this.dashCardBg = this.add.rectangle(CARD_X, CARD_Y, CARD_W, CARD_H, 0x0a0616, 0.88).setOrigin(0, 0.5).setDepth(19);
    const dashBorder = this.add.graphics().setDepth(19);
    dashBorder.lineStyle(1, 0x44ccff, 0.6);
    dashBorder.strokeRect(CARD_X, CARD_Y - CARD_H / 2, CARD_W, CARD_H);
    this.dashIcon = this.add
      .sprite(CARD_X + 24, CARD_Y, "player-idle", 0)
      .setScale(0.42)
      .setTint(0x44ccff)
      .setDepth(21);
    this.dashLabel = this.add
      .text(CARD_X + 46, CARD_Y - 10, "DASH", {
        fontSize: "22px",
        color: "#44ccff",
        fontFamily: mono,
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(21);
    this.add
      .text(CARD_X + 46, CARD_Y + 10, "SHIFT", {
        fontSize: "14px",
        color: "#336688",
        fontFamily: mono,
      })
      .setOrigin(0, 0.5)
      .setDepth(21);
    const BAR_Y = CARD_Y + CARD_H / 2 - 4;
    this.add
      .rectangle(CARD_X + 2, BAR_Y, CARD_W - 4, 4, 0x112233, 1)
      .setOrigin(0, 0.5)
      .setDepth(21);
    this.dashBarFill = this.add
      .rectangle(CARD_X + 2, BAR_Y, CARD_W - 4, 4, 0x44ccff, 1)
      .setOrigin(0, 0.5)
      .setDepth(22);

    this.goldIcon = this.add.sprite(28, 147, "gems", 134).setOrigin(0, 0.5).setDepth(20).setScale(1.6);
    this.goldText = this.add
      .text(50, 147, `${window.Gold?.total ?? 0}g`, {
        ...s(19, "#ffd700"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(20);

    this.waveText = this.add
      .text(480, 12, "Wave 1", {
        ...s(27, "#ffd700"),
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.killText = this.add
      .text(928, 12, "Kills: 0", {
        ...s(22, "#aaffaa"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(1, 0)
      .setDepth(20);

    if (this._debugMode) {
      this.waveText.setVisible(false);
      this.killText.setVisible(false);
    }

    this.announceText = this.add
      .text(480, 200, "", {
        ...s(52, "#ffd700"),
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(25)
      .setAlpha(0);

    this.hintsText = this.add.text(480, 528, "WASD — Move    LClick — Attack    Shift — Dash    Space — Summon/Dismiss Clone    RClick — Reposition Clone", s(11, "#666666")).setOrigin(0.5, 1).setDepth(20);
    this.time.delayedCall(8000, () => {
      this.tweens.add({ targets: this.hintsText, alpha: 0, duration: 1000 });
    });
  }

  _buildIndicators(): void {
    this.playerAttackIndicator = this.add.graphics().setDepth(8);
    this.cloneAttackIndicator = this.add.graphics().setDepth(7);
    this.anchorIndicator = this.add.graphics().setDepth(3);
  }

  _buildWaveManager(): void {
    this.waveManager = new WaveManager(this as any);
    this.waveManager.start();
  }

  // ─── Debug spawn panel ─────────────────────────────────────────────────────

  _buildDebugPanel(): void {
    /* TODO: This section is baffling and needs a rewrite, but fine for now */
    const mono = '"Courier New", Courier, monospace';
    const t = (sz: number, col: string) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    const PW = 160,
      PX = 960 - PW;
    const BTN_H = 34,
      GAP = 4;

    let panelVisible = false;
    const toggleBg = this.add
      .rectangle(PX + PW / 2, 14, PW - 12, 22, 0x1a0a2e)
      .setDepth(32)
      .setInteractive({ useHandCursor: true });
    const toggleLbl = this.add
      .text(PX + PW / 2, 14, "DEBUG ▶", t(13, "#aa44cc"))
      .setOrigin(0.5, 0.5)
      .setDepth(33);
    toggleBg.on("pointerover", () => toggleBg.setFillStyle(0x330066));
    toggleBg.on("pointerout", () => toggleBg.setFillStyle(0x1a0a2e));
    toggleBg.on("pointerdown", (_p: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      panelVisible = !panelVisible;
      toggleLbl.setText(panelVisible ? "DEBUG ▼" : "DEBUG ▶");
      panelItems.forEach((o: any) => o.setVisible(panelVisible));
      if (panelVisible) {
        spawnOpen = false;
        headerLbl.setText("▶ Spawn");
        spawnBtns.forEach(({ bg, lbl }: any) => {
          bg.setVisible(false);
          lbl.setVisible(false);
        });
        repositionUtil();
      }
    });

    const panelItems: any[] = [];
    const p = (obj: any) => {
      obj.setVisible(false);
      panelItems.push(obj);
      return obj;
    };

    p(
      this.add
        .rectangle(PX + PW / 2, 270, PW, 520, 0x0a0016, 0.85)
        .setDepth(30)
        .setOrigin(0.5, 0.5),
    );

    let spawnOpen = false;
    const HEADER_Y = 38;

    const headerBg = p(
      this.add
        .rectangle(PX + PW / 2, HEADER_Y + BTN_H / 2, PW - 12, BTN_H, 0x1a0a2e)
        .setDepth(30)
        .setInteractive({ useHandCursor: true }),
    );
    const headerLbl = p(
      this.add
        .text(PX + PW / 2, HEADER_Y + BTN_H / 2, "▶ Spawn", t(12, "#aa66dd"))
        .setOrigin(0.5, 0.5)
        .setDepth(31),
    );
    headerBg.on("pointerover", () => headerBg.setFillStyle(0x330066));
    headerBg.on("pointerout", () => headerBg.setFillStyle(0x1a0a2e));

    const spawnEntries = [
      { label: "Mutant Toad", col: "#88ff88", fn: () => this.spawnWave(1, 0, 0, 0) },
      { label: "Hell Hound", col: "#ff8844", fn: () => this.spawnWave(0, 1, 0, 0) },
      { label: "Plague Crow", col: "#88ccff", fn: () => this.spawnWave(0, 0, 1, 0) },
      { label: "Void Demon", col: "#ff88ff", fn: () => this.spawnWave(0, 0, 0, 1) },
      { label: "3× Toads", col: "#88ff88", fn: () => this.spawnWave(3, 0, 0, 0) },
      { label: "3× Hounds", col: "#ff8844", fn: () => this.spawnWave(0, 3, 0, 0) },
      { label: "3× Crows", col: "#88ccff", fn: () => this.spawnWave(0, 0, 3, 0) },
    ];

    const spawnBtns = spawnEntries.map((entry, i) => {
      const by = HEADER_Y + BTN_H + GAP + i * (BTN_H + GAP);
      const bg = p(
        this.add
          .rectangle(PX + PW / 2, by + BTN_H / 2, PW - 12, BTN_H, 0x120820)
          .setDepth(30)
          .setInteractive({ useHandCursor: true }),
      );
      const lbl = p(
        this.add
          .text(PX + PW / 2, by + BTN_H / 2, entry.label, t(12, entry.col))
          .setOrigin(0.5, 0.5)
          .setDepth(31),
      );
      bg.on("pointerover", () => bg.setFillStyle(0x280050));
      bg.on("pointerout", () => bg.setFillStyle(0x120820));
      bg.on("pointerdown", (_p: any, _lx: any, _ly: any, event: any) => {
        event.stopPropagation();
        entry.fn();
      });
      return { bg, lbl };
    });

    const utilEntries = [
      { label: "Dmg Player", col: "#ff4444", fn: () => this.player.takeDamage(1) },
      {
        label: "Dmg Clone",
        col: "#cc44ff",
        fn: () => {
          if (this.clone?.active && !(this.clone as any)._dead) this.clone.takeDamage(1);
        },
      },
      { label: "Clear All", col: "#ff4455", fn: () => this._debugClearEnemies() },
    ];

    const utilBgs: any[] = [];
    const utilLbls: any[] = [];

    utilEntries.forEach((entry) => {
      const bg = p(
        this.add
          .rectangle(0, 0, PW - 12, BTN_H, 0x1a0a2e)
          .setDepth(30)
          .setInteractive({ useHandCursor: true }),
      );
      const lbl = p(this.add.text(0, 0, entry.label, t(12, entry.col)).setOrigin(0.5, 0.5).setDepth(31));
      bg.on("pointerover", () => bg.setFillStyle(0x330066));
      bg.on("pointerout", () => bg.setFillStyle(0x1a0a2e));
      bg.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
        event.stopPropagation();
        entry.fn();
      });
      utilBgs.push(bg);
      utilLbls.push(lbl);
    });

    this._debugCountText = p(this.add.text(0, 0, "Enemies: 0", t(10, "#555555")).setOrigin(0.5, 0).setDepth(30));

    const ROW_H = 26;
    const statDefs = [
      {
        label: () => `Plr HP  ${this.player.hp}/${this.player.maxHp}`,
        minus: () => {
          this.player.hp = Math.max(1, this.player.hp - 1);
        },
        plus: () => {
          this.player.maxHp++;
          this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
        },
      },
      {
        label: () => `Plr ATK  ${this.player.attackDamage}`,
        minus: () => {
          this.player.attackDamage = Math.max(1, this.player.attackDamage - 1);
        },
        plus: () => {
          this.player.attackDamage++;
        },
      },
      {
        label: () => (this.clone?.active ? `Cln HP  ${this.clone.hp}/${this.clone.maxHp}` : "Cln HP  --"),
        minus: () => {
          if (this.clone?.active) {
            (this.clone as any)._baseHp = Math.max(1, (this.clone as any)._baseHp - 1);
            this.clone.hp = Math.max(1, Math.min(this.clone.hp, this.clone.maxHp));
          }
        },
        plus: () => {
          if (this.clone?.active) {
            (this.clone as any)._baseHp++;
            this.clone.hp = Math.min(this.clone.hp + 1, this.clone.maxHp);
          }
        },
      },
      {
        label: () => (this.clone?.active ? `Cln ATK  ${this.clone.attackDamage}` : "Cln ATK  --"),
        minus: () => {
          if (this.clone?.active) (this.clone as any)._baseAtk = Math.max(1, (this.clone as any)._baseAtk - 1);
        },
        plus: () => {
          if (this.clone?.active) (this.clone as any)._baseAtk++;
        },
      },
    ];

    const statRows = statDefs.map((def) => {
      const bg = p(this.add.rectangle(0, 0, PW - 12, ROW_H, 0x0a0616).setDepth(30));
      const lbl = p(this.add.text(0, 0, def.label(), t(10, "#ccaaff")).setOrigin(0.5, 0.5).setDepth(32));
      const minusBg = p(this.add.rectangle(0, 0, 22, 20, 0x1a0a2e).setDepth(31).setInteractive({ useHandCursor: true }));
      const minusLbl = p(this.add.text(0, 0, "−", t(13, "#ff6666")).setOrigin(0.5, 0.5).setDepth(32));
      const plusBg = p(this.add.rectangle(0, 0, 22, 20, 0x1a0a2e).setDepth(31).setInteractive({ useHandCursor: true }));
      const plusLbl = p(this.add.text(0, 0, "+", t(13, "#66ff88")).setOrigin(0.5, 0.5).setDepth(32));
      minusBg.on("pointerover", () => minusBg.setFillStyle(0x330022));
      minusBg.on("pointerout", () => minusBg.setFillStyle(0x1a0a2e));
      minusBg.on("pointerdown", (_p: any, _x: any, _y: any, ev: any) => {
        ev.stopPropagation();
        def.minus();
        lbl.setText(def.label());
      });
      plusBg.on("pointerover", () => plusBg.setFillStyle(0x003322));
      plusBg.on("pointerout", () => plusBg.setFillStyle(0x1a0a2e));
      plusBg.on("pointerdown", (_p: any, _x: any, _y: any, ev: any) => {
        ev.stopPropagation();
        def.plus();
        lbl.setText(def.label());
      });
      return { bg, lbl, minusBg, minusLbl, plusBg, plusLbl };
    });

    this._showOverlapZone = false;
    const ovBg = p(
      this.add
        .rectangle(0, 0, PW - 12, BTN_H, 0x1a0a2e)
        .setDepth(30)
        .setInteractive({ useHandCursor: true }),
    );
    const ovLbl = p(this.add.text(0, 0, "[ ] Overlap zone", t(11, "#888888")).setOrigin(0.5, 0.5).setDepth(31));
    ovBg.on("pointerover", () => ovBg.setFillStyle(0x330066));
    ovBg.on("pointerout", () => ovBg.setFillStyle(0x1a0a2e));
    ovBg.on("pointerdown", (_p: any, _x: any, _y: any, ev: any) => {
      ev.stopPropagation();
      this._showOverlapZone = !this._showOverlapZone;
      ovLbl.setText(this._showOverlapZone ? "[x] Overlap zone" : "[ ] Overlap zone");
      ovLbl.setStyle({ fill: this._showOverlapZone ? "#ffff44" : "#888888" });
    });

    const repositionUtil = () => {
      const spawnH = spawnOpen ? spawnEntries.length * (BTN_H + GAP) : 0;
      let uy = HEADER_Y + BTN_H + GAP + spawnH + 8;
      utilEntries.forEach((_, i) => {
        const cy = uy + BTN_H / 2;
        utilBgs[i].setPosition(PX + PW / 2, cy);
        utilLbls[i].setPosition(PX + PW / 2, cy);
        uy += BTN_H + GAP;
      });
      uy += 4;
      statRows.forEach((row) => {
        const cy = uy + ROW_H / 2;
        row.bg.setPosition(PX + PW / 2, cy);
        row.lbl.setPosition(PX + PW / 2, cy);
        row.minusBg.setPosition(PX + 14, cy);
        row.minusLbl.setPosition(PX + 14, cy);
        row.plusBg.setPosition(PX + PW - 14, cy);
        row.plusLbl.setPosition(PX + PW - 14, cy);
        uy += ROW_H + GAP;
      });
      if (this._debugCountText) this._debugCountText.setPosition(PX + PW / 2, uy + 2);
      uy += 16;
      ovBg.setPosition(PX + PW / 2, uy + BTN_H / 2);
      ovLbl.setPosition(PX + PW / 2, uy + BTN_H / 2);
    };

    repositionUtil();

    headerBg.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      spawnOpen = !spawnOpen;
      headerLbl.setText(spawnOpen ? "▼ Spawn" : "▶ Spawn");
      spawnBtns.forEach(({ bg, lbl }: any) => {
        const show = panelVisible && spawnOpen;
        bg.setVisible(show);
        lbl.setVisible(show);
      });
      repositionUtil();
    });

    const backBg = p(
      this.add
        .rectangle(PX + PW / 2, 510, PW - 12, 24, 0x1a0a2e)
        .setDepth(30)
        .setInteractive({ useHandCursor: true }),
    );
    p(
      this.add
        .text(PX + PW / 2, 510, "← Title", t(11, "#666666"))
        .setOrigin(0.5, 0.5)
        .setDepth(31),
    );
    backBg.on("pointerover", () => backBg.setFillStyle(0x220033));
    backBg.on("pointerout", () => backBg.setFillStyle(0x1a0a2e));
    backBg.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      this.scene.start("TitleScene");
    });

    // this._hitboxGfx = this.add.graphics().setDepth(50);
  }

  _debugClearEnemies(): void {
    this.enemies.getChildren().forEach((e: any) => {
      if (e.active) e._die?.();
    });
  }

  _drawDebugAttackZonees(): void {
    /* Disabled as think I can do this with phaser instead */
    return;
    const g = this._hitboxGfx;
    if (!g) return;
    g.clear();

    if (this._debugLabels) this._debugLabels.forEach((t) => t.destroy());
    this._debugLabels = [];

    const mono = '"Courier New", Courier, monospace';

    const drawBody = (sprite: any, color: number, label: string) => {
      if (!sprite?.active || !sprite.body) return;
      const b = sprite.body;
      const bw = Math.round(b.width),
        bh = Math.round(b.height);
      g.lineStyle(1, color, 0.9);
      g.strokeRect(b.x, b.y, bw, bh);
      if (label) {
        const txt = this.add
          .text(b.x + bw / 2, b.y - 2, `${label} ${bw}×${bh}`, {
            fontSize: "9px",
            color: "#" + color.toString(16).padStart(6, "0"),
            fontFamily: mono,
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(0.5, 1)
          .setDepth(51);
        this._debugLabels.push(txt);
      }
    };

    drawBody(this.player, 0x00ffff, "player");
    if (this.player.isAttacking) {
      this._drawDebugAttackZone(g, this.player, 0xffff00, 0.9);
    } else {
      this._drawDebugAttackZone(g, this.player, 0xffff00, 0.2);
    }
    if (this._showOverlapZone && this.player.attackZone?.body) {
      const az = this.player.attackZone;
      const ab = this.player.attackZone.body;
      g.lineStyle(1, 0xff4444, ab.enable ? 0.9 : 0.3);
      g.strokeRect(az.x - ab.width / 2, az.y - ab.height / 2, ab.width, ab.height);
    }

    if (this.clone?.active) {
      drawBody(this.clone, 0xcc66ff, "clone");
      if (this.clone.isAttacking) {
        this._drawDebugAttackZone(g, this.clone, 0xffdd00, 0.9);
      } else {
        this._drawDebugAttackZone(g, this.clone, 0xffdd00, 0.2);
      }
      if (this._showOverlapZone && this.clone.attackZone?.body) {
        const az = this.clone.attackZone;
        const ab = this.clone.attackZone.body;
        g.lineStyle(1, 0xff44ff, ab.enable ? 0.9 : 0.3);
        g.strokeRect(az.x - ab.width / 2, az.y - ab.height / 2, ab.width, ab.height);
      }
    }

    this.enemies.getChildren().forEach((e: any) => {
      if (!e.active) return;
      let col = 0xff4444;
      if (e instanceof HellHound) col = 0xff8800;
      if (e instanceof PlagueCrow) col = 0x88ccff;
      drawBody(e, col, e.constructor.name);
      if (e instanceof MutantToad && e._isAttacking) {
        const toadParams = { NH: 15, FH: 30, FD: 30, CTRL: 40, fillAlpha: e._attackFlash ? 0.5 : 0 };
        this._drawDebugAttackZone(g, e, 0xff4444, 0.9, toadParams);
      }
    });
  }

  _drawDebugAttackZone(g: Phaser.GameObjects.Graphics, entity: any, color: number, alpha: number, params: AttackZoneParams = {}): void {
    if (!entity?.active || !entity.body) return;
    const NH = params.NH ?? 15,
      FH = params.FH ?? 30;
    const FD = params.FD ?? 50,
      CTRL = params.CTRL ?? 70;
    const N = 16;
    const b = entity.body;
    const R2 = 0.7071067811865476;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const DCONF: Record<AttackDir, DirConfig> = {
      right: { fx: 1, fy: 0, ox: b.right, oy: cy },
      left: { fx: -1, fy: 0, ox: b.left, oy: cy },
      up: { fx: 0, fy: -1, ox: cx, oy: b.top },
      down: { fx: 0, fy: 1, ox: cx, oy: b.bottom },
      "up-right": { fx: R2, fy: -R2, ox: b.right, oy: b.top },
      "up-left": { fx: -R2, fy: -R2, ox: b.left, oy: b.top },
      "down-right": { fx: R2, fy: R2, ox: b.right, oy: b.bottom },
      "down-left": { fx: -R2, fy: R2, ox: b.left, oy: b.bottom },
    };
    const cfg = DCONF[entity.attackDir];
    if (!cfg) return;
    const { fx, fy, ox, oy } = cfg;
    const px = -fy,
      py = fx;

    const hA = { x: ox + px * NH, y: oy + py * NH };
    const hB = { x: ox - px * NH, y: oy - py * NH };
    const fA = { x: ox + fx * FD + px * FH, y: oy + fy * FD + py * FH };
    const fB = { x: ox + fx * FD - px * FH, y: oy + fy * FD - py * FH };
    const cp = { x: ox + fx * CTRL, y: oy + fy * CTRL };

    const buildPath = () => {
      g.beginPath();
      g.moveTo(hA.x, hA.y);
      g.lineTo(fA.x, fA.y);
      for (let i = 1; i <= N; i++) {
        const t = i / N,
          mt = 1 - t;
        g.lineTo(mt * mt * fA.x + 2 * mt * t * cp.x + t * t * fB.x, mt * mt * fA.y + 2 * mt * t * cp.y + t * t * fB.y);
      }
      g.lineTo(hB.x, hB.y);
      g.closePath();
    };

    if (params.fillAlpha) {
      g.fillStyle(color, params.fillAlpha);
      buildPath();
      g.fillPath();
    }
    g.lineStyle(1, color, alpha);
    buildPath();
    g.strokePath();
  }

  _buildCloneControls(): void {
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => {
      if (!this.player.active) return;
      if (this.clone?.active) this._dismissClone();
      else this._summonClone();
    });

    this.input.mouse.disableContextMenu();
    this.input.on("pointerdown", (ptr: any) => {
      if (ptr.rightButtonDown() && this.clone?.active && this.player.active) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ptr.worldX, ptr.worldY);
        const { x: offX, y: offY } = this._cardinalOffset(angle, 150);
        this.clone.anchorOffsetX = offX;
        this.clone.anchorOffsetY = offY;
        this.clone.startReposition();
        if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = false;
      }
    });
  }

  // ─── Attack visuals ────────────────────────────────────────────────────────

  _mouseDir(origin: Phaser.Physics.Arcade.Sprite): string {
    const ptr = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(origin.x, origin.y, ptr.worldX, ptr.worldY);
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -22.5 && deg < 22.5) return "right";
    if (deg >= 22.5 && deg < 67.5) return "down-right";
    if (deg >= 67.5 && deg < 112.5) return "down";
    if (deg >= 112.5 && deg < 157.5) return "down-left";
    if (deg >= -67.5 && deg < -22.5) return "up-right";
    if (deg >= -112.5 && deg < -67.5) return "up";
    if (deg >= -157.5 && deg < -112.5) return "up-left";
    return "left";
  }

  _updateAttackVisuals(): void {
    const playerMouseDir = this._mouseDir(this.player);

    if (!this.player.active) {
      this.playerAttackIndicator.clear();
    } else {
      const playerDir = this.player.isAttacking ? this.player.attackDir : playerMouseDir;
      this._drawAttackZonePreview(this.playerAttackIndicator, this.player, playerDir, 0xffd700);
    }

    if (this.clone?.active) {
      const cloneMouseDir = this._mouseDir(this.clone);
      const cloneDir = this.clone.isAttacking ? this.clone.attackDir : cloneMouseDir;
      this._drawAttackZonePreview(this.cloneAttackIndicator, this.clone, cloneDir, 0xcc88ff);
    } else {
      this.cloneAttackIndicator.clear();
    }
  }

  _updateAnchorIndicator(): void {
    this.anchorIndicator.clear();
    let ax: number, ay: number;
    if (this.player.active) {
      const ptr = this.input.activePointer;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ptr.worldX, ptr.worldY);
      const { x: offX, y: offY } = this._cardinalOffset(angle, 150);
      const wall = gameConfig.GAME_WALL;
      ax = Phaser.Math.Clamp(this.player.x + offX, wall, gameConfig.GAME_WIDTH - wall);
      ay = Phaser.Math.Clamp(this.player.y + offY, wall, gameConfig.GAME_HEIGHT - wall);

      const size = 3;
      this.anchorIndicator.lineStyle(1, cloneConfig.TINT, 1);
      this.anchorIndicator.lineBetween(ax - size, ay - size, ax + size, ay + size);
      this.anchorIndicator.lineBetween(ax - size, ay + size, ax + size, ay - size);
    } else {
      return;
    }
  }

  /**
   * Draws a shovel-shaped debug preview of the attack range.
   * Shape: A trapezoid with a curved outer edge.
   */
  _drawAttackZonePreview(g: Phaser.GameObjects.Graphics, entity: Player | Clone, dir: string, color: number): void {
    g.clear();

    // 1. Safety Check: Don't draw if the entity is dead or has no physics body
    if (!entity.active || !entity.body) return;

    const body = entity.body as Phaser.Physics.Arcade.Body;
    const centerX = body.x + body.width / 2;
    const centerY = body.y + body.height / 2;

    // TODO: Extract to contstants
    // 2. Shape Dimensions (Abstracted Constants)
    const NEAR_HALF_WIDTH = 15; // Width at the player's hands
    const FAR_HALF_WIDTH = 30; // Width at the tip of the shovel
    const ATTACK_DISTANCE = 50; // How far forward the shovel reaches
    const CURVE_CONTROL = 70; // How "puffed out" the curve is
    const CURVE_SAMPLES = 16; // Smoothness of the curve
    const R2 = 0.707; // Math helper for diagonal normalization

    // 3. Direction Mapping
    // fx/fy = Forward direction | ox/oy = Starting point (edge of player)
    const DIR_MAP: Record<string, any> = {
      right: { fx: 1, fy: 0, ox: body.right, oy: centerY },
      left: { fx: -1, fy: 0, ox: body.left, oy: centerY },
      up: { fx: 0, fy: -1, ox: centerX, oy: body.top },
      down: { fx: 0, fy: 1, ox: centerX, oy: body.bottom },
      "up-right": { fx: R2, fy: -R2, ox: body.right, oy: body.top },
      "up-left": { fx: -R2, fy: -R2, ox: body.left, oy: body.top },
      "down-right": { fx: R2, fy: R2, ox: body.right, oy: body.bottom },
      "down-left": { fx: -R2, fy: R2, ox: body.left, oy: body.bottom },
    };

    const config = DIR_MAP[dir] ?? DIR_MAP["right"];

    // px/py = Perpendicular direction (used to spread the width of the shovel)
    const px = -config.fy;
    const py = config.fx;

    // 4. Calculate the 4 Corners of the hitbox Shape
    const handleA = { x: config.ox + px * NEAR_HALF_WIDTH, y: config.oy + py * NEAR_HALF_WIDTH };
    const handleB = { x: config.ox - px * NEAR_HALF_WIDTH, y: config.oy - py * NEAR_HALF_WIDTH };
    const tipA = { x: config.ox + config.fx * ATTACK_DISTANCE + px * FAR_HALF_WIDTH, y: config.oy + config.fy * ATTACK_DISTANCE + py * FAR_HALF_WIDTH };
    const tipB = { x: config.ox + config.fx * ATTACK_DISTANCE - px * FAR_HALF_WIDTH, y: config.oy + config.fy * ATTACK_DISTANCE - py * FAR_HALF_WIDTH };

    // The "Control Point" for the curve at the end of the shovel
    const ctrlPoint = { x: config.ox + config.fx * CURVE_CONTROL, y: config.oy + config.fy * CURVE_CONTROL };

    // 5. Drawing Logic
    const isActuallyHitting = entity.isAttacking && entity.attackZone?.body?.enable;

    // Set line and fill styles based on attack state
    if (isActuallyHitting) {
      g.fillStyle(color, 0.35); // Solid-ish fill when attacking
      g.lineStyle(2, color, 1);
    } else {
      g.lineStyle(1, color, 0.3); // Faint outline when idle
    }

    // Trace the path
    g.beginPath();
    g.moveTo(handleA.x, handleA.y); // Start at handle corner A
    g.lineTo(tipA.x, tipA.y); // Draw line to tip corner A

    // Draw the curved shovel head using a Bezier curve
    for (let i = 1; i <= CURVE_SAMPLES; i++) {
      const t = i / CURVE_SAMPLES;
      const mt = 1 - t;
      const x = mt * mt * tipA.x + 2 * mt * t * ctrlPoint.x + t * t * tipB.x;
      const y = mt * mt * tipA.y + 2 * mt * t * ctrlPoint.y + t * t * tipB.y;
      g.lineTo(x, y);
    }

    g.lineTo(handleB.x, handleB.y); // Draw line back to handle corner B
    g.closePath();

    // Finalize the drawing
    if (isActuallyHitting) g.fillPath();
    g.strokePath();
  }

  // ─── Floating numbers ──────────────────────────────────────────────────────

  spawnDamageNumber(x: number, y: number, amount: number, color = "#ffffff", size = 19): void {
    const jitter = Phaser.Math.Between(-12, 12);
    const txt = this.add
      .text(x + jitter, y, `${amount}`, {
        fontSize: `${size}px`,
        color: color,
        fontFamily: '"Courier New", Courier, monospace',
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: txt,
      y: txt.y - 46,
      alpha: { from: 1, to: 0 },
      duration: 850,
      ease: "Power1",
      onComplete: () => txt.destroy(),
    });
  }

  spawnHealNumber(x: number, y: number, amount: number, color = "#44ffaa"): void {
    const txt = this.add
      .text(x, y, `+${amount}`, {
        fontSize: "20px",
        color: color,
        fontFamily: '"Courier New", Courier, monospace',
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: txt,
      y: txt.y - 50,
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Clone management ──────────────────────────────────────────────────────

  _cardinalOffset(angle: number, dist: number): { x: number; y: number } {
    const deg = Phaser.Math.RadToDeg(angle);
    const n = ((deg % 360) + 360) % 360;
    if (n < 45 || n >= 315) return { x: dist, y: 0 };
    if (n < 135) return { x: 0, y: dist };
    if (n < 225) return { x: -dist, y: 0 };
    return { x: 0, y: -dist };
  }

  _summonClone(): void {
    if (this.clone?.active) return;

    const ptr = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ptr.worldX, ptr.worldY);
    const { x: offX, y: offY } = this._cardinalOffset(angle, cloneConfig.ANCHOR_OFFSET);

    const prog = window.Progression;
    this.clone = new Clone(this, this.player.x, this.player.y, this.player, {
      bonusHp: prog.bonusCloneHp || 0,
    });
    this.clone.anchorOffsetX = offX;
    this.clone.anchorOffsetY = offY;

    this.clone.doDash(offX * 2.5, offY * 2.5);
    this.clone.startReposition();

    // this.cloneEnemyCollider = this.physics.add.collider(this.clone as any, this.enemies);
    // this.cloneEnemyCollider.active = false;

    this.physics.add.overlap(this.clone.attackZone, this.enemies, this._onCloneAttackHit, undefined, this);

    this._updateCloneHUD();
    this.showAnnouncement("Clone Summoned!", "#cc88ff");
  }

  _dismissClone(): void {
    if (!this.clone?.active) return;
    const kills = this.clone.killCount;
    this.clone.dismiss();
    this.onCloneDeath(kills, true);
  }

  _updateCloneHUD(): void {
    this.cloneHpContainer.removeAll(true);

    if (this.clone?.active) {
      const GAP = 29;
      for (let i = 0; i < this.clone.maxHp; i++) {
        const filled = i < this.clone.hp;
        this.cloneHpContainer.add(
          this.add.text(i * GAP, 0, filled ? "♥" : "♡", {
            fontSize: "27px",
            color: filled ? "#ff99ff" : "#884488",
            fontFamily: '"Courier New", Courier, monospace',
            stroke: "#000000",
            strokeThickness: 2,
          }),
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

  spawnWave(toadCount: number, houndCount: number, crowCount = 0, demonCount = 0): void {
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
    for (let i = 0; i < demonCount; i++) {
      const [x, y] = this._spawnPoint();
      this.enemies.add(new VoidDemon(this, x, y), true);
    }
  }

  onEnemyKilled(enemy: any): void {
    this.killCount++;
    this.killText.setText(`Kills: ${this.killCount}`);

    if (enemy.lastAttacker === "clone" && this.clone?.active) {
      this.clone.onKill();
      this._updateCloneHUD();
    } else if (enemy.lastAttacker === "player" && this.clone?.active) {
      if (this.clone.hp < this.clone.maxHp) {
        this.clone.hp = Math.min(this.clone.hp + 1, this.clone.maxHp);
        this.spawnHealNumber(this.clone.x, this.clone.y - 16, 1, "#cc88ff");
        this._updateCloneHUD();
      }
    }

    this.waveManager?.onEnemyKilled();
  }

  _cloneKillTier(kills: number): number {
    if (kills <= 0) return 0;
    if (kills < 3) return 1;
    return 1 + Math.floor(kills / 3);
  }

  onCloneDeath(kills: number, dismissed = false): void {
    this._totalCloneKills += kills;

    const burstDmg = this.clone ? this.clone.attackDamage : kills + 1;
    const tier = this._cloneKillTier(kills);
    const prog = window.Progression;

    let actualHeals = 0;
    if (tier > 0) {
      prog.bonusMaxHp += tier;
      this.player.maxHp += tier;
      this._totalPermHp += tier;
      const heal = Math.min(tier, this.player.maxHp - this.player.hp);
      this.player.hp += heal;
      actualHeals = heal;
      if (heal > 0) this.spawnHealNumber(this.player.x, this.player.y - 20, heal);
    }

    if (tier > 0) {
      prog.bonusDamage += tier;
      this.player.attackDamage += tier;
      this._totalPermAtk += tier;
    }

    this._totalHealGiven += actualHeals;

    const goldMultiplier = prog.goldBoost || 1;
    const goldEarned = Math.floor(kills * goldMultiplier);
    if (goldEarned > 0) {
      window.Gold.total += goldEarned;
      this._runGold += goldEarned;
      this._updateGoldHUD();
    }

    const verb = dismissed ? "dismissed" : "fell";
    let msg: string;
    if (kills === 0) {
      msg = `Clone ${verb} — no kills`;
    } else {
      const parts: string[] = [];
      if (tier > 0) parts.push(`+${tier} max HP`, `+${tier} ATK`);
      if (goldEarned > 0) parts.push(`+${goldEarned}g`);
      const bonus = parts.length > 0 ? `  ${parts.join("  ")}` : `  (need ${3 - kills} more for tier 2)`;
      msg = `Clone ${verb} — ${kills} kills${bonus}`;
    }
    this.showAnnouncement(msg, "#cc88ff");

    if (kills >= 5 && this.clone) {
      this._cloneBurst(this.clone.x, this.clone.y, burstDmg);
    }

    this.clone = null;
    this.cloneEnemyCollider = null;
    this._updateCloneHUD();
  }

  _cloneBurst(cx: number, cy: number, dmg: number): void {
    const W = 960,
      H = 540;
    const MAX_R = Math.sqrt(W * W + H * H) / 2 + 100;

    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xcc88ff, 0).setDepth(14);
    this.tweens.add({
      targets: flash,
      fillAlpha: { from: 0.35, to: 0 },
      duration: 500,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });

    const g = this.add.graphics().setDepth(15);
    const ring = { r: 1 };
    this.tweens.add({
      targets: ring,
      r: MAX_R,
      duration: 500,
      ease: "Power2",
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        g.clear();
        const alpha = 1 - tween.progress;
        g.lineStyle(4, 0xcc88ff, alpha);
        g.strokeCircle(cx, cy, ring.r);
      },
      onComplete: () => g.destroy(),
    });

    this.enemies.getChildren().forEach((e: any) => {
      if (!e.active) return;
      this.spawnDamageNumber(e.x, e.y - 10, dmg, "#cc88ff");
      e.takeDamage(dmg);
    });
  }

  spawnDeathEffect(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, "enemy-death").setDepth(6).setScale(1);
    sprite.play("enemy-death-anim");
    sprite.once("animationcomplete", () => sprite.destroy());
  }

  showAnnouncement(text: string, color = "#ffd700"): void {
    this.announceText.setText(text).setStyle({ fill: color }).setAlpha(1);
    this.tweens.killTweensOf(this.announceText);
    this.tweens.add({ targets: this.announceText, alpha: 0, duration: 600, delay: 1400 });
  }

  onPlayerDeath(): void {
    const sess = window.Session;
    sess.runs++;
    sess.totalKills += this.killCount;
    const currentWave = this.waveManager?.currentWave ?? 0;
    if (currentWave > sess.highestWave) sess.highestWave = currentWave;

    if (this.clone?.active) {
      this.clone.dismiss();
      this.clone = null;
    }

    this.enemies.getChildren().forEach((e: any) => e.setVelocity(0, 0));
    this.player.setActive(false).setVisible(false);
    this.player.attackZone.setActive(false);

    this.scene.start("GameOverScene", {
      wave: currentWave,
      kills: this.killCount,
      cloneKills: this._totalCloneKills,
      playerAtk: this.player.attackDamage,
      playerMaxHp: this.player.maxHp,
      healGiven: this._totalHealGiven,
      permHpGained: this._totalPermHp,
      permAtkGained: this._totalPermAtk,
      runGold: this._runGold,
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  _enemyInAttackZone(attacker: any, enemy: any): boolean {
    const b = enemy.body;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return [
      [cx, cy],
      [b.x, b.y],
      [b.right, b.y],
      [b.x, b.bottom],
      [b.right, b.bottom],
      [cx, b.y],
      [cx, b.bottom],
      [b.x, cy],
      [b.right, cy],
    ].some(([tx, ty]) => attacker._inAttackZone(tx, ty));
  }

  _onAttackHit(_zone: any, enemy: any): void {
    if (!this.player.isAttacking) return;
    if (!this.player.attackZone.body.enable) return;
    if (this.player.hitEnemies.has(enemy)) return;
    if (!this._enemyInAttackZone(this.player, enemy)) return;

    this.player.hitEnemies.add(enemy);
    enemy.lastAttacker = "player";
    const dmg = this.player.attackDamage;
    this.spawnDamageNumber(enemy.x, enemy.y - 10, dmg, "#ffff00", 26);
    enemy.takeDamage(dmg);
  }

  _onCloneAttackHit(_zone: any, enemy: any): void {
    if (!this.clone?.active) return;
    if (!this.clone.isAttacking) return;
    if (!this.clone.attackZone?.body?.enable) return;
    if (this.clone.hitEnemies.has(enemy)) return;
    if (!this._enemyInAttackZone(this.clone, enemy)) return;

    this.clone.hitEnemies.add(enemy);
    enemy.lastAttacker = "clone";
    const dmg = this.clone.attackDamage;
    this.spawnDamageNumber(enemy.x, enemy.y - 10, dmg, "#ffff00", 26);
    enemy.takeDamage(dmg);
  }

  _spawnPoint(): [number, number] {
    const side = Phaser.Math.Between(0, 3);
    const mx = Phaser.Math.Between;
    switch (side) {
      case 0:
        return [mx(50, 910), 48];
      case 1:
        return [mx(50, 910), 492];
      case 2:
        return [48, mx(50, 492)];
      default:
        return [912, mx(50, 492)];
    }
  }

  _rebuildHearts(): void {
    this.hpContainer.removeAll(true);
    for (let i = 0; i < this.player.maxHp; i++) {
      const filled = i < this.player.hp;
      this.hpContainer.add(
        this.add.text(i * 29, 0, filled ? "♥" : "♡", {
          fontSize: "27px",
          color: filled ? "#ff4466" : "#aa3355",
          fontFamily: '"Courier New", Courier, monospace',
          stroke: "#000000",
          strokeThickness: 2,
        }),
      );
    }
  }

  _updateHPBar(): void {
    this._rebuildHearts();
    this.atkText.setText(`ATK: ${this.player.attackDamage}`);

    const CARD_W = 150;
    if (this.player.dashCooldown > 0) {
      const pct = this.player.dashCooldown / this.player.dashCooldownMax;
      this.dashBarFill.setDisplaySize(Math.max(0, CARD_W * (1 - pct)), 3);
      this.dashLabel.setStyle({ fill: "#1a5566" });
      this.dashIcon.setTint(0x1a5566);
      this.dashCardBg.setFillStyle(0x060410, 0.88);
    } else {
      this.dashBarFill.setDisplaySize(CARD_W, 3);
      this.dashLabel.setStyle({ fill: "#44ccff" });
      this.dashIcon.setTint(0x44ccff);
      this.dashCardBg.setFillStyle(0x0a0616, 0.88);
    }
  }

  _updateGoldHUD(): void {
    this.goldText.setText(`${window.Gold.total}g`);
  }
}

(window as any).GameScene = GameScene;
