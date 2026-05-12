/**
 * ambient.d.ts — Global type declarations (no import/export → true script scope).
 * Everything declared here is available in all project files without an import.
 */

type CardinalDir = "right" | "down" | "left" | "up";
type OctoDir = "right" | "up-right" | "down-right" | "down" | "down-left" | "left" | "up-left" | "up";

type XYPosition = { x: number; y: number };

type SpawnZone = {
  active: boolean;
  zone: Phaser.Geom.Rectangle;
};

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
