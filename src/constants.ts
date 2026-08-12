import { BlockType, ItemType, GameConfig, FoodItem, BiomeType, BiomeData, CraftingRecipe } from './types';

export const CONFIG: GameConfig = {
    chunkSize: 16,
    renderDistance: 6,
    worldHeight: 256,
    seed: 12345,
    gravity: 20,
    playerHeight: 1.6,
    playerSpeed: 8,
    reachDistance: 4,
};

export const CHUNK_SIZE = CONFIG.chunkSize;
export const WORLD_HEIGHT = CONFIG.worldHeight;
export const CHUNK_VOLUME = CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE;

export const BLOCK_NAMES: Record<BlockType, string> = {
    [BlockType.AIR]: '공기',
    [BlockType.GRASS]: '잔디',
    [BlockType.DIRT]: '흙',
    [BlockType.STONE]: '돌',
    [BlockType.WOOD]: '원목',
    [BlockType.LEAVES]: '나뭇잎',
    [BlockType.SAND]: '모래',
    [BlockType.WATER]: '물',
    [BlockType.PLANKS]: '판자',
    [BlockType.COBBLESTONE]: '조약돌',
    [BlockType.BRICK]: '벽돌',
    [BlockType.GLASS]: '유리',
    [BlockType.SNOW]: '눈',
    [BlockType.CAMPFIRE]: '모닥불',
    [BlockType.TENT]: '텐트',
    [BlockType.BED]: '침대',
    [BlockType.FURNACE]: '화롯불',
    [BlockType.CHEST]: '상자',
    [BlockType.TORCH]: '횃불',
    [BlockType.COAL_ORE]: '석탄 광석',
    [BlockType.IRON_ORE]: '철 광석',
    [BlockType.GOLD_ORE]: '금 광석',
    [BlockType.DIAMOND_ORE]: '다이아몬드 광석',
    [BlockType.SANDSTONE]: '사암',
    [BlockType.ICE]: '얼음',
    [BlockType.CACTUS]: '선인장',
    [BlockType.GRAVEL]: '자갈',
    [BlockType.LAVA]: '용암',
};

export const ITEM_NAMES: Record<ItemType, string> = {
    [ItemType.DIRT_BLOCK]: '흙 블록',
    [ItemType.STONE_BLOCK]: '돌 블록',
    [ItemType.WOOD_BLOCK]: '원목',
    [ItemType.PLANKS_BLOCK]: '판자',
    [ItemType.COBBLESTONE_BLOCK]: '조약돌 블록',
    [ItemType.FURNACE_BLOCK]: '화롯불',
    [ItemType.CAMPFIRE_BLOCK]: '모닥불',
    [ItemType.TORCH_BLOCK]: '횃불',

    [ItemType.WOODEN_PICKAXE]: '나무 곡괭이',
    [ItemType.STONE_PICKAXE]: '돌 곡괭이',
    [ItemType.IRON_PICKAXE]: '철 곡괭이',
    [ItemType.DIAMOND_PICKAXE]: '다이아몬드 곡괭이',
    [ItemType.WOODEN_SWORD]: '나무 검',
    [ItemType.STONE_SWORD]: '돌 검',
    [ItemType.IRON_SWORD]: '철 검',
    [ItemType.DIAMOND_SWORD]: '다이아몬드 검',

    [ItemType.APPLE]: '사과',
    [ItemType.BAKED_APPLE]: '구운사과',

    [ItemType.STICK]: '막대기',
    [ItemType.COAL]: '석탄',
    [ItemType.IRON_INGOT]: '철 주괴',
    [ItemType.GOLD_INGOT]: '금 주괴',
    [ItemType.DIAMOND]: '다이아몬드',
    [ItemType.EMERALD]: '에메랄드',
};

