import * as THREE from 'three';
import { BlockType, ItemType } from './types';
import { World } from './World';
import { ItemEntity } from './ItemEntity';
import { BLOCK_TO_ITEM } from './constants';

export class FallingBlockEntity {
    public id: string;
    public blockType: BlockType;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public mesh: THREE.Mesh;
    public isFinished: boolean = false;

    constructor(blockType: BlockType, startPos: THREE.Vector3) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.blockType = blockType;
        // Snap to grid coordinates horizontally, float vertically
        this.position = new THREE.Vector3(
            Math.floor(startPos.x) + 0.5,
            startPos.y,
            Math.floor(startPos.z) + 0.5
        );
        this.velocity = new THREE.Vector3(0, 0, 0);

        // Build box geometry matching Sand or Gravel texture/color
        const color = blockType === BlockType.SAND ? 0xe2c481 : 0x8a8a8a;
        const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98); // Slightly inset to prevent face z-fighting during descent
        const material = new THREE.MeshLambertMaterial({
            color: color,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }

    public update(
        deltaTime: number,
        world: World,
        scene: THREE.Scene,
        playerPos: THREE.Vector3,
        triggerDamageCallback: (amount: number) => void,
        spawnItemEntityCallback: (itemEntity: ItemEntity) => void
    ): void {
        if (this.isFinished) return;

        // Apply gravity acceleration: 32 m/s^2 (per spec: g = 32.0 m/s^2)
        this.velocity.y -= 32.0 * deltaTime;
        this.position.addScaledVector(this.velocity, deltaTime);
        this.mesh.position.copy(this.position);

        // Suffocation check: if player intersects this falling block's volume
        const distToPlayerH = Math.sqrt(Math.pow(this.position.x - playerPos.x, 2) + Math.pow(this.position.z - playerPos.z, 2));
        const distToPlayerV = Math.abs(this.position.y - (playerPos.y + 0.9)); // check against player center/chest height
        if (distToPlayerH < 0.6 && distToPlayerV < 0.9) {
            // Inflict suffocation damage (e.g. 15 HP/second)
            triggerDamageCallback(15 * deltaTime);
        }

        // Collision logic
        const checkX = Math.floor(this.position.x);
        const checkY = Math.floor(this.position.y - 0.5); // check directly underneath bottom face
        const checkZ = Math.floor(this.position.z);

        const belowBlock = world.getBlock(checkX, checkY, checkZ);

        if (belowBlock !== BlockType.AIR && belowBlock !== BlockType.WATER && belowBlock !== BlockType.LAVA) {
            this.isFinished = true;

            // Remove mesh from scene
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else {
                this.mesh.material.dispose();
            }

            if (belowBlock === BlockType.TORCH) {
                // Landed on a torch -> split sand into collectable ItemEntity stack
                const itemType = BLOCK_TO_ITEM[this.blockType] ?? ItemType.DIRT_BLOCK;
                const dropPos = new THREE.Vector3(checkX + 0.5, checkY + 1.2, checkZ + 0.5);
                const drop = new ItemEntity(itemType, 1, dropPos);
                spawnItemEntityCallback(drop);
            } else {
                // Landed on solid ground -> snap and restore static voxel block
                const targetY = checkY + 1;
                if (targetY < 256) {
                    world.setBlock(checkX, targetY, checkZ, this.blockType);
                }
            }
        }
    }
}
