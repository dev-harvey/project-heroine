# Game Properties

All tunable values in one place. Values here describe the live code.

---

## Arena

| Property | Value |
|---|---|
| Canvas size | 960 × 540 px |
| Wall thickness | 28 px |
| Playable area | x: 28–932, y: 28–512 |
| Enemy clamp margin | 38 px from each edge (wall + 10 px buffer) |

---

## Player

### Core Stats
| Property | Value |
|---|---|
| Max HP | 5 (+ permanent bonus) |
| Attack damage | 1 (+ permanent bonus) |
| Move speed | 160 px/s |
| Physics mass | 10 |

### Physics Body
| Property | Value |
|---|---|
| Scale | 1.5× |
| Body size (world) | 30 × 60 px |
| Body size (local) | 20 × 40 px |
| Depth | 5 |

### Attack
| Property | Value |
|---|---|
| Directions | 8 (right, up-right, up, up-left, left, down-left, down, down-right) |
| Cooldown | 300 ms |
| Hitbox opens | 50 ms after click |
| Hitbox closes | 150 ms after click |
| Active window | 100 ms |
| Slash reach | 40 px from body centre |
| Movement during swing | Locked to 0 |

### Dash
| Property | Value |
|---|---|
| Duration | 200 ms |
| Distance | 100 px |
| Speed | 500 px/s |
| Cooldown | 1200 ms (base) |
| Cooldown reduction per upgrade rank | 200 ms |
| Minimum cooldown | 300 ms |
| Max upgrade ranks | 3 |
| Invincibility frames | 200 ms (full duration) |
| Can dash while attacking | No |

### Damage & Death
| Property | Value |
|---|---|
| Damage flash colour | Red `0xff4444` ↔ white |
| Damage flash duration | 200 ms |
| Invincibility after hit | 200 ms (from flash end) |
| Death delay | 100 ms after HP reaches 0 |

---

## Clone

### Core Stats
| Property | Value |
|---|---|
| Base HP formula | `max(1, floor(playerMaxHp ÷ 5) + bonusCloneHp)` |
| Base attack formula | `max(1, playerAtk × 2)` |
| Physics mass | 10 |

### Kill Scaling (resets each summon)
| Property | Value |
|---|---|
| Max HP bonus | +1 per 3 kills |
| Attack bonus | +1 per kill |
| Speed bonus | +3 px/s per kill, capped at +60 |

### Movement
| Property | Value |
|---|---|
| Base speed | 200 px/s |
| Max speed (at kill cap) | 260 px/s |
| Repositioning speed multiplier | 2× |
| Anchor offset | 200 px above player |
| Dead zone radius | 4 px |
| Dead zone drift speed | 30 px/s |

### Repositioning
| Property | Value |
|---|---|
| Trigger | Right-click or on summon |
| Behaviour | Speed 2×, unit collision disabled |
| Ends when | Clone reaches dead zone |

### Physics Body
| Property | Value |
|---|---|
| Scale | 1.5× |
| Body size (world) | 30 × 60 px |
| Body size (local) | 20 × 40 px |
| Depth | 4 |
| Alpha | 0.9 |
| Tint | `0x76ff46` (bright green) |
| Spawn fade duration | 350 ms |

### Attack (mirrors player)
| Property | Value |
|---|---|
| Cooldown | 300 ms |
| Active window | 100 ms |
| Slash tint | `0xcc88ff` (purple) |

### Death
| Property | Value |
|---|---|
| Death delay | 50 ms after HP reaches 0 |
| Death effect tint | `0x76ff46` (green) |
| Damage flash colours | Red `0xff4444` ↔ white, then restored to green |
| Damage flash duration | 200 ms |

### Expiry Bonuses (on death or dismiss)
| Property | Value |
|---|---|
| HP heal to player | +1 per kill scored (capped at player max HP) |
| Permanent max HP | +1 per 3 kills |
| Permanent ATK | +1 per 3 kills |
| Burst threshold | 5 kills |
| Burst damage | Clone's current attack damage |
| Burst targets | All active enemies |

---

## Mutant Toad

### Core Stats
| Property | Value |
|---|---|
| HP | 2 |
| Attack damage | 2 |
| Physics mass | 3 |

### Physics Body
| Property | Value |
|---|---|
| Scale | 1× |
| Body size | 48 × 36 px |
| Body offset | 15 px right, 28 px down |
| Depth | 4 |

### Melee Attack
| Property | Value |
|---|---|
| Attack trigger range | 75 px (centre to centre) |
| Cooldown | 1000–1500 ms (random) |
| Directions | 8-directional cone |
| Hilt half-width (NH) | 15 px |
| Blade half-width (FH) | 30 px |
| Far-corner depth (FD) | 30 px |
| Bezier control depth (CTRL) | 40 px |
| Blade peak | 35 px from body edge — (FD + CTRL) ÷ 2 = (30 + 40) ÷ 2 |
| Attack animation duration | 300 ms |
| Damage timing | 300 ms after attack starts — only if target is inside the cone |
| Recovery pause | 500 ms stationary after damage lands before pursuing again |

### Leap Movement
| Property | Value |
|---|---|
| Leap speed | 150 px/s |
| Leap duration | 500 ms |
| Pause between leaps | 300 ms |
| Animation during leap | `toad-jump` |
| Animation during pause | `toad-idle` |
| Interrupted by | Entering attack range (toad freezes in place and begins attack sequence) |

---

## Hell Hound

### Core Stats
| Property | Value |
|---|---|
| HP | 1 |
| Attack damage | 1 |
| Move speed | 135 px/s |
| Physics mass | 2 |

