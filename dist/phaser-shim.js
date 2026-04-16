// Browser shim for importing 'phaser' as an ES module.
// Assumes dist/phaser.js has been loaded as a non-module and set window.Phaser.
const Phaser = (window && window.Phaser) ? window.Phaser : undefined;
export default Phaser;
