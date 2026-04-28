# Plan: Consolidate angle utilities and rename direction types

## Context
Angle→direction logic is duplicated across 7+ files using two different patterns (degree-range checks and radian-index math). The goal is a single `snapAngle` primitive and a single `angleToDir` function in utils.ts that everything else calls. At the same time, `FacingDir` is renamed `CardinalDir` and `AttackDir` is renamed `OctoDir` for clarity.

---

## Step 1 — Rename types in ambient.d.ts

**File:** `src/types/ambient.d.ts` (lines 9, 12)

- Rename `FacingDir` → `CardinalDir`
- Rename `AttackDir` → `OctoDir`
- Update comments to match

After this, TypeScript will flag every use of the old names as errors — that's the checklist for the rest of the steps.

---

## Step 2 — Add `snapAngle` and `angleToDir` to utils.ts

**File:** `src/utils/utils.ts`

Add these two exports at the top (before the existing functions):

```ts
const OCTO_DIRS: OctoDir[] = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
const CARDINAL_DIRS: CardinalDir[] = ["right", "down", "left", "up"];

export function snapAngle(angle: number, mode: "cardinal" | "octo" = "octo"): number {
  const step = mode === "octo" ? Math.PI / 4 : Math.PI / 2;
  return Math.round(angle / step) * step;
}

export function angleToDir(angle: number, mode: "octo"): OctoDir;
export function angleToDir(angle: number, mode: "cardinal"): CardinalDir;
export function angleToDir(angle: number, mode: "cardinal" | "octo" = "octo"): OctoDir | CardinalDir {
  if (mode === "octo") {
    return OCTO_DIRS[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
  }
  return CARDINAL_DIRS[((Math.round(angle / (Math.PI / 2)) % 4) + 4) % 4];
}
```

---

## Step 3 — Simplify `getMouseDirectionFromTarget` in utils.ts

**File:** `src/utils/utils.ts` (lines 6–19)

Replace the degree-range if-chain with a call to `angleToDir`:

```ts
export function getMouseDirectionFromTarget(target: Phaser.Physics.Arcade.Sprite, mode: "cardinal" | "octo" = "octo"): OctoDir | CardinalDir {
  const ptr = target.scene.input.activePointer;
  const angle = Phaser.Math.Angle.Between(target.x, target.y, ptr.worldX, ptr.worldY);
  return angleToDir(angle, mode);
}
```

Note: the return type must widen to `OctoDir | CardinalDir` (or keep two overloads) since mode is dynamic. Check callers — all current callers use the default `"octo"` so this is backward compatible.

---

## Step 4 — Simplify `getAnchorOctoOffset` in utils.ts

**File:** `src/utils/utils.ts` (lines 21–33)

Replace the degree-range if-chain with a `angleToDir` call plus a lookup table:

```ts
const OCTO_UNIT: Record<OctoDir, XYPosition> = {
  right:      { x: 1,  y: 0  },
  "down-right": { x: 1,  y: 1  },
  down:       { x: 0,  y: 1  },
  "down-left":  { x: -1, y: 1  },
  left:       { x: -1, y: 0  },
  "up-left":    { x: -1, y: -1 },
  up:         { x: 0,  y: -1 },
  "up-right":   { x: 1,  y: -1 },
};

export function getAnchorOctoOffset(angle: number, dist: number): XYPosition {
  const dir = angleToDir(angle, "octo");
  const { x, y } = OCTO_UNIT[dir];
  const scale = x !== 0 && y !== 0 ? dist / Math.SQRT2 : dist;
  return { x: x * scale, y: y * scale };
}
```

---

## Step 5 — Update Enemy.ts

**File:** `src/entities/Enemy.ts`

- Line 4: `DIRS4: FacingDir[]` → `CardinalDir[]`
- Line 5: `DIRS8: AttackDir[]` → `OctoDir[]`
- Line 21: `attackDir: AttackDir` → `OctoDir`
- Line 22: `facingDir: FacingDir` → `CardinalDir`
- Lines 83–90: Delete the local `angleToDir` overloaded method entirely. Replace with calls to the imported util.
- Line 94: `this.facingDir = this.angleToDir(angle)` → `this.facingDir = angleToDir(angle, "cardinal")`
- Add import: `import { angleToDir } from "../utils/utils";`
- Remove the `DIRS4` and `DIRS8` local arrays (no longer needed).