### Physics Body
| Property | Value |
|---|---|
| Scale | 1× |
| Body size | 45 × 29 px |
| Body offset | 12 px right, 19 px down |
| Depth | 4 |

### Melee Attack
| Property | Value |
|---|---|
| Attack range | 48 px (centre to centre) |
| Cooldown | 1000–1600 ms (random) |
| Initial cooldown | 900–1500 ms |
| Directions | 8-directional shovel |
| Damage timing | On animation complete |

---

## Plague Crow

### Core Stats
| Property | Value |
|---|---|
| HP | 2 |
| Projectile damage | 2 |
| Move speed | 55 px/s |
| Flee speed | 77 px/s (1.4×) |
| Physics mass | 1 |

### Physics Body
| Property | Value |
|---|---|
| Scale | 1× |
| Body size | 28 × 45 px |
| Body offset | 12 px right, 1 px down |
| Depth | 4 |

### Behaviour Thresholds
| State | Distance | Action |
|---|---|---|
| Flee | < 100 px | Move away at flee speed |
| Back away | < 200 px | Move away at normal speed |
| Hover | 200–320 px | Stop; shoot if cooldown ready |
| Move in | > 320 px | Chase at normal speed |

### Projectile
| Property | Value |
|---|---|
| Shoot cooldown | 2000–3000 ms (random) |
| Initial cooldown | 1500–3000 ms |
| Projectile speed | 200 px/s |
| Projectile radius | 5 px |
| Projectile colour | `0x8833aa` |
| Projectile lifetime | 3000 ms |
| Destroyed on | World bounds hit or lifetime expiry |

---

## Void Demon

### Core Stats
| Property | Value |
|---|---|
| HP | 10 |
| Breath damage | 3 |
| Move speed | 45 px/s |
| Physics mass | 20 |

### Physics Body
| Property | Value |
|---|---|
| Scale | 0.7× |
| Body size (texture px) | 150 × 144 px |
| Body offset | 53 px right, 0 px down |
| Depth | 4 |

### Breath Attack
| Property | Value |
|---|---|
| Trigger range | ≤ 170 px |
| Cooldown | 3500–5000 ms (random) |
| Initial cooldown | 2000–4000 ms |
| Wind-up duration | 500 ms |
| Fire duration | 700 ms |
| Fire sprites | 9, staggered 55 ms apart |
| Directions | Free angle (not 8-dir snapped) |

### Breath Shovel Geometry
| Property | Value |
|---|---|
| Hilt width | 40 px |
| Blade width | 150 px |
| Far-corner depth | 130 px |
| Bezier control depth | 210 px |
| Blade peak (breath range) | 170 px |

---

## Waves

### Timing
| Property | Value |
|---|---|
| First wave delay | 800 ms after game start |
| Wave clear delay | 2800 ms after last enemy killed |

### Enemy Counts per Wave (N)
| Enemy | Formula | Wave 1 | Wave 2 | Wave 3 | Wave 5 |
|---|---|---|---|---|---|
| Mutant Toad | `2 + floor(N × 1.3)` | 3 | 4 | 5 | 8 |
| Hell Hound | `floor(N × 0.8)` | 0 | 1 | 2 | 4 |
| Plague Crow | `N ≥ 2: 1 + floor((N−2) × 0.6)` | — | 1 | 1 | 2 |
| Void Demon | `N ≥ 3: floor((N−3) × 0.5) + 1` | — | — | 1 | 2 |

---

## Permanent Progression

Persists across waves within a session. Resets on page refresh.

| Key | Effect | Default |
|---|---|---|
| `bonusMaxHp` | +N player max HP | 0 |
| `bonusDamage` | +N player attack damage | 0 |
| `bonusCloneHp` | +N clone base HP at summon | 0 |
| `dashCooldownBonus` | Dash cooldown reduced by N ms | 0 |
| `goldBoost` | Gold multiplier (×1.25 per rank) | ×1 |

---

## Upgrades (You Died screen)

| Upgrade | Effect | Cost | Max ranks |
|---|---|---|---|
| Extra Life | +1 permanent max HP | 3g | Unlimited |
| Sharpened Blade | +1 permanent attack damage | 3g | Unlimited |
| Clone Resilience | Clone starts with +1 HP | 5g | Unlimited |
| Faster Dash | Dash cooldown −200 ms | 8g | 3 |
| Gold Boost | +25% gold from clone kills | 10g | 3 |

---

## Shared — Enemy Death Effect

| Property | Value |
|---|---|
| Frame size | 64 × 64 px |
| Frame count | 8 |
| Frame rate | 14 fps |
| Scale | 1× |
| Depth | 6 |

---

## Debug Mode

### Stat Adjustments (debug panel)
| Control | Effect |
|---|---|
| Plr HP ± | Add or remove player HP directly |
| Plr ATK ± | Increase or decrease player attack damage |
| Cln HP ± | Add or remove clone HP directly |
| Cln ATK ± | Increase or decrease clone base attack |

### Debug Visuals
| Overlay | Colour | Alpha |
|---|---|---|
| Player attack shovel (idle) | `0xffd700` yellow | 20% |
| Player attack shovel (active) | `0xffd700` yellow | 90% outline, 35% fill |
| Clone attack shovel (idle) | `0xdd99ff` purple | 20% |
| Clone attack shovel (active) | `0xdd99ff` purple | 90% outline, 35% fill |
| Overlap zone rectangle | `0x888888` grey | 30% — toggled in panel |
| Anchor dot | `0x76ff46` green | 100%, 2×2 px |
