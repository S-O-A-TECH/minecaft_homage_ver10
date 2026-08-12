import { World } from './World';
import { BlockType } from './types';

interface FlowNode {
    x: number;
    y: number;
    z: number;
    blockType: BlockType.WATER | BlockType.LAVA;
    level: number;
}

export class LiquidSimulator {
    private world: World;
    private activeFlows: Set<string> = new Set();

    constructor(world: World) {
        this.world = world;
    }

    private makeKey(x: number, y: number, z: number): string {
        return `${x},${y},${z}`;
    }

    /**
     * Scans the world boundaries around the player and schedules liquid ticks.
     * We limit the scan boundary to loaded chunks around the player to maintain solid performance.
     */
    public update(deltaTime: number, playerX: number, playerZ: number): void {
        // Run a cellular automata update step
        this.tickFlowStep(playerX, playerZ);
    }

    private tickFlowStep(playerX: number, playerZ: number): void {
        const radius = 48; // scan radius around player (approx render distance)
        const minX = Math.floor(playerX - radius);
        const maxX = Math.floor(playerX + radius);
        const minZ = Math.floor(playerZ - radius);
        const maxZ = Math.floor(playerZ + radius);

        const currentLiquids: FlowNode[] = [];
        const nextLiquidsMap: Map<string, FlowNode> = new Map();

        // 1. Scan loaded grid region for existing water or lava blocks
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                // Read height of terrain to focus only on active Y-levels
                for (let y = 1; y < 120; y++) {
                    const block = this.world.getBlock(x, y, z);
                    if (block === BlockType.WATER || block === BlockType.LAVA) {
                        let level = this.world.getLiquidLevel(x, y, z);
                        // If it's a solid fluid but level is 0, it means it is a source block (Level 8)
                        if (level === 0) {
                            level = 8;
                            this.world.setLiquidLevel(x, y, z, 8);
                        }
                        currentLiquids.push({ x, y, z, blockType: block, level });
                    }
                }
            }
        }

        // Sort descending by height (Y) then level to simulate flows from top to bottom
        currentLiquids.sort((a, b) => b.y - a.y || b.level - a.level);

        // Track blocks that are scheduled for cleaning (changed to air or solid)
        const nextBlockStates: Map<string, { type: BlockType; level: number }> = new Map();

        // Helper to check if a block can be flowed into
        const isFlowable = (type: BlockType): boolean => {
            return type === BlockType.AIR || type === BlockType.WATER || type === BlockType.LAVA;
        };

        // 2. Process each active liquid node
        for (const node of currentLiquids) {
            const { x, y, z, blockType, level } = node;
            const key = this.makeKey(x, y, z);

            // If this node is already scheduled to be overwritten by a higher priority flow (e.g. lava/water reaction), skip
            if (nextBlockStates.has(key) && nextBlockStates.get(key)!.type !== blockType) {
                continue;
            }

            // A. Check directly below (vertical descent)
            const belowY = y - 1;
            const belowBlock = this.world.getBlock(x, belowY, z);
            const belowKey = this.makeKey(x, belowY, z);

            // Handle chemical reaction between water and lava
            if (
                (blockType === BlockType.WATER && belowBlock === BlockType.LAVA) ||
                (blockType === BlockType.LAVA && belowBlock === BlockType.WATER)
            ) {
                const belowLevel = this.world.getLiquidLevel(x, belowY, z);
                const reactionType = (level === 8 || belowLevel === 8) ? BlockType.STONE : BlockType.COBBLESTONE;
                nextBlockStates.set(belowKey, { type: reactionType, level: 0 });
                continue;
            }

            if (belowY > 0 && isFlowable(belowBlock)) {
                // If it can fall, it falls with full Level 8 source power (per spec: no decay during vertical fall)
                if (belowBlock !== blockType || this.world.getLiquidLevel(x, belowY, z) < 8) {
                    nextBlockStates.set(belowKey, { type: blockType, level: 8 });
                    // Flow is resolved vertically, skip horizontal spread on this node for this frame
                    continue;
                }
            }

            // B. Horizontal dispersion (Water decays by 1, Lava decays by 2)
            const decay = blockType === BlockType.WATER ? 1 : 2;
            const nextLevel = level - decay;

            if (nextLevel > 0) {
                const neighbors = [
                    { nx: x + 1, nz: z },
                    { nx: x - 1, nz: z },
                    { nx: x, nz: z + 1 },
                    { nx: x, nz: z - 1 }
                ];

                for (const neigh of neighbors) {
                    const { nx, nz } = neigh;
                    const nBlock = this.world.getBlock(nx, y, nz);
                    const nKey = this.makeKey(nx, y, nz);

                    // Chemistry check
                    if (
                        (blockType === BlockType.WATER && nBlock === BlockType.LAVA) ||
                        (blockType === BlockType.LAVA && nBlock === BlockType.WATER)
                    ) {
                        const nLevel = this.world.getLiquidLevel(nx, y, nz);
                        const reactionType = (level === 8 || nLevel === 8) ? BlockType.STONE : BlockType.COBBLESTONE;
                        nextBlockStates.set(nKey, { type: reactionType, level: 0 });
                        continue;
                    }

                    if (isFlowable(nBlock)) {
                        const currentNeighLevel = this.world.getLiquidLevel(nx, y, nz);
                        const currentNeighType = this.world.getBlock(nx, y, nz);

                        // Spread if the target is air, or a weaker fluid of the same type
                        if (
                            currentNeighType === BlockType.AIR ||
                            (currentNeighType === blockType && currentNeighLevel < nextLevel)
                        ) {
                            nextBlockStates.set(nKey, { type: blockType, level: nextLevel });
                        }
                    }
                }
            }
        }

        // 3. Apply state changes
        for (const [posKey, state] of nextBlockStates.entries()) {
            const [x, y, z] = posKey.split(',').map(Number);
            const currentBlock = this.world.getBlock(x, y, z);
            
            // Only update if it actually changes the block or water level
            if (currentBlock !== state.type || this.world.getLiquidLevel(x, y, z) !== state.level) {
                this.world.setBlock(x, y, z, state.type);
                this.world.setLiquidLevel(x, y, z, state.level);
            }
        }

        // 4. Dynamic evaporation: scan and evaporate flowing nodes that have no feeding source block
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                for (let y = 1; y < 120; y++) {
                    const block = this.world.getBlock(x, y, z);
                    if ((block === BlockType.WATER || block === BlockType.LAVA)) {
                        const level = this.world.getLiquidLevel(x, y, z);
                        if (level < 8) {
                            // Flowing blocks must have at least one neighbor or top block feeding them
                            let hasSource = false;
                            const neighbors = [
                                { nx: x, ny: y + 1, nz: z }, // top block
                                { nx: x + 1, ny: y, nz: z },
                                { nx: x - 1, ny: y, nz: z },
                                { nx: x, ny: y, nz: z + 1 },
                                { nx: x, ny: y, nz: z - 1 }
                            ];

                            for (const n of neighbors) {
                                const nBlock = this.world.getBlock(n.nx, n.ny, n.nz);
                                if (nBlock === block) {
                                    const nLevel = this.world.getLiquidLevel(n.nx, n.ny, n.nz);
                                    // Top block can feed with level 8, neighbors must have higher level than current
                                    if (n.ny > y || nLevel > level) {
                                        hasSource = true;
                                        break;
                                    }
                                }
                            }

                            if (!hasSource) {
                                // No feeding source, evaporate/dampen level
                                const nextL = level - 1;
                                if (nextL <= 0) {
                                    this.world.setBlock(x, y, z, BlockType.AIR);
                                    this.world.setLiquidLevel(x, y, z, 0);
                                } else {
                                    this.world.setLiquidLevel(x, y, z, nextL);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
