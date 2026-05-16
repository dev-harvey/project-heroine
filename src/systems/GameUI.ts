import * as Phaser from "phaser";
import Player from "../entities/Player";
import { DEPTH, GAME_ASSETS, GAME_COLORS, GAME_CONFIG, UI_CONFIG } from "../utils/constants";
import { colorToHex, getTextStyle } from "../utils/utils";
import { eventBus, GameEvents } from "./EventBus";

interface IGameScene extends Phaser.Scene {
  player: Player;
  cursorSprite: Phaser.GameObjects.Image;
}

// x: left | center | right
// y: up | center | down
type TextOrigin = 0 | 0.5 | 1;

export default class GameUI {
  private scene: IGameScene;
  private player: Player;

  private localCache: {
    player: {
      attack: number;
      hearts: number;
      kills: number;
    };
  };

  private cooldownBars: Record<string, Phaser.GameObjects.Rectangle> = {};
  private killsTexts: Record<string, Phaser.GameObjects.Text> = {};
  private attackTexts: Record<string, Phaser.GameObjects.Text> = {};

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

  private onEntityDeathHandler = (payload: GameEvents["entity:death"]) => this.onEntityDeath(payload.entity);
  private onWaveStartHandler = (payload: GameEvents["wave:start"]) => this.onWaveStart(payload.waveNumber);

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

