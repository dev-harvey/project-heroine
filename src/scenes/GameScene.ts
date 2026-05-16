import * as Phaser from "phaser";
import Player from "../entities/Player";
import Clone from "../entities/Clone";
import WaveManager from "../systems/WaveManager";

import { CLONE_CONFIG, DEPTH, GAME_ASSETS, GAME_COLORS, GAME_CONFIG, PLAYER_CONFIG, UI_CONFIG } from "../utils/constants";
import { checkIfBBehindA, colorToHex, getAnchorOctoOffset } from "../utils/utils";
import GameUI from "../systems/GameUI";
import DebugPanel from "../systems/DebugPanel";
import Enemy from "../entities/Enemy";
import { ENEMY_REGISTRY } from "../utils/ENEMY_REGISTRY";
import { eventBus, GameEvents } from "../systems/EventBus";

export default class GameScene extends Phaser.Scene {
  // Core objects
  player: Player;
  clone: Clone | null = null;
  waveManager!: WaveManager;

  ui: GameUI;

  cursorSprite: Phaser.GameObjects.Image;
  uiCamera!: Phaser.Cameras.Scene2D.Camera;

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

  spawnZones: SpawnZone[];

  private onEntityDeathHandler = (payload: GameEvents["entity:death"]) => this.onEntityDeath(payload.entity);
  private onEntityDashHandler = (payload: GameEvents["entity:dash"]) => this.onEntityDash(payload.entity, payload.direction);
  private onWaveStartHandler = (payload: GameEvents["wave:start"]) => this.onWaveStart(payload.waveNumber);

  // Stats
  private cloneTotalKillCount: number = 0;

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
    this.buildCamera();
    this.buildGroups();
    this.buildPhysics();

