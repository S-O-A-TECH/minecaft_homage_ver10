import * as THREE from 'three';
import { ChunkPosition, BlockType } from './types';
import { CHUNK_SIZE, WORLD_HEIGHT, CONFIG } from './constants';
import { Chunk } from './Chunk';
import { NoiseGenerator } from './NoiseGenerator';
import { TextureAtlas } from './TextureAtlas';

export class World {
    private chunks: Map<string, Chunk> = new Map();
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private noiseGen: NoiseGenerator;
    private textureAtlas: TextureAtlas;
    private chunkBuildQueue: Chunk[] = [];
    private maxBuildsPerFrame: number = 2;
    public chunkModifications: Map<string, Map<string, BlockType>> = new Map();

    constructor(scene: THREE.Scene, camera: THREE.Camera, noiseGen: NoiseGenerator, textureAtlas: TextureAtlas) {
        this.scene = scene;
        this.camera = camera;
        this.noiseGen = noiseGen;
        this.textureAtlas = textureAtlas;
    }

    private chunkKey(cx: number, cz: number): string {
        return `${cx},${cz}`;
    }

    getChunk(cx: number, cz: number): Chunk | undefined {
        return this.chunks.get(this.chunkKey(cx, cz));
    }

    getChunkMeshes(): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh) meshes.push(chunk.mesh);
        }
        return meshes;
    }

    getBlock(worldX: number, worldY: number, worldZ: number): BlockType {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return BlockType.AIR;

        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        const chunk = this.getChunk(cx, cz);
        if (!chunk) return BlockType.AIR;

        return chunk.getBlock(lx, worldY, lz);
    }

    public getTerrainHeight(worldX: number, worldZ: number): number {
        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) {
            return this.noiseGen.getHeight(worldX, worldZ);
        }
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            const block = this.getBlock(worldX, y, worldZ);
            if (block !== BlockType.AIR && block !== BlockType.WATER && block !== BlockType.LAVA) {
                return y;
            }
        }
        return 64; // Default fallback height
    }

    setBlock(worldX: number, worldY: number, worldZ: number, type: BlockType): void {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return;

        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        const chunk = this.getChunk(cx, cz);
        if (chunk) {
            chunk.setBlock(lx, worldY, lz, type);
        }

        // Always record modification, even if chunk is not loaded
        const chunkKeyStr = this.chunkKey(cx, cz);
        if (!this.chunkModifications.has(chunkKeyStr)) {
            this.chunkModifications.set(chunkKeyStr, new Map());
        }
        this.chunkModifications.get(chunkKeyStr)!.set(`${lx},${worldY},${lz}`, type);

        // Mark neighboring chunks dirty if block is on edge
        if (lx === 0) this.markNeighborDirty(cx - 1, cz);
        if (lx === CHUNK_SIZE - 1) this.markNeighborDirty(cx + 1, cz);
        if (lz === 0) this.markNeighborDirty(cx, cz - 1);
        if (lz === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cz + 1);
    }

    getLiquidLevel(worldX: number, worldY: number, worldZ: number): number {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return 0;

        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 0;

        return chunk.getLiquidLevel(lx, worldY, lz);
    }

    setLiquidLevel(worldX: number, worldY: number, worldZ: number, level: number): void {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return;

        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        const chunk = this.getChunk(cx, cz);
        if (chunk) {
            chunk.setLiquidLevel(lx, worldY, lz, level);
        }

        // Trigger neighbor updates to force clean geometry regeneration
        if (lx === 0) this.markNeighborDirty(cx - 1, cz);
        if (lx === CHUNK_SIZE - 1) this.markNeighborDirty(cx + 1, cz);
        if (lz === 0) this.markNeighborDirty(cx, cz - 1);
        if (lz === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cz + 1);
    }

    private markNeighborDirty(cx: number, cz: number): void {
        const neighbor = this.getChunk(cx, cz);
        if (neighbor) {
            neighbor.isDirty = true;
        }
    }

    update(playerX: number, playerZ: number): void {
        const playerCX = Math.floor(playerX / CHUNK_SIZE);
        const playerCZ = Math.floor(playerZ / CHUNK_SIZE);
        const renderDist = CONFIG.renderDistance;

        // Create frustum for visibility checking
        const frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(this.camera.projectionMatrix);

        // Create a box to represent chunk bounds
        const chunkBox = new THREE.Box3();

        // Load/unload chunks with frustum culling
        const neededChunks = new Set<string>();

        for (let dx = -renderDist; dx <= renderDist; dx++) {
            for (let dz = -renderDist; dz <= renderDist; dz++) {
                const cx = playerCX + dx;
                const cz = playerCZ + dz;
                const key = this.chunkKey(cx, cz);

                // Calculate chunk bounds in world coordinates
                const chunkMin = new THREE.Vector3(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
                const chunkMax = new THREE.Vector3((cx + 1) * CHUNK_SIZE, WORLD_HEIGHT, (cz + 1) * CHUNK_SIZE);
                chunkBox.set(chunkMin, chunkMax);

                // Check if chunk is visible in camera frustum or is very close to the player (within 2 chunks)
                // This prevents chunks directly underneath/behind the player from being culled, ensuring solid ground physics at all times.
                const distToPlayer = Math.max(Math.abs(dx), Math.abs(dz));
                if (distToPlayer <= 2 || frustum.intersectsBox(chunkBox)) {
                    neededChunks.add(key);

                    if (!this.chunks.has(key)) {
                        const chunk = new Chunk(
                            { cx, cz },
                            this.scene,
                            this.noiseGen,
                            this.textureAtlas,
                            this
                        );

                        // Apply tracked modifications immediately after generation
                        const mods = this.chunkModifications.get(key);
                        if (mods) {
                            for (const [posStr, type] of mods.entries()) {
                                const [lx, y, lz] = posStr.split(',').map(Number);
                                chunk.setBlock(lx, y, lz, type);
                            }
                        }

                        this.chunks.set(key, chunk);
                        this.chunkBuildQueue.push(chunk);
                    }
                }
            }
        }

        // Unload far chunks
        for (const [key, chunk] of this.chunks) {
            if (!neededChunks.has(key)) {
                chunk.dispose();
                this.chunks.delete(key);
            }
        }

        // Build dirty chunks (limited per frame)
        let buildsThisFrame = 0;

        // First, rebuild dirty chunks
        for (const chunk of this.chunks.values()) {
            if (chunk.isDirty && buildsThisFrame < this.maxBuildsPerFrame) {
                chunk.buildMesh();
                buildsThisFrame++;
            }
        }

        // Then, build new chunks from queue
        while (this.chunkBuildQueue.length > 0 && buildsThisFrame < this.maxBuildsPerFrame) {
            const chunk = this.chunkBuildQueue.shift()!;
            if (chunk.isDirty) {
                chunk.buildMesh();
                buildsThisFrame++;
            }
        }
    }

    getLoadedChunkCount(): number {
        return this.chunks.size;
    }

    getQueuedChunkCount(): number {
        return this.chunkBuildQueue.length;
    }

    getState(): any {
        const modifications: any = {};
        for (const [chunkKey, mods] of this.chunkModifications.entries()) {
            const chunkObj: any = {};
            for (const [pos, type] of mods.entries()) {
                chunkObj[pos] = type;
            }
            modifications[chunkKey] = chunkObj;
        }
        return {
            chunkModifications: modifications
        };
    }

    setState(data: any): void {
        this.chunkModifications.clear();
        if (data.chunkModifications) {
            for (const chunkKey in data.chunkModifications) {
                const chunkObj = data.chunkModifications[chunkKey];
                const mods = new Map<string, BlockType>();
                for (const pos in chunkObj) {
                    mods.set(pos, chunkObj[pos]);
                }
                this.chunkModifications.set(chunkKey, mods);
            }
        }

        // Re-apply to currently loaded chunks
        for (const [chunkKey, chunk] of this.chunks.entries()) {
            const mods = this.chunkModifications.get(chunkKey);
            if (mods) {
                for (const [posStr, type] of mods.entries()) {
                    const [lx, y, lz] = posStr.split(',').map(Number);
                    chunk.setBlock(lx, y, lz, type);
                }
                chunk.isDirty = true;
            }
        }
    }
}