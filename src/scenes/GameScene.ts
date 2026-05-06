import * as Phaser from "phaser";
import Player from "../entities/Player";
import Clone from "../entities/Clone";
import WaveManager from "../systems/WaveManager";

import { CLONE_CONFIG, GAME_ASSETS, GAME_COLORS, GAME_CONFIG, PLAYER_CONFIG, UI_CONFIG } from "../utils/constants";
import { checkIfBBehindA, colorToHex, getAnchorOctoOffset } from "../utils/utils";
import GameUI from "../systems/GameUI";
import Entity from "../entities/Entity";
import Enemy from "../entities/Enemy";
import OrcBasic from "../entities/OrcBasic";

export default class GameScene extends Phaser.Scene {
  // Core objects
  player: Player;
  clone: Clone | null = null;
  waveManager!: WaveManager;

  ui: GameUI;

  cursorSprite: Phaser.GameObjects.Image;

  enemies: Phaser.GameObjects.Group;
  enemiesAttackZones: Phaser.Physics.Arcade.Group | null = null;

  // Colliders
  playerEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;
  cloneEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;
  enemyEnemyCollider: Phaser.Physics.Arcade.Collider | null = null;

  playerAttackOverlap: Phaser.Physics.Arcade.Collider | null = null;
  cloneAttackOverlap: Phaser.Physics.Arcade.Collider | null = null;

  enemiesPlayerAttackOverlap: Phaser.Physics.Arcade.Collider | null = null;
  enemiesCloneAttackOverlap: Phaser.Physics.Arcade.Collider | null = null;

  // Stats
  // private killCount: number = 0;
  // private totalCloneKills: number = 0;
  private totalHealGiven: number = 0;
  private totalPermHp: number = 0;
  private totalPermAtk: number = 0;
  private runGold: number = 0;