    this.ui = new GameUI(this, this.player);
    this.buildUICamera();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyEvents();
      this.ui.destroyEvents();
      this.waveManager?.destroyEvents();
    });

    if (this.debugMode) new DebugPanel(this);
    else this.buildWaveManager();

    eventBus.on("entity:death", this.onEntityDeathHandler);
    eventBus.on("wave:start", this.onWaveStartHandler);

    this.buildCloneControls();

    this.spawnZones = [];

    for (let i = 0; i < 8; i++) {
      const { GAME_WIDTH, GAME_HEIGHT, GAME_WALL_X, GAME_WALL_Y } = GAME_CONFIG;

      const width = (GAME_WIDTH - GAME_WALL_X * 2) / 4;
      const height = (GAME_HEIGHT - GAME_WALL_Y * 2) / 3;

      const startX = i < 4 ? GAME_WALL_X + i * width : GAME_WALL_X + (i - 4) * width;
      const startY = i < 4 ? GAME_WALL_Y : GAME_WALL_Y + height * 2;

      this.spawnZones.push({
        active: false,
        zone: this.createSpawnZone(startX, startY, width, height, false),
      });
    }
  }

  update(time: number, delta: number): void {
    if (!this.player.active) return;

    const ptr = this.input.activePointer;
    ptr.updateWorldPoint(this.cameras.main);
    this.cursorSprite.setPosition(ptr.x, ptr.y);

    this.player.update(time, delta);

    this.ui.updateAbilityCooldown("dash", 1 - this.player.skills?.dash.cooldownTimer / this.player.skills?.dash.cooldown);

    this.player.anchor.indicator.update();
    this.player.attack.attackIndicator.update();

    if (this.clone?.active && this.clone?.entityState !== "dead") {
      this.clone.update(time, delta);
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

    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, GAME_COLORS.MIDNIGHT).setDepth(DEPTH.BACKGROUND);

    const gFloor = this.add.graphics().setDepth(DEPTH.FLOOR);
    gFloor.fillStyle(0x888888, 1);
    gFloor.fillRect(wallX, wallY, gameWidth - wallX * 2, gameHeight - wallY * 2);

    this.add
      .tileSprite(0, wallY, gameWidth, gameHeight - wallY * 2, GAME_ASSETS.FLOOR_TILE, GAME_ASSETS.FLOOR_TILE_FRAME)
      .setOrigin(0, 0)
      .setDepth(DEPTH.FLOOR);

    const gWall = this.add.graphics().setDepth(DEPTH.WALL);
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
    const { GAME_WIDTH, GAME_HEIGHT } = GAME_CONFIG;

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, "player");

    eventBus.on("entity:dash", this.onEntityDashHandler);
  }

  private buildCamera(): void {
    const camera = this.cameras.main;

    camera.setBounds(0, 0, GAME_CONFIG.GAME_WIDTH, GAME_CONFIG.GAME_HEIGHT);
    camera.startFollow(this.player, true, 0.05, 0.05);
    camera.setZoom(2);

    this.input.on("wheel", (_ptr, _objs, _dx, deltaY) => {
      const newZoom = Phaser.Math.Clamp(camera.zoom + (deltaY > 0 ? -0.1 : 0.1), 1.5, 3);
      camera.setZoom(newZoom);
    });
  }

  private buildUICamera(): void {
    const { GAME_WIDTH, GAME_HEIGHT } = GAME_CONFIG;

    // Second camera — same size as the canvas, fixed zoom 1, renders only the HUD.
    this.uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const uiObjects = this.ui.getUIObjects();

    // Main camera draws the world, never the HUD.
    this.cameras.main.ignore(uiObjects);

    // UI camera draws only the HUD — ignore every world object that already exists.
    // Objects spawned later (enemies, clone, damage numbers) are ignored at creation.
    for (const child of this.children.list) {
      if (!uiObjects.includes(child)) this.uiCamera.ignore(child);
    }
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
    this.waveManager = new WaveManager(this.time);
    this.waveManager.start();
  }

  private buildCloneControls(): void {
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => {
      if (!this.player.active || this.player.isInEntityState("dead", "hurt", "dash", "attack", "stunned")) return;
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
      .setDepth(DEPTH.FLOATING);
    this.uiCamera?.ignore(txt);
    this.tweens.add({
      targets: txt,
      y: txt.y - 46,
      alpha: { from: 1, to: 0 },
      duration: 850,
      ease: "Power1",
      onComplete: () => txt.destroy(),
    });
  }

  // ─── Clone management ──────────────────────────────────────────────────────

  private summonClone(): void {
    if (this.clone !== null) return;

    this.clone = new Clone(this, this.player.x, this.player.y, "player", this.player);
    this.uiCamera?.ignore([this.clone, this.clone.attack.attackIndicator, this.clone.attack.detectionZone]);

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
    this.player.anchor.offset = getAnchorOctoOffset(angle, CLONE_CONFIG.ANCHOR_OFFSET);

    this.cloneEnemyCollider = this.physics.add.collider(this.clone, this.enemies);
    this.cloneAttackOverlap = this.physics.add.overlap(this.clone.attack.detectionZone, this.enemies, (_zone, target) => this.onAttackHit(_zone, target));
    this.enemiesCloneAttackOverlap = this.physics.add.overlap(this.enemiesAttackZones, this.clone, (target, _zone) => this.onAttackHit(_zone, target));
  }

  private dismissClone(): void {
    this.clone.setEntityState("dead");
  }

  private onEntityDeath(entity: IEntity): void {
    switch (entity.entityType) {
      case "player":
        this.onPlayerDeath();
        break;
      case "clone":
        this.onCloneDeath();
        break;
      case "enemy":
        this.onEnemyDeath(entity);
        break;
    }
  }

  private onPlayerDeath(): void {
    this.scene.start("GameOverScene", {
      wave: this.waveManager?.currentWave ? this.waveManager?.currentWave - 1 : 0,
      kills: this.player.killCount,
      cloneKills: this.cloneTotalKillCount,
    });
  }

  private onCloneDeath(): void {
    this.clone = null;
    this.cloneEnemyCollider?.destroy();
    this.cloneEnemyCollider = null;
    this.cloneAttackOverlap?.destroy();
    this.cloneAttackOverlap = null;
    this.enemiesCloneAttackOverlap?.destroy();
    this.enemiesCloneAttackOverlap = null;
  }

  private onEnemyDeath(entity: IEntity): void {
    if (entity.lastAttacker?.entityType === "clone") this.cloneTotalKillCount++;
  }

  private onWaveStart(waveNumber) {
    this.spawnWave(waveNumber);
  }

  private onEntityDash(entity: IEntity, direction: OctoDir) {
    if (entity === this.player && direction) {
      if (this.playerEnemyCollider) this.playerEnemyCollider.active = false;
      if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = false;
      this.time.delayedCall(PLAYER_CONFIG.DASH_DURATION, () => {
        if (this.playerEnemyCollider) this.playerEnemyCollider.active = true;
        if (this.cloneEnemyCollider) this.cloneEnemyCollider.active = true;
      });
    }
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

  spawnWave(waveNum: number): void {
    const count = waveNum * 4;
    const zones = this.spawnZones.map((sz) => sz.zone);
    let lastIdx = -1;

    for (let i = 0; i < count; i++) {
      const pool = zones.map((_, idx) => idx).filter((idx) => idx !== lastIdx);
      lastIdx = pool[Phaser.Math.Between(0, pool.length - 1)];
      this.spawnEnemy("orc-basic", 1, zones[lastIdx]);
    }
  }

  spawnEnemy(enemyId: string, count: number, spawnZone: Phaser.Geom.Rectangle): void {
    const EnemyClass = ENEMY_REGISTRY[enemyId];
    if (!EnemyClass) {
      console.warn(`Unable to spawn enemy, unknown enemy type: ${enemyId}`);
      return;
    }

    for (let i = 0; i < count; i++) {
      const [x, y] = this.spawnPoint(spawnZone);
      const enemy = new EnemyClass(this, x, y, enemyId);
      this.uiCamera?.ignore(enemy);
      this.enemies.add(enemy, true);
      this.enemiesAttackZones.add(enemy.attack.detectionZone);
      this.uiCamera?.ignore(enemy.attack.detectionZone);
    }
  }

  private createSpawnZone(x: number, y: number, width: number, height: number, debug = false): Phaser.Geom.Rectangle {
    const zone = new Phaser.Geom.Rectangle(x, y, width, height);

    if (debug) {
      const gfx = this.add.graphics().setDepth(DEPTH.DEBUG);
      gfx.lineStyle(2, 0xff0000, 1);
      gfx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }

    return zone;
  }

  private spawnPoint(zone: Phaser.Geom.Rectangle): [number, number] {
    const point = zone.getRandomPoint();
    return [point.x, point.y];
  }

  public destroyEvents() {
    eventBus.off("entity:death", this.onEntityDeathHandler);
    eventBus.off("entity:dash", this.onEntityDashHandler);
    eventBus.off("wave:start", this.onWaveStartHandler);
  }
}
