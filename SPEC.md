# Project Heroine — Game Specification

---

## 1. Concept
A top-down action roguelite. You control a fighter who can summon a clone that mirrors your attacks in real time. The clone grows stronger the more enemies it kills. When the clone expires (killed or dismissed), its power is banked back to you as permanent stat boosts.

| Property | Value |
|---|---|
| Engine | Phaser 3.60 |
| Canvas | 960×540 px |
| Perspective | Top-down |
| Input | WASD + mouse |

---

## 0. Title Screen

Entry point of the game. Displayed on launch and after respawning from the You Died screen.

| Element | Content | Position | Size | Colour |
|---|---|---|---|---|
| Background | Solid fill | Full canvas | — | `0x0d0618` |
| Grid overlay | 40 px grid lines | Full canvas | 1 px | `0x1a0a2e` |
| Title | "PROJECT HEROINE" | `480, 160`, centred | 64 px | `#ffffff`, stroke `#330066` thickness 6 |
| Subtitle | "an arena roguelite" | `480, 220`, centred | 16 px | `#664488` |
| Divider | Horizontal rule | `280–680`, y: 248 | 1 px | `0x553366` at 80% alpha |
| Start button | "[ START GAME ]" | `480, 310`, centred | 30 px | `#ffd700`, stroke `#000000` thickness 4; hover → `#ffffff` |
| Debug button | "[ DEBUG MODE ]" | `480, 370`, centred | 16 px | `#555555`; hover → `#aa66cc` |
| Version label | "Milestone 3" | `480, 524`, centred bottom | 11 px | `#333333` |

**Input:** Clicking Start or pressing ENTER / SPACE launches `GameScene`. Clicking Debug launches `GameScene` with `{ debug: true }`.

---

## Core Mechanics

### 2. Player

#### 2.1 Base Stats
| Stat | Base | Modifier |
|---|---|---|
| Max HP | 5 | +`bonusMaxHp` from Progression |
| Attack Damage | 1 | +`bonusDamage` from Progression |
| Speed | 160 px/s | — |

#### 2.2 Sprite & Body
| Property | Value |
|---|---|
| Scale | 1.5× |
| Frame size | 128×64 px |
| Physics body | 30×60 px world (local 20×40 at scale 1.5) |
| Body offset | Centred on character, 2 px right |
| Depth | 5 |
| Mass | 10 |
| Starting animation | `player-idle` |

#### 2.3 Player Animations
| Key | Spritesheet | Frames | Frame Rate | Repeat |
|---|---|---|---|---|
| `player-idle` | `/characters/player/Bridge Heroine/Heroine base/Spritesheets/idle.png` | 0–3 | 8 fps | Loop |
| `player-run` | `/characters/player/Bridge Heroine/Heroine base/Spritesheets/run.png` | 0–6 | 12 fps | Loop |
| `player-attack` | `/characters/player/Bridge Heroine/Heroine base/Spritesheets/attack.png` | 0–4 | 14 fps | Once |

#### 2.4 Movement
| Property | Value |
|---|---|
| Input | WASD or arrow keys |
| Diagonal | Normalised (×0.707) |
| Facing | Set by horizontal movement only |
| Locked during | Active swing, active dash |

#### 2.5 Attack
| Property | Value |
|---|---|
| Input | Left mouse click |
| Directions | 4-directional — snapped to nearest cardinal (right / left / up / down) based on mouse angle at click time |
| Attack zone size | 60×60 px |
| Horizontal placement | Zone flush with body top edge, extending out from body side |
| Vertical placement | Zone centred on body X, extending above/below body |
| Active window | 50–150 ms after click (100 ms contact window) |
| Attack cooldown | 300 ms |
| Movement | Player velocity locked to 0 during swing |
| Visual | See **2.6 Attack Visual** |

#### 2.6 Attack Visual

| Property | Value |
|---|---|
| Spawned at | 50 ms after click (same time hitbox opens) |
| Duration | Plays once — 5 frames at 50 fps (100 ms); destroyed on animation complete |
| Depth | 6 (player is 5) |

