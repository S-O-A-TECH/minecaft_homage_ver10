import * as THREE from 'three';
import { MobEntity } from './MobEntity';
import { World } from './World';
import { MobType, BlockType } from './types';
import { BlockParticles } from './BlockParticles';

export class CreeperEntity extends MobEntity {
    public isFusing: boolean = false;
    private fuseTimer: number = 0;
    private particles: BlockParticles;

    constructor(id: string, startPos: THREE.Vector3, world: World, particles: BlockParticles) {
        // Max HP: 20, Speed: 2.7, Damage: 0 (Creeper deals explosion damage, not contact damage)
        super(id, MobType.CREEPER, startPos, world, 20, 2.7, 0);
        this.particles = particles;
        this.buildMesh();
    }

    private buildMesh(): void {
        // Head
        const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 }); // green
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 0.75, 0);
        head.castShadow = true;
        this.mesh.add(head);

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.35, 0.6, 0.2);
        const torsoMat = new THREE.MeshLambertMaterial({ color: 0x388e3c }); // dark green
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.set(0, 0.2, 0);
        torso.castShadow = true;
        this.mesh.add(torso);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.16, 0.3, 0.16);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
        
        const flLeg = new THREE.Mesh(legGeo, legMat);
        flLeg.position.set(-0.14, -0.25, 0.12);
        flLeg.castShadow = true;
        this.mesh.add(flLeg);

        const frLeg = new THREE.Mesh(legGeo, legMat);
        frLeg.position.set(0.14, -0.25, 0.12);
        frLeg.castShadow = true;
        this.mesh.add(frLeg);

        const blLeg = new THREE.Mesh(legGeo, legMat);
        blLeg.position.set(-0.14, -0.25, -0.12);
        blLeg.castShadow = true;
        this.mesh.add(blLeg);

        const brLeg = new THREE.Mesh(legGeo, legMat);
        brLeg.position.set(0.14, -0.25, -0.12);
        brLeg.castShadow = true;
        this.mesh.add(brLeg);
    }

    public update(
        deltaTime: number,
        playerPos: THREE.Vector3,
        scene: THREE.Scene,
        activeMobs: MobEntity[],
        triggerPlayerDamageCallback?: (amount: number) => void
    ): void {
        if (this.isDead) return;

        this.updateHurtFlash(deltaTime);

        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
        const dist = toPlayer.length();

        // 1. Proximity fuse check (within 3 meters)
        if (dist <= 3.0) {
            this.isFusing = true;
            this.velocity.set(0, this.velocity.y, 0); // stop moving when fusing

            // Flash white body
            this.fuseTimer += deltaTime;
            const flash = Math.sin(this.fuseTimer * 20.0) > 0;
            this.setFuseFlashColor(flash);

            if (this.fuseTimer >= 1.5) {
                this.explode(scene, playerPos, triggerPlayerDamageCallback);
            }
        } else {
            // If player escapes > 4.0 meters, reset fuse!
            if (dist > 4.0 && this.isFusing) {
                this.isFusing = false;
                this.fuseTimer = 0;
                this.setFuseFlashColor(false);
            }

            if (!this.isFusing) {
                if (dist <= 16.0) {
                    // Face the player
                    const angle = Math.atan2(toPlayer.x, toPlayer.z);
                    this.mesh.rotation.y = angle;

                    // Move towards player
                    toPlayer.y = 0;
                    toPlayer.normalize();
                    this.velocity.x = toPlayer.x * this.speed;
                    this.velocity.z = toPlayer.z * this.speed;
                } else {
                    // Idle
                    this.velocity.x = 0;
                    this.velocity.z = 0;
                }
            }
        }

        // Apply physical movement and collision
        this.moveWithCollision(deltaTime);
    }

    private setFuseFlashColor(isWhite: boolean): void {
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshLambertMaterial;
                if (mat) {
                    if (isWhite) {
                        if (!mat.userData.originalColor) {
                            mat.userData.originalColor = mat.color.clone();
                        }
                        mat.color.setHex(0xffffff); // extreme white flash
                    } else if (mat.userData.originalColor) {
                        mat.color.copy(mat.userData.originalColor as THREE.Color);
                    }
                }
            }
        });
    }

    private explode(
        scene: THREE.Scene,
        playerPos: THREE.Vector3,
        triggerPlayerDamageCallback?: (amount: number) => void
    ): void {
        this.isDead = true;

        // Voxel spherical crater destruction (Radius: 3m)
        const radius = 3;
        const cx = Math.floor(this.position.x);
        const cy = Math.floor(this.position.y + 0.5);
        const cz = Math.floor(this.position.z);

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    const tx = cx + dx;
                    const ty = cy + dy;
                    const tz = cz + dz;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq <= radius * radius && ty > 0 && ty < 120) {
                        const targetBlock = this.world.getBlock(tx, ty, tz);
                        if (targetBlock !== 0 && targetBlock !== 7 && targetBlock !== 28) {
                            this.world.setBlock(tx, ty, tz, BlockType.AIR);
                            // Spawn explosion smoke/block particles
                            if (Math.random() < 0.3) {
                                this.particles.spawn(tx, ty, tz, targetBlock);
                            }
                        }
                    }
                }
            }
        }

        // AOE player damage based on distance r
        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
        const r = toPlayer.length();
        if (r <= 4.0 && triggerPlayerDamageCallback) {
            const damage = Math.floor((4.0 - r) * 8.0);
            if (damage > 0) {
                triggerPlayerDamageCallback(damage);
            }
        }

        // Disposes mesh and textures
        this.dispose(scene);
    }
}