  // Debug
  private debugMode: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  create(data: GameSceneData = {}): void {
    this.debugMode = !!data.debug;

    this.clone = null;

    this.buildWorld();
    this.buildPlayer();
    this.buildGroups();
    this.buildPhysics();

    this.ui = new GameUI(this, this.player);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ui.destroyEvents();
    });

    if (this.debugMode) this.buildDebugPanel();
    else this.buildWaveManager();

    this.events.on("death", this.onEntityDeath, this);

    this.buildCloneControls();
  }

  update(time: number, delta: number): void {
    if (!this.player.active) return;

    const ptr = this.input.activePointer;
    this.cursorSprite.setPosition(ptr.x, ptr.y);

    this.player.update(time, delta);

    this.ui.updateAbilityCooldown("dash", 1 - this.player.skills?.dash.cooldownTimer / this.player.skills?.dash.cooldown);

    this.player.anchor.indicator.update();
    this.player.attack.attackIndicator.update();

    if (this.clone?.active && this.clone?.entityState !== "dead") {
      this.clone.update(time, delta);
      this.ui.updateHudAttrs(this.clone);
      this.clone.attack.attackIndicator.update();
    }

    this.enemies.getChildren().forEach((e: Enemy) => {
      if (e.active) e.update(time, delta, this.player, this.clone);
    });

    this.ui.updateHudAttrs();
  }

  // ─── Setup ──────────────────────────────────────────────────────

  private buildWorld(): void {
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

  private buildPlayer(): void {
    const { GAME_HEIGHT, GAME_WALL_X } = GAME_CONFIG;
    this.player = new Player(this, GAME_WALL_X + 50, GAME_HEIGHT / 2, "player");
    this.player.on("attack", () => {
      if (this.clone?.active) this.clone.tryAttack();
    });

    this.player.on("dash", (vx: number, vy: number, dir: OctoDir) => {
      if (this.clone?.active) {
        this.clone.tryDash(dir);
      }
      if (this.playerEnemyCollider) this.playerEnemyCollider.active = false;
      if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = false;
      this.time.delayedCall(PLAYER_CONFIG.DASH_DURATION, () => {
        if (this.playerEnemyCollider) this.playerEnemyCollider.active = true;
        if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = true;
      });
    });
  }

  private buildGroups(): void {
    this.enemies = this.add.group();
    this.enemiesAttackZones = this.physics.add.group();
  }

  private buildPhysics(): void {
    this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies);
    this.enemyEnemyCollider = this.physics.add.collider(this.enemies, this.enemies);

    this.playerAttackOverlap = this.physics.add.overlap(this.player.attack.detectionZone, this.enemies, (_zone, target) => this.onAttackHit(_zone, target));

    /* Target and zone are swapped for this because the phaser gives the single target first then the group in the callback */
    this.enemiesPlayerAttackOverlap = this.physics.add.overlap(this.enemiesAttackZones, this.player, (target, _zone) => this.onAttackHit(_zone, target));
  }

  private buildWaveManager(): void {
    this.waveManager = new WaveManager(this);
    this.waveManager.start();
  }

  private buildCloneControls(): void {
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => {
      if (!this.player.active) return;
      if (this.clone?.active) {
        this.dismissClone();
      } else {
        this.summonClone();
      }
    });

    this.input.mouse.disableContextMenu();
    this.input.on("pointerdown", (ptr: any) => {
      if (ptr.rightButtonDown() && this.clone?.active && this.player.active && this.clone?.entityState !== "dead") {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
        this.player.anchor.offset = getAnchorOctoOffset(angle, CLONE_CONFIG.ANCHOR_OFFSET);
        this.clone.setEntityState("reposition");
      }
    });
  }

  // ─── Debug panel ──────────────────────────────────────────────────────

  private buildDebugPanel(): void {
    const textStyle = (size: number, color: string) => ({ fontSize: `${size}px`, fill: color, fontFamily: UI_CONFIG.BODY_FONT });

    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;

    // ── Layout constants ──────────────────────────────────────────────────────
    const panelWidth = 200;
    const panelLeft = GAME_WIDTH - GAME_WALL_X - panelWidth;
    const panelCenterX = panelLeft + panelWidth / 2;
    const buttonHeight = 34;
    const buttonGap = 4;
    const spawnSectionStartY = GAME_WALL_Y + 38;

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
    registerPanelItem(this.add.rectangle(panelCenterX, spawnSectionStartY, panelWidth, 520, COLOR_PANEL_BG, 0.85).setDepth(30).setOrigin(0.5, 0));

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
    const spawnEntries = [{ label: "Orc Basic", color: colorToHex(GAME_COLORS.FERN), fn: () => this.spawnWave(1, 0, 0, 0) }];

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
      {
        label: "Debug hitboxes",
        color: colorToHex(GAME_COLORS.MULBERRY),
        fn: () => {
          if (!this.physics.world.debugGraphic) {
            this.physics.world.createDebugGraphic();
            this.physics.world.debugGraphic.setVisible(false);
          }
          const dbg = this.physics.world.debugGraphic;
          dbg.setVisible(!dbg.visible);
          this.physics.world.drawDebug = dbg.visible;
        },
      },
      { label: "Dmg Player", color: colorToHex(GAME_COLORS.CRIMSON), fn: () => this.player.tryHurt(1) },
      {
        label: "Dmg Clone",
        color: colorToHex(GAME_COLORS.AMBER),
        fn: () => {
          if (this.clone?.active && this.clone.entityState !== "dead") this.clone.tryHurt(1);
        },
      },
      { label: "Clear All", color: colorToHex(GAME_COLORS.CRIMSON), fn: () => this.debugClearEnemies() },
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
    const statRowHeight = 30;
    const statDefs = [
      {
        label: () => `PLA HP: ${this.player.health.max}`,
        minus: () => {
          const newMax = this.player.health.max - 1;
          this.player.setMaxHp(newMax);
          this.player.health.current = Math.max(1, this.player.health.current - 1);
        },
        plus: () => {
          const newMax = this.player.health.max + 1;
          this.player.setMaxHp(newMax);
          this.player.health.current = Math.min(this.player.health.current + 1, newMax);
        },
      },
      {
        label: () => `PLA ATK: ${this.player.attack.damage}`,
        minus: () => {
          const newDamage = this.player.attack.damage - 1;
          this.player.setAttackDamage(newDamage);
        },
        plus: () => {
          const newDamage = this.player.attack.damage + 1;
          this.player.setAttackDamage(newDamage);
        },
      },
    ];

    const statRows = statDefs.map((def) => {
      const bg = registerPanelItem(this.add.rectangle(0, 0, panelWidth - 12, statRowHeight, 0x0a0616).setDepth(30));
      const lbl = registerPanelItem(this.add.text(0, 0, def.label(), textStyle(13, "#ccaaff")).setOrigin(0.5, 0.5).setDepth(32));
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

  private debugClearEnemies(): void {
    this.enemies.getChildren().forEach((e: any) => {
      if (e.active) e.die?.();
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

  private summonClone(): void {
    if (this.clone !== null) return;

    this.clone = new Clone(this, this.player.x, this.player.y, "player", this.player);

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
    this.player.anchor.offset = getAnchorOctoOffset(angle, CLONE_CONFIG.ANCHOR_OFFSET);

    this.cloneEnemyCollider = this.physics.add.collider(this.clone, this.enemies);
    this.cloneAttackOverlap = this.physics.add.overlap(this.clone.attack.detectionZone, this.enemies, (_zone, target) => this.onAttackHit(_zone, target));
    this.enemiesCloneAttackOverlap = this.physics.add.overlap(this.enemiesAttackZones, this.clone, (target, _zone) => this.onAttackHit(_zone, target));

    this.events.emit("clone_summoned", this.clone);
    this.ui.updateHudAttrs(this.clone);
  }

  private dismissClone(): void {
    this.clone.setEntityState("dead");
  }

  // ─── Public API ──────────────────────────────────────────────────────

  spawnWave(orcCount: number, houndCount: number, crowCount = 0, demonCount = 0): void {
    const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;

    const arenaZone = this.createSpawnZone(GAME_WIDTH - GAME_WALL_X - 600, GAME_WALL_Y, 200, GAME_HEIGHT - GAME_WALL_Y * 2, false);

    for (let i = 0; i < orcCount; i++) {
      const [x, y] = this.spawnPoint(arenaZone);
      const orc = new OrcBasic(this, x, y, "orc-01");
      this.enemies.add(orc, true);
      this.enemiesAttackZones.add(orc.attack.detectionZone);
    }
  }

  onEntityDeath(entity: IEntity): void {
    switch (entity.entityType) {
      case "player":
        this.onPlayerDeath();
        break;
      case "clone":
        this.onCloneDeath();
        break;
      default:
        entity?.lastAttacker.registerKill();
        this.ui.updateHudAttrs(entity?.lastAttacker);
        this.ui.updateHudKills(entity?.lastAttacker);
        // this.waveManager?.onEnemyKilled();
        break;
    }
  }

  onPlayerDeath(): void {
    this.scene.start("GameOverScene", {
      wave: 1,
      kills: this.player.killCount,
      cloneKills: 0,
      playerAtk: this.player.attack.damage,
      playerMaxHp: this.player.health.max,
      healGiven: this.totalHealGiven,
      permHpGained: this.totalPermHp,
      permAtkGained: this.totalPermAtk,
      runGold: this.runGold,
    });
  }

  onCloneDeath(): void {
    this.clone = null;
    this.cloneEnemyCollider?.destroy();
    this.cloneEnemyCollider = null;
    this.cloneAttackOverlap?.destroy();
    this.cloneAttackOverlap = null;
    this.events.emit("clone_dismissed");
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private onAttackHit(attackerZone: any, target: any): void {
    const attacker = attackerZone.getData("owner");
    if (!attacker) return;
    if (attacker.entityState !== "attack") return;
    if (!attacker.attack.detectionZone.body.enable) return;
    const defender = target as IEntity;

    if (attacker.attack.hitEnemies.has(defender)) return;

    if (checkIfBBehindA(attacker, defender)) return;

    attacker.attack.hitEnemies.add(defender);

    defender.lastAttacker = attacker;
    this.spawnDamageNumber(defender.x, defender.y - 10, attacker.attack.damage, colorToHex(GAME_COLORS.BLOOD), 26);
    defender.tryHurt(attacker.attack.damage);
  }

  private createSpawnZone(x: number, y: number, width: number, height: number, debug = false): Phaser.Geom.Rectangle {
    const zone = new Phaser.Geom.Rectangle(x, y, width, height);

    if (debug) {
      const gfx = this.add.graphics().setDepth(100);
      gfx.lineStyle(2, 0xff0000, 1);
      gfx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }

    return zone;
  }

  private spawnPoint(zone: Phaser.Geom.Rectangle): [number, number] {
    const point = zone.getRandomPoint();
    return [point.x, point.y];
  }
}
