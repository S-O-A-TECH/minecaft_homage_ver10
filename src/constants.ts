import { BlockType, GameConfig } from './types';

export const CONFIG: GameConfig = {
    chunkSize: 16,
    renderDistance: 6,
    worldHeight: 256,
    seed: 12345,
    gravity: 20,
    playerHeight: 1.6,
    playerSpeed: 8,
    reachDistance: 6,
};

export const CHUNK_SIZE = CONFIG.chunkSize;
export const WORLD_HEIGHT = CONFIG.worldHeight;
export const CHUNK_VOLUME = CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE;

export const BLOCK_NAMES: Record<BlockType, string> = {
    [BlockType.AIR]: 'Air',
    [BlockType.GRASS]: 'Grass',
    [BlockType.DIRT]: 'Dirt',
    [BlockType.STONE]: 'Stone',
    [BlockType.WOOD]: 'Wood',
    [BlockType.LEAVES]: 'Leaves',
    [BlockType.SAND]: 'Sand',
    [BlockType.WATER]: 'Water',
    [BlockType.PLANKS]: 'Planks',
    [BlockType.COBBLESTONE]: 'Cobblestone',
    [BlockType.BRICK]: 'Brick',
    [BlockType.GLASS]: 'Glass',
    [BlockType.SNOW]: 'Snow',
};

export const BLOCK_COLORS: Record<BlockType, number[]> = {
    [BlockType.AIR]: [0, 0, 0, 0],
    [BlockType.GRASS]: [0.4, 0.6, 0.3, 1],
    [BlockType.DIRT]: [0.55, 0.4, 0.25, 1],
    [BlockType.STONE]: [0.5, 0.5, 0.5, 1],
    [BlockType.WOOD]: [0.45, 0.35, 0.2, 1],
    [BlockType.LEAVES]: [0.2, 0.5, 0.15, 1],
    [BlockType.SAND]: [0.85, 0.8, 0.55, 1],
    [BlockType.WATER]: [0.2, 0.3, 0.9, 0.6],
    [BlockType.PLANKS]: [0.7, 0.55, 0.3, 1],
    [BlockType.COBBLESTONE]: [0.4, 0.4, 0.4, 1],
    [BlockType.BRICK]: [0.65, 0.3, 0.2, 1],
    [BlockType.GLASS]: [0.8, 0.9, 1.0, 0.3],
    [BlockType.SNOW]: [0.95, 0.95, 0.98, 1],
};

export const PLACEABLE_BLOCKS: BlockType[] = [
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.WOOD,
    BlockType.PLANKS,
    BlockType.COBBLESTONE,
    BlockType.BRICK,
    BlockType.SAND,
    BlockType.GLASS,
    BlockType.SNOW,
];

export const FACE_NORMALS: [number, number, number][] = [
    [0, 1, 0],   // TOP
    [0, -1, 0],  // BOTTOM
    [0, 0, -1],  // NORTH
    [0, 0, 1],   // SOUTH
    [1, 0, 0],   // EAST
    [-1, 0, 0],  // WEST
];