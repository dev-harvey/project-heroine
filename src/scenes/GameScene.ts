import * as Phaser from "phaser";
import Player from "../entities/Player";
import Clone from "../entities/Clone";
import MutantToad from "../entities/MutantToad";
import HellHound from "../entities/HellHound";
import PlagueCrow from "../entities/PlagueCrow";
import VoidDemon from "../entities/VoidDemon";
import WaveManager from "../systems/WaveManager";

import { CLONE_CONFIG, DIAGONAL_VECTOR, GAME_ASSETS, GAME_COLORS, GAME_CONFIG, PLAYER_CONFIG, UI_CONFIG } from "../utils/constants";
import { checkIfBBehindA, getAnchorOctoOffset, getMouseDirectionFromTarget } from "../utils/utils";
import GameUI from "../systems/GameUI";

export default class GameScene extends Phaser.Scene {
  // Core objects
  player!: Player;
  clone: Clone | null = null;
  enemies!: Phaser.Physics.Arcade.Group;
  waveManager!: WaveManager;

  ui: GameUI;

  cursorSprite!: Phaser.GameObjects.Image;

  // Colliders
  playerEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;
  cloneEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;

  // UI
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

  // Stats
  killCount: number = 0;
  _totalCloneKills: number = 0;
  _totalHealGiven: number = 0;
  _totalPermHp: number = 0;
  _totalPermAtk: number = 0;
  _runGold: number = 0;

  // Debug
  _debugMode: boolean = false;
  _hitboxGfx!: Phaser.GameObjects.Graphics;
  _debugLabels: Phaser.GameObjects.Text[] = [];

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
    
    this.ui.updateAbilityCooldown("dash", 1 - this.player.dash.cooldownTimer / this.player.dash.cooldown);

    this.player.anchorIndicator.update();
    this.player.attackIndicator.update();

    if (this.clone?.active) {
      this.clone.update(time, delta);
      this._updateCloneHUD();
      this.clone.attackIndicator.update();
    }

    this.enemies.getChildren().forEach((e: any) => {
      if (e.active) e.update(time, delta, this.player, this.clone);
    });

    this.ui.updateHUD();
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  _buildWorld(): void {
    const gameWidth = GAME_CONFIG.GAME_WIDTH,
      gameHeight = GAME_CONFIG.GAME_HEIGHT,
      wallX = GAME_CONFIG.GAME_WALL_X,
      wallY = GAME_CONFIG.GAME_WALL_Y;

    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, GAME_COLORS.MIDNIGHT).setDepth(0);

    const gFloor = this.add.graphics().setDepth(1);
    gFloor.fillStyle(0x888888, 1);
    gFloor.fillRect(wallX, wallY, gameWidth - wallX * 2, gameHeight - wallY * 2);

    this.add
      .tileSprite(0, wallY, gameWidth, gameHeight - wallY * 2, GAME_ASSETS.FLOOR_TILE, GAME_ASSETS.FLOOR_TILE_FRAME)
      .setOrigin(0, 0)
      .setDepth(1);

    const gWall = this.add.graphics().setDepth(2);
    gWall.fillStyle(GAME_COLORS.ICE, 1);
    gWall.fillRect(0, 0, gameWidth, wallY);
    gWall.fillRect(0, gameHeight - wallY, gameWidth, wallY);
    gWall.fillRect(0, 0, wallX, gameHeight);
    gWall.fillRect(gameWidth - wallX, 0, wallX, gameHeight);
    gWall.lineStyle(2, GAME_COLORS.SKY, 1);
    gWall.strokeRect(wallX, wallY, gameWidth - wallX * 2, gameHeight - wallY * 2);

