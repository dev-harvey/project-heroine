import Enemy from "../entities/Enemy";
import OrcBasic from "../entities/OrcBasic";

export const ENEMY_REGISTRY: Record<string, new (scene: Phaser.Scene, x: number, y: number, texture: string) => Enemy> = {
  "orc-basic": OrcBasic,
};