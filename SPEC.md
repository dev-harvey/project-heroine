# Game Spec — *Project Heroine* (Working Title)

## Overview

A top-down action roguelite where you play as a heroine who can summon a real-time mirror clone of herself. The clone copies your every move and attack from a different position on screen, letting you attack from two angles simultaneously. The clone grows stronger the more enemies it kills — but when it dies, it's gone, and you bank a permanent stat boost based on its kill count. Each run pushes further; each death makes you permanently stronger.

**Platform:** Browser (HTML5)  
**Tech:** Phaser 3 (JavaScript)  
**Perspective:** Top-down  
**Art Style:** Gothic pixel art  

---

## Core Requirements

### Player
- 8-directional movement (WASD or arrow keys)
- Melee sword attack triggered by **left mouse click**
- **Facing direction** is controlled by horizontal movement (WASD) — moving right faces right, moving left faces left, vertical movement does not change facing
- **Attack direction** is determined by the mouse cursor position, snapped to the 4 cardinal directions (up / down / left / right)
  - Attacking left or right: sprite temporarily flips to match the attack direction, then restores to movement-facing after the swing
  - Attacking up or down: facing direction is unchanged; hitbox extends above or below the player
- Health bar — player dies when HP reaches zero, ending the run
- Can fight solo without a clone active

### Clone System
- Press a key to summon the clone
- The clone mirrors the player's position offset by a fixed vector (e.g. opposite side of the nearest enemy cluster), copying all movement and attacks in real-time
- Each enemy killed by the clone increments a **Clone Kill Counter**
- The clone gains a damage/speed bonus that scales with its kill count
- The clone has its own HP — it can die independently of the player
- On clone death: the kill count is converted into a **permanent stat boost** (banked across all future runs)
- Only one clone active at a time (in Milestones 1–2); multiple autonomous clones in Milestone 3

### Enemies
- Enemies spawn in waves; each wave is harder than the last
- Enemies have idle, movement, and attack states
- Contact or attack damage depletes player/clone HP

### Roguelite Progression
- Each run is endless — survive as long as possible
- On run end (player death), accumulated bonuses are permanently applied
- A persistent upgrade shop between runs lets you spend earned souls/currency on permanent upgrades
- In-run upgrades drop from enemies and can be picked up mid-wave

### Win / Lose
- There is no win state — the goal is to beat your previous record
- Run ends when the player dies (not the clone)

---

## Milestone 1 — Core Combat Loop

**Goal:** A playable loop with movement, combat, and enemy waves. No clone yet.

### Features
- Player spawns in a dungeon room
- 8-directional movement (WASD), sword attack on left mouse click; attack direction snapped to nearest cardinal (up/down/left/right) from cursor; facing set by horizontal movement
- Two enemy types: **Mutant Toad** (melee jumper) and **Hell Hound** (fast chaser)
- Wave system: enemies spawn in rounds with a short break between waves
- Player HP bar and wave counter displayed on screen
- Enemy death effect plays on kill
- Run ends on player death — shows kill count and wave reached
- Restart button

### Pixel Art Assets Used

#### Player
| Asset | Path |
|---|---|
| Idle (4 frames) | [game-assets/characters/player/Bridge Heroine/Heroine base/Sprites/idle/](game-assets/characters/player/Bridge%20Heroine/Heroine%20base/Sprites/idle/) |
| Run (7 frames) | [game-assets/characters/player/Bridge Heroine/Heroine base/Sprites/run/](game-assets/characters/player/Bridge%20Heroine/Heroine%20base/Sprites/run/) |
| Attack (5 frames) | [game-assets/characters/player/Bridge Heroine/Heroine base/Sprites/player-attack/](game-assets/characters/player/Bridge%20Heroine/Heroine%20base/Sprites/player-attack/) |
| Spritesheets | [game-assets/characters/player/Bridge Heroine/Heroine base/Spritesheets/](game-assets/characters/player/Bridge%20Heroine/Heroine%20base/Spritesheets/) |