export const ITEM_DESCRIPTIONS: Record<ItemType, string> = {
    [ItemType.DIRT_BLOCK]: '흙 블록입니다. 지형을 채우거나 건축에 사용됩니다.',
    [ItemType.STONE_BLOCK]: '단단한 천연 돌 블록입니다.',
    [ItemType.WOOD_BLOCK]: '가공되지 않은 통나무 원목입니다. 판자나 막대기로 가공할 수 있습니다.',
    [ItemType.PLANKS_BLOCK]: '나무 판자입니다. 건축 및 도구 제작의 핵심 기초 재료입니다.',
    [ItemType.COBBLESTONE_BLOCK]: '거친 조약돌 블록입니다. 화로나 고급 도구 제작에 필수적입니다.',
    [ItemType.FURNACE_BLOCK]: '블록 배치 후 우클릭하여 사과를 구운 사과로 요리할 수 있는 화롯불입니다.',
    [ItemType.CAMPFIRE_BLOCK]: '주변을 밝히고 따뜻한 온기를 전해주는 모닥불입니다.',
    [ItemType.TORCH_BLOCK]: '어두운 곳을 환하게 밝혀주며, 주변의 적대적 몹 스폰을 방지하는 횃불입니다.',

    [ItemType.WOODEN_PICKAXE]: '나무 곡괭이입니다. [기능] 돌과 조약돌 복셀을 채굴하고 수확할 수 있습니다.',
    [ItemType.STONE_PICKAXE]: '돌 곡괭이입니다. [기능] 돌 채굴 속도가 빠르며, 철 광석을 수확할 수 있습니다.',
    [ItemType.IRON_PICKAXE]: '철 곡괭이입니다. [기능] 금과 다이아몬드 광석을 온전하게 캐내어 수확할 수 있습니다.',
    [ItemType.DIAMOND_PICKAXE]: '다이아몬드 곡괭이입니다. [기능] 가장 단단하며 최고 배율의 채굴 속도를 제공합니다.',

    [ItemType.WOODEN_SWORD]: '나무 검입니다. [기능] 적에게 근접 물리 타격을 입힙니다. (공격 피해량: 4)',
    [ItemType.STONE_SWORD]: '돌 검입니다. [기능] 돌날을 갈아 다듬어 보다 치명적인 타격력을 지닙니다. (공격 피해량: 5)',
    [ItemType.IRON_SWORD]: '철 검입니다. [기능] 날카롭게 제련된 철 검신으로 무시무시한 피해를 줍니다. (공격 피해량: 6)',
    [ItemType.DIAMOND_SWORD]: '다이아몬드 검입니다. [기능] 최강의 검신과 물리 넉백 계수를 보유한 무기입니다. (공격 피해량: 7)',

    [ItemType.APPLE]: '갓 수확한 사과입니다. [기능] 단독 섭취 시 허기 20, 체력 10, 기력 20을 즉시 보충합니다.',
    [ItemType.BAKED_APPLE]: '화로에서 노릇하게 요리된 사과입니다. [기능] 섭취 시 허기 40, 체력 20, 기력 40을 회복합니다.',

    [ItemType.STICK]: '가늘고 단단한 막대기입니다. 곡괭이, 검, 횃불 등 도구 손잡이용 재료입니다.',
    [ItemType.COAL]: '화력 연료 석탄입니다. 횃불 제작 시 막대기와 결합하여 쓰입니다.',
    [ItemType.IRON_INGOT]: '단단히 제련된 철 주괴입니다. 철 도구 및 주요 물리 장비의 골격 재료입니다.',
    [ItemType.GOLD_INGOT]: '빛나는 금 주괴입니다. 주민 상점 거래 시 에메랄드를 수확하는 화폐로 유용합니다.',
    [ItemType.DIAMOND]: '지하 깊은 곳에서 채굴한 다이아몬드 보석입니다. 최고 성능 도구의 핵심 부품입니다.',
    [ItemType.EMERALD]: '주민 무역에 사용되는 보석 화폐입니다. 주민 우클릭 거래 창에서 지불 수단으로 쓰입니다.',
};

