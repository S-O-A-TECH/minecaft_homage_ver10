import * as THREE from 'three';
import { World } from './World';
import { BlockType, VillagerProfession } from './types';
import { WELL_TEMPLATE, HOUSE_TEMPLATE, FARM_TEMPLATE, BlockTemplate } from './VillageTemplates';

interface StructureBox {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

export class JigsawStructureBuilder {
    private activeBoxes: StructureBox[] = [];

    // Tries to place a village layout around center (centerX, centerZ)
    public buildVillage(world: World, centerX: number, centerZ: number): { pos: THREE.Vector3; profession: VillagerProfession }[] {
        this.activeBoxes = [];
        const spawnedVillagers: { pos: THREE.Vector3; profession: VillagerProfession }[] = [];

        // 1. Find terrain height Y at center
        const startY = world.getTerrainHeight ? world.getTerrainHeight(centerX, centerZ) : 64;
        
        // 2. Place central Well (Jigsaw Root)
        this.placeTemplate(world, centerX, startY, centerZ, WELL_TEMPLATE);
        this.addBoundingBox(centerX, centerZ, 3, 3); // 3x3 well boundary

        // 3. Extend road axes: North, South, East, West
        const roadLength = 24;
        this.buildRoad(world, centerX, startY, centerZ, 0, 1, roadLength);  // South
        this.buildRoad(world, centerX, startY, centerZ, 0, -1, roadLength); // North
        this.buildRoad(world, centerX, startY, centerZ, 1, 0, roadLength);  // East
        this.buildRoad(world, centerX, startY, centerZ, -1, 0, roadLength); // West

        // 4. Place Houses and Farms along the roadsides
        // We will try placing buildings at regular intervals along the roads
        const buildingIntervals = [8, 16, 22];
        const sides = [-6, 6]; // Offset from road center

        let villagerIndex = 0;
        const professions = [VillagerProfession.FARMER, VillagerProfession.WEAPONSMITH, VillagerProfession.CLERIC];

        for (const dist of buildingIntervals) {
            for (const side of sides) {
                // North/South Road Sides
                this.tryPlaceBuildingAt(
                    world,
                    centerX + side,
                    centerZ + dist,
                    dist % 2 === 0 ? 'house' : 'farm',
                    professions[villagerIndex % professions.length],
                    spawnedVillagers
                );
                villagerIndex++;

                this.tryPlaceBuildingAt(
                    world,
                    centerX + side,
                    centerZ - dist,
                    dist % 2 === 1 ? 'house' : 'farm',
                    professions[villagerIndex % professions.length],
                    spawnedVillagers
                );
                villagerIndex++;

                // East/West Road Sides
                this.tryPlaceBuildingAt(
                    world,
                    centerX + dist,
                    centerZ + side,
                    dist % 2 === 1 ? 'house' : 'farm',
                    professions[villagerIndex % professions.length],
                    spawnedVillagers
                );
                villagerIndex++;

                this.tryPlaceBuildingAt(
                    world,
                    centerX - dist,
                    centerZ - side,
                    dist % 2 === 0 ? 'house' : 'farm',
                    professions[villagerIndex % professions.length],
                    spawnedVillagers
                );
                villagerIndex++;
            }
        }

        return spawnedVillagers;
    }

    private tryPlaceBuildingAt(
        world: World,
        targetX: number,
        targetZ: number,
        type: 'house' | 'farm',
        profession: VillagerProfession,
        villagerList: { pos: THREE.Vector3; profession: VillagerProfession }[]
    ): void {
        const size = type === 'house' ? 5 : 6;
        const radius = Math.ceil(size / 2);

        // Check if bounding box collides with existing village structures
        if (this.checkCollision(targetX, targetZ, size, size)) {
            return; // Collision detected, skip placement
        }

        // Get ground level at building center
        const targetY = world.getTerrainHeight ? world.getTerrainHeight(targetX, targetZ) : 64;

        if (type === 'house') {
            this.placeTemplate(world, targetX, targetY, targetZ, HOUSE_TEMPLATE);
            // Spawn a villager inside the house (relative dx=0, dy=0, dz=0)
            const villagerPos = new THREE.Vector3(targetX, targetY + 1.2, targetZ);
            villagerList.push({ pos: villagerPos, profession: profession });
        } else {
            this.placeTemplate(world, targetX, targetY, targetZ, FARM_TEMPLATE);
            // Spawn farmer on the farm field
            const villagerPos = new THREE.Vector3(targetX - 1, targetY + 1.2, targetZ - 1);
            villagerList.push({ pos: villagerPos, profession: VillagerProfession.FARMER });
        }

        this.addBoundingBox(targetX, targetZ, size, size);
    }

