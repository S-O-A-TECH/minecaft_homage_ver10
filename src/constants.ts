import { BlockType, ItemType, GameConfig, FoodItem, BiomeType, BiomeData } from './types';

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
    [BlockType.CAMPFIRE]: 'Campfire',
    [BlockType.TENT]: 'Tent',
    [BlockType.BED]: 'Bed',
    [BlockType.FURNACE]: 'Furnace',
    [BlockType.CRAFTING_TABLE]: 'Crafting Table',
    [BlockType.CHEST]: 'Chest',
    [BlockType.TORCH]: 'Torch',
    [BlockType.COAL_ORE]: 'Coal Ore',
    [BlockType.IRON_ORE]: 'Iron Ore',
    [BlockType.GOLD_ORE]: 'Gold Ore',
    [BlockType.DIAMOND_ORE]: 'Diamond Ore',
    [BlockType.SANDSTONE]: 'Sandstone',
    [BlockType.ICE]: 'Ice',
    [BlockType.CACTUS]: 'Cactus',
    [BlockType.GRAVEL]: 'Gravel',
};

export const ITEM_NAMES: Record<ItemType, string> = {
    [ItemType.GRASS_BLOCK]: 'Grass Block',
    [ItemType.DIRT_BLOCK]: 'Dirt',
    [ItemType.STONE_BLOCK]: 'Stone',
    [ItemType.WOOD_BLOCK]: 'Wood',
    [ItemType.LEAVES_BLOCK]: 'Leaves',
    [ItemType.SAND_BLOCK]: 'Sand',
    [ItemType.PLANKS_BLOCK]: 'Planks',
    [ItemType.COBBLESTONE_BLOCK]: 'Cobblestone',
    [ItemType.BRICK_BLOCK]: 'Brick',
    [ItemType.GLASS_BLOCK]: 'Glass',
    [ItemType.SNOW_BLOCK]: 'Snow',
    [ItemType.CAMPFIRE_BLOCK]: 'Campfire',
    [ItemType.TENT_BLOCK]: 'Tent',
    [ItemType.BED_BLOCK]: 'Bed',
    [ItemType.FURNACE_BLOCK]: 'Furnace',
    [ItemType.CRAFTING_TABLE_BLOCK]: 'Crafting Table',
    [ItemType.CHEST_BLOCK]: 'Chest',
    [ItemType.TORCH_BLOCK]: 'Torch',
    [ItemType.COAL_ORE_BLOCK]: 'Coal Ore',
    [ItemType.IRON_ORE_BLOCK]: 'Iron Ore',
    [ItemType.GOLD_ORE_BLOCK]: 'Gold Ore',
    [ItemType.DIAMOND_ORE_BLOCK]: 'Diamond Ore',
    [ItemType.SANDSTONE_BLOCK]: 'Sandstone',
    [ItemType.ICE_BLOCK]: 'Ice',
    [ItemType.CACTUS_BLOCK]: 'Cactus',
    [ItemType.GRAVEL_BLOCK]: 'Gravel',
    [ItemType.WOODEN_PICKAXE]: 'Wooden Pickaxe',
    [ItemType.STONE_PICKAXE]: 'Stone Pickaxe',
    [ItemType.IRON_PICKAXE]: 'Iron Pickaxe',
    [ItemType.DIAMOND_PICKAXE]: 'Diamond Pickaxe',
    [ItemType.WOODEN_AXE]: 'Wooden Axe',
    [ItemType.STONE_AXE]: 'Stone Axe',
    [ItemType.IRON_AXE]: 'Iron Axe',
    [ItemType.WOODEN_SHOVEL]: 'Wooden Shovel',
    [ItemType.STONE_SHOVEL]: 'Stone Shovel',
    [ItemType.WOODEN_SWORD]: 'Wooden Sword',
    [ItemType.APPLE]: 'Apple',
    [ItemType.BREAD]: 'Bread',
    [ItemType.RAW_BEEF]: 'Raw Beef',
    [ItemType.STEAK]: 'Steak',
    [ItemType.RAW_CHICKEN]: 'Raw Chicken',
    [ItemType.COOKED_CHICKEN]: 'Cooked Chicken',
    [ItemType.CARROT]: 'Carrot',
    [ItemType.BAKED_POTATO]: 'Baked Potato',
    [ItemType.MUSHROOM_STEW]: 'Mushroom Stew',
    [ItemType.CAKE]: 'Cake',
    [ItemType.GOLDEN_APPLE]: 'Golden Apple',
    [ItemType.STICK]: 'Stick',
    [ItemType.COAL]: 'Coal',
    [ItemType.IRON_INGOT]: 'Iron Ingot',
    [ItemType.GOLD_INGOT]: 'Gold Ingot',
    [ItemType.DIAMOND]: 'Diamond',
    [ItemType.STRING]: 'String',
    [ItemType.FEATHER]: 'Feather',
    [ItemType.LEATHER]: 'Leather',
    [ItemType.BOWL]: 'Bowl',
    [ItemType.WOOL]: 'Wool',
    [ItemType.SUGAR]: 'Sugar',
    [ItemType.EGG]: 'Egg',
    [ItemType.WHEAT]: 'Wheat',
    [ItemType.POTATO]: 'Potato',
    [ItemType.RED_MUSHROOM]: 'Red Mushroom',
    [ItemType.BROWN_MUSHROOM]: 'Brown Mushroom',
};