#### Enemies
| Enemy | Asset Path |
|---|---|
| Mutant Toad — Idle | [game-assets/characters/enemies/mutant-toad/Sprites/idle/](game-assets/characters/enemies/mutant-toad/Sprites/idle/) |
| Mutant Toad — Jump | [game-assets/characters/enemies/mutant-toad/Sprites/jump/](game-assets/characters/enemies/mutant-toad/Sprites/jump/) |
| Mutant Toad — Attack | [game-assets/characters/enemies/mutant-toad/Sprites/attack/](game-assets/characters/enemies/mutant-toad/Sprites/attack/) |
| Mutant Toad — Spritesheet | [game-assets/characters/enemies/mutant-toad/Spritesheets/](game-assets/characters/enemies/mutant-toad/Spritesheets/) |
| Hell Hound — Idle | [game-assets/characters/enemies/Hell-Hound-Files/Sprites/Idle/](game-assets/characters/enemies/Hell-Hound-Files/Sprites/Idle/) |
| Hell Hound — Run | [game-assets/characters/enemies/Hell-Hound-Files/Sprites/Run/](game-assets/characters/enemies/Hell-Hound-Files/Sprites/Run/) |
| Hell Hound — Walk | [game-assets/characters/enemies/Hell-Hound-Files/Sprites/Walk/](game-assets/characters/enemies/Hell-Hound-Files/Sprites/Walk/) |
| Hell Hound — Jump | [game-assets/characters/enemies/Hell-Hound-Files/Sprites/Jump/](game-assets/characters/enemies/Hell-Hound-Files/Sprites/Jump/) |
| Hell Hound — Spritesheet | [game-assets/characters/enemies/Hell-Hound-Files/Spritesheets/](game-assets/characters/enemies/Hell-Hound-Files/Spritesheets/) |

#### Environment
| Asset | Path |
|---|---|
| Dungeon Tileset | [game-assets/environments/single-dungeon-crawler/PNG/dungeon-tileset.png](game-assets/environments/single-dungeon-crawler/PNG/dungeon-tileset.png) |
| Dungeon Objects | [game-assets/environments/single-dungeon-crawler-objects/PNG/dungeon-crawler-objects-transparent.png](game-assets/environments/single-dungeon-crawler-objects/PNG/dungeon-crawler-objects-transparent.png) |

#### Effects
| Asset | Path |
|---|---|
| Enemy Death (8 frames) | [game-assets/effects/EnemyDeath/Sprites/](game-assets/effects/EnemyDeath/Sprites/) |
| Enemy Death Spritesheet | [game-assets/effects/EnemyDeath/spritesheet.png](game-assets/effects/EnemyDeath/spritesheet.png) |

---

## Milestone 2 — Clone System

**Goal:** The clone is fully functional. Players can experience the core loop of growing the clone, losing it, and banking rewards.

### Features (builds on M1)
- Press `E` to summon/dismiss the clone
- Clone renders as a tinted (purple/blue) version of the player sprite
- Clone mirrors player movement offset by a configurable vector
- Clone mirrors all attacks — hit detection is independent
- Clone Kill Counter displayed on screen (e.g. "Clone: 14 kills")
- Clone kill count scales clone damage and speed (visible feedback)
- Clone has its own health bar (smaller, shown near clone)
- On clone death: kill count → permanent bonus (shown as a pop-up: "+3 Max HP banked")
- **3 new enemies:** Ghost, Flying Eye Demon, Ogre
- **In-run upgrade drops:** enemies occasionally drop a pickup that gives a temporary buff (e.g. attack speed, move speed)
- **2 clone-specific abilities** unlockable mid-run from drops:
  - *Echo Strike* — clone's attack fires a small shockwave projectile
  - *Shadow Step* — clone teleports to the mirrored position instantly when summoned
- Post-run screen shows banked bonuses and persistent soul count

### Pixel Art Assets Used

All assets from Milestone 1, plus:

