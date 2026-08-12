import * as THREE from 'three';
import { World } from './World';
import { BlockType } from './types';

interface PathfinderNode {
    x: number;
    y: number;
    z: number;
    g: number; // path cost
    h: number; // heuristic cost
    f: number; // g + h
    parent: PathfinderNode | null;
}

export class AStarPathfinder {
    private world: World;

    constructor(world: World) {
        this.world = world;
    }

    // Finds a 3D path from start to end in voxel space.
    // Villagers can walk up +1 step and fall down up to -3 blocks.
    public findPath(start: THREE.Vector3, end: THREE.Vector3, maxIterations: number = 300): THREE.Vector3[] | null {
        const startX = Math.floor(start.x);
        const startY = Math.floor(start.y);
        const startZ = Math.floor(start.z);
        const endX = Math.floor(end.x);
        const endY = Math.floor(end.y);
        const endZ = Math.floor(end.z);

        // Make sure destination is walkable
        if (!this.isWalkableSpace(endX, endY, endZ)) {
            // Find nearest walkable block near end destination
            const nearest = this.findNearestWalkable(endX, endY, endZ);
            if (!nearest) return null;
            end.copy(nearest);
        }

        const openSet: PathfinderNode[] = [];
        const closedSet = new Set<string>();

        const startNode: PathfinderNode = {
            x: startX,
            y: startY,
            z: startZ,
            g: 0,
            h: this.heuristic(startX, startY, startZ, endX, endY, endZ),
            f: 0,
            parent: null,
        };
        startNode.f = startNode.h;
        openSet.push(startNode);

        let iterations = 0;

        while (openSet.length > 0) {
            iterations++;
            if (iterations > maxIterations) {
                break; // Limit path calculation to prevent lag spikes
            }

            // Find node with lowest f cost
            let currentIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[currentIdx].f) {
                    currentIdx = i;
                }
            }

            const current = openSet[currentIdx];

            // Reached destination!
            if (current.x === endX && current.y === endY && current.z === endZ) {
                return this.reconstructPath(current);
            }

            // Remove from open, add to closed
            openSet.splice(currentIdx, 1);
            closedSet.add(`${current.x},${current.y},${current.z}`);

            // Explore 3D Voxel neighbors (Horizontal 4-directions + jumping/falling)
            const directions = [
                { dx: 1, dz: 0 },
                { dx: -1, dz: 0 },
                { dx: 0, dz: 1 },
                { dx: 0, dz: -1 }
            ];

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const nz = current.z + dir.dz;
                
                // Villager can stand on nx, nz at heights:
                // Same height: current.y
                // Walk up: current.y + 1
                // Step down / Fall down: current.y - 1, current.y - 2, current.y - 3
                const possibleHeights = [current.y, current.y + 1, current.y - 1, current.y - 2, current.y - 3];

                for (const ny of possibleHeights) {
                    const nodeKey = `${nx},${ny},${nz}`;
                    if (closedSet.has(nodeKey)) continue;

                    // Walkability rules:
                    // 1. Must be a walkable standing height (ny)
                    // 2. Headroom check: Must not hit head (ny + 1 must be transparent)
                    // 3. For height jump/drop, check intervening blocks
                    if (!this.isValidTransition(current.x, current.y, current.z, nx, ny, nz)) {
                        continue;
                    }

                    const gCost = current.g + 1.0 + (ny > current.y ? 0.5 : 0.0); // Slight penalty for jumping up
                    const hCost = this.heuristic(nx, ny, nz, endX, endY, endZ);
                    const fCost = gCost + hCost;

                    const existingOpen = openSet.find(o => o.x === nx && o.y === ny && o.z === nz);
                    if (existingOpen) {
                        if (gCost < existingOpen.g) {
                            existingOpen.g = gCost;
                            existingOpen.f = fCost;
                            existingOpen.parent = current;
                        }
                    } else {
                        openSet.push({
                            x: nx,
                            y: ny,
                            z: nz,
                            g: gCost,
                            h: hCost,
                            f: fCost,
                            parent: current,
                        });
                    }
                }
            }
        }

        // Return best incomplete path if destination is blocked
        if (openSet.length > 0) {
            let bestNode = openSet[0];
            for (const node of openSet) {
                if (node.h < bestNode.h) {
                    bestNode = node;
                }
            }
            return this.reconstructPath(bestNode);
        }

        return null;
    }

    private heuristic(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
        // Manhattan distance heuristic in 3D Voxel grid
        return Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2);
    }

    private reconstructPath(endNode: PathfinderNode): THREE.Vector3[] {
        const path: THREE.Vector3[] = [];
        let curr: PathfinderNode | null = endNode;
        while (curr !== null) {
            path.unshift(new THREE.Vector3(curr.x + 0.5, curr.y + 0.1, curr.z + 0.5));
            curr = curr.parent;
        }
        return path;
    }

    // Helper to check if a single node satisfies standing space requirements
    private isWalkableSpace(x: number, y: number, z: number): boolean {
        const feetBlock = this.world.getBlock(x, y, z);
        const bodyBlock = this.world.getBlock(x, y + 1, z);
        const headBlock = this.world.getBlock(x, y + 2, z);

        // Stand block under feet must be solid (not AIR/WATER/LAVA)
        const isFeetSolid = feetBlock !== BlockType.AIR && feetBlock !== BlockType.WATER && feetBlock !== BlockType.LAVA;
        
        // Body and head space must be transparent (AIR or non-solid like grass/torch)
        const isBodyClear = bodyBlock === BlockType.AIR || bodyBlock === BlockType.WATER;
        const isHeadClear = headBlock === BlockType.AIR || headBlock === BlockType.WATER;

        return isFeetSolid && isBodyClear && isHeadClear;
    }

    // Validates a 3D transition from current voxel to neighbor voxel
    private isValidTransition(cx: number, cy: number, cz: number, nx: number, ny: number, nz: number): boolean {
        // 1. Destination must be walkable
        if (!this.isWalkableSpace(nx, ny, nz)) {
            return false;
        }

        // 2. Jump clearance: If stepping up (+1), current head space (cy + 2) and target height (ny + 1) must be transparent
        if (ny > cy) {
            const currentHeadClear = this.world.getBlock(cx, cy + 2, cz) === BlockType.AIR;
            const targetHeadClear = this.world.getBlock(nx, ny + 1, nz) === BlockType.AIR;
            if (!currentHeadClear || !targetHeadClear) return false;
        }

        // 3. Fall clearance: If falling down (-2 or -3), make sure there are no solid overhangs block in the middle
        if (ny < cy) {
            for (let y = cy; y > ny; y--) {
                const midBlock = this.world.getBlock(nx, y, nz);
                if (midBlock !== BlockType.AIR && midBlock !== BlockType.WATER) {
                    return false; // Solid block blocking the fall path
                }
            }
        }

        return true;
    }

    private findNearestWalkable(x: number, y: number, z: number): THREE.Vector3 | null {
        // Scans surrounding vertical column for closest walkable coordinate
        const scanRange = 4;
        for (let dy = 0; dy <= scanRange; dy++) {
            // Check down first (preferred)
            if (this.isWalkableSpace(x, y - dy, z)) {
                return new THREE.Vector3(x + 0.5, y - dy + 0.1, z + 0.5);
            }
            // Check up
            if (this.isWalkableSpace(x, y + dy, z)) {
                return new THREE.Vector3(x + 0.5, y + dy + 0.1, z + 0.5);
            }
        }
        return null;
    }
}