    eventBus.on("entity:death", this.onEntityDeathHandler);
    eventBus.on("wave:start", this.onWaveStartHandler);

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
    this.scene.cursorSprite = this.scene.add.image(0, 0, GAME_ASSETS.CURSOR).setScale(0.8).setOrigin(0).setDepth(DEPTH.CURSOR).setScrollFactor(0);
  }

  private buildHudPhase(text: string) {
    const { GAME_WIDTH } = GAME_CONFIG;
    this.hudPhase = {
      container: this.scene.add
        .container(GAME_WIDTH / 2, 10)
        .setDepth(DEPTH.HUD)
        .setScrollFactor(0),
      text: this.addUIText(0, 0, text, getTextStyle("body", 64)).setOrigin(0.5, 0),
    };
    this.hudPhase.container.add(this.hudPhase.text);
  }

  private buildHudStats() {
    this.hudStats = {
      container: this.scene.add
        .container(GAME_CONFIG.GAME_WIDTH - 10, 10)
        .setDepth(DEPTH.HUD)
        .setScrollFactor(0),
      children: {
        playerKillsContainer: this.scene.add.container(0, 0),
      },
    };
    for (const child in this.hudStats.children) {
      if (!Object.hasOwn(this.hudStats.children, child)) continue;
      this.hudStats.container.add(this.hudStats.children[child]);
    }

    this.buildKills();
  }

  private buildKills(): void {
    const target = this.player;
    const container = this.hudStats.children.playerKillsContainer;

    container.removeAll(true);

    const text = this.addUIText(0, 0, `KILLS: ${target.killCount}`, getTextStyle("body", 32, { color: "#ffffff" }), { x: 1, y: 0 });

    this.killsTexts["player"] = text;
    container.add(text);
  }

  private buildHudAttrs() {
    this.hudAttrs = {
      container: this.scene.add.container(10, 10).setDepth(DEPTH.HUD).setScrollFactor(0),
      children: {
        playerAttackContainer: this.scene.add.container(0, 0),
        playerHeartsContainer: this.scene.add.container(70, 0),
      },
    };
    for (const child in this.hudAttrs.children) {
      if (!Object.hasOwn(this.hudAttrs.children, child)) continue;
      this.hudAttrs.container.add(this.hudAttrs.children[child]);
    }

    this.buildHearts();
    this.buildAttack();
  }

  private buildAttack(): void {
    const target = this.player;
    let container = this.hudAttrs.children.playerAttackContainer;

    container.removeAll(true);
    const icon = this.scene.add.image(0, 0, GAME_ASSETS.ATTACK_ICON).setDisplaySize(32, 32).setOrigin(0);
    const text = this.addUIText(icon.displayWidth + 10, 0, target.attack.damage.toString(), getTextStyle("heading", 32))
      .setColor("#ffffff")
      .setFontStyle("bold")
      .setOrigin(0, 0.04)
      .setFixedSize(0, 32);
    this.attackTexts["player"] = text;
    container.add(icon);
    container.add(text);
  }

  private buildHearts(): void {
    const target = this.player;
    let container = this.hudAttrs.children.playerHeartsContainer;
    container.removeAll(true);
    for (let i = 0; i < target.health.max; i++) {
      const heart =
        i < target.health.current
          ? this.scene.add
              .image(i * 36, 0, GAME_ASSETS.HEART)
              .setDisplaySize(32, 32)
              .setOrigin(0, 0)
              .setDepth(DEPTH.HUD)
              .setScrollFactor(0)
          : this.scene.add
              .image(i * 36, 0, GAME_ASSETS.HEART_EMPTY)
              .setDisplaySize(32, 32)
              .setOrigin(0, 0)
              .setDepth(DEPTH.HUD)
              .setScrollFactor(0);
      container.add(heart);
    }
  }

  private buildHudAbilities(): void {
    this.hudAbilities = {
      container: this.scene.add.container(10, 0).setDepth(DEPTH.HUD).setScrollFactor(0),
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

  updateHudAttrs(): void {
    const target = this.player;

    let cache = this.localCache.player;
    if (cache.attack != target.attack.damage) {
      this.buildAttack();
      cache.attack = target.attack.damage;
    }
    if (cache.hearts != target.health.current) {
      this.buildHearts();
      cache.hearts = target.health.current;
    }
  }

  updateHudPhase(text) {
    this.hudPhase.text.setText(text);
  }

  updateHudKills(): void {
    const target = this.player;
    const key = target.entityType;

    if (this.localCache[key].kills !== target.killCount) {
      this.killsTexts[key]?.setText(`KILLS: ${target.killCount}`);
      this.localCache[key].kills = target.killCount;
    }
  }

  updateHudAttack(target: IEntity): void {
    const key = target.entityType;
    this.attackTexts[key]?.setText(target.attack.damage.toString());
  }

  updateAbilityCooldown(ability: "dash" | string, percent: number): void {
    this.cooldownBars[ability].setDisplaySize(Math.max(0, UI_CONFIG.ABILITY_CARD.WIDTH * percent), UI_CONFIG.ABILITY_CARD.HEIGHT);
  }

  drawDebugLines(container: Phaser.GameObjects.Container) {
    const debug = this.scene.add.graphics().setDepth(DEPTH.DEBUG);
    const containerBounds = container.getBounds();
    debug.lineStyle(1, 0xff0000, 1);
    debug.strokeRect(container.x - container.width / 2, container.y - container.height / 2, containerBounds.width, containerBounds.height);
  }

  addUIText(x: number, y: number, content: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}, origin: { x: TextOrigin; y: TextOrigin } = { x: 0, y: 0 }, depth: number = DEPTH.HUD): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, content, style).setOrigin(origin.x, origin.y).setDepth(depth).setScrollFactor(0);
  }

  getUIObjects(): Phaser.GameObjects.GameObject[] {
    return [this.hudAttrs.container, this.hudAbilities.container, this.hudPhase.container, this.hudStats.container, this.scene.cursorSprite];
  }

  private onEntityDeath(entity: IEntity) {
    if (!entity.isEntityType("player")) {
      this.updateHudAttrs();
      this.updateHudKills();
    }
  }

  private onWaveStart(waveNumber: number) {
    this.updateHudPhase(`WAVE ${waveNumber}`);
  }

  destroyEvents() {
    eventBus.off("entity:death", this.onEntityDeathHandler);
    eventBus.off("wave:start", this.onWaveStartHandler);
  }
}