#### New Enemies
| Enemy | Asset Path |
|---|---|
| Ghost — Idle | [game-assets/characters/enemies/Ghost-Files/Sprites/Idle/](game-assets/characters/enemies/Ghost-Files/Sprites/Idle/) |
| Ghost — Chase | [game-assets/characters/enemies/Ghost-Files/Sprites/Chase/](game-assets/characters/enemies/Ghost-Files/Sprites/Chase/) |
| Ghost — Appear | [game-assets/characters/enemies/Ghost-Files/Sprites/Appear/](game-assets/characters/enemies/Ghost-Files/Sprites/Appear/) |
| Ghost — Shriek | [game-assets/characters/enemies/Ghost-Files/Sprites/Shriek/](game-assets/characters/enemies/Ghost-Files/Sprites/Shriek/) |
| Ghost — Vanish | [game-assets/characters/enemies/Ghost-Files/Sprites/Vanish/](game-assets/characters/enemies/Ghost-Files/Sprites/Vanish/) |
| Ghost — Spritesheet | [game-assets/characters/enemies/Ghost-Files/Spritesheets/](game-assets/characters/enemies/Ghost-Files/Spritesheets/) |
| Flying Eye Demon (8 frames) | [game-assets/characters/enemies/flying-eye-demon/Sprites/](game-assets/characters/enemies/flying-eye-demon/Sprites/) |
| Flying Eye Demon — Spritesheet | [game-assets/characters/enemies/flying-eye-demon/Spritesheet.png](game-assets/characters/enemies/flying-eye-demon/Spritesheet.png) |
| Ogre — Idle | [game-assets/characters/enemies/Ogre/Sprites/Idle/](game-assets/characters/enemies/Ogre/Sprites/Idle/) |
| Ogre — Walk | [game-assets/characters/enemies/Ogre/Sprites/walk/](game-assets/characters/enemies/Ogre/Sprites/walk/) |
| Ogre — Attack | [game-assets/characters/enemies/Ogre/Sprites/Attack/](game-assets/characters/enemies/Ogre/Sprites/Attack/) |
| Ogre — Spritesheet | [game-assets/characters/enemies/Ogre/Spritesheets/](game-assets/characters/enemies/Ogre/Spritesheets/) |

#### Weapons / Projectiles
| Asset | Path |
|---|---|
| Dagger (Echo Strike) | [game-assets/weapons/Dagger/dagger.png](game-assets/weapons/Dagger/dagger.png) |
| Enemy Projectile (2 frames) | [game-assets/weapons/EnemyProjectile/Sprites/](game-assets/weapons/EnemyProjectile/Sprites/) |
| Fantasy Weapons Set (10 items) | [game-assets/weapons/fantasy weapons set/PNG/](game-assets/weapons/fantasy%20weapons%20set/PNG/) |

#### Additional Environment
| Asset | Path |
|---|---|
| Caverns Background | [game-assets/environments/caverns-files-web/layers/background.png](game-assets/environments/caverns-files-web/layers/background.png) |
| Caverns Back Walls | [game-assets/environments/caverns-files-web/layers/back-walls.png](game-assets/environments/caverns-files-web/layers/back-walls.png) |
| Caverns Tiles | [game-assets/environments/caverns-files-web/layers/tiles.png](game-assets/environments/caverns-files-web/layers/tiles.png) |

#### Effects
| Asset | Path |
|---|---|
| Explosion A | [game-assets/effects/Explosions pack/explosion-1-a/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-a/Sprites/) |
| Explosion B | [game-assets/effects/Explosions pack/explosion-1-b/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-b/Sprites/) |

---

## Milestone 3 — Full Roguelite Loop

**Goal:** Complete game with meta-progression, autonomous clones, all enemies, boss encounters, and a full between-run upgrade shop.

### Features (builds on M2)
- **Persistent upgrade shop** between runs — spend souls on permanent upgrades:
  - Max HP up
  - Base damage up
  - Clone duration up
  - Clone kill bonus multiplier
  - Unlock autonomous clone slot
- **Autonomous clones** — once unlocked, clones can be set to act independently (chase nearest enemy) rather than mirror the player
- **Boss encounters** — every 5 waves, a boss spawns:
  - Wave 5: Terrible Knight
  - Wave 10: Hell Beast
  - Wave 15: Death (the reaper)
  - Wave 20+: Dragon (repeating boss cycle escalates in difficulty)
- **Full enemy roster** active — all 13 enemy types in rotation based on wave depth:
  - Early waves (1–4): Mutant Toad, Hell Hound
  - Mid waves (5–9): Ghost, Flying Eye Demon, Ogre, Fire Skull
  - Late waves (10–14): Werewolf, Demon, Hell Beast
  - Deep waves (15+): Death, Terrible Knight, Dragon
