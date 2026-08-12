import { createNoise2D } from 'simplex-noise';
import { CONFIG } from './constants';

export class NoiseGenerator {
    private noise2D: (x: number, y: number) => number;
    private seed: number;

    constructor(seed: number = CONFIG.seed) {
        this.seed = seed;
        // Use a proper seeded random function for simplex-noise
        const seededRandom = this.createSeededRandom(seed);
        this.noise2D = createNoise2D(seededRandom);
    }

    private createSeededRandom(seed: number): () => number {
        let s = seed;
        return () => {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    getHeight(worldX: number, worldZ: number): number {
        const scale1 = 0.005;
        const scale2 = 0.02;
        const scale3 = 0.001;

        const n1 = this.noise2D(worldX * scale1, worldZ * scale1) * 1.0;
        const n2 = this.noise2D(worldX * scale2 + 100, worldZ * scale2 + 100) * 0.5;
        const n3 = this.noise2D(worldX * scale3 + 200, worldZ * scale3 + 200) * 2.0;

        let height = (n1 + n2 + n3) * 20 + 64;
        height = Math.max(1, Math.min(CONFIG.worldHeight - 1, Math.round(height)));

        // --- Village Area Flattening & Smoothing ---
        const centerX = 64;
        const centerZ = 64;
        const flatRadius = 36; // 64 - 36 = 28, 64 + 36 = 100 (flat base of the village structures)
        const blendRadius = 46; // 64 - 46 = 18, 64 + 46 = 110 (10-block smooth transition slope)

        const dx = worldX - centerX;
        const dz = worldZ - centerZ;
        const dist = Math.max(Math.abs(dx), Math.abs(dz)); // Chebyshev distance (creates a neat square plateau)

        const villageY = 60; // Base height matching the spawner layout

        if (dist <= flatRadius) {
            return villageY;
        } else if (dist <= blendRadius) {
            const t = (dist - flatRadius) / (blendRadius - flatRadius);
            return Math.round(villageY * (1 - t) + height * t);
        }

        return height;
    }

    get3D(worldX: number, worldY: number, worldZ: number): number {
        const scale = 0.03;
        const nx = this.noise2D(worldX * scale, worldZ * scale);
        const ny = this.noise2D(worldX * scale + 500, worldZ * scale + 500);
        const nz = this.noise2D(worldX * scale + 1000, worldZ * scale + 1000);
        return (nx + ny + nz) / 3;
    }
}