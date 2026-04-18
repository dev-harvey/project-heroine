import * as Phaser from "phaser";

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
