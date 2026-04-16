import Phaser from 'phaser';
import Player from '../entities/Player.js';
// WaveManager is available as TS module or on window at runtime
import WaveManager from '../systems/WaveManager.js';
export default class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    create(data) {
        this._debugMode = !!(data === null || data === void 0 ? void 0 : data.debug);
        this.killCount = 0;
        this.clone = null;
        this._totalCloneKills = 0;
        this._totalHealGiven = 0;
        this._totalPermHp = 0;
        this._totalPermAtk = 0;
        this._runGold = 0;
        this._buildWorld();
        this._buildPlayer();
        this._buildGroups();
        this._buildPhysics();
        this._buildUI();
        this._buildArrowsAndPreview();
        if (this._debugMode)
            this._buildDebugPanel();
        else
            this._buildWaveManager();
        this._buildCloneControls();
    }
    update(time, delta) {
        var _a;
        if (!this.player.active)
            return;
        const ptr = this.input.activePointer;
        this.cursorSprite.setPosition(ptr.x, ptr.y);
        this.player.update(time, delta);
        this._updateHPBar();
        this._updateAttackVisuals();
        if ((_a = this.clone) === null || _a === void 0 ? void 0 : _a.active) {
            this.clone.update(time, delta, this.player);
            this._updateCloneHUD();
            if (this.cloneEnemyCollider && !this.clone._repositioning)
                this.cloneEnemyCollider.active = true;
        }
        this._updateAnchorDot();
        this.enemies.getChildren().forEach((e) => { if (e.active)
            e.update(time, delta, this.player, this.clone); });
        if (this._debugMode) {
            const alive = this.enemies.getChildren().filter((e) => e.active).length;
            if (this._debugCountText)
                this._debugCountText.setText(`Enemies: ${alive}`);
            this._drawDebugHitboxes();
        }
    }
    _buildWorld() {
        const W = 960, H = 540, WALL = 28, TILE = 32;
        this.add.rectangle(W / 2, H / 2, W, H, 0x0d0618).setDepth(0);
        const gFloor = this.add.graphics().setDepth(1);
        gFloor.fillStyle(0x4a3569, 1);
        gFloor.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
        gFloor.lineStyle(1, 0x352548, 0.9);
        for (let x = WALL; x <= W - WALL; x += TILE)
            gFloor.lineBetween(x, WALL, x, H - WALL);
        for (let y = WALL; y <= H - WALL; y += TILE)
            gFloor.lineBetween(WALL, y, W - WALL, y);
        gFloor.fillStyle(0x503d72, 0.35);
        for (let col = 0; col * TILE < W - WALL * 2; col++) {
            for (let row = 0; row * TILE < H - WALL * 2; row++) {
                if ((col + row) % 2 === 0)
                    gFloor.fillRect(WALL + col * TILE + 1, WALL + row * TILE + 1, TILE - 2, TILE - 2);
            }
        }
        const gWall = this.add.graphics().setDepth(2);
        gWall.fillStyle(0x1a0a2e, 1);
        gWall.fillRect(0, 0, 960, WALL);
        gWall.fillRect(0, H - WALL, 960, WALL);
        gWall.fillRect(0, 0, WALL, H);
        gWall.fillRect(W - WALL, 0, WALL, H);
        gWall.lineStyle(2, 0x8855cc, 0.9);
        gWall.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
        this.physics.world.setBounds(WALL, WALL, W - WALL * 2, H - WALL * 2);
    }
    _buildPlayer() {
        this.player = new Player(this, 480, 270);
        this.player.on('attack', (dir) => { var _a; if ((_a = this.clone) === null || _a === void 0 ? void 0 : _a.active)
            this.clone.doAttack(dir); });
        this.player.on('dash', (vx, vy) => {
            var _a;
            if ((_a = this.clone) === null || _a === void 0 ? void 0 : _a.active)
                this.clone.doDash(vx, vy);
            if (this.playerEnemyCollider)
                this.playerEnemyCollider.active = false;
            if (this.cloneEnemyCollider)
                this.cloneEnemyCollider.active = false;
            this.time.delayedCall(320, () => {
                if (this.playerEnemyCollider)
                    this.playerEnemyCollider.active = true;
                if (this.cloneEnemyCollider)
                    this.cloneEnemyCollider.active = true;
            });
        });
    }
    _buildWaveManager() {
        // try TS import, fallback to window-attached WaveManager
        const WM = WaveManager || window.WaveManager;
        this.waveManager = new WM(this);
        this.waveManager.start();
    }
    // Placeholder stubs for remaining original methods — migrated incrementally
    _buildGroups() { }
    _buildPhysics() { }
    _buildUI() { }
    _buildArrowsAndPreview() { }
    _buildCloneControls() { }
    _buildDebugPanel() { }
    _updateHPBar() { }
    _updateAttackVisuals() { }
    _updateCloneHUD() { }
    _updateAnchorDot() { }
    _drawDebugHitboxes() { }
}
window.GameScene = GameScene;