- **Full clone ability tree** — 6 abilities unlockable in-run:
  - Echo Strike, Shadow Step (from M2)
  - *Spectral Guard* — clone briefly blocks damage for the player
  - *Blood Surge* — clone gains burst speed on kill streak
  - *Twin Frenzy* — both player and clone attack speed doubled for 5s
  - *Death Mark* — clone marks an enemy; marked enemy takes double damage from all sources
- Gothic Castle environment introduced at deeper wave depths
- Run summary screen with stats: waves survived, total kills, clone kills, best clone streak, souls earned

### Pixel Art Assets Used

All assets from Milestones 1 & 2, plus:

#### New Enemies
| Enemy | Asset Path |
|---|---|
| Fire Skull — Fire sprites | [game-assets/characters/enemies/Fire-Skull-Files/Sprites/Fire/](game-assets/characters/enemies/Fire-Skull-Files/Sprites/Fire/) |
| Fire Skull — NoFire sprites | [game-assets/characters/enemies/Fire-Skull-Files/Sprites/NoFire/](game-assets/characters/enemies/Fire-Skull-Files/Sprites/NoFire/) |
| Fire Skull — Spritesheets | [game-assets/characters/enemies/Fire-Skull-Files/Spritesheets/](game-assets/characters/enemies/Fire-Skull-Files/Spritesheets/) |
| WereWolf — Idle | [game-assets/characters/enemies/WereWolf/Sprites/Idle/](game-assets/characters/enemies/WereWolf/Sprites/Idle/) |
| WereWolf — Run | [game-assets/characters/enemies/WereWolf/Sprites/run/](game-assets/characters/enemies/WereWolf/Sprites/run/) |
| WereWolf — Jump | [game-assets/characters/enemies/WereWolf/Sprites/jump/](game-assets/characters/enemies/WereWolf/Sprites/jump/) |
| WereWolf — Fall | [game-assets/characters/enemies/WereWolf/Sprites/fall/](game-assets/characters/enemies/WereWolf/Sprites/fall/) |
| WereWolf — Spritesheet | [game-assets/characters/enemies/WereWolf/Spritesheets/](game-assets/characters/enemies/WereWolf/Spritesheets/) |
| Demon — Idle | [game-assets/characters/enemies/demon-Files/Sprites/Idle/](game-assets/characters/enemies/demon-Files/Sprites/Idle/) |
| Demon — Attack | [game-assets/characters/enemies/demon-Files/Sprites/DemonAttack/](game-assets/characters/enemies/demon-Files/Sprites/DemonAttack/) |
| Demon — Breath Attack | [game-assets/characters/enemies/demon-Files/Sprites/DemonAttackBreath/](game-assets/characters/enemies/demon-Files/Sprites/DemonAttackBreath/) |
| Demon — Spritesheet | [game-assets/characters/enemies/demon-Files/Spritesheets/](game-assets/characters/enemies/demon-Files/Spritesheets/) |
| Hell Beast — Idle | [game-assets/characters/enemies/Hell-Beast-Files/Idle/Sprites/](game-assets/characters/enemies/Hell-Beast-Files/Idle/Sprites/) |
| Hell Beast — Breath | [game-assets/characters/enemies/Hell-Beast-Files/Breath/Sprites/](game-assets/characters/enemies/Hell-Beast-Files/Breath/Sprites/) |
| Hell Beast — Burn | [game-assets/characters/enemies/Hell-Beast-Files/Burn/Sprites/](game-assets/characters/enemies/Hell-Beast-Files/Burn/Sprites/) |
| Hell Beast — Fireball | [game-assets/characters/enemies/Hell-Beast-Files/Fireball/Sprites/](game-assets/characters/enemies/Hell-Beast-Files/Fireball/Sprites/) |
| Death — Walk | [game-assets/characters/enemies/death/Sprites/walk/](game-assets/characters/enemies/death/Sprites/walk/) |
| Death — Rise | [game-assets/characters/enemies/death/Sprites/rise/](game-assets/characters/enemies/death/Sprites/rise/) |
| Death — No Lamp Walk | [game-assets/characters/enemies/death/Sprites/No-lamp-walk/](game-assets/characters/enemies/death/Sprites/No-lamp-walk/) |
| Death — Spritesheet | [game-assets/characters/enemies/death/Spritesheets/](game-assets/characters/enemies/death/Spritesheets/) |
| Terrible Knight — Idle | [game-assets/characters/enemies/Terrible Knight/Sprites/Idle/](game-assets/characters/enemies/Terrible%20Knight/Sprites/Idle/) |
| Terrible Knight — Run | [game-assets/characters/enemies/Terrible Knight/Sprites/Run/](game-assets/characters/enemies/Terrible%20Knight/Sprites/Run/) |
| Terrible Knight — Sword Slash | [game-assets/characters/enemies/Terrible Knight/Sprites/SwordSlash/](game-assets/characters/enemies/Terrible%20Knight/Sprites/SwordSlash/) |
| Terrible Knight — Jump Attack | [game-assets/characters/enemies/Terrible Knight/Sprites/JumpAttack/](game-assets/characters/enemies/Terrible%20Knight/Sprites/JumpAttack/) |
| Terrible Knight — Hurt | [game-assets/characters/enemies/Terrible Knight/Sprites/Hurt/](game-assets/characters/enemies/Terrible%20Knight/Sprites/Hurt/) |
| Terrible Knight — Projectile Hit | [game-assets/characters/enemies/Terrible Knight/Projectiles/Hit/Sprites/](game-assets/characters/enemies/Terrible%20Knight/Projectiles/Hit/Sprites/) |
| Terrible Knight — Spritesheet | [game-assets/characters/enemies/Terrible Knight/Spritesheets/](game-assets/characters/enemies/Terrible%20Knight/Spritesheets/) |
| Dragon — Idle | [game-assets/characters/enemies/Grotto-escape-2-boss-dragon/sprites/idle/](game-assets/characters/enemies/Grotto-escape-2-boss-dragon/sprites/idle/) |
| Dragon — Breath | [game-assets/characters/enemies/Grotto-escape-2-boss-dragon/sprites/breath/](game-assets/characters/enemies/Grotto-escape-2-boss-dragon/sprites/breath/) |
| Dragon — Tail | [game-assets/characters/enemies/Grotto-escape-2-boss-dragon/sprites/tail/](game-assets/characters/enemies/Grotto-escape-2-boss-dragon/sprites/tail/) |
| Dragon — Spritesheets | [game-assets/characters/enemies/Grotto-escape-2-boss-dragon/spritesheets/](game-assets/characters/enemies/Grotto-escape-2-boss-dragon/spritesheets/) |

