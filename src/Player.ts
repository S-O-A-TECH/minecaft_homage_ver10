import * as THREE from 'three';
import { InputManager } from './InputManager';
import { CONFIG, WORLD_HEIGHT, CHUNK_SIZE } from './constants';
import { World } from './World';
import { AudioManager } from './AudioManager';
import { BlockType } from './types';

export class Player {
    public camera: THREE.PerspectiveCamera;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public rotation: THREE.Euler;
    public onGround: boolean = false;

    private input: InputManager;
    private world: World;
    private yaw: number = 0;
    private pitch: number = 0;
    private mouseSensitivity: number = 0.002;
    
    private footstepTimer: number = 0;
    private wasOnGround: boolean = false;

    constructor(camera: THREE.PerspectiveCamera, input: InputManager, world: World) {
        this.camera = camera;
        this.input = input;
        this.world = world;
        const spawnY = world.getTerrainHeight ? world.getTerrainHeight(64, 64) + 15 : 80;
        this.position = new THREE.Vector3(64, spawnY, 64);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.camera.position.copy(this.position);
        this.camera.position.y += CONFIG.playerHeight;
        this.wasOnGround = this.onGround;
    }

    update(deltaTime: number): void {
        // Mouse look (only in game mode with pointer locked)
        if (this.input.gameMode === 'game' && this.input.isPointerLocked) {
            const { dx, dy } = this.input.consumeMouseMovement();
            this.yaw -= dx * this.mouseSensitivity;
            this.pitch -= dy * this.mouseSensitivity;
            this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));

