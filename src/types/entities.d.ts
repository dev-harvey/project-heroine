type EntityState = "idle" | "walk" | "run" | "attack" | "hurt" | "stunned" | "dead";

interface IEntityGameScene extends Phaser.Scene {
  spawnDamageNumber: (x: number, y: number, amount: number, color = "#ffffff", size = 19) => void;
}

interface IAllyGameScene extends IEntityGameScene {
  
}

interface IPlayerGameScene extends IAllyGameScene {}
interface ICloneGameScene extends IAllyGameScene {
  onCloneDeath(kills: number, dismissed: string): void;
}

interface IEnemyGameScene extends IEntityGameScene {
  onEnemyKilled: (enemy: IEnemy) => void;
}

interface IEntity {
  entityState: EntityState;
  x: number;
  y: number;
  movement: IEntityMovement;
  health: IEntityHealth;
  attack: IEntityAttack;
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
  takeDamage(amount: number): void;
}

interface IEnemy extends IEntity {
  attack: IEnemyAttack;
  lastAttacker?: string;
  update(time: number, delta: number, player: IPlayer, clone?: IClone | null): void;
  die?(): void;
}

interface IAlly extends IEntity {
  attack: IAllyAttack;
  setAttackDamage(value: number): void;
  dash: Dash;
}

interface IPlayer extends IAlly {
  anchor: IPlayerAnchor;
}
interface IClone extends IAlly {}

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
  dir: CardinalDir | OctoDir;
  range: number;
  detectionZone: Phaser.Physics.Arcade.Image;
}

interface IAllyAttack extends IEntityAttack {
  dir: OctoDir;
  attackIndicator: AttackIndicator;
  hitEnemies: Set;
}

interface IPlayerAttack extends IAllyAttack {}
interface ICloneAttack extends IAllyAttack {}

interface IEnemyAttack extends IEntityAttack {
  dir: CardinalDir;
}

interface IPlayerAnchor {
  position: XYPosition;
  offset: XYPosition;
  indicatorPosition: XYPosition;
  indicator: AnchorIndicator;
}