| Direction | Texture | Path | Position | FlipX | Angle |
|---|---|---|---|---|---|
| Right | `slash-upward` | `/effects/slashes/slash-upward.png` | `body.right + 30`, `body.top + 30` | false | 0° |
| Left | `slash-upward` | `/effects/slashes/slash-upward.png` | `body.left − 30`, `body.top + 30` | true | 0° |
| Up | `slash-horizontal` | `/effects/slashes/slash-horizontal.png` | `body.centreX`, `body.top − 30` | false | −90° |
| Down | `slash-horizontal` | `/effects/slashes/slash-horizontal.png` | `body.centreX`, `body.bottom + 30` | false | +90° |

#### 2.7 Dash
| Property | Value |
|---|---|
| Input | SHIFT |
| Duration | 200 ms |
| Distance | 100 px |
| Speed | 500 px/s (derived: distance ÷ duration) |
| Cooldown | 1200 ms (reduced by Faster Dash upgrade, −200 ms per rank, max 3×) |
| Direction | Current movement direction; falls back to facing direction if stationary |
| I-frames | 200 ms (full dash duration) |
| Restriction | Cannot dash while attacking |
| Visual | See **2.8 Dash Visual** |

#### 2.8 Dash Visual

##### 2.8.1 Flash
Alpha tween applied to the player sprite — creates a noticeable flicker for the full duration of the dash.
| Property | Value |
|---|---|
| Alpha | 0 → 1 |
| Duration | 100 ms (derived: dash duration ÷ 2 repeats) |
| Repeat | 1 (2 total cycles = 200 ms = dash duration) |
| On complete | Alpha reset to 1 |

##### 2.8.2 Spark Trail
An animated spark sprite spawned at the player's position when the dash starts. Plays once and destroys itself on completion.

| Property | Value |
|---|---|
| Texture | `dash-spark` |
| Source | `/effects/dash-spark.png` |
| Frame size | 63×32 px |
| Frames | 0–4 (5 total) |
| Frame rate | 25 fps |
| Duration | 200 ms — 5 frames at 25 fps, matches dash duration |
| Repeat | Once |
| Depth | 4 (player is 5, floor is 0) |
| Position | `body.centreX`, `body.centreY` |
| Anchor | `1.0, 0.5` (right-centre edge) |

#### 2.9 Damage
| Property | Value |
|---|---|
| Damage visual | Alpha flicker 0.2 → 1.0, duration 40 ms, repeat 3 (~120 ms total) |

#### 2.11 Death
| Property | Value |
|---|---|
| Trigger | Player HP reaches 0 |
| Delay | `onPlayerDeath()` called 300 ms after HP reaches 0 |

### 3. Clone

#### 3.1 Sprite & Body
| Property | Value |
|---|---|
| Spritesheet | Same as player (`/characters/player/Bridge Heroine/Heroine base/Spritesheets/`) |
| Scale | 1.5× |
| Frame size | 128×64 px |
| Physics body | 30×60 px world (local 20×40 at scale 1.5) |
| Body offset | Centred on character, 2 px right |
| Tint | `0x9966ff` (purple) |
| Glow | Colour `0x9966ff`, outer strength 6, inner strength 2 |
| Alpha | 0.9 (slightly transparent) |
| Depth | 4 (one behind player) |
| Mass | 10 |
| Spawn fade | Alpha tweens from 0 → 0.9 over 350 ms (ease: Power2) |
| Collision — player | None (clone passes through the player freely) |
| Collision — enemies | Solid (same as player) |

#### 3.2 Base Stats
Derived from player stats at the moment of summon.

| Stat | Formula |
|---|---|
| Base HP | `max(1, floor(playerMaxHp ÷ 5) + bonusCloneHp)` |
| Base ATK | `max(1, playerAtk × 2)` |

#### 3.3 Dynamic Stats
Scale with kill count (`k`) during the clone's current life.

| Stat | Formula |
|---|---|
| Max HP | `baseHp + floor(k ÷ 3)` (+1 per 3 kills) |
| Attack Damage | `baseAtk + k` (+1 every kill) |
| Speed | `160 + min(k × 3, 60)` px/s (max bonus: +60) |

