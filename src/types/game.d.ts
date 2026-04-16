// Project-level ambient module augmentations.
// ProgressionStore, GoldStore, SessionStore etc. are declared in ambient.d.ts.

declare global {
  // Zone created by `scene.add.zone()` with an Arcade physics body attached.
  interface ZoneWithBody extends Phaser.GameObjects.Zone {
    body: Phaser.Physics.Arcade.Body & {
      enable: boolean;
      setSize(w: number, h: number): void;
    };
  }

  // Minimal preFX surface used for WebGL glow effects.
  interface PreFX {
    addGlow(color: number, intensity?: number, radius?: number): void;
  }

  // Extend the global Window with our runtime stores.
  interface Window {
    Progression:  ProgressionStore;
    Gold:         GoldStore;
    Session:      SessionStore;
    // Legacy runtime exports (removed once TS migration is complete)
    WaveManager?: unknown;
    Clone?:       unknown;
    HellHound?:   unknown;
    MutantToad?:  unknown;
    PlagueCrow?:  unknown;
    StoneKnight?: unknown;
    VoidDemon?:   unknown;
    GameScene?:   unknown;
    BootScene?:   unknown;
    TitleScene?:  unknown;
    GameOverScene?: unknown;
    Player?:      unknown;
  }
}

export {};
