import * as THREE from 'three';
import { BlockType, BlockFace, RaycastResult } from './types';
import { CONFIG } from './constants';
import { World } from './World';

export class BlockRaycaster {
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    cast(camera: THREE.PerspectiveCamera): RaycastResult | null {
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        direction.normalize();

        const origin = camera.position.clone();
        const maxDistance = CONFIG.reachDistance;
        const step = 0.05;

        let distance = 0;
        let lastBlockPos: THREE.Vector3 | null = null;

        while (distance < maxDistance) {
            const point = origin.clone().add(direction.clone().multiplyScalar(distance));
            const blockX = Math.floor(point.x);
            const blockY = Math.floor(point.y);
            const blockZ = Math.floor(point.z);

            const block = this.world.getBlock(blockX, blockY, blockZ);

            if (block !== BlockType.AIR) {
                // Found a block - calculate which face was hit
                const face = this.calculateFace(point, blockX, blockY, blockZ);
                const normal = this.getFaceNormal(face);

                return {
                    position: { x: blockX, y: blockY, z: blockZ },
                    face,
                    normal: { x: normal[0], y: normal[1], z: normal[2] },
                    distance,
                };
            }

            lastBlockPos = new THREE.Vector3(blockX, blockY, blockZ);
            distance += step;
        }

        return null;
    }

    private calculateFace(point: THREE.Vector3, bx: number, by: number, bz: number): BlockFace {
        const dx = point.x - bx;
        const dy = point.y - by;
        const dz = point.z - bz;

        // Calculate distances to each face
        const distTop = 1 - dy;
        const distBottom = dy;
        const distNorth = dz;
        const distSouth = 1 - dz;
        const distEast = 1 - dx;
        const distWest = dx;

        const minDist = Math.min(distTop, distBottom, distNorth, distSouth, distEast, distWest);

        if (minDist === distTop) return BlockFace.TOP;
        if (minDist === distBottom) return BlockFace.BOTTOM;
        if (minDist === distNorth) return BlockFace.NORTH;
        if (minDist === distSouth) return BlockFace.SOUTH;
        if (minDist === distEast) return BlockFace.EAST;
        return BlockFace.WEST;
    }

    private getFaceNormal(face: BlockFace): [number, number, number] {
        switch (face) {
            case BlockFace.TOP: return [0, 1, 0];
            case BlockFace.BOTTOM: return [0, -1, 0];
            case BlockFace.NORTH: return [0, 0, -1];
            case BlockFace.SOUTH: return [0, 0, 1];
            case BlockFace.EAST: return [1, 0, 0];
            case BlockFace.WEST: return [-1, 0, 0];
        }
    }
}