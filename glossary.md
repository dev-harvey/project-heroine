# Project Heroine — Glossary

A reference for every named part of the game. Use these terms when discussing changes.

---

## Player

### Sprite
The rendered character graphic. Source spritesheet frames are 128×64px, displayed at **scale 1.4×** (world render: ~179×90px). The visible character occupies the lower-right portion of the frame.

### Body
The player's physics hitbox. **30×60px** in world space (local units: 22×43 at scale 1.4). Used for wall collisions, enemy-body contact, and taking damage. Centred on the visible model.

### Swing / Attack
Triggered by **left mouse click**. Direction is snapped to the nearest cardinal (right / left / up / down) based on mouse position relative to the player at the moment of click.

### Attack Zone
The 60×60px melee hitbox that activates during a swing.
- **Horizontal swing** (left/right): zone top edge is flush with the body top; zone extends outward from the body side.
- **Vertical swing** (up/down): zone is centred on the model horizontally, extending 15px past each side of the body.

### Reach
Distance from the player's world centre to the attack zone centre: **54px**.

### Swing Window
The frames during which the attack zone is active: **80ms → 280ms** after click (200ms contact window).

### Attack Cooldown
Minimum time between swings: **420ms**.

### Attack Indicator
The faint outlined box shown on screen before swinging, previewing where the attack zone will land. Brightens and fills with colour during the active swing window.

### Direction Arrow
Small triangle pointing toward the current mouse cardinal direction.

### Dash
- **Input:** SHIFT key
- **Speed:** 500px/s
- **Duration:** 200ms
- **Cooldown:** 1200ms (reduced by Faster Dash upgrade)
- **I-frames:** player is invincible for the full dash duration
- **Visual:** white flash tween + blue particle trail

### Invincibility Frames (I-frames)
Period during which the player cannot take damage. Active during the dash and briefly after taking a hit (flashing tween duration).

### Max HP
Player's maximum health. Base: **5**. Increased by Extra Life upgrades and clone expiry tier bonuses.

### Attack Damage
Damage dealt per swing. Base: **1**. Increased by Sharpened Blade upgrades and clone expiry tier bonuses.

### Speed
Movement speed: **160px/s** (constant, not upgradeable).

---

## Clone

### Sprite
Same spritesheet and scale as the player (128×64, scale 1.4×). Rendered at **0.9 alpha** with a **purple tint** (`0x9966ff`) to distinguish it.

### Body
Identical to the player body: **30×60px** world, local 22×43 at scale 1.4.

### Anchor Offset
The clone's target position expressed as an offset from the player's world position. Default: **−110px X, 0 Y** (left of player). Right-click repositions the anchor by rotating it around the player toward the mouse.

### Swing / Attack Zone
Identical geometry to the player's attack zone (60×60px, same reach and timing). The clone attacks in the same cardinal direction as the player simultaneously.

### Kill Count
Number of enemies the clone has killed during its current life. Displayed in the HUD. Drives stat growth and the expiry tier bonus.

### Dynamic Stats (scale with kill count)
- **Max HP:** `baseHp + floor(killCount / 3)`
- **Attack Damage:** `baseAtk + killCount`
- **Speed:** `160 + min(killCount × 3, 60)` px/s

### Base Stats
Derived from player stats at summon time:
- **Base HP:** `max(1, floor(playerMaxHp / 5)) + bonusCloneHp`
- **Base ATK:** `max(1, playerAtk × 2)`

### Expiry Tier
When the clone expires (dies or is dismissed), a bonus is applied to the player based on how many kills the clone scored that life:

| Kills | Tier | Bonus |
|-------|------|-------|
| 0 | 0 | None |
| 1–2 | 1 | +1 permanent Max HP, +1 permanent ATK |
| 3–5 | 2 | +2 permanent Max HP, +2 permanent ATK |
| 6–8 | 3 | +3 permanent Max HP, +3 permanent ATK |
| 9+ | 4+ | +N permanent Max HP, +N permanent ATK |

### Clone Burst
AoE explosion triggered when the clone expires with **≥5 kills**. Deals the clone's attack damage to all active enemies on screen. Visual: full-screen flash + expanding purple ring.

### Banking Popup
On-screen announcement shown when the clone expires. Summarises kills scored, bonuses earned, and gold gained.

### Summon / Dismiss
- **Input:** Space bar
- Summon places the clone at the anchor offset from the player.
- Dismiss voluntarily expires the clone, awarding the same tier bonuses as death.

---

## Enemies

All enemies target the **nearest** living entity (player or clone). On death, all enemies play a shared death effect animation.

---

### Mutant Toad

| Stat | Value |
|------|-------|
| HP | 2 |
| ATK | 2 |
| Speed | 70px/s |
| Body | 48×36px |
| First appears | Wave 1 |

**Attack Range:** 55px — stops and plays attack animation, deals damage.  
**Attack Cooldown:** 1400–2000ms (random).  
**Jump Lunge:** When within 320px and jump cooldown expires, launches at the target at 230px/s for 380ms. Jump cooldown: 3000–5500ms.  
**Behaviour:** Walks toward nearest target; stops to attack in range; periodically lunges.

---

### Hell Hound

| Stat | Value |
|------|-------|
| HP | 1 |
| ATK | 1 |
| Speed | 135px/s |
| Body | 45×29px |
| First appears | Wave 1 |

**Attack Range:** 48px — stops and bites, dealing damage.  
**Attack Cooldown:** 1000–1600ms (random).  
**Behaviour:** Pure chase; fastest basic enemy. No special move.

---

### Plague Crow

| Stat | Value |
|------|-------|
| HP | 2 |
| ATK | 2 |
| Speed | 55px/s |
| Body | 28×45px |
| First appears | Wave 2 |

