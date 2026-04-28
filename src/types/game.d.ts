// Project-level ambient module augmentations.
declare global {
  interface ZoneWithBody extends Phaser.GameObjects.Zone {
    body: Phaser.Physics.Arcade.Body & {
      enable: boolean;
      setSize(w: number, h: number): void;
    };
  }

  // Extend the global Window with our runtime stores.
  interface Window {
    Progression:  ProgressionStore;
    Gold:         GoldStore;
    Session:      SessionStore;
  }
}

export {};