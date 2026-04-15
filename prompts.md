# Project Heroine — Prompt Reference

---

## update spec to spec style

When the user says "update to spec style" or "write in spec style", apply all of the following to the target section:

1. **Read the actual source code** before writing anything — never assume values
2. **Rewrite the section with full detail** — no information left as a vague sentence if it can be a concrete value
3. **Use tables for all stats and properties**
4. **Split sprite/animation content into its own dedicated table** — separate from the mechanics table it belongs to
5. **Add a numbered index** to every heading (e.g. `2.1.6 Attack`) so any section can be referenced precisely
6. **Cross-reference related sections** where relevant (e.g. "See 2.1.7 Attack Visual")
7. **Any time an asset or texture is referenced include the full path to it from the root of game-assets/.** e.g. /characters/player/Bridge Heroine/Heroine base/Spritesheets/attack.png.

> Spec only — no game code changes until the user says so.


## Update spec and propeties
When the user says "update spec and properties", update the properties.md and spec.md files to make sure that all the values inside those documents match the current game code.

## Update game to properties
When the user says " update game based on properties", read the latest state of properties.md and list any game values that don't match the values that are listed in properties.md. If the user says "confirm" then apply those changes to the code and update the spec.md to reflect the changes.