// BlockType -> ItemType mapping for drops
export const BLOCK_TO_ITEM: Partial<Record<BlockType, ItemType>> = {
    [BlockType.GRASS]: ItemType.DIRT_BLOCK,
    [BlockType.DIRT]: ItemType.DIRT_BLOCK,
    [BlockType.STONE]: ItemType.COBBLESTONE_BLOCK,
    [BlockType.WOOD]: ItemType.WOOD_BLOCK,
    [BlockType.LEAVES]: ItemType.DIRT_BLOCK,
    [BlockType.SAND]: ItemType.DIRT_BLOCK,
    [BlockType.PLANKS]: ItemType.PLANKS_BLOCK,
    [BlockType.COBBLESTONE]: ItemType.COBBLESTONE_BLOCK,
    [BlockType.CAMPFIRE]: ItemType.CAMPFIRE_BLOCK,
    [BlockType.FURNACE]: ItemType.FURNACE_BLOCK,
    [BlockType.TORCH]: ItemType.TORCH_BLOCK,
    [BlockType.COAL_ORE]: ItemType.COAL,
    [BlockType.IRON_ORE]: ItemType.IRON_INGOT,
    [BlockType.GOLD_ORE]: ItemType.GOLD_INGOT,
    [BlockType.DIAMOND_ORE]: ItemType.DIAMOND,
};

// ItemType -> BlockType mapping for placement
export const ITEM_TO_BLOCK: Partial<Record<ItemType, BlockType>> = {
    [ItemType.DIRT_BLOCK]: BlockType.DIRT,
    [ItemType.STONE_BLOCK]: BlockType.STONE,
    [ItemType.WOOD_BLOCK]: BlockType.WOOD,
    [ItemType.PLANKS_BLOCK]: BlockType.PLANKS,
    [ItemType.COBBLESTONE_BLOCK]: BlockType.COBBLESTONE,
    [ItemType.CAMPFIRE_BLOCK]: BlockType.CAMPFIRE,
    [ItemType.FURNACE_BLOCK]: BlockType.FURNACE,
    [ItemType.TORCH_BLOCK]: BlockType.TORCH,
};

export const PLACEABLE_BLOCKS: BlockType[] = [
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.WOOD,
    BlockType.PLANKS,
    BlockType.COBBLESTONE,
];

