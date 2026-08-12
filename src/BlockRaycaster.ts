import * as THREE from 'three';
import { BlockType, BlockFace, RaycastResult } from './types';
import { CONFIG } from './constants';
import { World } from './World';

export class BlockRaycaster {
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    cast(camera: THREE.PerspectiveCamera, screenX?: number, screenY?: number): RaycastResult | null {
        const raycaster = new THREE.Raycaster();
        raycaster.far = CONFIG.reachDistance;

        if (screenX !== undefined && screenY !== undefined) {
            // Use screen coordinates (for cursor mode)
            const ndc = new THREE.Vector2(
                screenX * 2 - 1,
                -(screenY * 2 - 1)
            );
            raycaster.setFromCamera(ndc, camera);
        } else {
            // Use camera center (for game mode)
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        }

        const meshes = this.world.getChunkMeshes();
        const intersects = raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Push the hit point inward by exactly half a block 
            // to ensure Math.floor absolutely resolves to the center of the solid block.
            const blockX = Math.floor(hit.point.x - hit.face!.normal.x * 0.5);
            const blockY = Math.floor(hit.point.y - hit.face!.normal.y * 0.5);
            const blockZ = Math.floor(hit.point.z - hit.face!.normal.z * 0.5);

            const face = this.getFaceFromNormal(hit.face!.normal);

            return {
                position: { x: blockX, y: blockY, z: blockZ },
                face,
                normal: { x: hit.face!.normal.x, y: hit.face!.normal.y, z: hit.face!.normal.z },
                distance: hit.distance,
                exactHitPoint: hit.point,
            };
        }

        return null;
    }

    private getFaceFromNormal(normal: THREE.Vector3): BlockFace {
        if (normal.y > 0.5) return BlockFace.TOP;
        if (normal.y < -0.5) return BlockFace.BOTTOM;
        if (normal.z < -0.5) return BlockFace.NORTH;
        if (normal.z > 0.5) return BlockFace.SOUTH;
        if (normal.x > 0.5) return BlockFace.EAST;
        return BlockFace.WEST;
    }
}