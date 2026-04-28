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
  enemyEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;
  playerAttackOverlap: Phaser.Physics.Arcade.Collider | null = null;

  // UI
  announceText!: Phaser.GameObjects.Text;
  hintsText!: Phaser.GameObjects.Text;
  dashCardBg!: Phaser.GameObjects.Rectangle;
  dashBarFill!: Phaser.GameObjects.Rectangle;
  dashLabel!: Phaser.GameObjects.Text;
  dashIcon!: Phaser.GameObjects.Sprite;

  // Arrows & preview graphics
  playerAttackIndicator!: Phaser.GameObjects.Graphics;
  cloneAttackIndicator!: Phaser.GameObjects.Graphics;

  // Stats
  // killCount: number = 0;
  // _totalCloneKills: number = 0;
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

    this.clone = null;

    this._buildWorld();
    this._buildPlayer();
    this._buildGroups();
    this._buildPhysics();
    this._buildIndicators();

    this.ui = new GameUI(this, this.player);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ui.destroyEvents();
    });

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
      this.ui.updateHudAttrs(this.clone);
      this.clone.attackIndicator.update();
    }

    this.enemies.getChildren().forEach((e: any) => {
      if (e.active) e.update(time, delta, this.player, this.clone);
    });

    this.ui.updateHudAttrs();
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
    const { GAME_HEIGHT, GAME_WALL_X } = GAME_CONFIG;
    this.player = new Player(this, GAME_WALL_X + 50, GAME_HEIGHT / 2);
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
    this.enemyEnemyCollider = this.physics.add.collider(this.enemies, this.enemies);
    this.playerAttackOverlap = this.physics.add.overlap(this.player.attackDetectionZone, this.enemies, (_zone, enemy) => this._onAttackHit(this.player, enemy));
  }

  _buildIndicators(): void {
    this.playerAttackIndicator = this.add.graphics().setDepth(8);
    this.cloneAttackIndicator = this.add.graphics().setDepth(7);
  }

  _buildWaveManager(): void {
    this.waveManager = new WaveManager(this as any);
    this.waveManager.start();
  }

  // ─── Debug panel ─────────────────────────────────────────────────────

  _buildDebugPanel(): void {
    const textStyle = (size: number, color: string) => ({ fontSize: `${size}px`, fill: color, fontFamily: UI_CONFIG.BODY_FONT });

    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;

    // ── Layout constants ──────────────────────────────────────────────────────
    const panelWidth = 160;
    const panelLeft = GAME_WIDTH - GAME_WALL_X - panelWidth;
    const panelCenterX = panelLeft + panelWidth / 2;
    const buttonHeight = 34;
    const buttonGap = 4;
    const spawnSectionStartY = 38;

    // ── Colors ────────────────────────────────────────────────────────────────
    const COLOR_PANEL_BG = 0x0a0016;
    const COLOR_BUTTON_DEFAULT = 0x1a0a2e;
    const COLOR_BUTTON_HOVER = 0x330066;
    const COLOR_SPAWN_DEFAULT = 0x120820;
    const COLOR_SPAWN_HOVER = 0x280050;

    // ── Toggle button (always visible, opens/closes the panel) ────────────────
    let panelVisible = false;

    const toggleButton = this.add
      .rectangle(panelCenterX - 10, GAME_WALL_Y + 20, panelWidth, 22, COLOR_BUTTON_DEFAULT)
      .setDepth(32)
      .setInteractive({ useHandCursor: false });
    const toggleLabel = this.add
      .text(panelCenterX - 10, GAME_WALL_Y + 20, "DEBUG ▶", textStyle(13, "#aa44cc"))
      .setOrigin(0.5, 0.5)
      .setDepth(33);

    toggleButton.on("pointerover", () => toggleButton.setFillStyle(COLOR_BUTTON_HOVER));
    toggleButton.on("pointerout", () => toggleButton.setFillStyle(COLOR_BUTTON_DEFAULT));
    toggleButton.on("pointerdown", (_p: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      panelVisible = !panelVisible;
      toggleLabel.setText(panelVisible ? "DEBUG ▼" : "DEBUG ▶");
      panelItems.forEach((item: any) => item.setVisible(panelVisible));
      if (panelVisible) {
        // Collapse spawn list whenever panel is reopened
        spawnSectionOpen = false;
        spawnSectionLabel.setText("▶ Spawn");
        spawnButtons.forEach(({ bg, lbl }: any) => {
          bg.setVisible(false);
          lbl.setVisible(false);
        });
        repositionUtilAndStatRows();
      }
    });

    // Helper — registers an object as part of the panel (hidden by default)
    const panelItems: any[] = [];
    const registerPanelItem = (obj: any) => {
      obj.setVisible(false);
      panelItems.push(obj);
      return obj;
    };

    // ── Panel background ──────────────────────────────────────────────────────
    registerPanelItem(this.add.rectangle(panelCenterX, 270, panelWidth, 520, COLOR_PANEL_BG, 0.85).setDepth(30).setOrigin(0.5, 0.5));

    // ── Spawn section header (collapses/expands the spawn buttons) ────────────
    let spawnSectionOpen = false;

    const spawnSectionHeader = registerPanelItem(
      this.add
        .rectangle(panelCenterX, spawnSectionStartY + buttonHeight / 2, panelWidth - 12, buttonHeight, COLOR_BUTTON_DEFAULT)
        .setDepth(30)
        .setInteractive({ useHandCursor: false }),
    );
    const spawnSectionLabel = registerPanelItem(
      this.add
        .text(panelCenterX, spawnSectionStartY + buttonHeight / 2, "▶ Spawn", textStyle(12, "#aa66dd"))
        .setOrigin(0.5, 0.5)
        .setDepth(31),
    );

    spawnSectionHeader.on("pointerover", () => spawnSectionHeader.setFillStyle(COLOR_BUTTON_HOVER));
    spawnSectionHeader.on("pointerout", () => spawnSectionHeader.setFillStyle(COLOR_BUTTON_DEFAULT));

    // ── Spawn buttons (one per enemy type) ───────────────────────────────────
    const spawnEntries = [
      { label: "Mutant Toad", color: "#88ff88", fn: () => this.spawnWave(1, 0, 0, 0) },
      { label: "Hell Hound", color: "#ff8844", fn: () => this.spawnWave(0, 1, 0, 0) },
      { label: "Plague Crow", color: "#88ccff", fn: () => this.spawnWave(0, 0, 1, 0) },
      { label: "Void Demon", color: "#ff88ff", fn: () => this.spawnWave(0, 0, 0, 1) },
    ];

    const spawnButtons = spawnEntries.map((entry, i) => {
      const buttonY = spawnSectionStartY + buttonHeight + buttonGap + i * (buttonHeight + buttonGap);
      const bg = registerPanelItem(
        this.add
          .rectangle(panelCenterX, buttonY + buttonHeight / 2, panelWidth - 12, buttonHeight, COLOR_SPAWN_DEFAULT)
          .setDepth(30)
          .setInteractive({ useHandCursor: false }),
      );
      const lbl = registerPanelItem(
        this.add
          .text(panelCenterX, buttonY + buttonHeight / 2, entry.label, textStyle(12, entry.color))
          .setOrigin(0.5, 0.5)
          .setDepth(31),
      );
      bg.on("pointerover", () => bg.setFillStyle(COLOR_SPAWN_HOVER));
      bg.on("pointerout", () => bg.setFillStyle(COLOR_SPAWN_DEFAULT));
      bg.on("pointerdown", (_p: any, _lx: any, _ly: any, event: any) => {
        event.stopPropagation();
        entry.fn();
      });
      return { bg, lbl };
    });

    // ── Utility buttons (damage / clear) ─────────────────────────────────────
    const utilEntries = [
      { label: "Dmg Player", color: "#ff4444", fn: () => this.player.takeDamage(1) },
      {
        label: "Dmg Clone",
        color: "#cc44ff",
        fn: () => {
          if (this.clone?.active && !(this.clone as any)._dead) this.clone.takeDamage(1);
        },
      },
      { label: "Clear All", color: "#ff4455", fn: () => this._debugClearEnemies() },
    ];

    // Positions are set dynamically by repositionUtilAndStatRows(), so start at 0,0
    const utilButtonBgs: any[] = [];
    const utilButtonLabels: any[] = [];

    utilEntries.forEach((entry) => {
      const bg = registerPanelItem(
        this.add
          .rectangle(0, 0, panelWidth - 12, buttonHeight, COLOR_BUTTON_DEFAULT)
          .setDepth(30)
          .setInteractive({ useHandCursor: false }),
      );
      const lbl = registerPanelItem(this.add.text(0, 0, entry.label, textStyle(12, entry.color)).setOrigin(0.5, 0.5).setDepth(31));
      bg.on("pointerover", () => bg.setFillStyle(COLOR_BUTTON_HOVER));
      bg.on("pointerout", () => bg.setFillStyle(COLOR_BUTTON_DEFAULT));
      bg.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
        event.stopPropagation();
        entry.fn();
      });
      utilButtonBgs.push(bg);
      utilButtonLabels.push(lbl);
    });

    // ── Stat rows (HP / ATK tweakers with − and + buttons) ───────────────────
    const statRowHeight = 26;
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
      const bg = registerPanelItem(this.add.rectangle(0, 0, panelWidth - 12, statRowHeight, 0x0a0616).setDepth(30));
      const lbl = registerPanelItem(this.add.text(0, 0, def.label(), textStyle(10, "#ccaaff")).setOrigin(0.5, 0.5).setDepth(32));
      const minusBg = registerPanelItem(this.add.rectangle(0, 0, 22, 20, COLOR_BUTTON_DEFAULT).setDepth(31).setInteractive({ useHandCursor: false }));
      const minusLbl = registerPanelItem(this.add.text(0, 0, "−", textStyle(13, "#ff6666")).setOrigin(0.5, 0.5).setDepth(32));
      const plusBg = registerPanelItem(this.add.rectangle(0, 0, 22, 20, COLOR_BUTTON_DEFAULT).setDepth(31).setInteractive({ useHandCursor: false }));
      const plusLbl = registerPanelItem(this.add.text(0, 0, "+", textStyle(13, "#66ff88")).setOrigin(0.5, 0.5).setDepth(32));

      minusBg.on("pointerover", () => minusBg.setFillStyle(0x330022));
      minusBg.on("pointerout", () => minusBg.setFillStyle(COLOR_BUTTON_DEFAULT));
      minusBg.on("pointerdown", (_p: any, _x: any, _y: any, event: any) => {
        event.stopPropagation();
        def.minus();
        lbl.setText(def.label());
      });

      plusBg.on("pointerover", () => plusBg.setFillStyle(0x003322));
      plusBg.on("pointerout", () => plusBg.setFillStyle(COLOR_BUTTON_DEFAULT));
      plusBg.on("pointerdown", (_p: any, _x: any, _y: any, event: any) => {
        event.stopPropagation();
        def.plus();
        lbl.setText(def.label());
      });

      return { bg, lbl, minusBg, minusLbl, plusBg, plusLbl };
    });

    // Recalculates Y positions for util buttons and stat rows.
    // Called whenever the spawn section is toggled, since it shifts everything below it.
    const repositionUtilAndStatRows = () => {
      const spawnSectionHeight = spawnSectionOpen ? spawnEntries.length * (buttonHeight + buttonGap) : 0;
      let currentY = spawnSectionStartY + buttonHeight + buttonGap + spawnSectionHeight + 8;

      utilEntries.forEach((_, i) => {
        const centerY = currentY + buttonHeight / 2;
        utilButtonBgs[i].setPosition(panelCenterX, centerY);
        utilButtonLabels[i].setPosition(panelCenterX, centerY);
        currentY += buttonHeight + buttonGap;
      });

      currentY += 4;

      statRows.forEach((row) => {
        const centerY = currentY + statRowHeight / 2;
        row.bg.setPosition(panelCenterX, centerY);
        row.lbl.setPosition(panelCenterX, centerY);
        row.minusBg.setPosition(panelLeft + 14, centerY);
        row.minusLbl.setPosition(panelLeft + 14, centerY);
        row.plusBg.setPosition(panelLeft + panelWidth - 14, centerY);
        row.plusLbl.setPosition(panelLeft + panelWidth - 14, centerY);
        currentY += statRowHeight + buttonGap;
      });
    };

    repositionUtilAndStatRows();

    spawnSectionHeader.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      spawnSectionOpen = !spawnSectionOpen;
      spawnSectionLabel.setText(spawnSectionOpen ? "▼ Spawn" : "▶ Spawn");
      spawnButtons.forEach(({ bg, lbl }: any) => {
        const visible = panelVisible && spawnSectionOpen;
        bg.setVisible(visible);
        lbl.setVisible(visible);
      });
      repositionUtilAndStatRows();
    });

    // ── Back to title button ──────────────────────────────────────────────────
    const backButton = registerPanelItem(
      this.add
        .rectangle(panelCenterX, 510, panelWidth - 12, 24, COLOR_BUTTON_DEFAULT)
        .setDepth(30)
        .setInteractive({ useHandCursor: false }),
    );
    registerPanelItem(this.add.text(panelCenterX, 510, "← Title", textStyle(11, "#666666")).setOrigin(0.5, 0.5).setDepth(31));
    backButton.on("pointerover", () => backButton.setFillStyle(0x220033));
    backButton.on("pointerout", () => backButton.setFillStyle(COLOR_BUTTON_DEFAULT));
    backButton.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
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

    this.physics.add.overlap(this.clone.attackDetectionZone, this.enemies, (_zone, enemy) => this._onAttackHit(this.clone, enemy));

    this.events.emit("clone_summoned", this.clone);
    this.ui.updateHudAttrs(this.clone);
  }

  _dismissClone(): void {
    if (!this.clone?.active) return;
    const kills = this.clone.killCount;
    this.clone.dismiss();
    this.onCloneDeath(kills, true);

    this.events.emit("clone_dismissed");
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  spawnWave(toadCount: number, houndCount: number, crowCount = 0, demonCount = 0): void {
    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;

    const arenaZone = this._createSpawnZone(GAME_WIDTH - GAME_WALL_X - 200, GAME_WALL_Y, 200, GAME_HEIGHT - GAME_WALL_Y * 2, false);

    for (let i = 0; i < toadCount; i++) {
      const [x, y] = this._spawnPoint(arenaZone);
      const toad = new MutantToad(this, x, y);
      this.enemies.add(toad, true);
    }
    for (let i = 0; i < houndCount; i++) {
      const [x, y] = this._spawnPoint(arenaZone);
      this.enemies.add(new HellHound(this, x, y), true);
    }
    for (let i = 0; i < crowCount; i++) {
      const [x, y] = this._spawnPoint(arenaZone);
      this.enemies.add(new PlagueCrow(this, x, y), true);
    }
    for (let i = 0; i < demonCount; i++) {
      const [x, y] = this._spawnPoint(arenaZone);
      this.enemies.add(new VoidDemon(this, x, y), true);
    }
  }

  onEnemyKilled(enemy: any): void {
    if (enemy.lastAttacker === "clone" && this.clone?.active) {
      this.clone.onKill();
      this.ui.updateHudAttrs(this.clone);
      this.ui.updateHudKills(this.clone);
    } else if (enemy.lastAttacker === "player") {
      this.player.killCount++;
      this.ui.updateHudKills(this.player);
    }
    this.waveManager?.onEnemyKilled();
  }

  _cloneKillTier(kills: number): number {
    if (kills <= 0) return 0;
    if (kills < 3) return 1;
    return 1 + Math.floor(kills / 3);
  }

  onCloneDeath(kills: number, dismissed = false): void {
    // this._totalCloneKills += kills;

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

    const verb = dismissed ? "dismissed" : "fell";
    let msg: string;
    if (kills === 0) {
      msg = `Clone ${verb} — no kills`;
    } else {
      const parts: string[] = [];
      if (tier > 0) parts.push(`+${tier} max HP`, `+${tier} ATK`);
      const bonus = parts.length > 0 ? `  ${parts.join("  ")}` : `  (need ${3 - kills} more for tier 2)`;
      msg = `Clone ${verb} — ${kills} kills${bonus}`;
    }
    // this.showAnnouncement(msg, "#cc88ff");

    if (kills >= 5 && this.clone) {
      this._cloneBurst(this.clone.x, this.clone.y, burstDmg);
    }

    this.clone = null;
    this.cloneEnemyCollider = null;
    this.events.emit("clone_dismissed");
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
    sess.totalKills += this.player.killCount;
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
      kills: this.player.killCount,
      cloneKills: 0,
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
    enemy.lastAttacker = attacker === this.player ? "player" : "clone";
    this.spawnDamageNumber(enemy.x, enemy.y - 10, attacker.attackDamage, "#ffff00", 26);
    enemy.takeDamage(attacker.attackDamage);
  }

  _createSpawnZone(x: number, y: number, width: number, height: number, debug = false): Phaser.Geom.Rectangle {
    const zone = new Phaser.Geom.Rectangle(x, y, width, height);

    if (debug) {
      const gfx = this.add.graphics().setDepth(100);
      gfx.lineStyle(2, 0xff0000, 1);
      gfx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }

    return zone;
  }

  _spawnPoint(zone: Phaser.Geom.Rectangle): [number, number] {
    const point = zone.getRandomPoint();
    return [point.x, point.y];
  }
}

window.GameScene = GameScene;