export const FOOD_ITEMS: FoodItem[] = [
    { itemType: ItemType.APPLE, hungerRestore: 20, hpRestore: 10, epRestore: 20 },
    { itemType: ItemType.BAKED_APPLE, hungerRestore: 40, hpRestore: 20, epRestore: 40 },
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
// Tool durability
export const TOOL_DURABILITY: Partial<Record<ItemType, number>> = {
    [ItemType.WOODEN_PICKAXE]: 60,
    [ItemType.STONE_PICKAXE]: 132,
    [ItemType.IRON_PICKAXE]: 251,
    [ItemType.DIAMOND_PICKAXE]: 1562,
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

// === CRAFTING RECIPES ===
// null means empty slot in the pattern
export const CRAFTING_RECIPES: CraftingRecipe[] = [
    // Planks (from Wood)
    {
        result: ItemType.PLANKS_BLOCK,
        count: 4,
        pattern: [[ItemType.WOOD_BLOCK, null, null], [null, null, null], [null, null, null]],
        requiresCraftingTable: false,
    },
    // Sticks (from Planks)
    {
        result: ItemType.STICK,
        count: 4,
        pattern: [
            [ItemType.PLANKS_BLOCK, null, null],
            [ItemType.PLANKS_BLOCK, null, null],
            [null, null, null],
        ],
        requiresCraftingTable: false,
    },
    // Torch (from Coal + Stick)
    {
        result: ItemType.TORCH_BLOCK,
        count: 4,
        pattern: [
            [ItemType.COAL, null, null],
            [ItemType.STICK, null, null],
            [null, null, null],
        ],
        requiresCraftingTable: false,
    },
    // Wooden Pickaxe
    {
        result: ItemType.WOODEN_PICKAXE,
        count: 1,
        pattern: [
            [ItemType.PLANKS_BLOCK, ItemType.PLANKS_BLOCK, ItemType.PLANKS_BLOCK],
            [null, ItemType.STICK, null],
            [null, ItemType.STICK, null],
        ],
        requiresCraftingTable: true,
    },
    // Stone Pickaxe
    {
        result: ItemType.STONE_PICKAXE,
        count: 1,
        pattern: [
            [ItemType.COBBLESTONE_BLOCK, ItemType.COBBLESTONE_BLOCK, ItemType.COBBLESTONE_BLOCK],
            [null, ItemType.STICK, null],
            [null, ItemType.STICK, null],
        ],
        requiresCraftingTable: true,
    },
    // Iron Pickaxe
    {
        result: ItemType.IRON_PICKAXE,
        count: 1,
        pattern: [
            [ItemType.IRON_INGOT, ItemType.IRON_INGOT, ItemType.IRON_INGOT],
            [null, ItemType.STICK, null],
            [null, ItemType.STICK, null],
        ],
        requiresCraftingTable: true,
    },
    // Diamond Pickaxe
    {
        result: ItemType.DIAMOND_PICKAXE,
        count: 1,
        pattern: [
            [ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND],
            [null, ItemType.STICK, null],
            [null, ItemType.STICK, null],
        ],
        requiresCraftingTable: true,
    },
    // Wooden Sword
    {
        result: ItemType.WOODEN_SWORD,
        count: 1,
        pattern: [
            [ItemType.PLANKS_BLOCK, null, null],
            [ItemType.PLANKS_BLOCK, null, null],
            [ItemType.STICK, null, null],
        ],
        requiresCraftingTable: true,
    },
    // Stone Sword
    {
        result: ItemType.STONE_SWORD,
        count: 1,
        pattern: [
            [ItemType.COBBLESTONE_BLOCK, null, null],
            [ItemType.COBBLESTONE_BLOCK, null, null],
            [ItemType.STICK, null, null],
        ],
        requiresCraftingTable: true,
    },
    // Iron Sword
    {
        result: ItemType.IRON_SWORD,
        count: 1,
        pattern: [
            [ItemType.IRON_INGOT, null, null],
            [ItemType.IRON_INGOT, null, null],
            [ItemType.STICK, null, null],
        ],
        requiresCraftingTable: true,
    },
    // Diamond Sword
    {
        result: ItemType.DIAMOND_SWORD,
        count: 1,
        pattern: [
            [ItemType.DIAMOND, null, null],
            [ItemType.DIAMOND, null, null],
            [ItemType.STICK, null, null],
        ],
        requiresCraftingTable: true,
    },
    // Furnace
    {
        result: ItemType.FURNACE_BLOCK,
        count: 1,
        pattern: [
            [ItemType.COBBLESTONE_BLOCK, ItemType.COBBLESTONE_BLOCK, ItemType.COBBLESTONE_BLOCK],
            [ItemType.COBBLESTONE_BLOCK, null, ItemType.COBBLESTONE_BLOCK],
            [ItemType.COBBLESTONE_BLOCK, ItemType.COBBLESTONE_BLOCK, ItemType.COBBLESTONE_BLOCK],
        ],
        requiresCraftingTable: true,
    },
    // Campfire
    {
        result: ItemType.CAMPFIRE_BLOCK,
        count: 1,
        pattern: [
            [ItemType.STICK, ItemType.COAL, ItemType.STICK],
            [null, ItemType.WOOD_BLOCK, null],
            [null, ItemType.WOOD_BLOCK, null],
        ],
        requiresCraftingTable: true,
    },
];
