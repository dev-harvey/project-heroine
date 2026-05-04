import * as Phaser from "phaser";
import Player from "../entities/Player";
import Clone from "../entities/Clone";
import { CLONE_CONFIG, DEPTH_CONFIG, GAME_ASSETS, GAME_COLORS, GAME_CONFIG, UI_CONFIG } from "../utils/constants";
import { colorToHex, getTextStyle } from "../utils/utils";

interface IGameScene extends Phaser.Scene {
  player: Player;
  clone: Clone | null;
  cursorSprite: Phaser.GameObjects.Image;
}

// x: left | center | right
// y: up | center | down
type TextOrigin = 0 | 0.5 | 1;

export default class GameUI {
  private scene: IGameScene;
  private player: Player;
  private clone?: Clone;

  private localCache: {
    player: {
      attack: number;
      hearts: number;
      kills: number;
    };
    clone?: {
      attack: number;
      hearts: number;
      kills: number;
    };
  };

  // TODO: eventually the Record types should be more defined as to what is within them rather than accepting anything

  private cooldownBars: Record<string, Phaser.GameObjects.Rectangle> = {};
  private killsTexts: Record<string, Phaser.GameObjects.Text> = {};
  private attackTexts: Record<string, Phaser.GameObjects.Text> = {};

  private onCloneSummoned: (clone: Clone) => void;
  private onCloneDismissed: (clone: Clone) => void;

  private hudAttrs: {
    container: Phaser.GameObjects.Container;
    children: Record<string, Phaser.GameObjects.Container>;
  };

  private hudAbilities: {
    container: Phaser.GameObjects.Container;
    children: Record<string, Phaser.GameObjects.Container>;
  };

  private hudPhase: {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
  };

  private hudStats: {
    container: Phaser.GameObjects.Container;
    children: Record<string, Phaser.GameObjects.Container>;
  };

  constructor(scene: IGameScene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.localCache = {
      player: {
        attack: player?.attack.damage || 0,
        hearts: player?.health.current || 0,
        kills: 0,
      },
    };

    this.onCloneSummoned = (clone: Clone) => {
      this.clone = clone;
      this.localCache.clone = { attack: clone.attack.damage, hearts: clone.health.current, kills: 0 };
      this.buildAttack(clone);
      this.buildHearts(clone);
      this.buildKills(clone);
    };

    this.onCloneDismissed = (clone: Clone) => {
      this.clone = null;
      this.hudAttrs.children.cloneAttackContainer.removeAll(true);
      this.hudAttrs.children.cloneHeartsContainer.removeAll(true);
      this.hudStats.children.cloneKillsContainer.removeAll(true);
    };

    this.scene.events.on("clone_summoned", this.onCloneSummoned);
    this.scene.events.on("clone_dismissed", this.onCloneDismissed);

    this.build();
  }

  private build(): void {
    this.buildCursor();
    this.buildHudPhase("GET READY");
    this.buildHudAttrs();
    this.buildHudStats();
    this.buildHudAbilities();
  }

  private buildCursor(): void {
    this.scene.input.setDefaultCursor("none");
    this.scene.cursorSprite = this.scene.add.image(0, 0, GAME_ASSETS.CURSOR).setScale(0.8).setOrigin(0).setDepth(DEPTH_CONFIG.CURSOR).setScrollFactor(0);
  }

  private buildHudPhase(text: string) {
    const { GAME_WIDTH } = GAME_CONFIG;
    this.hudPhase = {
      container: this.scene.add
        .container(GAME_WIDTH / 2, 10)
        .setDepth(DEPTH_CONFIG.HUD)
        .setScrollFactor(0),
      text: this.addUIText(0, 0, text, getTextStyle("body", 64)).setOrigin(0.5, 0),
    };
    this.hudPhase.container.add(this.hudPhase.text);
  }

  private buildHudStats() {
    this.hudStats = {
      container: this.scene.add
        .container(GAME_CONFIG.GAME_WIDTH - 10, 10)
        .setDepth(DEPTH_CONFIG.HUD)
        .setScrollFactor(0),
      children: {
        playerKillsContainer: this.scene.add.container(0, 0),
        cloneKillsContainer: this.scene.add.container(0, 40),
      },
    };
    for (const child in this.hudStats.children) {
      if (!Object.hasOwn(this.hudStats.children, child)) continue;
      this.hudStats.container.add(this.hudStats.children[child]);
    }

    this.buildKills(this.player);
  }

