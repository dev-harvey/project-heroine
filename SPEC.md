# Project Heroine — Game Specification

## Concept
A top-down action roguelite. You control a fighter who can summon a clone that mirrors your attacks in real time. The clone grows stronger the more enemies it kills. When the clone expires (killed or dismissed), its power is banked back to you as permanent stat boosts.

**Engine:** Phaser 3.60 · **Canvas:** 960 × 540 · **Perspective:** Top-down, WASD + mouse

---

## Core Mechanics

### Player
| Stat          | Base | Notes                           |
|---------------|------|---------------------------------|
| Max HP        | 5    | +`bonusMaxHp` from Progression  |
| Attack Damage | 1    | +`bonusDamage` from Progression |
| Speed         | 160  |                                 |

- **Movement:** WASD / arrow keys, diagonal normalised.
- **Attack:** Left click — 4-directional, aimed by mouse angle (snapped to cardinal). Hitbox active 80–280 ms after swing. 420 ms cooldown.
- **Invincibility frames:** 480 ms after taking damage (flicker effect).
- **Clone heal:** Every time the *player* kills an enemy while the clone is active, the clone restores 1 HP.

### Clone
| Stat          | Formula (k = kill count)         |
|---------------|----------------------------------|
| Max HP        | `3 + floor(k / 3)` (+1 per 3 kills) |
| Attack Damage | `1 + k`                (+1 every kill) |
| Speed         | `160 + min(k×3, 60)`             |

- **Summon:** Press E — clone spawns 110 px in the direction of the mouse cursor.
- **Dismiss:** Press E again — grants expiry bonuses (same as when killed).
- **Reposition:** Right-click while clone is active — clone anchor moves 110 px toward mouse.
- **Behaviour:** Chases anchor point (player position + offset vector), mirrors player attacks instantly.
- **HP heal on kill tier:** When `_killCount` crosses a multiple of 3, clone heals 1 HP (up to new max).

### Clone Expiry Bonuses (on death or dismiss)
For every **kill** the clone scored this life:
- Player heals **+1 HP** immediately (capped at current maxHp).

For every **3 kills** the clone scored this life:
- Player gains **+1 permanent max HP** (persists via `window.Progression.bonusMaxHp`).
- Player gains **+1 permanent ATK** (persists via `window.Progression.bonusDamage`).

### Enemies

| Enemy       | HP | ATK | Speed | Behaviour                                      |
|-------------|-----|-----|-------|------------------------------------------------|
| Mutant Toad | 3   | 1   | 80    | Slow chase; lunges when close (1 s cooldown).  |
| Hell Hound  | 2   | 1   | 135   | Fast relentless chaser; bites at range 48 px.  |

- All enemies target the **nearest** living target (player or active clone).

### Waves
Managed by `WaveManager`. Enemy count and mix scale over time. A new wave starts automatically after all enemies are cleared.

### Permanent Progression (`window.Progression`)
```js
window.Progression = { bonusMaxHp: 0, bonusDamage: 0 }
```
Accumulates within a browser session. Applied to player stats at run start.
(Full cross-session persistence via localStorage is a Milestone 3 feature.)

---

## HUD Layout

**Top-left (depth 20)**
```
Row 1  y=14   ♥♥♥♥♥   Player hearts (red, 20 px)
Row 2  y=37   ATK: X  Player ATK (orange #ffaa44, 15 px)
Row 3  y=57   ♥♥♥     Clone hearts (purple, 18 px)  — hidden when no clone
Row 4  y=76   ATK: X  Clone ATK (#bb88ff, 14 px)    — hidden when no clone
Row 5  y=94   Kills:X Clone kill counter (#9966ff, 13 px) — hidden when no clone
```

**Top-centre:** Wave number (gold).  
**Top-right:** Total kill count (green).

---

## Game Over Screen
1. "YOU DIED" title
2. `[ PLAY AGAIN ]` button (immediately below title)
3. Run Summary — Waves survived, Total kills, Clone kills
4. Player — final Max HP and ATK (including permanent bonuses earned this run)
5. Clone — Kills scored, HP healed to player, Perm Max HP granted, Perm ATK granted, Peak ATK

---

## Assets

| Asset | Source | File |
|-------|--------|------|
| Player idle/run/attack | [Warrior Pack](https://craftpix.net/freebies/free-warrior-pixel-art-sprite-sheets/) | `game-assets/warrior/` |
| Enemy — Mutant Toad | [Free Frog Enemy](https://craftpix.net/freebies/free-frog-enemy-sprite-sheets-pixel-art/) | `game-assets/toad/` |
| Enemy — Hell Hound | [Free Hell Hound](https://craftpix.net/freebies/free-hell-hound-chibi-2d-game-sprites/) | `game-assets/hound/` |

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

### 🔲 Milestone 3 — Combat Depth
- [ ] 2–3 new enemy types (ranged, shielded, exploding)
- [ ] Player special ability (dash / shield / area blast)
- [ ] Clone ability: area burst at high kill count
- [ ] Persistent cross-session progression (localStorage)
- [ ] Between-wave upgrade picks (choose 1 of 3)
- [ ] Sound effects and music

### 🔲 Milestone 4 — Polish & Boss
- [ ] Boss encounter every 5 waves
- [ ] Full run-end screen with final score
- [ ] Title / main menu scene
- [ ] Visual polish: particle trails, screen shake on big hits
- [ ] Local high score leaderboard
