import { BlockType } from './types';

export interface BlockTemplate {
    dx: number;
    dy: number;
    dz: number;
    blockType: BlockType;
}

// 1. 우물 (3x3 Base, 4 Pillars, 3x3 Planks Roof, Water core)
export const WELL_TEMPLATE: BlockTemplate[] = [
    // Layer 0 (Base & Water)
    { dx: -1, dy: -1, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: -1, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: -1, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: -1, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: -1, dz: 0, blockType: BlockType.WATER },
    { dx: 1, dy: -1, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: -1, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: -1, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: -1, dz: 1, blockType: BlockType.COBBLESTONE },

    // Layer 1 (Rim)
    { dx: -1, dy: 0, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: 0, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 0, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 0, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: 0, dz: 0, blockType: BlockType.WATER },
    { dx: 1, dy: 0, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 0, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: 0, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 0, dz: 1, blockType: BlockType.COBBLESTONE },

    // Layer 2 & 3 (Pillars)
    { dx: -1, dy: 1, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 2, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 1, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 2, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 1, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 2, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 1, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 2, dz: 1, blockType: BlockType.COBBLESTONE },

    // Layer 4 (Roof)
    { dx: -1, dy: 3, dz: -1, blockType: BlockType.PLANKS },
    { dx: 0, dy: 3, dz: -1, blockType: BlockType.PLANKS },
    { dx: 1, dy: 3, dz: -1, blockType: BlockType.PLANKS },
    { dx: -1, dy: 3, dz: 0, blockType: BlockType.PLANKS },
    { dx: 0, dy: 3, dz: 0, blockType: BlockType.PLANKS },
    { dx: 1, dy: 3, dz: 0, blockType: BlockType.PLANKS },
    { dx: -1, dy: 3, dz: 1, blockType: BlockType.PLANKS },
    { dx: 0, dy: 3, dz: 1, blockType: BlockType.PLANKS },
    { dx: 1, dy: 3, dz: 1, blockType: BlockType.PLANKS },
];

