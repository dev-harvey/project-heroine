/**
 * ambient.d.ts — Global type declarations (no import/export → true script scope).
 * Everything declared here is available in all project files without an import.
 */

type CardinalDir = "right" | "down" | "left" | "up";
type OctoDir = "right" | "up-right" | "down-right" | "down" | "down-left" | "left" | "up-left" | "up";

// ─── Shared geometry ───────────────────────────────────────────────────────

type XYPosition = { x: number; y: number };

/** Optional geometry overrides for debug shovel drawing / hit tests. */
interface AttackZoneParams {
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

// TODO: Review this
