import * as Phaser from "phaser";

import { CLONE_CONFIG, GAME_COLORS, PLAYER_CONFIG } from "../utils/constants";
import Player from "./Player";
import Clone from "./Clone";
import { getMouseDirectionFromTarget } from "../utils/utils";

const DIRECTION_CONFIG: Record<string, { angle: number; offsetX: number; offsetY: number }> = {
  right: { angle: 0, offsetX: PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_X, offsetY: 0 },
  "down-right": { angle: 45, offsetX: PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_X, offsetY: PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_Y },
  down: { angle: 90, offsetX: 0, offsetY: PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_Y },
  "down-left": { angle: 135, offsetX: -PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_X, offsetY: PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_Y },
  left: { angle: 180, offsetX: -PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_X, offsetY: 0 },
  "up-left": { angle: 225, offsetX: -PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_X, offsetY: -PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_Y },
  up: { angle: 270, offsetX: 0, offsetY: -PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_Y },
  "up-right": { angle: 315, offsetX: PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_X, offsetY: -PLAYER_CONFIG.ATTACK_INDICATOR.OFFSET_Y },
};

export default class AttackIndicator extends Phaser.Physics.Arcade.Sprite {
  public attacker: Player | Clone;

  // TODO: This should be typed to Entity eventually
  constructor(scene: Phaser.Scene, attacker: Player | Clone, tint?: number) {
    super(scene, attacker.x, attacker.y, PLAYER_CONFIG.ATTACK_INDICATOR.ANIM);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.attacker = attacker;

    this.setCollideWorldBounds(true);
    this.setDepth(PLAYER_CONFIG.DEPTH);

    this.setDisplaySize(32, 32);

    this.setPosition(attacker.x + 20, attacker.y + 35);
    this.setAngle(45);

    if (tint) this.setTint(tint);

    this.play(PLAYER_CONFIG.ATTACK_INDICATOR.ANIM);

    /* Makes the animation play forwards then backwards instead of a loop */
    let reverse = true;
    this.on("animationcomplete", (anim: Phaser.Animations.Animation) => {
      if (anim.key !== PLAYER_CONFIG.ATTACK_INDICATOR.ANIM) return;
      if (!reverse) {
        this.play(PLAYER_CONFIG.ATTACK_INDICATOR.ANIM);
      } else {
        this.anims.playReverse(PLAYER_CONFIG.ATTACK_INDICATOR.ANIM);
      }
      reverse = !reverse;
    });
  }

  update() {
    // TODO: Nice to have - Make the attack indicator bulge outwards when you move towards it, then reduce the x offset (was 20 before). This would look nice and make it sit tighter to the entity.
    const direction = getMouseDirectionFromTarget(this.attacker);
    // TODO: move this to constants so that it doesn't make a new record every frame

    this.setPosition(this.attacker.x + DIRECTION_CONFIG[direction].offsetX, this.attacker.y + DIRECTION_CONFIG[direction].offsetY);
    this.setAngle(DIRECTION_CONFIG[direction].angle);
  }
}
