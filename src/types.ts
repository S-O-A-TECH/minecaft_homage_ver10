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
    CRAFTING_TABLE = 17,
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
}

export enum ItemType {
    // Block items (100+)
    GRASS_BLOCK = 100,
    DIRT_BLOCK = 101,
    STONE_BLOCK = 102,
    WOOD_BLOCK = 103,
    LEAVES_BLOCK = 104,
    SAND_BLOCK = 105,
    PLANKS_BLOCK = 106,
    COBBLESTONE_BLOCK = 107,
    BRICK_BLOCK = 108,
    GLASS_BLOCK = 109,
    SNOW_BLOCK = 110,
    CAMPFIRE_BLOCK = 111,
    TENT_BLOCK = 112,
    BED_BLOCK = 113,
    FURNACE_BLOCK = 114,
    CRAFTING_TABLE_BLOCK = 115,
    CHEST_BLOCK = 116,
    TORCH_BLOCK = 117,
    COAL_ORE_BLOCK = 118,
    IRON_ORE_BLOCK = 119,
    GOLD_ORE_BLOCK = 120,
    DIAMOND_ORE_BLOCK = 121,
    SANDSTONE_BLOCK = 122,
    ICE_BLOCK = 123,
    CACTUS_BLOCK = 124,
    GRAVEL_BLOCK = 125,

    // Tools (200+)
    WOODEN_PICKAXE = 200,
    STONE_PICKAXE = 201,
    IRON_PICKAXE = 202,
    DIAMOND_PICKAXE = 203,
    WOODEN_AXE = 204,
    STONE_AXE = 205,
    IRON_AXE = 206,
    WOODEN_SHOVEL = 207,
    STONE_SHOVEL = 208,
    WOODEN_SWORD = 209,

    // Food (300+)
    APPLE = 300,
    BREAD = 301,
    RAW_BEEF = 302,
    STEAK = 303,
    RAW_CHICKEN = 304,
    COOKED_CHICKEN = 305,
    CARROT = 306,
    BAKED_POTATO = 307,
    MUSHROOM_STEW = 308,
    CAKE = 309,
    GOLDEN_APPLE = 310,

    // Resources (400+)
    STICK = 400,
    COAL = 401,
    IRON_INGOT = 402,
    GOLD_INGOT = 403,
    DIAMOND = 404,
    STRING = 405,
    FEATHER = 406,
    LEATHER = 407,
    BOWL = 408,
    WOOL = 409,
    SUGAR = 410,
    EGG = 411,
    WHEAT = 412,
    POTATO = 413,
    RED_MUSHROOM = 414,
    BROWN_MUSHROOM = 415,
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