#### 3.4 Summon & Dismiss
| Property | Value |
|---|---|
| Cast input | Spacebar — summons clone if none active, dismisses if one is active |
| Summon position | 100 px from player in the direction of the mouse cursor |
| Summon dash | Clone spawns at player position then instantly dashes to summon position (see **3.4.1 Clone Dash Visual**) |
| Dismiss effect | Triggers full expiry bonuses, same as death |
| Reposition input | Right-click while clone is active |
| Reposition effect | Anchor snaps to the nearest of 4 fixed positions around the player (N/S/E/W), each 100 px away, chosen by snapping the mouse angle to the nearest cardinal direction |

#### 3.4.1 Clone Dash Visual
Used any time the clone dashes — on summon, and whenever the player dashes (clone mirrors the dash). Same effects as **2.8 Dash Visual** with the following overrides:

| Property | Value |
|---|---|
| Flash tint | `0x9966ff` |
| Flash alpha | 0 → 0.9 (clone base alpha, not 1.0) |
| Spark trail tint | `0x9966ff` |
| Spark trail glow | Colour `0x9966ff`, outer strength 6, inner strength 2 |

#### 3.5 Movement
| Property | Value |
|---|---|
| Target | Player position + anchor offset |
| Default anchor offset | 100 px from player at the nearest cardinal direction to the mouse cursor at summon time |
| Facing | Mirrors player facing direction |
| Movement speed | Always moves toward anchor at full speed |
| Locked during | Active swing, active dash |
| Idle threshold | idle on an anchor more than 100 ms |

#### 3.6 Attack
| Property | Value |
|---|---|
| Trigger | Mirrors player attack simultaneously |
| Direction | Same cardinal direction as player |
| Attack zone | 60×60 px, identical placement to player (see **2.4**) |
| Active window | 50–150 ms after trigger (derived from player — see **2.5**) |
| Cooldown | 300 ms (derived from player — see **2.5**) |
| Slash visual | Same as player with purple tint `0xcc88ff` (see **2.6**) |

#### 3.7 Kill Count & HP Scaling
| Property | Value |
|---|---|
| Kill registered | Each time clone's attack kills an enemy |
| HP on kill tier | When kill count crosses a multiple of 3, clone gains +1 Max HP then heals 1 HP |

#### 3.8 Expiry Bonuses
Triggered on death or dismiss. Applied to the player immediately.

| Kills scored | Bonus |
|---|---|
| Per kill | Player heals +1 HP (capped at current max HP) |
| Per 3 kills | +1 permanent max HP (`window.Progression.bonusMaxHp`) |
| Per 3 kills | +1 permanent ATK (`window.Progression.bonusDamage`) |

#### 3.9 Clone Burst
| Property | Value |
|---|---|
| Trigger | Clone expires (death or dismiss) with ≥ 5 kills |
| Damage | Clone's current attack damage |
| Targets | All active enemies on screen |
| Visual — Flash | Full-screen white flash |
| Visual — Ring | Expanding purple ring centred on clone position |

#### 3.10 Death
| Property | Value |
|---|---|
| Trigger | Clone HP reaches 0 |
| Delay | `onCloneDeath()` called 200 ms after HP reaches 0 |
| Effect | Expiry bonuses applied, clone dismissed |
| Damage visual | Same as player (see **2.9**) but alpha range adjusted to 0.2 → 0.9 to match clone's base alpha |

### Enemies

---

### 4. Mutant Toad

#### 4.1 Sprite & Body
| Property | Value |
|---|---|
| Scale | 1× |
| Frame size | 80×64 px |
| Physics body | 48×36 px world |
| Body offset | 15 px right, 28 px down |
| Depth | 4 |
| Starting animation | `/characters/enemies/mutant-toad/Spritesheets/mutant-toad-idle.png` |
| Mass | 3 |
| Target | Nearest living target (player or active clone) |
| Damage visual | Red tint (`0xff5555`) for 120 ms |

#### 4.2 Animations
| Key | Spritesheet | Frames | Frame Rate | Repeat |
|---|---|---|---|---|
| `toad-idle` | `/characters/enemies/mutant-toad/Spritesheets/mutant-toad-idle.png` | 0–3 | 8 fps | Loop |
| `toad-jump` | `/characters/enemies/mutant-toad/Spritesheets/mutant-toad-jump.png` | 0–3 | 10 fps | Once |
| `toad-attack` | `/characters/enemies/mutant-toad/Spritesheets/mutant-toad-attack.png` | 0–2 | 10 fps | Once |

