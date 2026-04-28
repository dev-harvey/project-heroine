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
  private _scene: IGameScene;
  private _player: Player;
  private _clone?: Clone;

  private _localCache: {
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

  private _cooldownBars: Record<string, Phaser.GameObjects.Rectangle> = {};
  private _killsTexts: Record<string, Phaser.GameObjects.Text> = {};
  private _attackTexts: Record<string, Phaser.GameObjects.Text> = {};

  private _onCloneSummoned: (clone: Clone) => void;
  private _onCloneDismissed: (clone: Clone) => void;

  private _hudAttrs: {
    container: Phaser.GameObjects.Container;
    children: Record<string, Phaser.GameObjects.Container>;
  };

  private _hudAbilities: {
    container: Phaser.GameObjects.Container;
    children: Record<string, Phaser.GameObjects.Container>;
  };

  private _hudPhase: {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
  };

  private _hudStats: {
    container: Phaser.GameObjects.Container;
    children: Record<string, Phaser.GameObjects.Container>;
  };

  constructor(scene: IGameScene, player: Player) {
    this._scene = scene;
    this._player = player;

    this._localCache = {
      player: {
        attack: player?.attackDamage || 0,
        hearts: player?.hp || 0,
        kills: 0,
      },
    };

    this._onCloneSummoned = (clone: Clone) => {
      this._clone = clone;
      this._localCache.clone = { attack: clone.attackDamage, hearts: clone.hp, kills: 0 };
      this._buildAttack(clone);
      this._buildHearts(clone);
      this._buildKills(clone);
    };

    this._onCloneDismissed = (clone: Clone) => {
      this._clone = null;
      this._hudAttrs.children.cloneAttackContainer.removeAll(true);
      this._hudAttrs.children.cloneHeartsContainer.removeAll(true);
      this._hudStats.children.cloneKillsContainer.removeAll(true);
    };

    this._scene.events.on("clone_summoned", this._onCloneSummoned);
    this._scene.events.on("clone_dismissed", this._onCloneDismissed);

    this._build();
  }

  private _build(): void {
    this._buildCursor();
    this._buildHudPhase("GET READY");
    this._buildHudAttrs();
    this._buildHudStats();
    this._buildHudAbilities();
  }

  private _buildCursor(): void {
    this._scene.input.setDefaultCursor("none");
    this._scene.cursorSprite = this._scene.add.image(0, 0, GAME_ASSETS.CURSOR).setScale(0.8).setOrigin(0).setDepth(DEPTH_CONFIG.CURSOR).setScrollFactor(0);
  }

  private _buildHudPhase(text: string) {
    const { GAME_WIDTH } = GAME_CONFIG;
    this._hudPhase = {
      container: this._scene.add
        .container(GAME_WIDTH / 2, 10)
        .setDepth(DEPTH_CONFIG.HUD)
        .setScrollFactor(0),
      text: this.addUIText(0, 0, text, getTextStyle("body", 64)).setOrigin(0.5, 0),
    };
    this._hudPhase.container.add(this._hudPhase.text);
  }

  private _buildHudStats() {
    this._hudStats = {
      container: this._scene.add
        .container(GAME_CONFIG.GAME_WIDTH - 10, 10)
        .setDepth(DEPTH_CONFIG.HUD)
        .setScrollFactor(0),
      children: {
        playerKillsContainer: this._scene.add.container(0, 0),
        cloneKillsContainer: this._scene.add.container(0, 40),
      },
    };
    for (const child in this._hudStats.children) {
      if (!Object.hasOwn(this._hudStats.children, child)) continue;
      this._hudStats.container.add(this._hudStats.children[child]);
    }

    this._buildKills(this._player);
  }

  private _buildKills(target: Player | Clone): void {
    let container: Phaser.GameObjects.Container;
    let key: string;
    const label = target === this._player ? "KILLS" : "CLONE KILLS";
    if (target === this._player) {
      container = this._hudStats.children.playerKillsContainer;
      key = "player";
    } else if (target === this._clone) {
      container = this._hudStats.children.cloneKillsContainer;
      key = "clone";
    } else {
      console.error("Couldn't update HUD Stats - problem with local cache");
      return;
    }

    container.removeAll(true);
    const text = this.addUIText(0, 0, `${label}: ${target.killCount}`, getTextStyle("body", 32, { color: colorToHex(GAME_COLORS.COBALT) }), { x: 1, y: 0 });
    this._killsTexts[key] = text;
    container.add(text);
  }

  private _buildHudAttrs() {
    this._hudAttrs = {
      container: this._scene.add.container(10, 10).setDepth(DEPTH_CONFIG.HUD).setScrollFactor(0),
      children: {
        playerAttackContainer: this._scene.add.container(0, 0),
        playerHeartsContainer: this._scene.add.container(70, 0),
        cloneAttackContainer: this._scene.add.container(0, 40),
        cloneHeartsContainer: this._scene.add.container(70, 40),
      },
    };
    for (const child in this._hudAttrs.children) {
      if (!Object.hasOwn(this._hudAttrs.children, child)) continue;
      this._hudAttrs.container.add(this._hudAttrs.children[child]);
    }

    this._buildHearts(this._player);
    this._buildAttack(this._player);
  }

  private _buildAttack(target: Player | Clone): void {
    let container: Phaser.GameObjects.Container;
    let key: string;
    if (target === this._player) {
      container = this._hudAttrs.children.playerAttackContainer;
      key = "player";
    } else if (target === this._clone) {
      container = this._hudAttrs.children.cloneAttackContainer;
      key = "clone";
    } else {
      console.error("Couldn't update HUD - problem with local cache");
      return;
    }
    container.removeAll(true);
    const icon = this._scene.add.image(0, 0, GAME_ASSETS.ATTACK_ICON).setDisplaySize(32, 32).setOrigin(0);
    const text = this.addUIText(icon.displayWidth + 10, 0, target.attackDamage.toString(), getTextStyle("heading", 32))
      .setColor(colorToHex(GAME_COLORS.COBALT))
      .setFontStyle("bold")
      .setOrigin(0, 0.04)
      .setFixedSize(0, 32);
    this._attackTexts[key] = text;
    container.add(icon);
    container.add(text);
  }

  private _buildHearts(target: Player | Clone): void {
    let container;
    let targetType;
    if (target === this._player) {
      container = this._hudAttrs.children.playerHeartsContainer;
      targetType = "player";
    } else if (target !== undefined && target === this._clone) {
      container = this._hudAttrs.children.cloneHeartsContainer;
      targetType = "clone";
    } else {
      console.error("Couldn't update HUD - problem with local cache");
      return;
    }
    container.removeAll(true);
    for (let i = 0; i < target.maxHp; i++) {
      const heart =
        i < target.hp
          ? this._scene.add
              .image(i * 36, 0, GAME_ASSETS.HEART)
              .setDisplaySize(32, 32)
              .setOrigin(0, 0)
              .setDepth(DEPTH_CONFIG.HEARTS)
              .setScrollFactor(0)
          : this._scene.add
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

  private _buildHudAbilities(): void {
    this._hudAbilities = {
      container: this._scene.add.container(10, 0).setDepth(DEPTH_CONFIG.HUD).setScrollFactor(0),
      children: {
        dash: this._scene.add.container(0, 0),
      },
    };
    for (const child in this._hudAbilities.children) {
      if (!Object.hasOwn(this._hudAbilities.children, child)) continue;
      this._hudAbilities.container.add(this._hudAbilities.children[child]);
    }

    this._buildDashCard();

    const containerHeight = this._hudAbilities.container.getBounds().height;
    this._hudAbilities.container.setY(GAME_CONFIG.GAME_HEIGHT - 10 - containerHeight);
  }

  private _buildDashCard(): void {
    const container = this._hudAbilities.children.dash;
    const cardWidth = UI_CONFIG.ABILITY_CARD.WIDTH;
    const cardHeight = UI_CONFIG.ABILITY_CARD.HEIGHT;
    this._cooldownBars["dash"] = this._scene.add.rectangle(0, 0, cardWidth, cardHeight, GAME_COLORS.COBALT, 1).setOrigin(0);
    container.add(this._cooldownBars["dash"]);
    container.add(this._scene.add.rectangle(0, 0, cardWidth, cardHeight, 0x000, 0).setStrokeStyle(3, GAME_COLORS.NAVY).setOrigin(0));
    container.add(this._scene.add.text(10, 10, "DASH", getTextStyle("body", 32, { color: colorToHex(GAME_COLORS.ICE) })).setOrigin(0));
    container.add(this._scene.add.text(10, 45, "[ SHIFT ]", getTextStyle("body", 16, { color: colorToHex(GAME_COLORS.ICE) })).setOrigin(0));

    const icon = this._scene.add.sprite(0, 0, "player-run", 11).setDisplaySize(80, 80).setOrigin(1, 0).setPosition(UI_CONFIG.ABILITY_CARD.WIDTH, 0).setTint(GAME_COLORS.ICE).setBlendMode("ADD");
    container.add(icon);
  }

  /* Public Methods */

  public updateHudAttrs(target?: Player | Clone): void {
    if (target === undefined) {
      this.updateHudAttrs(this._player);
      if (this._clone?.active) this.updateHudAttrs(this._clone);
      return;
    }

    let cache;
    if (target === this._player) {
      cache = this._localCache.player;
    } else if (target !== undefined && target === this._clone) {
      cache = this._localCache.clone;
    } else {
      console.error("Couldn't update HUD - problem with local cache");
      return;
    }

    if (cache.attack != target.attackDamage) {
      this._buildAttack(target);
      cache.attack = target.attackDamage;
    }
    if (cache.hearts != target.hp) {
      this._buildHearts(target);
      cache.hearts = target.hp;
    }
  }

  public updateHudStats(target?: Player | Clone): void {
    if (target === undefined) {
      this.updateHudKills(this._player);
      if (this._clone?.active) this.updateHudKills(this._clone);
      return;
    }
    this.updateHudKills(target);
  }

  public updateHudPhase(text) {
    this._hudPhase.text.setText(text);
  }

  public updateHudKills(target: Player | Clone): void {
    const key = target === this._player ? "player" : "clone";
    const label = target === this._player ? "KILLS" : "CLONE KILLS";

    if (this._localCache[key].kills !== target.killCount) {
      this._killsTexts[key]?.setText(`${label}: ${target.killCount}`);
      this._localCache[key].kills = target.killCount;
    }
  }

  public updateHudAttack(target: Player | Clone): void {
    const key = target === this._player ? "player" : "clone";
    this._attackTexts[key]?.setText(target.attackDamage.toString());
  }

  public updateAbilityCooldown(ability: "dash" | string, percent: number): void {
    this._cooldownBars[ability].setDisplaySize(Math.max(0, UI_CONFIG.ABILITY_CARD.WIDTH * percent), UI_CONFIG.ABILITY_CARD.HEIGHT);
  }

  public drawDebugLines(container: Phaser.GameObjects.Container) {
    const debug = this._scene.add.graphics().setDepth(1000);
    const containerBounds = container.getBounds();
    debug.lineStyle(1, 0xff0000, 1);
    debug.strokeRect(container.x - container.width / 2, container.y - container.height / 2, containerBounds.width, containerBounds.height);
  }

  // TODO: pass in optional params for stroke and font. Potentially actually pass a config object that I can type as an interface.
  public addUIText(x: number, y: number, content: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}, origin: { x: TextOrigin; y: TextOrigin } = { x: 0, y: 0 }, depth: number = DEPTH_CONFIG.UI_TEXT_DEFAULT): Phaser.GameObjects.Text {
    return this._scene.add.text(x, y, content, style).setOrigin(origin.x, origin.y).setDepth(depth).setScrollFactor(0);
  }

  public destroyEvents() {
    this._scene.events.off("clone_summoned", this._onCloneSummoned);
    this._scene.events.off("clone_dismissed", this._onCloneDismissed);
  }
}