  private buildKills(target: IEntity): void {
    let container: Phaser.GameObjects.Container;
    let key: string;
    const label = target === this.player ? "KILLS" : "CLONE KILLS";
    if (target === this.player) {
      container = this.hudStats.children.playerKillsContainer;
      key = "player";
    } else if (target === this.clone) {
      container = this.hudStats.children.cloneKillsContainer;
      key = "clone";
    } else {
      console.error("Couldn't update HUD Stats - problem with local cache");
      return;
    }

    container.removeAll(true);
    const text = this.addUIText(0, 0, `${label}: ${target.killCount}`, getTextStyle("body", 32, { color: colorToHex(GAME_COLORS.COBALT) }), { x: 1, y: 0 });
    this.killsTexts[key] = text;
    container.add(text);
  }

  private buildHudAttrs() {
    this.hudAttrs = {
      container: this.scene.add.container(10, 10).setDepth(DEPTH_CONFIG.HUD).setScrollFactor(0),
      children: {
        playerAttackContainer: this.scene.add.container(0, 0),
        playerHeartsContainer: this.scene.add.container(70, 0),
        cloneAttackContainer: this.scene.add.container(0, 40),
        cloneHeartsContainer: this.scene.add.container(70, 40),
      },
    };
    for (const child in this.hudAttrs.children) {
      if (!Object.hasOwn(this.hudAttrs.children, child)) continue;
      this.hudAttrs.container.add(this.hudAttrs.children[child]);
    }

    this.buildHearts(this.player);
    this.buildAttack(this.player);
  }

  private buildAttack(target: IEntity): void {
    let container: Phaser.GameObjects.Container;
    let key: string;
    if (target === this.player) {
      container = this.hudAttrs.children.playerAttackContainer;
      key = "player";
    } else if (target === this.clone) {
      container = this.hudAttrs.children.cloneAttackContainer;
      key = "clone";
    } else {
      console.error("Couldn't update HUD - problem with local cache");
      return;
    }
    container.removeAll(true);
    const icon = this.scene.add.image(0, 0, GAME_ASSETS.ATTACK_ICON).setDisplaySize(32, 32).setOrigin(0);
    const text = this.addUIText(icon.displayWidth + 10, 0, target.attack.damage.toString(), getTextStyle("heading", 32))
      .setColor(colorToHex(GAME_COLORS.COBALT))
      .setFontStyle("bold")
      .setOrigin(0, 0.04)
      .setFixedSize(0, 32);
    this.attackTexts[key] = text;
    container.add(icon);
    container.add(text);
  }

  private buildHearts(target: IEntity): void {
    let container;
    let targetType;
    if (target === this.player) {
      container = this.hudAttrs.children.playerHeartsContainer;
      targetType = "player";
    } else if (target !== undefined && target === this.clone) {
      container = this.hudAttrs.children.cloneHeartsContainer;
      targetType = "clone";
    } else {
      console.error("Couldn't update HUD - problem with local cache");
      return;
    }
    container.removeAll(true);
    for (let i = 0; i < target.health.max; i++) {
      const heart =
        i < target.health.current
          ? this.scene.add
              .image(i * 36, 0, GAME_ASSETS.HEART)
              .setDisplaySize(32, 32)
              .setOrigin(0, 0)
              .setDepth(DEPTH_CONFIG.HEARTS)
              .setScrollFactor(0)
          : this.scene.add
              .image(i * 36, 0, GAME_ASSETS.HEART_EMPTY)
              .setDisplaySize(32, 32)
              .setOrigin(0, 0)
              .setDepth(DEPTH_CONFIG.HEARTS)
              .setScrollFactor(0);

      if (targetType === "clone") {
        heart.setTint(CLONE_CONFIG.TINT).setTintMode(2);
      }

      container.add(heart);
    }
  }

  private buildHudAbilities(): void {
    this.hudAbilities = {
      container: this.scene.add.container(10, 0).setDepth(DEPTH_CONFIG.HUD).setScrollFactor(0),
      children: {
        dash: this.scene.add.container(0, 0),
      },
    };
    for (const child in this.hudAbilities.children) {
      if (!Object.hasOwn(this.hudAbilities.children, child)) continue;
      this.hudAbilities.container.add(this.hudAbilities.children[child]);
    }

    this.buildDashCard();

    const containerHeight = this.hudAbilities.container.getBounds().height;
    this.hudAbilities.container.setY(GAME_CONFIG.GAME_HEIGHT - 10 - containerHeight);
  }

