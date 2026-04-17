/**
 * ambient.d.ts — Global type declarations (no import/export → true script scope).
 * Everything declared here is available in all project files without an import.
 */

// ─── Primitive aliases ─────────────────────────────────────────────────────

/** Four-directional attack / movement animation direction literal. */
type FacingDir = "right" | "down" | "left" | "up";

/** Eight-directional attack / movement direction literal. */
type AttackDir = "right" | "up-right" | "down-right" | "down" | "down-left" | "left" | "up-left" | "up";

// ─── Shared geometry ───────────────────────────────────────────────────────

/** Per-direction forward/perpendicular unit vector + origin used in shovel math. */
interface DirConfig {
  fx: number;
  fy: number;
  ox: number;
  oy: number;
}

/** Optional geometry overrides for debug shovel drawing / hit tests. */
interface HitboxParams {
  NH?: number;
  FH?: number;
  FD?: number;
  CTRL?: number;
  fillAlpha?: number;
}

// ─── Input helpers ─────────────────────────────────────────────────────────

/** Object returned by `scene.input.keyboard.addKeys()` for WASD. */
interface WasdKeys {
  up: { isDown: boolean };
  down: { isDown: boolean };
  left: { isDown: boolean };
  right: { isDown: boolean };
}

// ─── Entity constructor options ────────────────────────────────────────────

/** Options passed to the Clone constructor. */
interface CloneOptions {
  bonusHp?: number;
}

// ─── Scene data payloads ───────────────────────────────────────────────────

/** Data object passed to `GameScene.create()`. */
interface GameSceneData {
  debug?: boolean;
}

/** Data object passed to `GameOverScene.create()`. */
interface GameOverData {
  wave?: number;
  kills?: number;
  cloneKills?: number;
  playerAtk?: number;
  playerMaxHp?: number;
  healGiven?: number;
  permHpGained?: number;
  permAtkGained?: number;
  runGold?: number;
}

// ─── Global runtime stores ─────────────────────────────────────────────────

/** Persistent run-to-run bonus stats (window.Progression). */
interface ProgressionStore {
  bonusMaxHp: number;
  bonusDamage: number;
  bonusCloneHp: number;
  dashCooldownBonus: number;
  goldBoost: number;
}

/** Accumulated gold (window.Gold). */
interface GoldStore {
  total: number;
}

/** Per-page-load session statistics (window.Session). */
interface SessionStore {
  runs: number;
  highestWave: number;
  totalKills: number;
}

// ─── Entity contracts ──────────────────────────────────────────────────────

/**
 * Anything that can be targeted by an enemy: the player or the clone.
 * Structurally compatible with both Player and Clone without importing either.
 */
interface ITarget {
  x: number;
  y: number;
  hp: number;
  active: boolean;
  /** True while the object is in its death sequence (clone-specific). */
  _dead?: boolean;
  body: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    bottom: number;
    left: number;
    right: number;
    enable: boolean;
    halfWidth: number;
    halfHeight: number;
    offset: { x: number; y: number };
    setSize(w: number, h: number): void;
    setMass?(mass: number): void;
    setImmovable?(flag: boolean): void;
    setVelocity?(x: number, y: number): unknown;
    setCircle?(radius: number): unknown;
    setCollideWorldBounds?(flag: boolean): unknown;
  };
  takeDamage(amount: number): void;
}

/**
 * Common interface implemented by all enemy classes.
 * Extends ITarget so enemies can also be passed as targets (e.g. for burst damage).
 */
interface IEnemy extends ITarget {
  maxHp: number;
  attackDir: AttackDir;
  lastAttacker?: string;
  update(time: number, delta: number, player: ITarget, clone?: ITarget | null): void;
  _die?(): void;
}
