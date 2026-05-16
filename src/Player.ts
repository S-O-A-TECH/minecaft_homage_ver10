import * as THREE from 'three';
import { InputManager } from './InputManager';
import { CONFIG, WORLD_HEIGHT } from './constants';
import { World } from './World';

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

    constructor(camera: THREE.PerspectiveCamera, input: InputManager, world: World) {
        this.camera = camera;
        this.input = input;
        this.world = world;
        this.position = new THREE.Vector3(0, 80, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        this.camera.position.copy(this.position);
        this.camera.position.y += CONFIG.playerHeight;
    }

    update(deltaTime: number): void {
        // Mouse look (only in game mode with pointer locked)
        if (this.input.gameMode === 'game' && this.input.isPointerLocked) {
            const { dx, dy } = this.input.consumeMouseMovement();
            this.yaw -= dx * this.mouseSensitivity;
            this.pitch -= dy * this.mouseSensitivity;
            this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
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

        const speed = this.input.isKeyDown('ShiftLeft') ? CONFIG.playerSpeed * 1.5 : CONFIG.playerSpeed;
        const horizontalVelocity = moveDir.multiplyScalar(speed);

        // Gravity
        if (!this.onGround) {
            this.velocity.y -= CONFIG.gravity * deltaTime;
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

        // Collision detection and position update
        this.moveWithCollision(deltaTime);

        // Update camera
        this.camera.position.copy(this.position);
        this.camera.position.y += CONFIG.playerHeight;
    }

    private moveWithCollision(deltaTime: number): void {
        const newPos = this.position.clone();

        // Move each axis separately for collision
        newPos.x += this.velocity.x * deltaTime;
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

        newPos.z += this.velocity.z * deltaTime;
        if (this.checkCollision(newPos)) {
            newPos.z = this.position.z;
        }

        this.position.copy(newPos);

        // Clamp to world bounds
        if (this.position.y < 0) {
            this.position.y = 80;
            this.velocity.y = 0;
        }
        if (this.position.y > WORLD_HEIGHT) {
            this.position.y = WORLD_HEIGHT - 1;
        }
    }

    private checkCollision(pos: THREE.Vector3): boolean {
        // Check player bounding box (0.6 wide, 1.8 tall)
        const halfWidth = 0.3;
        const footY = pos.y;
        const headY = pos.y + 1.8;

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
}