import { DEPTH, GAME_COLORS, GAME_CONFIG, UI_CONFIG } from "../utils/constants";
import { colorToHex } from "../utils/utils";
import GameScene from "../scenes/GameScene";

export default class DebugPanel {
  constructor(scene: GameScene) {
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

    const toggleButton = scene.add
      .rectangle(panelCenterX - 10, GAME_WALL_Y + 20, panelWidth, 22, COLOR_BUTTON_DEFAULT)
      .setDepth(DEPTH.DEBUG + 2)
      .setInteractive({ useHandCursor: false });
    const toggleLabel = scene.add
      .text(panelCenterX - 10, GAME_WALL_Y + 20, "DEBUG ▶", textStyle(13, "#aa44cc"))
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.DEBUG + 3);

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
    registerPanelItem(scene.add.rectangle(panelCenterX, spawnSectionStartY, panelWidth, 520, COLOR_PANEL_BG, 0.85).setDepth(DEPTH.DEBUG).setOrigin(0.5, 0));

    // ── Spawn section header (collapses/expands the spawn buttons) ────────────
    let spawnSectionOpen = false;

    const spawnSectionHeader = registerPanelItem(
      scene.add
        .rectangle(panelCenterX, spawnSectionStartY + buttonHeight / 2, panelWidth - 12, buttonHeight, COLOR_BUTTON_DEFAULT)
        .setDepth(DEPTH.DEBUG)
        .setInteractive({ useHandCursor: false }),
    );
    const spawnSectionLabel = registerPanelItem(
      scene.add
        .text(panelCenterX, spawnSectionStartY + buttonHeight / 2, "▶ Spawn", textStyle(12, "#aa66dd"))
        .setOrigin(0.5, 0.5)
        .setDepth(DEPTH.DEBUG + 1),
    );

    spawnSectionHeader.on("pointerover", () => spawnSectionHeader.setFillStyle(COLOR_BUTTON_HOVER));
    spawnSectionHeader.on("pointerout", () => spawnSectionHeader.setFillStyle(COLOR_BUTTON_DEFAULT));

    // ── Spawn buttons (one per enemy type) ───────────────────────────────────
    const spawnEntries = [{ label: "Spawn wave 1", color: colorToHex(GAME_COLORS.FERN), fn: () => scene.spawnWave(1) }];

    const spawnButtons = spawnEntries.map((entry, i) => {
      const buttonY = spawnSectionStartY + buttonHeight + buttonGap + i * (buttonHeight + buttonGap);
      const bg = registerPanelItem(
        scene.add
          .rectangle(panelCenterX, buttonY + buttonHeight / 2, panelWidth - 12, buttonHeight, COLOR_SPAWN_DEFAULT)
          .setDepth(DEPTH.DEBUG)
          .setInteractive({ useHandCursor: false }),
      );
      const lbl = registerPanelItem(
        scene.add
          .text(panelCenterX, buttonY + buttonHeight / 2, entry.label, textStyle(12, entry.color))
          .setOrigin(0.5, 0.5)
          .setDepth(DEPTH.DEBUG + 1),
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
          if (!scene.physics.world.debugGraphic) {
            scene.physics.world.createDebugGraphic();
            scene.physics.world.debugGraphic.setVisible(false);
          }
          const dbg = scene.physics.world.debugGraphic;
          dbg.setVisible(!dbg.visible);
          scene.physics.world.drawDebug = dbg.visible;
        },
      },
      { label: "Dmg Player", color: colorToHex(GAME_COLORS.CRIMSON), fn: () => scene.player.tryHurt(1) },
      {
        label: "Dmg Clone",
        color: colorToHex(GAME_COLORS.AMBER),
        fn: () => {
          if (scene.clone?.active && scene.clone.entityState !== "dead") scene.clone.tryHurt(1);
        },
      },
      {
        label: "Clear All",
        color: colorToHex(GAME_COLORS.CRIMSON),
        fn: () => scene.enemies.getChildren().forEach((e: any) => { if (e.active) e.die?.(); }),
      },
    ];

    // Positions are set dynamically by repositionUtilAndStatRows(), so start at 0,0
    const utilButtonBgs: any[] = [];
    const utilButtonLabels: any[] = [];

    utilEntries.forEach((entry) => {
      const bg = registerPanelItem(
        scene.add
          .rectangle(0, 0, panelWidth - 12, buttonHeight, COLOR_BUTTON_DEFAULT)
          .setDepth(DEPTH.DEBUG)
          .setInteractive({ useHandCursor: false }),
      );
      const lbl = registerPanelItem(scene.add.text(0, 0, entry.label, textStyle(12, entry.color)).setOrigin(0.5, 0.5).setDepth(DEPTH.DEBUG + 1));
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
        label: () => `PLA HP: ${scene.player.health.max}`,
        minus: () => {
          const newMax = scene.player.health.max - 1;
          scene.player.health.max = newMax;
          scene.player.health.current = Math.max(1, scene.player.health.current - 1);
        },
        plus: () => {
          const newMax = scene.player.health.max + 1;
          scene.player.health.max = newMax;
          scene.player.health.current = Math.min(scene.player.health.current + 1, newMax);
        },
      },
      {
        label: () => `PLA ATK: ${scene.player.attack.damage}`,
        minus: () => {
          const newDamage = scene.player.attack.damage - 1;
          scene.player.attack.damage = newDamage;
        },
        plus: () => {
          const newDamage = scene.player.attack.damage + 1;
          scene.player.attack.damage = newDamage;
        },
      },
    ];

    const statRows = statDefs.map((def) => {
      const bg = registerPanelItem(scene.add.rectangle(0, 0, panelWidth - 12, statRowHeight, 0x0a0616).setDepth(DEPTH.DEBUG));
      const lbl = registerPanelItem(scene.add.text(0, 0, def.label(), textStyle(13, "#ccaaff")).setOrigin(0.5, 0.5).setDepth(DEPTH.DEBUG + 2));
      const minusBg = registerPanelItem(scene.add.rectangle(0, 0, 22, 20, COLOR_BUTTON_DEFAULT).setDepth(DEPTH.DEBUG + 1).setInteractive({ useHandCursor: false }));
      const minusLbl = registerPanelItem(scene.add.text(0, 0, "−", textStyle(13, "#ff6666")).setOrigin(0.5, 0.5).setDepth(DEPTH.DEBUG + 2));
      const plusBg = registerPanelItem(scene.add.rectangle(0, 0, 22, 20, COLOR_BUTTON_DEFAULT).setDepth(DEPTH.DEBUG + 1).setInteractive({ useHandCursor: false }));
      const plusLbl = registerPanelItem(scene.add.text(0, 0, "+", textStyle(13, "#66ff88")).setOrigin(0.5, 0.5).setDepth(DEPTH.DEBUG + 2));

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
      scene.add
        .rectangle(panelCenterX, 510, panelWidth - 12, 24, COLOR_BUTTON_DEFAULT)
        .setDepth(DEPTH.DEBUG)
        .setInteractive({ useHandCursor: false }),
    );
    registerPanelItem(scene.add.text(panelCenterX, 510, "← Title", textStyle(11, "#666666")).setOrigin(0.5, 0.5).setDepth(DEPTH.DEBUG + 1));
    backButton.on("pointerover", () => backButton.setFillStyle(0x220033));
    backButton.on("pointerout", () => backButton.setFillStyle(COLOR_BUTTON_DEFAULT));
    backButton.on("pointerdown", (_ptr: any, _lx: any, _ly: any, event: any) => {
      event.stopPropagation();
      scene.scene.start("TitleScene");
    });
  }
}