// BlockType -> ItemType mapping for drops
export const BLOCK_TO_ITEM: Partial<Record<BlockType, ItemType>> = {
    [BlockType.GRASS]: ItemType.DIRT_BLOCK,
    [BlockType.DIRT]: ItemType.DIRT_BLOCK,
    [BlockType.STONE]: ItemType.COBBLESTONE_BLOCK,
    [BlockType.WOOD]: ItemType.WOOD_BLOCK,
    [BlockType.LEAVES]: ItemType.LEAVES_BLOCK,
    [BlockType.SAND]: ItemType.SAND_BLOCK,
    [BlockType.PLANKS]: ItemType.PLANKS_BLOCK,
    [BlockType.COBBLESTONE]: ItemType.COBBLESTONE_BLOCK,
    [BlockType.BRICK]: ItemType.BRICK_BLOCK,
    [BlockType.GLASS]: ItemType.GLASS_BLOCK,
    [BlockType.SNOW]: ItemType.SNOW_BLOCK,
    [BlockType.CAMPFIRE]: ItemType.CAMPFIRE_BLOCK,
    [BlockType.TENT]: ItemType.TENT_BLOCK,
    [BlockType.BED]: ItemType.BED_BLOCK,
    [BlockType.FURNACE]: ItemType.FURNACE_BLOCK,
    [BlockType.CRAFTING_TABLE]: ItemType.CRAFTING_TABLE_BLOCK,
    [BlockType.CHEST]: ItemType.CHEST_BLOCK,
    [BlockType.TORCH]: ItemType.TORCH_BLOCK,
    [BlockType.COAL_ORE]: ItemType.COAL,
    [BlockType.IRON_ORE]: ItemType.IRON_ORE_BLOCK,
    [BlockType.GOLD_ORE]: ItemType.GOLD_ORE_BLOCK,
    [BlockType.DIAMOND_ORE]: ItemType.DIAMOND,
    [BlockType.SANDSTONE]: ItemType.SANDSTONE_BLOCK,
    [BlockType.ICE]: ItemType.ICE_BLOCK,
    [BlockType.CACTUS]: ItemType.CACTUS_BLOCK,
    [BlockType.GRAVEL]: ItemType.GRAVEL_BLOCK,
};

