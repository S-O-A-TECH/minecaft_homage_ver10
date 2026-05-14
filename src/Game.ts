import * as THREE from 'three';
import { InputManager } from './InputManager';
import { World } from './World';
import { Player } from './Player';
import { BlockRaycaster } from './BlockRaycaster';
import { NoiseGenerator } from './NoiseGenerator';
import { TextureAtlas } from './TextureAtlas';
import { PlayerStats } from './PlayerStats';
import { TimeSystem } from './TimeSystem';
import { UIManager } from './UIManager';
import { Inventory } from './Inventory';
import { BlockType, ItemType } from './types';
import { BLOCK_TO_ITEM, ITEM_TO_BLOCK } from './constants';

export class Game {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private input: InputManager;
    private world: World;
    private player: Player;
    private raycaster: BlockRaycaster;
    private textureAtlas: TextureAtlas;
    private noiseGen: NoiseGenerator;
    private clock: THREE.Clock;

    // New systems
    private stats: PlayerStats;
    private timeSystem: TimeSystem;
    private uiManager: UIManager;
    private inventory: Inventory;

    private highlightMesh: THREE.LineSegments | null = null;
    private fpsCounter: number = 0;
    private fpsTime: number = 0;
    private frameCount: number = 0;
    private ambientLight: THREE.AmbientLight;
    private sunLight: THREE.DirectionalLight;

    constructor() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        const skyColor = new THREE.Color(0x87CEEB);
        this.scene.background = skyColor;
        const fog = new THREE.Fog(0x87CEEB, 50, 200);
        this.scene.fog = fog;

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // Input
        this.input = new InputManager();

        // Texture atlas
        this.textureAtlas = new TextureAtlas();

        // Noise generator
        this.noiseGen = new NoiseGenerator();

        // World
        this.world = new World(this.scene, this.noiseGen, this.textureAtlas);

        // Player
        this.player = new Player(this.camera, this.input, this.world);

        // Raycaster
        this.raycaster = new BlockRaycaster(this.world);

        // Stats
        this.stats = new PlayerStats();

        // Inventory
        this.inventory = new Inventory();

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(100, 200, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.sunLight.shadow.camera.far = 500;
        this.scene.add(this.sunLight);

        // Time system
        this.timeSystem = new TimeSystem(
            this.ambientLight,
            this.sunLight,
            skyColor,
            fog
        );

        // UI Manager
        this.uiManager = new UIManager(this.stats, this.timeSystem, this.inventory);

        // Clock
        this.clock = new THREE.Clock();

        // Highlight mesh for selected block
        this.setupHighlight();

        // Resize handler
        window.addEventListener('resize', this.onResize.bind(this));

        // Click to lock pointer
        const lockMessage = document.getElementById('lock-message')!;
        lockMessage.addEventListener('click', () => {
            this.input.requestPointerLock();
        });

        // Death respawn
        const deathRespawn = document.getElementById('death-respawn')!;
        deathRespawn.addEventListener('click', () => {
            this.respawn();
        });

        // Start game loop
        this.animate();
    }

    private setupHighlight(): void {
        const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
        this.highlightMesh = new THREE.LineSegments(edges, material);
        this.highlightMesh.visible = false;
        this.scene.add(this.highlightMesh);
    }

    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        // Check if dead
        if (this.stats.isDead()) {
            this.uiManager.showDeathScreen();
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Update time system
        this.timeSystem.update(deltaTime);

        // Update player stats with environmental states
        this.stats.setSprinting(this.input.isKeyDown('ShiftLeft'));
        this.stats.setDaytime(this.timeSystem.isDaytime());
        this.updatePlayerStats(deltaTime);

        // Update player
        this.player.update(deltaTime);

        // Update world (chunk loading)
        this.world.update(this.player.position.x, this.player.position.z);

        // Handle block interaction
        this.handleBlockInteraction();

        // Handle inventory toggle
        if (this.input.isKeyDown('KeyE')) {
            this.uiManager.toggleInventory();
            this.input.keys.delete('KeyE'); // Prevent repeated toggles
        }

        // Handle crafting table interaction
        this.handleCraftingTable();

        // Update highlight
        this.updateHighlight();

        // Update UI
        this.uiManager.updateHUD();
        this.uiManager.updateHotbar();
        this.updateFPS(deltaTime);

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    private updatePlayerStats(deltaTime: number): void {
        // Check if player is near campfire/furnace/tent
        const playerPos = this.player.position;
        let nearCampfire = false;
        let nearFurnace = false;
        let inTent = false;

        // Simple radius check for nearby blocks
        for (let dx = -5; dx <= 5; dx++) {
            for (let dy = -5; dy <= 5; dy++) {
                for (let dz = -5; dz <= 5; dz++) {
                    const bx = Math.floor(playerPos.x + dx);
                    const by = Math.floor(playerPos.y + dy);
                    const bz = Math.floor(playerPos.z + dz);
                    const block = this.world.getBlock(bx, by, bz);
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (block === BlockType.CAMPFIRE && dist <= 5) {
                        nearCampfire = true;
                    }
                    if (block === BlockType.FURNACE && dist <= 3) {
                        nearFurnace = true;
                    }
                    if (block === BlockType.TENT && dist <= 2) {
                        inTent = true;
                    }
                }
            }
        }

        this.stats.setNearCampfire(nearCampfire);
        this.stats.setNearFurnace(nearFurnace);
        this.stats.setInTent(inTent);

        // Update stats
        this.stats.update(deltaTime);
    }

    private handleBlockInteraction(): void {
        if (this.uiManager.isUIOpen()) return;

        const result = this.raycaster.cast(this.camera);

        if (this.input.isMouseButtonDown(0)) {
            // Left click - destroy block
            if (result) {
                const blockType = this.world.getBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z
                );

                // Add item to inventory
                const itemType = BLOCK_TO_ITEM[blockType];
                if (itemType !== undefined) {
                    this.inventory.addItem(itemType, 1);
                }

                // Consume EP
                this.stats.consumeEPForBreak(false);

                this.world.setBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z,
                    BlockType.AIR
                );
                this.input.mouseDown.delete(0);
            }
        }

