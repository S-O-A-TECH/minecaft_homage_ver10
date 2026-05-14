import * as THREE from 'three';
import { InputManager } from './InputManager';
import { World } from './World';
import { Player } from './Player';
import { BlockRaycaster } from './BlockRaycaster';
import { NoiseGenerator } from './NoiseGenerator';
import { TextureAtlas } from './TextureAtlas';
import { BlockType } from './types';
import { PLACEABLE_BLOCKS, BLOCK_NAMES } from './constants';

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
    private selectedBlockIndex: number = 0;
    private highlightMesh: THREE.LineSegments | null = null;
    private fpsCounter: number = 0;
    private fpsTime: number = 0;
    private frameCount: number = 0;

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
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

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

        // Clock
        this.clock = new THREE.Clock();

        // Lighting
        this.setupLighting();

        // Highlight mesh for selected block
        this.setupHighlight();

        // Block selector UI
        this.setupBlockSelector();

        // Resize handler
        window.addEventListener('resize', this.onResize.bind(this));

        // Click to lock pointer
        const lockMessage = document.getElementById('lock-message')!;
        lockMessage.addEventListener('click', () => {
            this.input.requestPointerLock();
        });

        // Start game loop
        this.animate();
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 200, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.camera.far = 500;
        this.scene.add(sunLight);
    }

    private setupHighlight(): void {
        const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
        this.highlightMesh = new THREE.LineSegments(edges, material);
        this.highlightMesh.visible = false;
        this.scene.add(this.highlightMesh);
    }

    private setupBlockSelector(): void {
        const container = document.getElementById('block-selector')!;
        container.innerHTML = '';

        PLACEABLE_BLOCKS.forEach((blockType, index) => {
            const slot = document.createElement('div');
            slot.className = 'block-slot';
            if (index === this.selectedBlockIndex) {
                slot.classList.add('selected');
            }
            slot.textContent = BLOCK_NAMES[blockType].substring(0, 4);
            slot.addEventListener('click', () => {
                this.selectedBlockIndex = index;
                this.updateBlockSelectorUI();
            });
            container.appendChild(slot);
        });
    }

    private updateBlockSelectorUI(): void {
        const slots = document.querySelectorAll('.block-slot');
        slots.forEach((slot, index) => {
            if (index === this.selectedBlockIndex) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        // Update player
        this.player.update(deltaTime);

        // Update world (chunk loading)
        this.world.update(this.player.position.x, this.player.position.z);

        // Handle block interaction
        this.handleBlockInteraction();

        // Update highlight
        this.updateHighlight();

        // Update FPS counter
        this.updateFPS(deltaTime);

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    private handleBlockInteraction(): void {
        const result = this.raycaster.cast(this.camera);

        if (this.input.isMouseButtonDown(0)) {
            // Left click - destroy block
            if (result) {
                this.world.setBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z,
                    BlockType.AIR
                );
                this.input.mouseDown.delete(0); // Prevent continuous breaking
            }
        }

        if (this.input.isMouseButtonDown(2)) {
            // Right click - place block
            if (result) {
                const placeX = result.position.x + result.normal.x;
                const placeY = result.position.y + result.normal.y;
                const placeZ = result.position.z + result.normal.z;

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
                    const blockType = PLACEABLE_BLOCKS[this.selectedBlockIndex];
                    this.world.setBlock(placeX, placeY, placeZ, blockType);
                }
                this.input.mouseDown.delete(2); // Prevent continuous placing
            }
        }

        // Number keys to select block
        for (let i = 0; i < PLACEABLE_BLOCKS.length; i++) {
            if (this.input.isKeyDown(`Digit${i + 1}`)) {
                this.selectedBlockIndex = i;
                this.updateBlockSelectorUI();
            }
        }
    }

    private updateHighlight(): void {
        if (!this.input.isPointerLocked || !this.highlightMesh) {
            if (this.highlightMesh) this.highlightMesh.visible = false;
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

            const info = document.getElementById('info');
            if (info) {
                const pos = this.player.position;
                info.textContent = `FPS: ${this.fpsCounter} | Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)} | Chunks: ${this.world.getLoadedChunkCount()}`;
            }
        }
    }
}