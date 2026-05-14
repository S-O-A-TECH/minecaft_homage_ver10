export enum BlockType {
    AIR = 0,
    GRASS = 1,
    DIRT = 2,
    STONE = 3,
    WOOD = 4,
    LEAVES = 5,
    SAND = 6,
    WATER = 7,
    PLANKS = 8,
    COBBLESTONE = 9,
    BRICK = 10,
    GLASS = 11,
    SNOW = 12,
}

export interface BlockPosition {
    x: number;
    y: number;
    z: number;
}

export interface ChunkPosition {
    cx: number;
    cz: number;
}

export enum BlockFace {
    TOP = 0,
    BOTTOM = 1,
    NORTH = 2,
    SOUTH = 3,
    EAST = 4,
    WEST = 5,
}

export interface RaycastResult {
    position: BlockPosition;
    face: BlockFace;
    normal: BlockPosition;
    distance: number;
}

export interface GameConfig {
    chunkSize: number;
    renderDistance: number;
    worldHeight: number;
    seed: number;
    gravity: number;
    playerHeight: number;
    playerSpeed: number;
    reachDistance: number;
}