#### 4.3 Stats
| Stat | Value |
|---|---|
| HP | 2 |
| Attack Damage | 2 |
| Speed | 70 px/s |
| Attack Zone | 90° cone, 55 px range, facing direction of target |
| Attack Cooldown | 1400–2000 ms (random) |
| Jump Cooldown | 3000–5500 ms (random); initial 2500–4500 ms |

#### 4.4 Behaviour
| State | Condition | Action |
|---|---|---|
| Attack | Distance ≤ 55 px and cooldown expired | Stop, play `toad-attack`, deal damage, reset cooldown |
| Jump Lunge | Distance ≤ 320 px and jump cooldown expired | Launch at 230 px/s toward target for 380 ms, play `toad-jump` |
| Walk | Otherwise | Move toward target at 70 px/s, play `toad-idle` |

---

### 5. Hell Hound

#### 5.1 Sprite & Body
| Property | Value |
|---|---|
| Scale | 1× |
| Frame size | 64×48 px |
| Physics body | 45×29 px world |
| Body offset | 12 px right, 19 px down |
| Depth | 4 |
| Starting animation | `hound-idle` |
| Mass | 2 |
| Target | Nearest living target (player or active clone) |
| Damage visual | Red tint (`0xff5555`) for 120 ms |

#### 5.2 Animations
| Key | Spritesheet | Frames | Frame Rate | Repeat |
|---|---|---|---|---|
| `hound-idle` | `/characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-idle.png` | 0–10 | 8 fps | Loop |
| `hound-run` | `/characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-run.png` | 0–4 | 12 fps | Loop |
| `hound-attack` | `/characters/enemies/Hell-Hound-Files/Spritesheets/hell-hound-attack.png` | 0–5 | 12 fps | Once |

#### 5.3 Stats
| Stat | Value |
|---|---|
| HP | 1 |
| Attack Damage | 1 |
| Speed | 135 px/s |
| Attack Zone | 90° cone, 48 px range, facing direction of target |
| Attack Cooldown | 1000–1600 ms (random); initial 900–1500 ms |

#### 5.4 Behaviour
| State | Condition | Action |
|---|---|---|
| Attack | Distance ≤ 48 px and cooldown expired | Stop, play `hound-attack`, deal damage on completion, reset cooldown |
| Chase | Otherwise | Move toward target at 135 px/s, play `hound-run` |

---

### 6. Plague Crow

#### 6.1 Sprite & Body
| Property | Value |
|---|---|
| Scale | 1× |
| Frame size | 48×48 px |
| Physics body | 28×45 px world |
| Body offset | 12 px right, 1 px down |
| Depth | 4 |
| Starting animation | `crow-idle` |
| Mass | 1 |
| Target | Nearest living target (player or active clone) |
| Damage visual | Red tint (`0xff5555`) for 120 ms |

#### 6.2 Animations
| Key | Spritesheet | Frames | Frame Rate | Repeat |
|---|---|---|---|---|
| `crow-idle` | `/characters/enemies/plague-crow/plague-crow-idle.png` | 0–2 | 6 fps | Loop |
| `crow-fly` | `/characters/enemies/plague-crow/plague-crow-fly.png` | 0–1 | 8 fps | Loop |

#### 6.3 Stats
| Stat | Value |
|---|---|
| HP | 2 |
| Attack Damage | 2 |
| Speed | 55 px/s |
| Flee Speed | 77 px/s (1.4× speed) |
| Shoot Cooldown | 2000–3000 ms (random); initial 1500–3000 ms |

#### 6.4 Projectile
| Property | Value |
|---|---|
| Shape | Circle, radius 5 px |
| Colour | `0x8833aa` |
| Speed | 200 px/s |
| Depth | 6 |
| Lifetime | Destroyed on world bounds hit or after 3000 ms |

#### 6.5 Behaviour
| State | Condition | Action |
|---|---|---|
| Flee | Distance < 100 px | Move away from target at 77 px/s, play `crow-fly` |
| Back away | Distance < 200 px | Move away from target at 55 px/s, play `crow-fly` |
| Hover | Distance 200–320 px | Stop, play `crow-idle`; shoot if cooldown expired |
| Move in | Distance > 320 px | Move toward target at 55 px/s, play `crow-fly` |

