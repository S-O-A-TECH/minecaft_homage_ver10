import * as THREE from 'three';
import { ChunkPosition, BlockType } from './types';
import { CHUNK_SIZE, WORLD_HEIGHT, CONFIG } from './constants';
import { Chunk } from './Chunk';
import { NoiseGenerator } from './NoiseGenerator';
import { TextureAtlas } from './TextureAtlas';

export class World {
    private chunks: Map<string, Chunk> = new Map();
    private scene: THREE.Scene;
    private noiseGen: NoiseGenerator;
    private textureAtlas: TextureAtlas;
    private chunkBuildQueue: Chunk[] = [];
    private maxBuildsPerFrame: number = 2;

    constructor(scene: THREE.Scene, noiseGen: NoiseGenerator, textureAtlas: TextureAtlas) {
        this.scene = scene;
        this.noiseGen = noiseGen;
        this.textureAtlas = textureAtlas;
    }

    private chunkKey(cx: number, cz: number): string {
        return `${cx},${cz}`;
    }

    getChunk(cx: number, cz: number): Chunk | undefined {
        return this.chunks.get(this.chunkKey(cx, cz));
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

    setBlock(worldX: number, worldY: number, worldZ: number, type: BlockType): void {
        if (worldY < 0 || worldY >= WORLD_HEIGHT) return;

        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        const chunk = this.getChunk(cx, cz);
        if (!chunk) return;

        chunk.setBlock(lx, worldY, lz, type);

        // Mark neighboring chunks dirty if block is on edge
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

        // Load/unload chunks
        const neededChunks = new Set<string>();

        for (let dx = -renderDist; dx <= renderDist; dx++) {
            for (let dz = -renderDist; dz <= renderDist; dz++) {
                const cx = playerCX + dx;
                const cz = playerCZ + dz;
                const key = this.chunkKey(cx, cz);
                neededChunks.add(key);

                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(
                        { cx, cz },
                        this.scene,
                        this.noiseGen,
                        this.textureAtlas,
                        this
                    );
                    this.chunks.set(key, chunk);
                    this.chunkBuildQueue.push(chunk);
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
}