type EntityState = "idle" | "walk" | "run" | "reposition" | "attack" | "dash" | "hurt" | "stunned" | "dead";

interface IEntityGameScene extends Phaser.Scene {
  spawnDamageNumber: (x: number, y: number, amount: number, color = "#ffffff", size = 19) => void;
}

interface IAllyGameScene extends IEntityGameScene {
  enemies: Phaser.Physics.Arcade.Group;
}

interface IPlayerGameScene extends IAllyGameScene {}
interface ICloneGameScene extends IAllyGameScene {}

interface IEnemyGameScene extends IEntityGameScene {
  // TODO: Move to onEntityKilled ?
  // onEnemyKilled: (enemy: IEnemy) => void;
}

interface IEntity {
  id: string;
  entityType: string;
  gameScene: IEntityGameScene;
  entityState: EntityState;
  setEntityState(next: EntityState): void;
  x: number;
  y: number;
  movement: IEntityMovement;
  health: IEntityHealth;
  attack: IEntityAttack;
  skills: IEntitySkills;
  killCount: number;
  lastAttacker?: IEntity;
  active: boolean;
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
  emit(event: string | symbol, ...args: any[]): boolean;
  setAlpha(topLeft?: number, topRight?: number, bottomLeft?: number, bottomRight?: number): this;
  tryHurt(amount: number): boolean;
  registerKill(): void;
}

interface IAlly extends IEntity {
  attack: IAllyAttack;
  setAttackDamage(value: number): void;
}

interface IPlayer extends IAlly {
  anchor: IPlayerAnchor;
}
interface IClone extends IAlly {}

interface IEnemy extends IEntity {
  attack: IEnemyAttack;
  update(time: number, delta: number, player: IPlayer, clone?: IClone | null): void;
  die?(): void;
}

interface IEntityMovement {
  speed: number;
  facingDir: CardinalDir;
}

interface IPlayerMovement extends IEntityMovement {}
interface ICloneMovement extends IEntityMovement {}
interface IEnemyMovement extends IEntityMovement {}

interface IEntityHealth {
  current: number;
  max: number;
}

interface IPlayerHealth extends IEntityHealth {}
interface ICloneHealth extends IEntityHealth {}
interface IEnemyHealth extends IEntityHealth {}

interface IEntityAttack {
  damage: number;
  cooldown: number;
  cooldownMax: number;
  dir: CardinalDir;
  range: number;
  detectionZone: Phaser.Physics.Arcade.Image;
  frames: {
    start: number = 0;
    end: number = 0;
  }
}

interface IAllyAttack extends IEntityAttack {
  attackIndicator: AttackIndicator;
  hitEnemies: Set;
}

interface IPlayerAttack extends IAllyAttack {}
interface ICloneAttack extends IAllyAttack {}
interface IEnemyAttack extends IEntityAttack {}

interface IEntitySkills {
  dash?: Dash;
}

interface IAllySkills extends IEntitySkills {}
interface IPlayerSkills extends IAllySkills {}
interface ICloneSkills extends IAllySkills {}
interface IEnemySkills extends IEntitySkills {}

interface IPlayerAnchor {
  position: XYPosition;
  offset: XYPosition;
  indicatorPosition: XYPosition;
  indicator: AnchorIndicator;
}

interface IPlayerInput {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: WasdKeys;
  shiftKey: Phaser.Input.Keyboard.Key;
}
