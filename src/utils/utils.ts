import * as Phaser from "phaser";
import { CLONE_CONFIG, GAME_COLORS, GAME_CONFIG, UI_CONFIG } from "./constants";
import Player from "../entities/Player";
import Clone from "../entities/Clone";

const OCTO_DIRS: OctoDir[] = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
const CARDINAL_DIRS: CardinalDir[] = ["right", "down", "left", "up"];

const DIR_OCTO = "octo";
const DIR_CARDINAL = "cardinal";
type DirTypeCardinal = "cardinal";
type DirTypeOcto = "octo";
type DirType = DirTypeOcto | DirTypeCardinal;

export function angleToDir(angle: number): CardinalDir;
export function angleToDir(angle: number, mode: DirTypeOcto): OctoDir;
export function angleToDir(angle: number, mode: DirTypeCardinal): CardinalDir;
export function angleToDir(angle: number, mode: DirType = DIR_CARDINAL): OctoDir | CardinalDir {
  if (mode === DIR_OCTO) {
    return OCTO_DIRS[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
  }
  return CARDINAL_DIRS[((Math.round(angle / (Math.PI / 2)) % 4) + 4) % 4];
}

export function snapAngle(angle: number, mode: DirType = DIR_OCTO): number {
  const step = mode === DIR_OCTO ? Math.PI / 4 : Math.PI / 2;
  return Math.round(angle / step) * step;
}

export function getMouseDirFromTarget(target: Phaser.Physics.Arcade.Sprite, mode: DirType = DIR_CARDINAL): OctoDir | CardinalDir {
  const ptr = target.scene.input.activePointer;
  const angle = Phaser.Math.Angle.Between(target.x, target.y, ptr.worldX, ptr.worldY);
  if (mode === DIR_CARDINAL) return angleToDir(angle, DIR_CARDINAL);
  return angleToDir(angle, DIR_OCTO);
}

const OCTO_UNIT: Record<OctoDir, XYPosition> = {
  right: { x: 1, y: 0 },
  "down-right": { x: 1, y: 1 },
  down: { x: 0, y: 1 },
  "down-left": { x: -1, y: 1 },
  left: { x: -1, y: 0 },
  "up-left": { x: -1, y: -1 },
  up: { x: 0, y: -1 },
  "up-right": { x: 1, y: -1 },
};

export function getAnchorOctoOffset(angle: number, dist: number): XYPosition {
  const dir = angleToDir(angle, DIR_OCTO);
  const { x, y } = OCTO_UNIT[dir];
  const scale = x !== 0 && y !== 0 ? dist / Math.SQRT2 : dist;
  return { x: x * scale, y: y * scale };
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
  if (!fwd) return false;
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
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function syncAttackZone(target: IAlly): void {
  if (!target.attack.detectionZone) return;

  const b = target.body as Phaser.Physics.Arcade.Body;
  const bcx = b.x + b.width / 2;
  const bcy = b.y + b.height / 2;

  const radius = target.attack.range;

  target.attack.detectionZone.setPosition(bcx, bcy);
  target.attack.detectionZone.setSize(radius * 2, radius * 2);
  target.attack.detectionZone.body.setCircle(radius);
}
