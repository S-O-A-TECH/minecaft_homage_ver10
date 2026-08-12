import * as THREE from 'three';
import { ItemType, BlockType } from './types';
import { World } from './World';

export class ItemEntity {
    public id: string;
    public itemType: ItemType;
    public count: number;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public mesh: THREE.Group;
    public isSettled: boolean = false;
    public despawnTimer: number = 0;
    public isBeingAttracted: boolean = false;

    private static colorMap: Record<number, number> = {
        [ItemType.DIRT_BLOCK]: 0x865439,
        [ItemType.STONE_BLOCK]: 0x808080,
        [ItemType.WOOD_BLOCK]: 0x5e3a24,
        [ItemType.PLANKS_BLOCK]: 0xbd8b72,
        [ItemType.COBBLESTONE_BLOCK]: 0x6e6e6e,
        [ItemType.FURNACE_BLOCK]: 0x424242,
        [ItemType.CAMPFIRE_BLOCK]: 0xd35400,
        [ItemType.TORCH_BLOCK]: 0xf1c40f,
        [ItemType.APPLE]: 0xc0392b,
        [ItemType.BAKED_APPLE]: 0xe67e22,
        [ItemType.STICK]: 0xd3a25d,
        [ItemType.COAL]: 0x2c3e50,
        [ItemType.IRON_INGOT]: 0xd5dbdb,
        [ItemType.GOLD_INGOT]: 0xf39c12,
        [ItemType.DIAMOND]: 0x3498db,
        [ItemType.WOODEN_PICKAXE]: 0xa04000,
        [ItemType.STONE_PICKAXE]: 0x7f8c8d,
        [ItemType.IRON_PICKAXE]: 0xbdc3c7,
        [ItemType.DIAMOND_PICKAXE]: 0x2980b9,
    };

    constructor(itemType: ItemType, count: number, startPos: THREE.Vector3) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.itemType = itemType;
        this.count = count;
        this.position = startPos.clone();
        
        // Random ejection velocity: upwards and slightly outwards
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * (Math.PI * 0.2) + (Math.PI * 0.15); // angle from horizontal
        const speed = Math.random() * 3.0 + 2.5; // 2.5 to 5.5 m/s

        this.velocity = new THREE.Vector3(
            speed * Math.cos(phi) * Math.cos(theta),
            speed * Math.sin(phi),
            speed * Math.cos(phi) * Math.sin(theta)
        );

        this.mesh = new THREE.Group();
        this.buildMesh();
    }

    private buildMesh(): void {
        const color = ItemEntity.colorMap[this.itemType] ?? 0x1abc9c;
        
        // Mini block model
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
        });
        const innerMesh = new THREE.Mesh(geometry, material);
        innerMesh.castShadow = true;
        innerMesh.receiveShadow = true;
        
        this.mesh.add(innerMesh);
        this.mesh.position.copy(this.position);
    }

    private isSolidBlock(type: BlockType): boolean {
        return type !== BlockType.AIR && type !== BlockType.WATER;
    }

    public update(deltaTime: number, world: World, playerPos: THREE.Vector3): void {
        this.despawnTimer += deltaTime;

        // Calculate distance to player
        const distToPlayer = this.position.distanceTo(playerPos);

        // Vacuum attraction mechanism
        if (distToPlayer <= 1.8) {
            this.isBeingAttracted = true;
            this.isSettled = false;

            // Accelerate towards player's center (approx eye height - 0.5)
            const targetPos = playerPos.clone();
            targetPos.y += 0.5; // pull to chest
            const direction = new THREE.Vector3().subVectors(targetPos, this.position);
            const distance = direction.length();
            
            if (distance > 0.01) {
                direction.normalize();
                // Sucking force increases exponentially as it gets closer
                const acceleration = 6.2 * Math.pow(1.8 / Math.max(0.1, distance), 1.8);
                this.velocity.copy(direction).multiplyScalar(acceleration);
            }
        } else {
            this.isBeingAttracted = false;
        }

        if (!this.isSettled) {
            if (!this.isBeingAttracted) {
                // Apply normal gravity (18 m/s^2)
                this.velocity.y -= 18.0 * deltaTime;

                // Apply horizontal air resistance
                this.velocity.x *= Math.exp(-0.6 * deltaTime);
                this.velocity.z *= Math.exp(-0.6 * deltaTime);
            }

            // Update position
            this.position.addScaledVector(this.velocity, deltaTime);

            if (!this.isBeingAttracted) {
                // Voxel ground collision check
                const checkX = Math.floor(this.position.x);
                const checkY = Math.floor(this.position.y - 0.1); // check slightly below center
                const checkZ = Math.floor(this.position.z);
                const blockUnder = world.getBlock(checkX, checkY, checkZ);

                if (this.isSolidBlock(blockUnder)) {
                    // Snap to top of the solid block
                    this.position.y = checkY + 1.1; // 1.0 (block height) + 0.1 (offset)
                    
                    // Bounce
                    if (this.velocity.y < -0.5) {
                        this.velocity.y = -0.45 * this.velocity.y;
                        this.velocity.x *= 0.55;
                        this.velocity.z *= 0.55;
                    } else {
                        // Fully settled
                        this.velocity.set(0, 0, 0);
                        this.isSettled = true;
                    }
                }
            }
        }

        // Apply animations
        if (this.isSettled) {
            // Hover animation (sine wave)
            const hoverOffset = 0.06 * Math.sin(Date.now() * 0.003);
            this.mesh.position.copy(this.position);
            this.mesh.position.y += hoverOffset;
        } else {
            this.mesh.position.copy(this.position);
        }

        // Constant spinning animation
        this.mesh.rotation.y += 2.5 * deltaTime;
    }

    public destroy(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        
        // Traverse and dispose geometries and materials
        this.mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}
