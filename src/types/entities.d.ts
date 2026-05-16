/* ENTITIES */

interface IEntity {
  id: string;
  scene: Phaser.Scene;
  entityType: EntityType;
  isEntityType(...types: EntityType[]): boolean
  entityState: EntityState;
  setEntityState(next: EntityState): void;
  isInEntityState(...states: EntityState[]): boolean
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
}

interface IOrcBasic extends IEnemy {}

/* MOVEMENT */

interface IEntityMovement {
  speed: number;
  facingDir: CardinalDir;
}

interface IPlayerMovement extends IEntityMovement {}
interface ICloneMovement extends IEntityMovement {}
interface IEnemyMovement extends IEntityMovement {}

/* HEALTH */

interface IEntityHealth {
  current: number;
  max: number;
}

interface IPlayerHealth extends IEntityHealth {}
interface ICloneHealth extends IEntityHealth {}
interface IEnemyHealth extends IEntityHealth {}

/* ATTACK */

interface IEntityAttack {
  damage: number;
  cooldown: number;
  cooldownMax: number;
  dir: CardinalDir;
  range: number;
  detectionZone: DetectionZone;
  frames: {
    start: number = 0;
    end: number = 0;
  },
  hitEnemies: Set;
}

interface IAllyAttack extends IEntityAttack {
  attackIndicator: AttackIndicator;
}

interface IPlayerAttack extends IAllyAttack {}
interface ICloneAttack extends IAllyAttack {}
interface IEnemyAttack extends IEntityAttack {}

/* SKILLS */

interface IEntitySkills {
  dash?: Dash;
}

interface IAllySkills extends IEntitySkills {}
interface IPlayerSkills extends IAllySkills {}
interface ICloneSkills extends IAllySkills {}
interface IEnemySkills extends IEntitySkills {}

/* OTHER */

type EntityType = "player" | "clone" | "enemy";

type EntityState = "idle" | "walk" | "run" | "reposition" | "attack" | "dash" | "hurt" | "stunned" | "dead";

type DetectionZone = Phaser.Physics.Arcade.Image;

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
