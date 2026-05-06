import * as Phaser from "phaser";
import Enemy from "./Enemy";
import { ORCBASIC_CONFIG } from "../utils/constants";

export default class OrcBasic extends Enemy implements IOrcBasic {
  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string) {
    super(scene, x, y, textureKey);

    this.id = "orc-basic";

    this.setBodySize(ORCBASIC_CONFIG.BODY_SIZE.x, ORCBASIC_CONFIG.BODY_SIZE.y, true);
    this.body.setMass(ORCBASIC_CONFIG.MASS);
    this.setDepth(ORCBASIC_CONFIG.DEPTH);
    this.setCollideWorldBounds(true);

    this.movement = {
      speed: ORCBASIC_CONFIG.SPEED,
      facingDir: "right",
    };

    this.health = {
      current: ORCBASIC_CONFIG.MAXHP,
      max: ORCBASIC_CONFIG.MAXHP,
    };

    this.attack = {
      ...this.attack,
      damage: ORCBASIC_CONFIG.ATTACK_DAMAGE,
      cooldownMax: ORCBASIC_CONFIG.ATTACK_COOLDOWN,
      dir: "right",
      range: ORCBASIC_CONFIG.ATTACK_RANGE,
      frames: {
        start: ORCBASIC_CONFIG.ATTACK_FRAMES.START,
        end: ORCBASIC_CONFIG.ATTACK_FRAMES.END,
      },
    };
  }
}