    this.physics.world.setBounds(wallX, wallY, gameWidth - wallX * 2, gameHeight - wallY * 2);
  }

  _buildPlayer(): void {
    this.player = new Player(this, GAME_CONFIG.GAME_WIDTH / 2, GAME_CONFIG.GAME_HEIGHT / 2);
    this.player.on("attack", () => {
      if (this.clone?.active) this.clone.doAttack();
    });
    this.player.on("dash", (vx: number, vy: number) => {
      this.player.isInvincible = true;
      if (this.clone?.active) this.clone.dash.execute();
      if (this.playerEnemyCollider) this.playerEnemyCollider.active = false;
      if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = false;
      this.time.delayedCall(PLAYER_CONFIG.DASH_DURATION, () => {
        this.player.isInvincible = false;
        if (this.playerEnemyCollider) this.playerEnemyCollider.active = true;
        if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = true;
      });
    });

    // const prog = window.Progression;
    // this.player.maxHp += prog.bonusMaxHp || 0;
    // this.player.hp = this.player.maxHp;
    // this.player.attackDamage += prog.bonusDamage || 0;

    // const dashBonus = prog.dashCooldownBonus || 0;
    // if (dashBonus > 0) {
    //   this.player.dashCooldownMax = Math.max(300, this.player.dashCooldownMax - dashBonus);
    // }
  }

  _buildGroups(): void {
    this.enemies = this.physics.add.group();
  }

  _buildPhysics(): void {
    this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player.attackDetectionZone, this.enemies, this._onAttackHit, undefined, this);

    this.physics.add.overlap(this.player.attackDetectionZone, this.enemies, (_zone, enemy) => this._onAttackHit(this.player, enemy));
  }

  _buildUI(): void {
    // TODO: UI UPDATE
    this.ui = new GameUI(this, this.player);

    const mono = UI_CONFIG.BODY_FONT;

    // Helper to avoid repeating font/size/color boilerplate for every text object
    const textStyle = (sz: number, col: string) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    // Dash cooldown card — bottom-left HUD element with icon, label, keybind, and a fill bar
    

    // Gold display — gem icon + running total, top-left below clone stats
    this.goldIcon = this.add.sprite(28, 147, "gems", 134).setOrigin(0, 0.5).setDepth(20).setScale(1.6);
    this.goldText = this.add
      .text(50, 147, `${window.Gold?.total ?? 0}g`, {
        ...textStyle(19, "#ffd700"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(20);

    // Wave counter — centered at the top of the screen
    this.waveText = this.add
      .text(480, 12, "Wave 1", {
        ...textStyle(27, "#ffd700"),
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(20);
    // Kill counter — top-right corner
    this.killText = this.add
      .text(928, 12, "Kills: 0", {
        ...textStyle(22, "#aaffaa"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(1, 0)
      .setDepth(20);

    // In debug mode these are redundant with other tooling, so hide them
    if (this._debugMode) {
      this.waveText.setVisible(false);
      this.killText.setVisible(false);
    }

    // Large center-screen announcement text (e.g. "Wave 2!") — starts invisible,
    // tweened in/out by the wave manager when needed
    this.announceText = this.add
      .text(480, 200, "", {
        ...textStyle(52, "#ffd700"),
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setDepth(25)
      .setAlpha(0);

    // Control hints shown at the bottom of the screen, fade out after 8 seconds
    this.hintsText = this.add.text(480, 528, "WASD — Move    LClick — Attack    Shift — Dash    Space — Summon/Dismiss Clone    RClick — Reposition Clone", textStyle(11, "#666666")).setOrigin(0.5, 1).setDepth(20);
    this.time.delayedCall(8000, () => {
      this.tweens.add({ targets: this.hintsText, alpha: 0, duration: 1000 });
    });
  }

  _buildIndicators(): void {
    this.playerAttackIndicator = this.add.graphics().setDepth(8);
    this.cloneAttackIndicator = this.add.graphics().setDepth(7);
  }

  _buildWaveManager(): void {
    this.waveManager = new WaveManager(this as any);
    this.waveManager.start();
  }

  // ─── Debug spawn panel ─────────────────────────────────────────────────────

  _buildDebugPanel(): void {
    const mono = UI_CONFIG.BODY_FONT;
    const t = (sz: number, col: string) => ({ fontSize: `${sz}px`, fill: col, fontFamily: mono });

    const PW = 160,
      PX = GAME_CONFIG.GAME_WIDTH - PW;
    const BTN_H = 34,
      GAP = 4;

    let panelVisible = false;
    const toggleBg = this.add
      .rectangle(PX + PW / 2, 14, PW - 12, 22, 0x1a0a2e)
      .setDepth(32)
      .setInteractive({ useHandCursor: false });
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
        statsUtil();
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
        .setInteractive({ useHandCursor: false }),
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
    ];

    const spawnBtns = spawnEntries.map((entry, i) => {
      const by = HEADER_Y + BTN_H + GAP + i * (BTN_H + GAP);
      const bg = p(
        this.add
          .rectangle(PX + PW / 2, by + BTN_H / 2, PW - 12, BTN_H, 0x120820)
          .setDepth(30)
          .setInteractive({ useHandCursor: false }),
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
          .setInteractive({ useHandCursor: false }),
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
      const minusBg = p(this.add.rectangle(0, 0, 22, 20, 0x1a0a2e).setDepth(31).setInteractive({ useHandCursor: false }));
      const minusLbl = p(this.add.text(0, 0, "−", t(13, "#ff6666")).setOrigin(0.5, 0.5).setDepth(32));
      const plusBg = p(this.add.rectangle(0, 0, 22, 20, 0x1a0a2e).setDepth(31).setInteractive({ useHandCursor: false }));
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

    const statsUtil = () => {
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
      uy += 16;
    };

    statsUtil();

    headerBg.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      spawnOpen = !spawnOpen;
      headerLbl.setText(spawnOpen ? "▼ Spawn" : "▶ Spawn");
      spawnBtns.forEach(({ bg, lbl }: any) => {
        const show = panelVisible && spawnOpen;
        bg.setVisible(show);
        lbl.setVisible(show);
      });
      statsUtil();
    });

    const backBg = p(
      this.add
        .rectangle(PX + PW / 2, 510, PW - 12, 24, 0x1a0a2e)
        .setDepth(30)
        .setInteractive({ useHandCursor: false }),
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
  }

  _debugClearEnemies(): void {
    this.enemies.getChildren().forEach((e: any) => {
      if (e.active) e._die?.();
    });
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
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
        this.player.anchorOffset = getAnchorOctoOffset(angle, CLONE_CONFIG.ANCHOR_OFFSET);
        this.clone.startReposition();
      }
    });
  }

  // ─── Floating numbers ──────────────────────────────────────────────────────

  spawnDamageNumber(x: number, y: number, amount: number, color = "#ffffff", size = 19): void {
    const jitter = Phaser.Math.Between(-12, 12);
    const txt = this.add
      .text(x + jitter, y, `${amount}`, {
        fontSize: `${size}px`,
        color: color,
        fontFamily: UI_CONFIG.BODY_FONT,
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
        fontFamily: UI_CONFIG.BODY_FONT,
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

  _summonClone(): void {
    if (this.clone?.active) return;

    const prog = window.Progression;
    this.clone = new Clone(this, this.player.x, this.player.y, this.player, {
      bonusHp: prog.bonusCloneHp || 0,
    });

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
    this.player.anchorOffset = getAnchorOctoOffset(angle, CLONE_CONFIG.ANCHOR_OFFSET);

    this.cloneEnemyCollider = this.physics.add.collider(this.clone, this.enemies);

    // this.clone.dash.execute();
    this.clone.startReposition();

    this.physics.add.overlap(this.clone.attackDetectionZone, this.enemies, (_zone, enemy) => this._onAttackHit(this.player, enemy));

    this._updateCloneHUD();
    this.showAnnouncement("Clone Summoned!", "#cc88ff");

    this.events.emit('clone_summoned', this.clone);
  }

  _dismissClone(): void {
    if (!this.clone?.active) return;
    const kills = this.clone.killCount;
    this.clone.dismiss();
    this.onCloneDeath(kills, true);

    this.events.emit('clone_dismissed');
  }

  _updateCloneHUD(): void {
    this.ui.updateHUD(this.clone);
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
    const W = GAME_CONFIG.GAME_WIDTH,
      H = GAME_CONFIG.GAME_HEIGHT;
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
    this.player.attackDetectionZone.setActive(false);

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

  _onAttackHit(attacker: Player | Clone, enemy: any): void {
    if (!attacker.isAttacking) return;
    if (!attacker.attackDetectionZone.body.enable) return;
    if (attacker.hitEnemies.has(enemy)) return;

    if (checkIfBBehindA(attacker, enemy)) return;

    attacker.hitEnemies.add(enemy);
    enemy.lastAttacker = this.player ? "player" : "clone";
    this.spawnDamageNumber(enemy.x, enemy.y - 10, attacker.attackDamage, "#ffff00", 26);
    enemy.takeDamage(attacker.attackDamage);
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

  _updateGoldHUD(): void {
    this.goldText.setText(`${window.Gold.total}g`);
  }
}

window.GameScene = GameScene;