  private buildDashCard(): void {
    const container = this.hudAbilities.children.dash;
    const cardWidth = UI_CONFIG.ABILITY_CARD.WIDTH;
    const cardHeight = UI_CONFIG.ABILITY_CARD.HEIGHT;
    this.cooldownBars["dash"] = this.scene.add.rectangle(0, 0, cardWidth, cardHeight, GAME_COLORS.COBALT, 1).setOrigin(0);
    container.add(this.cooldownBars["dash"]);
    container.add(this.scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x000, 0).setStrokeStyle(3, GAME_COLORS.NAVY).setOrigin(0));
    container.add(this.scene.add.text(10, 10, "DASH", getTextStyle("body", 32, { color: colorToHex(GAME_COLORS.ICE) })).setOrigin(0));
    container.add(this.scene.add.text(10, 45, "[ SHIFT ]", getTextStyle("body", 16, { color: colorToHex(GAME_COLORS.ICE) })).setOrigin(0));

    const icon = this.scene.add.sprite(0, 0, "player-run", 11).setDisplaySize(80, 80).setOrigin(1, 0).setPosition(UI_CONFIG.ABILITY_CARD.WIDTH, 0).setTint(GAME_COLORS.ICE).setBlendMode("ADD");
    container.add(icon);
  }

  /* Public Methods */

  public updateHudAttrs(target?: IEntity): void {
    if (target === undefined) {
      this.updateHudAttrs(this.player);
      if (this.clone?.active) this.updateHudAttrs(this.clone);
      return;
    }

    let cache;
    if (target === this.player) {
      cache = this.localCache.player;
    } else if (target !== undefined && target === this.clone) {
      cache = this.localCache.clone;
    } else {
      console.error("Couldn't update HUD - problem with local cache");
      return;
    }

    if (cache.attack != target.attack.damage) {
      this.buildAttack(target);
      cache.attack = target.attack.damage;
    }
    if (cache.hearts != target.health.current) {
      this.buildHearts(target);
      cache.hearts = target.health.current;
    }
  }

  public updateHudStats(target?: IEntity): void {
    if (target === undefined) {
      this.updateHudKills(this.player);
      if (this.clone?.active) this.updateHudKills(this.clone);
      return;
    }
    this.updateHudKills(target);
  }

  public updateHudPhase(text) {
    this.hudPhase.text.setText(text);
  }

  public updateHudKills(target: IEntity): void {
    const key = target.entityType;
    const label = key === "player" ? "KILLS" : "CLONE KILLS";

    if (this.localCache[key].kills !== target.killCount) {
      this.killsTexts[key]?.setText(`${label}: ${target.killCount}`);
      this.localCache[key].kills = target.killCount;
    }
  }

  public updateHudAttack(target: IEntity): void {
    const key = target.entityType;
    this.attackTexts[key]?.setText(target.attack.damage.toString());
  }

  public updateAbilityCooldown(ability: "dash" | string, percent: number): void {
    this.cooldownBars[ability].setDisplaySize(Math.max(0, UI_CONFIG.ABILITY_CARD.WIDTH * percent), UI_CONFIG.ABILITY_CARD.HEIGHT);
  }

  public drawDebugLines(container: Phaser.GameObjects.Container) {
    const debug = this.scene.add.graphics().setDepth(1000);
    const containerBounds = container.getBounds();
    debug.lineStyle(1, 0xff0000, 1);
    debug.strokeRect(container.x - container.width / 2, container.y - container.height / 2, containerBounds.width, containerBounds.height);
  }

  // TODO: pass in optional params for stroke and font. Potentially actually pass a config object that I can type as an interface.
  public addUIText(x: number, y: number, content: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}, origin: { x: TextOrigin; y: TextOrigin } = { x: 0, y: 0 }, depth: number = DEPTH_CONFIG.UI_TEXT_DEFAULT): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, content, style).setOrigin(origin.x, origin.y).setDepth(depth).setScrollFactor(0);
  }

  public destroyEvents() {
    this.scene.events.off("clone_summoned", this.onCloneSummoned);
    this.scene.events.off("clone_dismissed", this.onCloneDismissed);
  }
}