#### Environment
| Asset | Path |
|---|---|
| Gothic Castle Background | [game-assets/environments/Gothic-Castle-Files/PNG/](game-assets/environments/Gothic-Castle-Files/PNG/) |
| Gothic Horror Background | [game-assets/environments/Gothic-Horror-Files/PNG/](game-assets/environments/Gothic-Horror-Files/PNG/) |
| Old Dark Castle Interior Tileset | [game-assets/environments/Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-tileset.png](game-assets/environments/Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-tileset.png) |
| Old Dark Castle Interior Background | [game-assets/environments/Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-background.png](game-assets/environments/Old-dark-Castle-tileset-Files/PNG/old-dark-castle-interior-background.png) |
| Modular Tileset | [game-assets/environments/Modular-tileset/layers/modular-tileset.png](game-assets/environments/Modular-tileset/layers/modular-tileset.png) |

#### Effects
| Asset | Path |
|---|---|
| Explosion C | [game-assets/effects/Explosions pack/explosion-1-c/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-c/Sprites/) |
| Explosion D | [game-assets/effects/Explosions pack/explosion-1-d/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-d/Sprites/) |
| Explosion E | [game-assets/effects/Explosions pack/explosion-1-e/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-e/Sprites/) |
| Explosion F | [game-assets/effects/Explosions pack/explosion-1-f/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-f/Sprites/) |
| Explosion G | [game-assets/effects/Explosions pack/explosion-1-g/Sprites/](game-assets/effects/Explosions%20pack/explosion-1-g/Sprites/) |

---

## Asset Summary

| Category | Count |
|---|---|
| Player animations | 4 states (idle, run, attack, jump) |
| Enemy types | 13 total |
| Boss enemies | 4 (Terrible Knight, Hell Beast, Death, Dragon) |
| Environment tilesets | 7 |
| Effect animations | 9 (1 death + 7 explosions + 1 shockwave) |
| Weapon sprites | 12 (dagger + 10 fantasy weapons + enemy projectile) |