---

### 7. Void Dragon

#### 7.1 Sprite & Body
| Property | Value |
|---|---|
| Scale | 0.56× |
| Frame size | 192×176 px |
| Physics body | ~101×84 px world (local 180×150 at scale 0.56) |
| Body offset | 6 px right, 10 px down (local units) |
| Depth | 4 |
| Starting animation | `dragon-fly` |
| Mass | 20 |
| Target | Nearest living target (player or active clone) |
| Damage visual | Red tint (`0xff5555`) for 120 ms |

#### 7.2 Animations
| Key | Spritesheet | Frames | Frame Rate | Repeat |
|---|---|---|---|---|
| `dragon-fly` | `/characters/enemies/void-dragon/void-dragon-fly.png` | 0–8 | 10 fps | Loop |
| `dragon-breath` | `/characters/enemies/demon-Files/Spritesheets/breath-fire.png` | 0–7 | 12 fps | Once |

#### 7.3 Stats
| Stat | Value |
|---|---|
| HP | 10 |
| Melee Damage | 1 |
| Breath Damage | 3 |
| Speed | 45 px/s |
| Melee Zone | 90° cone, 65 px range, facing direction of target |
| Melee Cooldown | 1200 ms |
| Breath Range | 170 px (depth of fire rectangle) |
| Breath Cooldown | 3500–5000 ms (random); initial 2000–4000 ms |

#### 7.4 Breath Attack
| Property | Value |
|---|---|
| Wind-up duration | 500 ms — dragon stationary |
| Wind-up tint | Orange (`0xff8800`) applied to dragon sprite |
| Wind-up preview | Cone outline drawn in light orange (`0xffcc88`) at 40% alpha showing exactly where the fire cone will land; fades out as fire fires |
| Fire cone angle | 60° |
| Fire cone range | 170 px, extending from dragon centre in facing direction |
| Damage | 3 — applied instantly to any target whose centre falls inside the cone |
| Fire sprites | 9 staggered `dragon-breath` sprites scattered within the cone; scale 0.48, alpha 0.85, blend mode ADD, depth 6, spawned 55 ms apart; fade to alpha 0 over 150 ms on animation complete |
| Cone visual | Fills with `0xff4400` at 18% alpha fading to 0; outlined with `0xff8800` fading to 0; duration 700 ms |

#### 7.5 Behaviour
| State | Condition | Action |
|---|---|---|
| Wind-up / Fire | Breath active | Stop, play wind-up then fire breath |
| Breath | Distance ≤ 170 px and breath cooldown expired | Stop, face target, trigger breath attack (priority over melee) |
| Melee | Distance ≤ 65 px and melee cooldown expired | Stop, deal 1 damage |
| Chase | Otherwise | Move toward target at 45 px/s, play `dragon-fly` |

---

### 8. Unit Collision

**Solid** collisions use Phaser's arcade physics collider — the two bodies cannot overlap. When they meet, they push each other apart based on their velocities and masses. Neither unit takes damage from the contact; it is purely positional.

**Overlap** collisions detect when two bodies intersect without physically pushing each other apart. When an attack zone overlaps an enemy, damage is dealt and the enemy is added to a hit set so it cannot be hit again by the same swing.

| Unit A | Unit B | Collision |
|---|---|---|
| Player | Enemies | Solid |
| Clone | Enemies | Solid |
| Player | Clone | None (pass through) |
| Enemies | Enemies | Solid |
| Player attack zone | Enemies | Overlap (deals damage) |
| Clone attack zone | Enemies | Overlap (deals damage) |

#### Unit Mass
Mass controls how much a unit is pushed when two solid bodies collide — heavier units are pushed less.

| Unit | Mass |
|---|---|
| Player | 10 |
| Clone | 10 |
| Mutant Toad | 3 |
| Hell Hound | 2 |
| Plague Crow | 1 |
| Void Dragon | 20 |

---

### 9. Shared — Enemy Death Effect
| Property | Value |
|---|---|
| Trigger | Any enemy reaches 0 HP |
| Texture | `enemy-death` |
| Source | `/effects/EnemyDeath/enemy-death.png` |
| Frame size | 56×64 px |
| Frames | 0–7 (8 total) |
| Frame rate | 14 fps |
| Repeat | Once; destroyed on animation complete |
| Position | Enemy world centre at time of death |