**Projectile:** Small purple circle (radius 5px), fired at 200px/s toward the nearest target. Auto-destroys on world bounds or after 3s.  
**Shoot Cooldown:** 2000–3000ms (random, initial delay 1500–3000ms).  
**Flee Range:** If the target is within **100px**, flees at 1.4× speed.  
**Kite Range:** Preferred distance **200–320px**. Backs away if closer, moves in if further.  
**Behaviour:** Keeps its distance and shoots; never engages in melee.

---

### Void Dragon

| Stat | Value |
|------|-------|
| HP | 10 |
| ATK (melee) | 1 |
| ATK (breath) | 3 |
| Speed | 45px/s |
| Body | ~101×84px world (local 180×150 at scale 0.56) |
| First appears | Wave 3 |

**Melee Range:** 65px — bites for 1 damage. Cooldown: 1200ms.  
**Breath Range:** 170px depth — triggers breath attack when target is within range.  
**Breath Wind-up:** 500ms orange flash before firing. Dragon is stationary during wind-up and firing.  
**Breath Attack (Fire Rectangle):** A 170×110px rectangle extending from the dragon in the cardinal direction it is currently facing. Deals 3 damage to any target whose world centre falls inside the rectangle at the moment of firing.  
**Breath Cooldown:** 3500–5000ms after each breath.  
**Fire Sprites:** 9 staggered `dragon-breath` animation sprites scattered within the rectangle, using additive blend, lasting ~700ms.  
**Behaviour:** Chases target; prioritises breath over melee when both are available.

---

## Wave System

Managed by `WaveManager`. Waves start automatically; a new wave launches 2800ms after the last enemy of the previous wave is killed.

### Wave Composition (per wave N)
| Enemy | Formula |
|-------|---------|
| Mutant Toad | `2 + floor(N × 1.3)` |
| Hell Hound | `floor(N × 0.8)` |
| Plague Crow | wave ≥ 2: `1 + floor((N−2) × 0.6)` |
| Void Dragon | wave ≥ 3: `floor((N−3) × 0.5) + 1` |

### Wave Announcement
Centre-screen text shown at the start of each wave and on wave clear.

### Enemies Remaining
Internal counter decremented on each kill. Reaching 0 triggers the wave clear sequence.

---

## Gold

### Gold (currency)
Earned when the clone expires. Formula: `floor(killCount × goldBoost)`.  
Persists across runs (stored in `window.Gold.total`).

### Gold Boost (upgrade)
Multiplier applied to gold earned on clone expiry. Stacks multiplicatively: ×1.25 per purchase, max 3×.

### Run Gold
Gold earned in the current run only. Shown on the death screen.

---

## Progression (persistent upgrades)

Stored in `window.Progression`. Survives scene transitions; resets on page refresh (localStorage persistence planned for Milestone 4).

| Upgrade | Key | Effect |
|---------|-----|--------|
| Extra Life | `bonusMaxHp` | +1 permanent player Max HP per purchase |
| Sharpened Blade | `bonusDamage` | +1 permanent player ATK per purchase |
| Clone Resilience | `bonusCloneHp` | Clone base HP +1 per purchase |
| Faster Dash | `dashCooldownBonus` | Dash cooldown −200ms per purchase, max 3× |
| Gold Boost | `goldBoost` | ×1.25 gold from clone kills per purchase, max 3× |

---

## Session

Stored in `window.Session`. Resets on page refresh; persists across runs within a session.

| Field | Tracks |
|-------|--------|
| `runs` | Total number of runs this session |
| `highestWave` | Highest wave reached this session |
| `totalKills` | Lifetime kills this session |

---

## HUD (in-game UI)

### HP Bar
Row of heart icons in the top-left. One heart = 1 HP. Missing HP shown as empty hearts.

### ATK Display
Player's current attack damage, shown below the HP bar in yellow.

### Clone HUD
Visible only when a clone is active. Shows clone HP (purple hearts), clone ATK (purple), and clone kill count (yellow).

### Gold Display
Gold coin icon + current gold total, shown below the clone HUD.

### Wave Text
Current wave number, centred top of screen.

### Kill Counter
Total kills this run, top-right.

### Announcement Text
Large centred text for wave start ("Wave N"), wave clear ("Wave Clear!"), clone events, and other notifications. Fades out automatically.

### Attack Indicator
See *Player → Attack Indicator*.

### Direction Arrow
See *Player → Direction Arrow*.

### Controls Hint
Small text at the bottom of the screen showing key bindings. Fades out after 8 seconds.

### Dash Card
Bottom-left panel showing the current dash cooldown as a depleting bar.

---

## Scenes

### BootScene
Loads all assets (spritesheets, images) and registers all animations. Transitions to TitleScene when complete.

### TitleScene
Splash screen shown before the first run and between runs. Contains the game title, Start Game button, and Debug Mode button.

### GameScene
The main gameplay arena. Manages player, clone, enemies, waves, physics, HUD, and all game events.

### GameOverScene
Death screen shown when the player dies. Displays run stats, session stats, and the upgrade shop. Returns to TitleScene via the Respawn button.

---

## Debug Mode

Accessible from TitleScene. Launched by passing `{ debug: true }` to GameScene.

### Spawn Menu
Panel on the right side of the screen with buttons to spawn individual enemies or groups. Includes a live enemy count and a back-to-title button.

### Hitbox Overlay
Drawn every frame in debug mode. Colour-coded outlines over every physics body:
- **Cyan** — Player body
- **Yellow (solid)** — Player/Clone attack zone (always visible, not just during swing)
- **Purple** — Clone body
- **Red** — Mutant Toad
- **Orange** — Hell Hound
- **Light blue** — Plague Crow
- **Pink** — Void Dragon

Dimension labels (width×height in world px) appear above each box.