        if (this.input.isMouseButtonDown(2)) {
            // Right click - place block
            if (result) {
                const placeX = result.position.x + result.normal.x;
                const placeY = result.position.y + result.normal.y;
                const placeZ = result.position.z + result.normal.z;

                // Check if placing on a crafting table opens crafting UI
                const targetBlock = this.world.getBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z
                );
                if (targetBlock === BlockType.CRAFTING_TABLE) {
                    this.uiManager.openCrafting();
                    this.input.mouseDown.delete(2);
                    return;
                }

                // Don't place inside player
                const playerPos = this.player.position;
                const playerHeight = 1.8;
                if (
                    placeX >= Math.floor(playerPos.x - 0.3) &&
                    placeX <= Math.floor(playerPos.x + 0.3) &&
                    placeY >= Math.floor(playerPos.y) &&
                    placeY <= Math.floor(playerPos.y + playerHeight) &&
                    placeZ >= Math.floor(playerPos.z - 0.3) &&
                    placeZ <= Math.floor(playerPos.z + 0.3)
                ) {
                    // Block would be inside player, don't place
                } else {
                    const selectedItem = this.uiManager.getSelectedItem();
                    if (selectedItem !== null) {
                        const blockType = ITEM_TO_BLOCK[selectedItem];
                        if (blockType !== undefined) {
                            this.world.setBlock(placeX, placeY, placeZ, blockType);
                            this.inventory.removeItem(this.inventory.selectedSlot, 1);
                        }
                    }
                }
                this.input.mouseDown.delete(2);
            }
        }

        // Number keys to select hotbar slot
        for (let i = 0; i < 9; i++) {
            if (this.input.isKeyDown(`Digit${i + 1}`)) {
                this.inventory.selectedSlot = i;
                this.uiManager.updateHotbar();
            }
        }
    }

    private handleCraftingTable(): void {
        // Check if player right-clicks a crafting table
        // This is handled in handleBlockInteraction
    }

    private updateHighlight(): void {
        if (!this.input.isPointerLocked || !this.highlightMesh) {
            if (this.highlightMesh) this.highlightMesh.visible = false;
            return;
        }

        if (this.uiManager.isUIOpen()) {
            this.highlightMesh.visible = false;
            return;
        }

        const result = this.raycaster.cast(this.camera);
        if (result) {
            this.highlightMesh.position.set(
                result.position.x + 0.5,
                result.position.y + 0.5,
                result.position.z + 0.5
            );
            this.highlightMesh.visible = true;
        } else {
            this.highlightMesh.visible = false;
        }
    }

    private updateFPS(deltaTime: number): void {
        this.frameCount++;
        this.fpsTime += deltaTime;

        if (this.fpsTime >= 0.5) {
            this.fpsCounter = Math.round(this.frameCount / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;

            const pos = this.player.position;
            this.uiManager.updateInfo(
                this.fpsCounter,
                pos.x,
                pos.y,
                pos.z,
                this.world.getLoadedChunkCount()
            );
        }
    }

    private respawn(): void {
        this.stats.fullHeal();
        this.player.position.set(0, 80, 0);
        this.player.velocity.set(0, 0, 0);
        this.uiManager.hideDeathScreen();
    }
}