// 2. 오두막 주민 주택 (5x5 Area, Wood Planks floor, Cobble base, Glass windows, Bed inside)
export const HOUSE_TEMPLATE: BlockTemplate[] = [
    // Floor (Wood Planks)
    ...Array.from({ length: 25 }, (_, i) => ({
        dx: (i % 5) - 2,
        dy: -1,
        dz: Math.floor(i / 5) - 2,
        blockType: BlockType.PLANKS,
    })),

    // Cobblestone foundation base wall (Layer 0)
    { dx: -2, dy: 0, dz: -2, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 0, dz: -2, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: 0, dz: -2, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 0, dz: -2, blockType: BlockType.COBBLESTONE },
    { dx: 2, dy: 0, dz: -2, blockType: BlockType.COBBLESTONE },
    { dx: -2, dy: 0, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: 2, dy: 0, dz: -1, blockType: BlockType.COBBLESTONE },
    { dx: -2, dy: 0, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: 2, dy: 0, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: -2, dy: 0, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: 2, dy: 0, dz: 1, blockType: BlockType.COBBLESTONE },
    { dx: -2, dy: 0, dz: 2, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 0, dz: 2, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: 0, dz: 2, blockType: BlockType.COBBLESTONE }, // Door space (will be left as AIR at Layer 1/2)
    { dx: 1, dy: 0, dz: 2, blockType: BlockType.COBBLESTONE },
    { dx: 2, dy: 0, dz: 2, blockType: BlockType.COBBLESTONE },

    // Planks walls with windows (Layer 1 & 2)
    { dx: -2, dy: 1, dz: -2, blockType: BlockType.WOOD },
    { dx: -1, dy: 1, dz: -2, blockType: BlockType.GLASS }, // Window back
    { dx: 0, dy: 1, dz: -2, blockType: BlockType.PLANKS },
    { dx: 1, dy: 1, dz: -2, blockType: BlockType.GLASS }, // Window back
    { dx: 2, dy: 1, dz: -2, blockType: BlockType.WOOD },
    { dx: -2, dy: 1, dz: -1, blockType: BlockType.GLASS }, // Window left
    { dx: 2, dy: 1, dz: -1, blockType: BlockType.GLASS }, // Window right
    { dx: -2, dy: 1, dz: 0, blockType: BlockType.PLANKS },
    { dx: 2, dy: 1, dz: 0, blockType: BlockType.PLANKS },
    { dx: -2, dy: 1, dz: 1, blockType: BlockType.GLASS }, // Window left
    { dx: 2, dy: 1, dz: 1, blockType: BlockType.GLASS }, // Window right
    { dx: -2, dy: 1, dz: 2, blockType: BlockType.WOOD },
    { dx: -1, dy: 1, dz: 2, blockType: BlockType.PLANKS },
    { dx: 0, dy: 1, dz: 2, blockType: BlockType.AIR }, // Door lower
    { dx: 1, dy: 1, dz: 2, blockType: BlockType.PLANKS },
    { dx: 2, dy: 1, dz: 2, blockType: BlockType.WOOD },

    // Layer 2
    { dx: -2, dy: 2, dz: -2, blockType: BlockType.WOOD },
    { dx: -1, dy: 2, dz: -2, blockType: BlockType.PLANKS },
    { dx: 0, dy: 2, dz: -2, blockType: BlockType.PLANKS },
    { dx: 1, dy: 2, dz: -2, blockType: BlockType.PLANKS },
    { dx: 2, dy: 2, dz: -2, blockType: BlockType.WOOD },
    { dx: -2, dy: 2, dz: -1, blockType: BlockType.PLANKS },
    { dx: 2, dy: 2, dz: -1, blockType: BlockType.PLANKS },
    { dx: -2, dy: 2, dz: 0, blockType: BlockType.PLANKS },
    { dx: 2, dy: 2, dz: 0, blockType: BlockType.PLANKS },
    { dx: -2, dy: 2, dz: 1, blockType: BlockType.PLANKS },
    { dx: 2, dy: 2, dz: 1, blockType: BlockType.PLANKS },
    { dx: -2, dy: 2, dz: 2, blockType: BlockType.WOOD },
    { dx: -1, dy: 2, dz: 2, blockType: BlockType.PLANKS },
    { dx: 0, dy: 2, dz: 2, blockType: BlockType.AIR }, // Door upper
    { dx: 1, dy: 2, dz: 2, blockType: BlockType.PLANKS },
    { dx: 2, dy: 2, dz: 2, blockType: BlockType.WOOD },

    // Interior Bed and Hearth (Layer 0)
    { dx: -1, dy: 0, dz: -1, blockType: BlockType.BED }, // Bed!
    { dx: 1, dy: 0, dz: -1, blockType: BlockType.FURNACE }, // Work Block!
    { dx: -1, dy: 0, dz: 1, blockType: BlockType.CHEST }, // Chest storage!

    // Roof (Layer 3 - Flat, Layer 4 - Peak)
    ...Array.from({ length: 25 }, (_, i) => ({
        dx: (i % 5) - 2,
        dy: 3,
        dz: Math.floor(i / 5) - 2,
        blockType: BlockType.PLANKS,
    })),
    // Gable Roof center trim (Layer 4)
    { dx: -2, dy: 4, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: -1, dy: 4, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: 0, dy: 4, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: 1, dy: 4, dz: 0, blockType: BlockType.COBBLESTONE },
    { dx: 2, dy: 4, dz: 0, blockType: BlockType.COBBLESTONE },
];