### 10. Announcement Text
Shared text object used for wave start, wave clear, and other events. Fades in instantly, holds, then fades out.

| Property | Value |
|---|---|
| Position | `480, 200` (horizontally centred, 200 px from top) |
| Origin | `0.5, 0.5` |
| Font | Courier New, monospace |
| Font size | 52 px |
| Stroke | `#000000`, thickness 5 |
| Depth | 25 |
| Fade | Alpha 1 → 0 over 600 ms, with 1400 ms delay (total visible: ~2000 ms) |

| Event | Text | Colour |
|---|---|---|
| Wave start | "Wave N" | `#ffd700` |
| Wave clear | "Wave Clear!" | `#aaffaa` |
| Clone summoned | "Clone Summoned!" | `#cc88ff` |
| Clone dismissed, 0 kills | "Clone dismissed — no kills" | `#cc88ff` |
| Clone died, 0 kills | "Clone fell — no kills" | `#cc88ff` |
| Clone dismissed, N kills | "Clone dismissed — N kills  +T max HP  +T ATK  +Xg" | `#cc88ff` |
| Clone died, N kills | "Clone fell — N kills  +T max HP  +T ATK  +Xg" | `#cc88ff` |
| Clone dismissed/died, no tier yet | "Clone dismissed/fell — N kills  (need X more for tier 2)" | `#cc88ff` |

### 11. Waves

#### 11.0 Flow
| Property | Value |
|---|---|
| First wave delay | 800 ms after game start |
| Wave clear delay | 2800 ms after last enemy killed |

#### 11.1 Wave Counter (persistent HUD text)
| Property | Value |
|---|---|
| Content | "Wave N" |
| Position | `480, 12` (top centre) |
| Origin | `0.5, 0` |
| Font | Courier New, monospace |
| Font size | 27 px |
| Colour | `#ffd700` |
| Stroke | `#000000`, thickness 3 |
| Depth | 20 |

#### 11.2 Enemy Composition
Counts scale with wave number (`N`). Plague Crow appears from wave 2, Void Dragon from wave 3.

| Enemy | Formula | Wave 1 | Wave 2 | Wave 3 | Wave 5 |
|---|---|---|---|---|---|
| Mutant Toad | `2 + floor(N × 1.3)` | 3 | 4 | 5 | 8 |
| Hell Hound | `floor(N × 0.8)` | 0 | 1 | 2 | 4 |
| Plague Crow | `N ≥ 2: 1 + floor((N−2) × 0.6)` | — | 1 | 1 | 2 |
| Void Dragon | `N ≥ 3: floor((N−3) × 0.5) + 1` | — | — | 1 | 2 |

### 12. Permanent Progression

Stored in `window.Progression`. Persists across runs within a session (page refresh resets). Applied to player stats at the start of each run.

#### 12.1 Progression Keys
| Key | Type | Default | Effect |
|---|---|---|---|
| `bonusMaxHp` | number | 0 | +N permanent player Max HP |
| `bonusDamage` | number | 0 | +N permanent player ATK |
| `bonusCloneHp` | number | 0 | Clone base HP +N at summon |
| `dashCooldownBonus` | number | 0 | Dash cooldown reduced by N ms (min 300 ms) |
| `goldBoost` | number | 1 | Gold multiplier on clone expiry (×1.25 per rank) |

#### 12.2 Upgrades
Purchased on the You Died screen (see **13**). Applied immediately and persist for the session.

| Upgrade | Description | Cost | Colour | Max |
|---|---|---|---|---|
| Extra Life | +1 permanent Max HP | 3g | `#ff8899` | — |
| Sharpened Blade | +1 permanent ATK | 3g | `#ffcc66` | — |
| Clone Resilience | Clone starts with +1 HP | 5g | `#dd99ff` | — |
| Faster Dash | Dash cooldown −200 ms | 8g | `#88ddff` | 3× |
| Gold Boost | +25% gold from clone kills | 10g | `#ffd700` | 3× |

Buy button states: affordable → `#44ff88`; hover → `#ffffff`; unaffordable → `#555555`; max reached → "[ MAX ]" `#444444`.

