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
    CAMPFIRE = 13,
    TENT = 14,
    BED = 15,
    FURNACE = 16,
    CHEST = 18,
    TORCH = 19,
    COAL_ORE = 20,
    IRON_ORE = 21,
    GOLD_ORE = 22,
    DIAMOND_ORE = 23,
    SANDSTONE = 24,
    ICE = 25,
    CACTUS = 26,
    GRAVEL = 27,
    LAVA = 28,
}

export enum ItemType {
    // 블록류 아이템 (100+)
    DIRT_BLOCK = 100,
    STONE_BLOCK = 101,
    WOOD_BLOCK = 102,
    PLANKS_BLOCK = 103,
    COBBLESTONE_BLOCK = 104,
    FURNACE_BLOCK = 106,
    CAMPFIRE_BLOCK = 107,
    TORCH_BLOCK = 108,

    // 도구류 곡괭이 4종 (200+)
    WOODEN_PICKAXE = 200,
    STONE_PICKAXE = 201,
    IRON_PICKAXE = 202,
    DIAMOND_PICKAXE = 203,
    WOODEN_SWORD = 210,
    STONE_SWORD = 211,
    IRON_SWORD = 212,
    DIAMOND_SWORD = 213,

    // 필수 음식 (300+)
    APPLE = 300,
    BAKED_APPLE = 301,

    // 필수 자원 (400+)
    STICK = 400,
    COAL = 401,
    IRON_INGOT = 402,
    GOLD_INGOT = 403,
    DIAMOND = 404,
    EMERALD = 405,
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
    exactHitPoint?: THREE.Vector3;
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

export interface InventorySlot {
    itemType: ItemType | null;
    count: number;
}

export interface CraftingRecipe {
    result: ItemType;
    count: number;
    pattern: (ItemType | null)[][];
    requiresCraftingTable: boolean;
}

export interface PlayerStatsData {
    hp: number;
    maxHp: number;
    ep: number;
    maxEp: number;
    hunger: number;
    maxHunger: number;
    saturation: number;
}

export interface FoodItem {
    itemType: ItemType;
    hungerRestore: number;
    hpRestore: number;
    epRestore: number;
}

export enum BiomeType {
    PLAINS = 0,
    FOREST = 1,
    DESERT = 2,
    TAIGA = 3,
    SNOWY = 4,
    JUNGLE = 5,
    SWAMP = 6,
}

export interface BiomeData {
    type: BiomeType;
    temperature: number;
    humidity: number;
    surfaceBlock: BlockType;
    subSurfaceBlock: BlockType;
    treeDensity: number;
    treeWoodType: BlockType;
    treeLeafType: BlockType;
}

export enum MobType {
    ZOMBIE = 'zombie',
    SKELETON = 'skeleton',
    CREEPER = 'creeper',
    VILLAGER = 'villager',
}

export enum VillagerProfession {
    FARMER = 'farmer',
    WEAPONSMITH = 'weaponsmith',
    CLERIC = 'cleric',
}

export interface VillagerTrade {
    inputItem: ItemType;
    inputCount: number;
    outputItem: ItemType;
    outputCount: number;
    demand: number;
    maxUses: number;
    uses: number;
}

export enum VillagerState {
    WANDER = 'wander',
    WORK = 'work',
    WELL = 'well',
    SLEEP = 'sleep',
}