// 3. 주민 농장 (5x6 Area, Fenced Border, Water channel, Tilled Soil (Dirt), Growing crops (Leaves))
export const FARM_TEMPLATE: BlockTemplate[] = [
    // Ground Foundation (Dirt)
    ...Array.from({ length: 30 }, (_, i) => ({
        dx: (i % 5) - 2,
        dy: -1,
        dz: Math.floor(i / 5) - 3,
        blockType: BlockType.DIRT,
    })),

    // Fence Border (Wood blocks as simple post boundary)
    { dx: -2, dy: 0, dz: -3, blockType: BlockType.WOOD },
    { dx: -1, dy: 0, dz: -3, blockType: BlockType.WOOD },
    { dx: 0, dy: 0, dz: -3, blockType: BlockType.WOOD },
    { dx: 1, dy: 0, dz: -3, blockType: BlockType.WOOD },
    { dx: 2, dy: 0, dz: -3, blockType: BlockType.WOOD },
    { dx: -2, dy: 0, dz: -2, blockType: BlockType.WOOD },
    { dx: 2, dy: 0, dz: -2, blockType: BlockType.WOOD },
    { dx: -2, dy: 0, dz: -1, blockType: BlockType.WOOD },
    { dx: 2, dy: 0, dz: -1, blockType: BlockType.WOOD },
    { dx: -2, dy: 0, dz: 0, blockType: BlockType.WOOD },
    { dx: 2, dy: 0, dz: 0, blockType: BlockType.WOOD },
    { dx: -2, dy: 0, dz: 1, blockType: BlockType.WOOD },
    { dx: 2, dy: 0, dz: 1, blockType: BlockType.WOOD },
    { dx: -2, dy: 0, dz: 2, blockType: BlockType.WOOD },
    { dx: -1, dy: 0, dz: 2, blockType: BlockType.WOOD },
    { dx: 0, dy: 0, dz: 2, blockType: BlockType.AIR }, // Entrance gate space
    { dx: 1, dy: 0, dz: 2, blockType: BlockType.WOOD },
    { dx: 2, dy: 0, dz: 2, blockType: BlockType.WOOD },

    // Water channel (Central dz, dy=0)
    { dx: 0, dy: 0, dz: -2, blockType: BlockType.WATER },
    { dx: 0, dy: 0, dz: -1, blockType: BlockType.WATER },
    { dx: 0, dy: 0, dz: 0, blockType: BlockType.WATER },
    { dx: 0, dy: 0, dz: 1, blockType: BlockType.WATER },

    // Soil & Crops (Left column and Right column, dy=0 as Soil, dy=1 as crop Leaves)
    // Left Crops
    { dx: -1, dy: 0, dz: -2, blockType: BlockType.DIRT },
    { dx: -1, dy: 1, dz: -2, blockType: BlockType.LEAVES },
    { dx: -1, dy: 0, dz: -1, blockType: BlockType.DIRT },
    { dx: -1, dy: 1, dz: -1, blockType: BlockType.LEAVES },
    { dx: -1, dy: 0, dz: 0, blockType: BlockType.DIRT },
    { dx: -1, dy: 1, dz: 0, blockType: BlockType.LEAVES },
    { dx: -1, dy: 0, dz: 1, blockType: BlockType.DIRT },
    { dx: -1, dy: 1, dz: 1, blockType: BlockType.LEAVES },
    
    // Right Crops
    { dx: 1, dy: 0, dz: -2, blockType: BlockType.DIRT },
    { dx: 1, dy: 1, dz: -2, blockType: BlockType.LEAVES },
    { dx: 1, dy: 0, dz: -1, blockType: BlockType.DIRT },
    { dx: 1, dy: 1, dz: -1, blockType: BlockType.LEAVES },
    { dx: 1, dy: 0, dz: 0, blockType: BlockType.DIRT },
    { dx: 1, dy: 1, dz: 0, blockType: BlockType.LEAVES },
    { dx: 1, dy: 0, dz: 1, blockType: BlockType.DIRT },
    { dx: 1, dy: 1, dz: 1, blockType: BlockType.LEAVES },
];
