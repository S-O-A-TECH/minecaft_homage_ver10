import * as THREE from 'three';
import { World } from './World';
import { MobType } from './types';

export abstract class MobEntity {
    public id: string;
    public type: MobType;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public mesh: THREE.Group;
    public hp: number;
    public maxHp: number;
    public speed: number;
    public damage: number;
    public isDead: boolean = false;
    public onGround: boolean = false;

    // Red flash timer when hit
    protected hurtTimer: number = 0;
    protected world: World;
    protected width: number = 0.6;
    protected height: number = 1.8;

    constructor(
        id: string,
        type: MobType,
        startPos: THREE.Vector3,
        world: World,
        maxHp: number,
        speed: number,
        damage: number
    ) {
        this.id = id;
        this.type = type;
        this.position = startPos.clone();
        this.world = world;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.speed = speed;
        this.damage = damage;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);
    }

    public abstract update(deltaTime: number, playerPos: THREE.Vector3, scene: THREE.Scene, activeMobs: MobEntity[]): void;

    /**
     * Applies damage and registers 3D knockback.
     */
    public takeDamage(amount: number, knockbackDir?: THREE.Vector3): void {
        if (this.isDead) return;
        this.hp -= amount;
        this.hurtTimer = 0.4; // Flash red for 0.4 seconds

        if (knockbackDir) {
            // Apply horizontal and slight upward 3D knockback
            this.velocity.x += knockbackDir.x * 6.0;
            this.velocity.z += knockbackDir.z * 6.0;
            this.velocity.y += 4.5;
        }

        if (this.hp <= 0) {
            this.isDead = true;
        }
    }

    protected moveWithCollision(deltaTime: number): void {
        // Apply gravity acceleration: 20 m/s^2 downwards
        this.velocity.y -= 20.0 * deltaTime;
        
        // Clamp terminal velocity
        this.velocity.y = Math.max(-40.0, this.velocity.y);

        const newPos = this.position.clone();

        // 1. Move X axis
        newPos.x += this.velocity.x * deltaTime;
        if (this.checkCollision(newPos)) {
            newPos.x = this.position.x;
            this.velocity.x = 0;
            
            // Auto jump over 1-block hurdles
            if (this.onGround) {
                this.velocity.y = 5.5;
            }
        }

        // 2. Move Y axis
        newPos.y += this.velocity.y * deltaTime;
        if (this.checkCollision(newPos)) {
            if (this.velocity.y < 0) {
                this.onGround = true;
            }
            newPos.y = this.position.y;
            this.velocity.y = 0;
        } else {
            this.onGround = false;
        }

        // 3. Move Z axis
        newPos.z += this.velocity.z * deltaTime;
        if (this.checkCollision(newPos)) {
            newPos.z = this.position.z;
            this.velocity.z = 0;
            
            // Auto jump over 1-block hurdles
            if (this.onGround) {
                this.velocity.y = 5.5;
            }
        }

        this.position.copy(newPos);
        this.mesh.position.copy(this.position);

        // Apply ground/air friction
        const friction = this.onGround ? 8.0 : 1.5;
        this.velocity.x -= this.velocity.x * friction * deltaTime;
        this.velocity.z -= this.velocity.z * friction * deltaTime;
    }

    protected checkCollision(pos: THREE.Vector3): boolean {
        const halfWidth = this.width / 2;
        const footY = pos.y;
        const headY = pos.y + this.height;

        for (let dx = -1; dx <= 1; dx += 2) {
            for (let dz = -1; dz <= 1; dz += 2) {
                const checkX = Math.floor(pos.x + dx * halfWidth);
                const checkZ = Math.floor(pos.z + dz * halfWidth);

                for (let y = Math.floor(footY); y <= Math.floor(headY); y++) {
                    const block = this.world.getBlock(checkX, y, checkZ);
                    // Collide with solid blocks (exclude Air = 0, Water = 7, Lava = 28, Torch = 19)
                    if (block !== 0 && block !== 7 && block !== 28 && block !== 19) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    protected updateHurtFlash(deltaTime: number): void {
        if (this.hurtTimer > 0) {
            this.hurtTimer -= deltaTime;
            this.setHurtColor(true);
        } else {
            this.setHurtColor(false);
        }
    }

    protected setHurtColor(isHurt: boolean): void {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshLambertMaterial;
                if (mat) {
                    if (isHurt) {
                        if (!mat.userData.originalColor) {
                            mat.userData.originalColor = mat.color.clone();
                        }
                        mat.color.setHex(0xff4444); // Flash red
                    } else if (mat.userData.originalColor) {
                        mat.color.copy(mat.userData.originalColor as THREE.Color);
                    }
                }
            }
        });
    }

    public dispose(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}
