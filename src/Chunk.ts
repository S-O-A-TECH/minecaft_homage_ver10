import * as THREE from 'three';
import { BlockType, ChunkPosition } from './types';
import { CHUNK_SIZE, WORLD_HEIGHT, CHUNK_VOLUME } from './constants';
import { NoiseGenerator } from './NoiseGenerator';
import { ChunkMeshBuilder } from './ChunkMeshBuilder';
import { TextureAtlas } from './TextureAtlas';
import { World } from './World';

export class Chunk {
    public position: ChunkPosition;
    public blocks: Uint8Array;
    public mesh: THREE.Mesh | null = null;
    public isDirty: boolean = true;
    private scene: THREE.Scene;
    private noiseGen: NoiseGenerator;
    private meshBuilder: ChunkMeshBuilder;
    private textureAtlas: TextureAtlas;
    private world: World;

    constructor(
        position: ChunkPosition,
        scene: THREE.Scene,
        noiseGen: NoiseGenerator,
        textureAtlas: TextureAtlas,
        world: World
    ) {
        this.position = position;
        this.scene = scene;
        this.noiseGen = noiseGen;
        this.textureAtlas = textureAtlas;
        this.world = world;
        this.blocks = new Uint8Array(CHUNK_VOLUME);
        this.meshBuilder = new ChunkMeshBuilder(this, textureAtlas, world);
        this.generateTerrain();
    }

    private getIndex(x: number, y: number, z: number): number {
        return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
    }

    getBlock(lx: number, ly: number, lz: number): BlockType {
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= WORLD_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            return BlockType.AIR;
        }
        return this.blocks[this.getIndex(lx, ly, lz)] as BlockType;
    }

    setBlock(lx: number, ly: number, lz: number, type: BlockType): void {
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= WORLD_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) {
            return;
        }
        this.blocks[this.getIndex(lx, ly, lz)] = type;
        this.isDirty = true;
    }

    private generateTerrain(): void {
        const worldX = this.position.cx * CHUNK_SIZE;
        const worldZ = this.position.cz * CHUNK_SIZE;

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const wx = worldX + lx;
                const wz = worldZ + lz;
                const height = this.noiseGen.getHeight(wx, wz);

                for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
                    const wy = ly;
                    let blockType = BlockType.AIR;

                    if (wy === 0) {
                        blockType = BlockType.STONE;
                    } else if (wy < height - 4) {
                        blockType = BlockType.STONE;
                    } else if (wy < height) {
                        blockType = BlockType.DIRT;
                    } else if (wy === height) {
                        if (height < 40) {
                            blockType = BlockType.SAND;
                        } else if (height > 100) {
                            blockType = BlockType.SNOW;
                        } else {
                            blockType = BlockType.GRASS;
                        }
                    }

                    this.blocks[this.getIndex(lx, ly, lz)] = blockType;
                }

                // Generate trees
                if (lx > 2 && lx < CHUNK_SIZE - 2 && lz > 2 && lz < CHUNK_SIZE - 2) {
                    const treeChance = this.noiseGen.get3D(wx, 0, wz);
                    if (treeChance > 0.3 && height > 40 && height < 100) {
                        this.generateTree(lx, height + 1, lz);
                    }
                }
            }
        }
    }

    private generateTree(baseX: number, baseY: number, baseZ: number): void {
        const trunkHeight = 4 + Math.floor(Math.random() * 3);

        // Trunk
        for (let y = 0; y < trunkHeight; y++) {
            this.setBlock(baseX, baseY + y, baseZ, BlockType.WOOD);
        }

        // Leaves
        for (let dy = trunkHeight - 2; dy <= trunkHeight + 1; dy++) {
            const radius = dy >= trunkHeight ? 1 : 2;
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0 && dy < trunkHeight) continue;
                    if (Math.abs(dx) === radius && Math.abs(dz) === radius && Math.random() > 0.5) continue;
                    const lx = baseX + dx;
                    const ly = baseY + dy;
                    const lz = baseZ + dz;
                    if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < WORLD_HEIGHT && lz >= 0 && lz < CHUNK_SIZE) {
                        if (this.getBlock(lx, ly, lz) === BlockType.AIR) {
                            this.setBlock(lx, ly, lz, BlockType.LEAVES);
                        }
                    }
                }
            }
        }
    }

    buildMesh(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }

        this.mesh = this.meshBuilder.build();
        if (this.mesh) {
            this.scene.add(this.mesh);
        }
        this.isDirty = false;
    }

    dispose(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }
    }
}