    // Places blocks defined in template relative to (cx, cy, cz)
    private placeTemplate(world: World, cx: number, cy: number, cz: number, template: BlockTemplate[]): void {
        for (const t of template) {
            const bx = cx + t.dx;
            const by = cy + t.dy;
            const bz = cz + t.dz;

            // 1. Place the structural block itself
            world.setBlock(bx, by, bz, t.blockType);

            // 2. Jigsaw Ground Match: If foundation layer (dy = -1), apply structural columns downward
            if (t.dy === -1 && t.blockType !== BlockType.AIR && t.blockType !== BlockType.WATER) {
                this.applyFoundation(world, bx, by - 1, bz, BlockType.COBBLESTONE);
            }
        }
    }

    // Digs down and places supporting blocks until it hits solid ground
    private applyFoundation(world: World, x: number, startY: number, z: number, blockType: BlockType): void {
        let currentY = startY;
        const maxDepth = 15; // Limit depth to prevent infinite loops

        while (currentY > 0 && (currentY > startY - maxDepth)) {
            const currentBlock = world.getBlock(x, currentY, z);
            
            // If we hit a solid block (not AIR or WATER), we stop the foundation column
            if (currentBlock !== BlockType.AIR && currentBlock !== BlockType.WATER) {
                break;
            }

            // Fill empty space with cobble/dirt
            world.setBlock(x, currentY, z, blockType);
            currentY--;
        }
    }

    // Builds a flat gravel/cobble road along a direction vector
    private buildRoad(world: World, cx: number, cy: number, cz: number, dx: number, dz: number, length: number): void {
        for (let i = 1; i <= length; i++) {
            const rx = cx + dx * i;
            const rz = cz + dz * i;
            const ry = world.getTerrainHeight ? world.getTerrainHeight(rx, rz) : cy;

            // 3-wide road layout perpendicular to travel axis
            const px = -dz; // Perpendicular vector x
            const pz = dx;  // Perpendicular vector z

            for (let offset = -1; offset <= 1; offset++) {
                const rxOff = rx + px * offset;
                const rzOff = rz + pz * offset;
                const ryOff = world.getTerrainHeight ? world.getTerrainHeight(rxOff, rzOff) : ry;

                // Flatten space 3 blocks above road
                for (let h = 0; h <= 2; h++) {
                    world.setBlock(rxOff, ryOff + h + 1, rzOff, BlockType.AIR);
                }

                // Place cobblestone road path
                world.setBlock(rxOff, ryOff, rzOff, BlockType.COBBLESTONE);

                // Re-apply solid base right below road if needed
                this.applyFoundation(world, rxOff, ryOff - 1, rzOff, BlockType.DIRT);
            }
        }
    }

    private addBoundingBox(cx: number, cz: number, w: number, h: number): void {
        const halfW = Math.ceil(w / 2);
        const halfH = Math.ceil(h / 2);
        this.activeBoxes.push({
            minX: cx - halfW - 1,
            maxX: cx + halfW + 1,
            minZ: cz - halfH - 1,
            maxZ: cz + halfH + 1,
        });
    }

    private checkCollision(cx: number, cz: number, w: number, h: number): boolean {
        const halfW = Math.ceil(w / 2);
        const halfH = Math.ceil(h / 2);
        const newBox = {
            minX: cx - halfW,
            maxX: cx + halfW,
            minZ: cz - halfH,
            maxZ: cz + halfH,
        };

        for (const box of this.activeBoxes) {
            // Standard AABB 2D overlap check
            if (
                newBox.maxX >= box.minX &&
                newBox.minX <= box.maxX &&
                newBox.maxZ >= box.minZ &&
                newBox.minZ <= box.maxZ
            ) {
                return true; // Collides!
            }
        }
        return false;
    }
}