---

### 13. You Died Screen

Two-column layout (960×540). Background `0x0d0618`. Vertical divider at x=480, colour `0x553366` at 80% alpha. Font throughout: Courier New, monospace.

#### 13.1 Left Column (x: 18–462)

| Element | Content | Size | Colour |
|---|---|---|---|
| Title | "YOU DIED" | 54 px | `#dd2233`, stroke `#000000` thickness 6 |
| Respawn button | "[ RESPAWN ]" | 26 px | `#ffd700`; hover → `#ffffff`; also triggered by ENTER or SPACE |
| Section header | "THIS RUN" | 12 px | `#999999` |
| Waves Survived | number | 15 px | value `#ffffff` |
| Total Kills | number | 15 px | value `#aaffaa` |
| Clone Kills | number | 15 px | value `#dd99ff` |
| Gold Earned | number | 15 px | value `#ffd700` |
| Section header | "SESSION" | 12 px | `#999999` |
| Total Runs | number | 15 px | value `#ffffff` |
| Highest Wave | number | 15 px | value `#ffd700` |
| Lifetime Kills | number | 15 px | value `#aaffaa` |
| Section header | "PLAYER" | 12 px | `#999999` |
| Max HP | number | 15 px | value `#ff8899` |
| Attack | number | 15 px | value `#ffcc66` |
| Section header | "CLONE" | 12 px | `#999999` |
| Kills Scored | number | 14 px | value `#dd99ff` |
| HP Healed to Player | number | 14 px | value `#44ffaa` |
| Perm Max HP Granted | number | 14 px | value `#44ffaa` |
| Perm ATK Granted | number | 14 px | value `#ffcc66` |
| Peak Attack | number | 14 px | value `#ffcc66` |
| If clone unused | "Clone was never used" | 13 px | `#555555` |

#### 13.2 Right Column — Upgrade Shop (x: 498–950)

| Element | Content | Size | Colour |
|---|---|---|---|
| Header | "UPGRADE SHOP" | 20 px | `#ffd700`, stroke `#000000` thickness 3 |
| Gold display | Gem icon (`/ui/gems-spritesheet.png` frame 134, scale 0.9) + "Gold: N" | 14 px | `#ffd700` |

Each upgrade occupies a 52 px tall row. All rows share the same layout:

| Sub-element | Position | Size | Colour |
|---|---|---|---|
| Upgrade name | Left edge (x: 498), vertically centred at row top +13 px | 14 px | Upgrade colour (see **12.2**) |
| Description | Left edge (x: 498), row top +30 px | 11 px | `#777777` |
| Gem icon | x: 860, row centre | — | Gem frame 134, scale 0.85 |
| Cost | x: 875, row centre | 13 px | `#ffd700` |
| Buy button | Right edge (x: 950), row centre | 14 px | State-dependent (see **12.2**) |
| Separator line | Bottom of row | 1 px | `0x553366` at 60% alpha |

Upgrade list: see **12.2 Upgrades**.

#### 13.3 Owned Upgrades
Listed below the shop, separated by a horizontal rule (1 px, `0x553366`, 70% alpha). Shows only upgrades with at least one rank purchased; hidden entries are collapsed. Refreshes live whenever a purchase is made.

| Element | Position | Size | Colour |
|---|---|---|---|
| Section header "OWNED UPGRADES" | Centred at x: 724, below separator | 12 px | `#999999` |
| "None yet" placeholder | Centred at x: 724 | 13 px | `#555555` — visible only when nothing owned |
| Upgrade name | Left edge x: 498, origin left-centre | 13 px | Upgrade colour (see **12.2**) |
| Upgrade value | Right edge x: 950, origin right-centre | 12 px | `#888888` |
| Row spacing | 20 px between rows | — | — |

Value format per upgrade:

| Upgrade | Value format |
|---|---|
| Extra Life | `+N Max HP` |
| Sharpened Blade | `+N ATK` |
| Clone Resilience | `+N Clone HP` |
| Faster Dash | `−Nms (×R)` where R = rank |
| Gold Boost | `×M.MM (×R)` where M = multiplier, R = rank |

---

### 14. HUD