// ItemType -> BlockType mapping for placement
export const ITEM_TO_BLOCK: Partial<Record<ItemType, BlockType>> = {
    [ItemType.GRASS_BLOCK]: BlockType.GRASS,
    [ItemType.DIRT_BLOCK]: BlockType.DIRT,
    [ItemType.COBBLESTONE_BLOCK]: BlockType.COBBLESTONE,
    [ItemType.WOOD_BLOCK]: BlockType.WOOD,
    [ItemType.LEAVES_BLOCK]: BlockType.LEAVES,
    [ItemType.SAND_BLOCK]: BlockType.SAND,
    [ItemType.PLANKS_BLOCK]: BlockType.PLANKS,
    [ItemType.BRICK_BLOCK]: BlockType.BRICK,
    [ItemType.GLASS_BLOCK]: BlockType.GLASS,
    [ItemType.SNOW_BLOCK]: BlockType.SNOW,
    [ItemType.CAMPFIRE_BLOCK]: BlockType.CAMPFIRE,
    [ItemType.TENT_BLOCK]: BlockType.TENT,
    [ItemType.BED_BLOCK]: BlockType.BED,
    [ItemType.FURNACE_BLOCK]: BlockType.FURNACE,
    [ItemType.CRAFTING_TABLE_BLOCK]: BlockType.CRAFTING_TABLE,
    [ItemType.CHEST_BLOCK]: BlockType.CHEST,
    [ItemType.TORCH_BLOCK]: BlockType.TORCH,
    [ItemType.COAL_ORE_BLOCK]: BlockType.COAL_ORE,
    [ItemType.IRON_ORE_BLOCK]: BlockType.IRON_ORE,
    [ItemType.GOLD_ORE_BLOCK]: BlockType.GOLD_ORE,
    [ItemType.DIAMOND_ORE_BLOCK]: BlockType.DIAMOND_ORE,
    [ItemType.SANDSTONE_BLOCK]: BlockType.SANDSTONE,
    [ItemType.ICE_BLOCK]: BlockType.ICE,
    [ItemType.CACTUS_BLOCK]: BlockType.CACTUS,
    [ItemType.GRAVEL_BLOCK]: BlockType.GRAVEL,
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

export const FOOD_ITEMS: FoodItem[] = [
    { itemType: ItemType.APPLE, hungerRestore: 10, hpRestore: 5, epRestore: 10 },
    { itemType: ItemType.BREAD, hungerRestore: 20, hpRestore: 10, epRestore: 15 },
    { itemType: ItemType.RAW_BEEF, hungerRestore: 15, hpRestore: 5, epRestore: 10 },
    { itemType: ItemType.STEAK, hungerRestore: 40, hpRestore: 20, epRestore: 30 },
    { itemType: ItemType.RAW_CHICKEN, hungerRestore: 10, hpRestore: 3, epRestore: 8 },
    { itemType: ItemType.COOKED_CHICKEN, hungerRestore: 30, hpRestore: 15, epRestore: 20 },
    { itemType: ItemType.CARROT, hungerRestore: 10, hpRestore: 5, epRestore: 10 },
    { itemType: ItemType.BAKED_POTATO, hungerRestore: 25, hpRestore: 12, epRestore: 15 },
    { itemType: ItemType.MUSHROOM_STEW, hungerRestore: 30, hpRestore: 15, epRestore: 20 },
    { itemType: ItemType.CAKE, hungerRestore: 10, hpRestore: 5, epRestore: 10 },
    { itemType: ItemType.GOLDEN_APPLE, hungerRestore: 40, hpRestore: 100, epRestore: 100 },
];

export const FOOD_MAP: Map<ItemType, FoodItem> = new Map(
    FOOD_ITEMS.map(f => [f.itemType, f])
);

export const BIOME_DATA: Record<BiomeType, BiomeData> = {
    [BiomeType.PLAINS]: {
        type: BiomeType.PLAINS,
        temperature: 20,
        humidity: 50,
        surfaceBlock: BlockType.GRASS,
        subSurfaceBlock: BlockType.DIRT,
        treeDensity: 0.05,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
    [BiomeType.FOREST]: {
        type: BiomeType.FOREST,
        temperature: 15,
        humidity: 70,
        surfaceBlock: BlockType.GRASS,
        subSurfaceBlock: BlockType.DIRT,
        treeDensity: 0.4,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
    [BiomeType.DESERT]: {
        type: BiomeType.DESERT,
        temperature: 38,
        humidity: 10,
        surfaceBlock: BlockType.SAND,
        subSurfaceBlock: BlockType.SANDSTONE,
        treeDensity: 0,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
    [BiomeType.TAIGA]: {
        type: BiomeType.TAIGA,
        temperature: 5,
        humidity: 50,
        surfaceBlock: BlockType.GRASS,
        subSurfaceBlock: BlockType.DIRT,
        treeDensity: 0.3,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
    [BiomeType.SNOWY]: {
        type: BiomeType.SNOWY,
        temperature: -10,
        humidity: 40,
        surfaceBlock: BlockType.SNOW,
        subSurfaceBlock: BlockType.DIRT,
        treeDensity: 0.02,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
    [BiomeType.JUNGLE]: {
        type: BiomeType.JUNGLE,
        temperature: 30,
        humidity: 90,
        surfaceBlock: BlockType.GRASS,
        subSurfaceBlock: BlockType.DIRT,
        treeDensity: 0.5,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
    [BiomeType.SWAMP]: {
        type: BiomeType.SWAMP,
        temperature: 25,
        humidity: 85,
        surfaceBlock: BlockType.GRASS,
        subSurfaceBlock: BlockType.DIRT,
        treeDensity: 0.2,
        treeWoodType: BlockType.WOOD,
        treeLeafType: BlockType.LEAVES,
    },
};

export const FACE_NORMALS: [number, number, number][] = [
    [0, 1, 0],   // TOP
    [0, -1, 0],  // BOTTOM
    [0, 0, -1],  // NORTH
    [0, 0, 1],   // SOUTH
    [1, 0, 0],   // EAST
    [-1, 0, 0],  // WEST
];

// Tool durability
export const TOOL_DURABILITY: Partial<Record<ItemType, number>> = {
    [ItemType.WOODEN_PICKAXE]: 60,
    [ItemType.STONE_PICKAXE]: 132,
    [ItemType.IRON_PICKAXE]: 251,
    [ItemType.DIAMOND_PICKAXE]: 1562,
    [ItemType.WOODEN_AXE]: 60,
    [ItemType.STONE_AXE]: 132,
    [ItemType.IRON_AXE]: 251,
    [ItemType.WOODEN_SHOVEL]: 60,
    [ItemType.STONE_SHOVEL]: 132,
    [ItemType.WOODEN_SWORD]: 60,
};

// EP costs
export const EP_COST_CRAFT = 5;
export const EP_COST_BREAK_BARE_HAND = 1;
export const EP_COST_BREAK_TOOL = 0.5;
export const EP_COST_SPRINT = 3; // per second
export const EP_COST_JUMP = 2;
export const EP_COST_SWIM = 5; // per second
export const EP_COST_MINE = 2;

// EP recovery rates
export const EP_REGEN_BASE = 2; // per second (standing/walking)
export const EP_REGEN_CAMPFIRE = 5; // per second (near campfire)
export const EP_REGEN_TENT = 10; // per second (inside tent)
export const EP_REGEN_SUNLIGHT = 1; // per second (daytime, outdoors)
export const EP_REGEN_SITTING = 8; // per second (sitting)

// HP recovery
export const HP_REGEN_NATURAL = 0.5; // per second (hunger > 80%, ep > 30%)
export const HP_REGEN_FURNACE = 1; // per second (near furnace)

// Hunger decay
export const HUNGER_DECAY_BASE = 0.1; // per second
export const HUNGER_DECAY_SPRINT = 2; // per second extra
export const HUNGER_DECAY_JUMP = 1; // per jump
export const HUNGER_DECAY_SWIM = 3; // per second extra
export const HUNGER_DECAY_HEALING = 3; // per second while HP regen

// HP damage
export const HP_DAMAGE_STARVATION = 2; // per second when hunger = 0
export const HP_DAMAGE_LAVA = 10; // per second
export const HP_DAMAGE_DROWN = 2; // per second

// Day/night cycle
export const DAY_DURATION = 600; // 10 minutes in seconds
export const NIGHT_DURATION = 420; // 7 minutes
export const SUNRISE_DURATION = 90; // 1.5 minutes
export const SUNSET_DURATION = 90; // 1.5 minutes
export const FULL_DAY = DAY_DURATION + NIGHT_DURATION + SUNRISE_DURATION + SUNSET_DURATION;

// Temperature
export const HYPOTHERMIA_THRESHOLD = 0;
export const HEATSTROKE_THRESHOLD = 40;
export const EP_DAMAGE_HYPOTHERMIA = 5; // per second
export const EP_DAMAGE_HEATSTROKE = 3; // per second
export const HP_DAMAGE_HEATSTROKE = 1; // per second