            // Scroll wheel zoom
            const scroll = this.input.consumeScrollDelta();
            if (scroll !== 0) {
                this.camera.fov += scroll * 0.05;
                this.camera.fov = Math.max(30, Math.min(110, this.camera.fov));
                this.camera.updateProjectionMatrix();
            }
        }

        this.rotation.set(this.pitch, this.yaw, 0);
        this.camera.rotation.copy(this.rotation);

        // Movement (always works, even without pointer lock)
        const moveDir = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        if (this.input.isKeyDown('KeyW')) moveDir.add(forward);
        if (this.input.isKeyDown('KeyS')) moveDir.sub(forward);
        if (this.input.isKeyDown('KeyA')) moveDir.sub(right);
        if (this.input.isKeyDown('KeyD')) moveDir.add(right);

        if (moveDir.length() > 0) {
            moveDir.normalize();
        }

        const isSneaking = this.input.isKeyDown('ShiftLeft') && this.onGround;
        const speed = isSneaking 
            ? CONFIG.playerSpeed * 0.4 
            : (this.input.isKeyDown('ControlLeft') ? CONFIG.playerSpeed * 1.5 : CONFIG.playerSpeed);
        const horizontalVelocity = moveDir.multiplyScalar(speed);

        // Gravity (only apply if the chunk at player's location is loaded, to prevent falling through the void during startup/loading)
        const playerCX = Math.floor(this.position.x / CHUNK_SIZE);
        const playerCZ = Math.floor(this.position.z / CHUNK_SIZE);
        const isChunkLoaded = this.world.getChunk(playerCX, playerCZ) !== undefined;

        if (isChunkLoaded) {
            if (!this.onGround) {
                this.velocity.y -= CONFIG.gravity * deltaTime;
            } else {
                // Apply a steady downward floor bias to maintain stable contact and eliminate frame-by-frame onGround oscillation
                this.velocity.y = -0.5;
            }
        } else {
            this.velocity.y = 0;
        }

        // Jump
        if (this.input.isKeyDown('Space') && this.onGround) {
            this.velocity.y = 8;
            this.onGround = false;
        }

        // Apply horizontal movement
        this.velocity.x = horizontalVelocity.x;
        this.velocity.z = horizontalVelocity.z;

        // Capture vertical velocity before collision check to distinguish real falls from micro-frame edge jitters
        const preCollisionVerticalVelocity = this.velocity.y;

        // Collision detection and position update
        this.moveWithCollision(deltaTime);

        // Update camera (lower eye-height by 0.3m while sneaking)
        this.camera.position.copy(this.position);
        const camHeight = isSneaking ? CONFIG.playerHeight - 0.3 : CONFIG.playerHeight;
        this.camera.position.y += camHeight;

        // --- FOOTSTEP SOUND ENGINE ---
        if (this.onGround) {
            const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            let landedWithThud = false;

            if (!this.wasOnGround) {
                // Only trigger landing impact sounds and movement delay for actual high-altitude falls
                if (preCollisionVerticalVelocity < -3.0) {
                    this.playLandingSound();
                    this.footstepTimer = 0.15; // padding buffer
                    landedWithThud = true;
                }
            }

            if (!landedWithThud && horizontalSpeed > 0.5) {
                this.footstepTimer += deltaTime;

                const isSprinting = this.input.isKeyDown('ControlLeft') && !isSneaking;
                const interval = isSneaking ? 0.58 : (isSprinting ? 0.24 : 0.38);
                const volumeScale = isSneaking ? 0.35 : (isSprinting ? 1.4 : 1.0);

                if (this.footstepTimer >= interval) {
                    this.playFootstepSound(volumeScale);
                    this.footstepTimer = 0;
                }
            } else if (!landedWithThud) {
                this.footstepTimer = Math.max(0, this.footstepTimer - deltaTime);
            }
        }
        this.wasOnGround = this.onGround;
    }

    private getFootstepMaterial(): string {
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y - 0.5);
        const bz = Math.floor(this.position.z);
        const blockType = this.world.getBlock(bx, by, bz);

        switch (blockType) {
            case BlockType.GRASS:
            case BlockType.LEAVES:
                return 'grass';
            case BlockType.DIRT:
                return 'dirt';
            case BlockType.WOOD:
            case BlockType.PLANKS:
                return 'wood';
            case BlockType.SAND:
            case BlockType.CACTUS:
                return 'sand';
            case BlockType.GRAVEL:
                return 'sand';
            case BlockType.STONE:
            case BlockType.COBBLESTONE:
            case BlockType.BRICK:
            case BlockType.FURNACE:
            case BlockType.COAL_ORE:
            case BlockType.IRON_ORE:
            case BlockType.GOLD_ORE:
            case BlockType.DIAMOND_ORE:
                return 'stone';
            default:
                return 'stone';
        }
    }

    private playFootstepSound(volumeScale: number = 1.0): void {
        const material = this.getFootstepMaterial();
        AudioManager.getInstance().playFootstep(material, volumeScale);
    }

    private playLandingSound(): void {
        const material = this.getFootstepMaterial();
        AudioManager.getInstance().playFootstep(material, 1.3);
    }

    private moveWithCollision(deltaTime: number): void {
        const newPos = this.position.clone();
        const isSneaking = this.input.isKeyDown('ShiftLeft') && this.onGround;

        // Move X axis separately (apply sneak edge-stop lookup)
        let nextX = this.velocity.x * deltaTime;
        if (isSneaking && nextX !== 0) {
            let hasGround = false;
            const yMin = Math.floor(this.position.y - 0.9);
            const yMax = Math.floor(this.position.y - 0.1);
            for (let dx = -1; dx <= 1; dx += 2) {
                for (let dz = -1; dz <= 1; dz += 2) {
                    const cx = Math.floor((this.position.x + nextX) + dx * 0.3);
                    const cz = Math.floor(this.position.z + dz * 0.3);
                    for (let checkY = yMin; checkY <= yMax; checkY++) {
                        if (this.world.getBlock(cx, checkY, cz) !== 0) {
                            hasGround = true;
                            break;
                        }
                    }
                }
            }
            if (!hasGround) nextX = 0;
        }

        newPos.x += nextX;
        if (this.checkCollision(newPos)) {
            newPos.x = this.position.x;
        }

        newPos.y += this.velocity.y * deltaTime;
        if (this.checkCollision(newPos)) {
            if (this.velocity.y < 0) {
                this.onGround = true;
            }
            this.velocity.y = 0;
            newPos.y = this.position.y;
        } else {
            this.onGround = false;
        }

        // Move Z axis separately (apply sneak edge-stop lookup)
        let nextZ = this.velocity.z * deltaTime;
        if (isSneaking && nextZ !== 0) {
            let hasGround = false;
            const yMin = Math.floor(this.position.y - 0.9);
            const yMax = Math.floor(this.position.y - 0.1);
            for (let dx = -1; dx <= 1; dx += 2) {
                for (let dz = -1; dz <= 1; dz += 2) {
                    const cx = Math.floor(this.position.x + dx * 0.3);
                    const cz = Math.floor((this.position.z + nextZ) + dz * 0.3);
                    for (let checkY = yMin; checkY <= yMax; checkY++) {
                        if (this.world.getBlock(cx, checkY, cz) !== 0) {
                            hasGround = true;
                            break;
                        }
                    }
                }
            }
            if (!hasGround) nextZ = 0;
        }

        newPos.z += nextZ;
        if (this.checkCollision(newPos)) {
            newPos.z = this.position.z;
        }

        this.position.copy(newPos);

        // Clamp to world bounds
        if (this.position.y < 0) {
            const spawnY = this.world.getTerrainHeight ? this.world.getTerrainHeight(64, 64) + 15 : 75;
            this.position.set(64, spawnY, 64);
            this.velocity.set(0, 0, 0);
        }
        if (this.position.y > WORLD_HEIGHT) {
            this.position.y = WORLD_HEIGHT - 1;
        }
    }

    private checkCollision(pos: THREE.Vector3): boolean {
        // Check player bounding box (0.6 wide, 1.8 tall or 1.5 if sneaking)
        const halfWidth = 0.3;
        const footY = pos.y;
        const isSneaking = this.input.isKeyDown('ShiftLeft') && this.onGround;
        const headY = pos.y + (isSneaking ? 1.5 : 1.8);

        for (let dx = -1; dx <= 1; dx += 2) {
            for (let dz = -1; dz <= 1; dz += 2) {
                const checkX = Math.floor(pos.x + dx * halfWidth);
                const checkZ = Math.floor(pos.z + dz * halfWidth);

                for (let y = Math.floor(footY); y <= Math.floor(headY); y++) {
                    const block = this.world.getBlock(checkX, y, checkZ);
                    if (block !== 0) return true;
                }
            }
        }

        return false;
    }

    getState(): any {
        return {
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            yaw: this.yaw,
            pitch: this.pitch
        };
    }

    setState(data: any): void {
        if (data.position) {
            this.position.set(data.position.x, data.position.y, data.position.z);
            this.camera.position.copy(this.position);
            this.camera.position.y += CONFIG.playerHeight;
        }
        if (data.yaw !== undefined) this.yaw = data.yaw;
        if (data.pitch !== undefined) this.pitch = data.pitch;
        this.rotation.set(this.pitch, this.yaw, 0);
        this.camera.rotation.copy(this.rotation);
        this.velocity.set(0, 0, 0);
    }
}