#### 14.1 Top-left
| Row | Y | Content | Font size | Colour |
|---|---|---|---|---|
| Player hearts | 14 | ♥ per HP | 20 px | `#ff4444` |
| Player ATK | 37 | "ATK: N" | 20 px | `#ffcc44` |
| Clone hearts | — | ♥ per clone HP | 18 px | `#dd88ff` — hidden when no clone |
| Clone ATK | — | "ATK: N" | 19 px | `#dd88ff` — hidden when no clone |
| Clone kills | — | "Kills: N" | 18 px | `#ffee55` — hidden when no clone |

#### 14.2 Top-right
| Content | Font size | Colour |
|---|---|---|
| "Kills: N" | 22 px | `#aaffaa`, stroke `#000000` thickness 2 |

---

## Assets

| Asset | Source | Path |
|-------|--------|------|
| Player idle/run/attack | [Warrior Pack](https://craftpix.net/freebies/free-warrior-pixel-art-sprite-sheets/) | `/characters/player/Bridge Heroine/Heroine base/Spritesheets/` |
| Enemy — Mutant Toad | [Free Frog Enemy](https://craftpix.net/freebies/free-frog-enemy-sprite-sheets-pixel-art/) | `/characters/enemies/mutant-toad/Spritesheets/` |
| Enemy — Hell Hound | [Free Hell Hound](https://craftpix.net/freebies/free-hell-hound-chibi-2d-game-sprites/) | `/characters/enemies/Hell-Hound-Files/Spritesheets/` |
| Enemy — Plague Crow | — | `/characters/enemies/plague-crow/` |
| Enemy — Void Dragon | — | `/characters/enemies/void-dragon/` |
| Dragon breath fire | — | `/characters/enemies/demon-Files/Spritesheets/` |
| Slash effects | — | `/effects/slashes/` |
| Enemy death effect | — | `/effects/EnemyDeath/` |
| Dash spark | — | `/effects/dash-spark.png` |
| Dungeon tileset | — | `/environments/single-dungeon-crawler/PNG/` |
| Gem spritesheet | — | `/ui/gems-spritesheet.png` |
| Cursor — dagger | — | `/weapons/Dagger/dagger.png` |
| Cursor — sword | — | `/weapons/fantasy weapons set/PNG/1.png` |

---

## Milestones

### ✅ Milestone 1 — Core Gameplay Loop
**Status: Complete**
- [x] Top-down arena (960×540, tiled floor, walled border)
- [x] Player movement (WASD + diagonals)
- [x] 4-directional melee attack (mouse-aimed, left click)
- [x] Hitbox active frames with physics overlap
- [x] MutantToad and HellHound enemies with basic AI
- [x] Wave manager (auto-spawn, scaling difficulty)
- [x] Player HP + invincibility frames
- [x] Floating damage numbers
- [x] Game Over scene

### ✅ Milestone 2 — Clone System
**Status: Complete**
- [x] Clone summon/dismiss (E key)
- [x] Clone spawns toward mouse cursor
- [x] Clone mirrors player attacks in real time
- [x] Enemy target priority (chases nearest of player/clone)
- [x] Clone kill-scaling stats (HP every 3 kills, ATK every kill)
- [x] Clone expiry banking: +1 HP per kill (immediate heal), +1 perm max HP per 3 kills, +1 perm ATK per 3 kills
- [x] Clone HP displayed as purple hearts in HUD
- [x] Clone ATK and live kill count displayed in HUD
- [x] Right-click to reposition clone anchor
- [x] Player kill while clone active → clone heals 1 HP
- [x] Game Over screen: Play Again above summary, clone stats, no redundant content
- [x] Permanent progression (`window.Progression`) applied across waves in a session

### ✅ Milestone 3 — Combat Depth
**Status: Complete**
- [x] 2 new enemy types (Plague Crow, Void Dragon)
- [x] Player special ability (dash)
- [x] Clone ability: area burst at high kill count (Clone Burst)
- [x] Permanent progression
- [x] Initial title screen

### 🔲 Milestone 4 — Polish & Boss
- [ ] Boss encounter every 5 waves
- [ ] Full run-end screen with final score
- [ ] Title / main menu scene
- [ ] Sound effects and music
- [ ] Visual polish: particle trails, screen shake on big hits
- [ ] Local high score leaderboard
