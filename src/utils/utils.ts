import * as Phaser from "phaser";
import { CLONE_CONFIG, GAME_COLORS, GAME_CONFIG, UI_CONFIG } from "./constants";
import Player from "../entities/Player";
import Clone from "../entities/Clone";

export function getMouseDirectionFromTarget(target: Phaser.Physics.Arcade.Sprite, mode: "cardinal" | "octo" = "octo"): AttackDir {
  const ptr = target.scene.input.activePointer;
  const angle = Phaser.Math.Angle.Between(target.x, target.y, ptr.worldX, ptr.worldY);
  const deg = Phaser.Math.RadToDeg(angle);

  if (deg >= -22.5 && deg < 22.5) return "right";
  if (deg >= 22.5 && deg < 67.5) return mode === "octo" ? "down-right" : "down";
  if (deg >= 67.5 && deg < 112.5) return "down";
  if (deg >= 112.5 && deg < 157.5) return mode === "octo" ? "down-left" : "down";
  if (deg >= -67.5 && deg < -22.5) return mode === "octo" ? "up-right" : "up";
  if (deg >= -112.5 && deg < -67.5) return "up";
  if (deg >= -157.5 && deg < -112.5) return mode === "octo" ? "up-left" : "up";
  return "left";
}

export function getAnchorOctoOffset(angle: number, dist: number): XYPosition {
  const deg = ((Phaser.Math.RadToDeg(angle) % 360) + 360) % 360;
  const d = dist / Math.SQRT2;
  if (deg < 22.5 || deg >= 337.5) return { x: dist, y: 0 }; // right
  if (deg < 67.5) return { x: d, y: d }; // down-right
  if (deg < 112.5) return { x: 0, y: dist }; // down
  if (deg < 157.5) return { x: -d, y: d }; // down-left
  if (deg < 202.5) return { x: -dist, y: 0 }; // left
  if (deg < 247.5) return { x: -d, y: -d }; // up-left
  if (deg < 292.5) return { x: 0, y: -dist }; // up
  if (deg < 337.5) return { x: d, y: -d }; // up-right
  return { x: 0, y: dist }; // down (default)
}

export function getAnchorPosition(a: XYPosition, b: XYPosition, offset?: XYPosition): XYPosition {
  const calculatedOffset = offset || getAnchorOctoOffset(Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y), CLONE_CONFIG.ANCHOR_OFFSET);
  return {
    x: Phaser.Math.Clamp(a.x + calculatedOffset.x, GAME_CONFIG.GAME_WALL_X, GAME_CONFIG.GAME_WIDTH - GAME_CONFIG.GAME_WALL_X),
    y: Phaser.Math.Clamp(a.y + calculatedOffset.y, GAME_CONFIG.GAME_WALL_Y, GAME_CONFIG.GAME_HEIGHT - GAME_CONFIG.GAME_WALL_Y),
  };
}

// TODO: add Enemy type / move all to Entity
/*
  Returns true if entity B is behind entity A.
*/
export function checkIfBBehindA(a: Player | Clone | any, b: Player | Clone | any): boolean {
  const FORWARD: Record<string, { fx: number; fy: number }> = {
    right: { fx: 1, fy: 0 },
    left: { fx: -1, fy: 0 },
    up: { fx: 0, fy: -1 },
    down: { fx: 0, fy: 1 },
    "up-right": { fx: 0.7071, fy: -0.7071 },
    "up-left": { fx: -0.7071, fy: -0.7071 },
    "down-right": { fx: 0.7071, fy: 0.7071 },
    "down-left": { fx: -0.7071, fy: 0.7071 },
  };
  const fwd = FORWARD[a.attackDir];
  if ((b.x - a.x) * fwd.fx + (b.y - a.y) * fwd.fy < 0) return true;
  return false;
}

type GameTextVariant = "heading" | "body";

export function getTextStyle(variant: GameTextVariant, size: number, style?: Phaser.Types.GameObjects.Text.TextStyle) {
  let fontFamily = "Oswald, sans-serif";
  if (variant == "heading") {
    fontFamily = "Cinzel Decorative, serif";
  }

  return {
    fontFamily: fontFamily,
    fontSize: `${size}px`,
    ...style,
  };
}

export function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}