---

## Step 6 — Update Clone.ts

**File:** `src/entities/Clone.ts`

- Line 24: `attackDir: AttackDir` → `OctoDir`
- Line 64: `this.attackDir = "right"` (no change, string literal still valid)
- Lines 120–132: Delete `mouseToDir()` method entirely.
- Line 138: `this.attackDir = this.mouseToDir()` → `this.attackDir = angleToDir(Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY), "octo")` where `ptr = this.scene.input.activePointer`

  Or extract to a one-liner inline in `doAttack()`:
  ```ts
  const ptr = this.scene.input.activePointer;
  this.attackDir = angleToDir(Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY), "octo");
  ```
- Add import: `import { angleToDir } from "../utils/utils";`

---

## Step 7 — Update HellHound.ts

**File:** `src/entities/HellHound.ts`

- Line 15: `attackDir: AttackDir` → `OctoDir`
- Line 43: `this.attackDir = "right"` (no change)
- Line 85: Delete local `DIRS: AttackDir[]` array declaration.
- Line 88: `this.attackDir = DIRS[...]` → `this.attackDir = angleToDir(angleToTarget, "octo")`
- Lines 122–124: `const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)` → `const snap8 = snapAngle(angle, "octo")`
- Add import: `import { angleToDir, snapAngle } from "../utils/utils";`

---

## Step 8 — Update MutantToad.ts

**File:** `src/entities/MutantToad.ts`

- Line 15: `attackDir: AttackDir` → `OctoDir`
- Line 74: `DCONF: Record<AttackDir, DirConfig>` → `Record<OctoDir, DirConfig>`
- Line 146: Delete local `DIRS: AttackDir[]` array.
- Line 156: `this.attackDir = DIRS[...]` → `this.attackDir = angleToDir(angleToTarget, "octo")`
- Line 192: `const snap8 = Math.round(...)` → `const snap8 = snapAngle(angleToTarget, "octo")`
- Add import: `import { angleToDir, snapAngle } from "../utils/utils";`

---

## Step 9 — Update PlagueCrow.ts

**File:** `src/entities/PlagueCrow.ts`

- Line 11: `attackDir: AttackDir` → `OctoDir`
- Lines 122–124, 135–137, 140–142: Each block has the pattern:
  ```ts
  const angle = Phaser.Math.Angle.Between(...);
  const snap8 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  this.setVelocity(Math.cos(snap8) * ..., Math.sin(snap8) * ...);
  ```
  Replace `snap8` computation with `snapAngle(angle, "octo")` in all three places.
- Add import: `import { snapAngle } from "../utils/utils";`

---

## Step 10 — Update VoidDemon.ts

**File:** `src/entities/VoidDemon.ts`

- Line 12: `attackDir: AttackDir` → `OctoDir`
- Line 44: `this.attackDir = "right"` (no change)
- Lines 269–271: Replace `snap8` computation with `snapAngle(a, "octo")`
- Add import: `import { snapAngle } from "../utils/utils";`
- **Do not change** `facingAngle` — VoidDemon intentionally uses a continuous (un-snapped) angle for its breath cone geometry. That is correct and should stay.

---

## Step 11 — Update IEnemy in ambient.d.ts

**File:** `src/types/ambient.d.ts` (line 137)

- `attackDir: AttackDir` → `attackDir: OctoDir`

---

## Step 12 — Fix any remaining type errors

Run `npx tsc --noEmit` (or the project's build command) to catch any remaining references to the old type names. The most likely stragglers are:
- `src/entities/Player.ts` (uses `attackDir`, `facingDir`)
- `src/scenes/GameScene.ts` (may reference type names in annotations)
- `src/entities/AttackIndicator.ts` (uses `AttackDir` implicitly via `Record<string, ...>` — likely fine already)

Fix each error as it appears.

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. Run the game, confirm:
   - Player attacks in all 8 directions
   - Clone attacks and dashes in correct directions
   - All enemies (HellHound, MutantToad, PlagueCrow, VoidDemon) move and face correctly
   - Clone anchor repositions correctly when player moves toward mouse
   - Attack indicator rotates to correct direction
