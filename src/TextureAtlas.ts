import * as THREE from 'three';
import { BlockType } from './types';

const TILE_SIZE = 16;
const ATLAS_COLS = 8;
const ATLAS_SIZE = TILE_SIZE * ATLAS_COLS;

export class TextureAtlas {
    public texture: THREE.CanvasTexture;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = ATLAS_SIZE;
        this.canvas.height = ATLAS_SIZE;
        this.ctx = this.canvas.getContext('2d')!;
        this.generateTextures();
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.wrapS = THREE.ClampToEdgeWrapping;
        this.texture.wrapT = THREE.ClampToEdgeWrapping;
        this.texture.colorSpace = THREE.SRGBColorSpace;
    }

    private generateTextures(): void {
        this.drawGrassTop(0, 0);
        this.drawGrassSide(1, 0);
        this.drawDirt(2, 0);
        this.drawStone(3, 0);
        this.drawWoodSide(4, 0);
        this.drawWoodTop(5, 0);
        this.drawLeaves(6, 0);
        this.drawSand(7, 0);
        this.drawPlanks(0, 1);
        this.drawCobblestone(1, 1);
        this.drawBrick(2, 1);
        this.drawGlass(3, 1);
        this.drawSnow(4, 1);
    }

    private fillRect(x: number, y: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    private addNoise(x: number, y: number, baseColor: string, variation: number): void {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        const imageData = this.ctx.getImageData(px, py, TILE_SIZE, TILE_SIZE);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * variation * 2;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        this.ctx.putImageData(imageData, px, py);
    }

    private drawGrassTop(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#5a8f3d';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 40; i++) {
            const gx = px + Math.random() * TILE_SIZE;
            const gy = py + Math.random() * TILE_SIZE;
            this.ctx.fillStyle = `rgb(${70 + Math.random() * 40},${130 + Math.random() * 40},${50 + Math.random() * 30})`;
            this.ctx.fillRect(gx, gy, 2, 2);
        }
    }

    private drawGrassSide(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#8B6914';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 30; i++) {
            const gx = px + Math.random() * TILE_SIZE;
            const gy = py + Math.random() * TILE_SIZE;
            this.ctx.fillStyle = `rgb(${120 + Math.random() * 30},${90 + Math.random() * 30},${15 + Math.random() * 15})`;
            this.ctx.fillRect(gx, gy, 2, 2);
        }
        this.ctx.fillStyle = '#5a8f3d';
        this.ctx.fillRect(px, py, TILE_SIZE, 4);
    }

    private drawDirt(col: number, row: number): void {
        this.addNoise(col, row, '#8B6914', 15);
    }

    private drawStone(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#7F7F7F';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 25; i++) {
            const sx = px + Math.random() * TILE_SIZE;
            const sy = py + Math.random() * TILE_SIZE;
            const shade = 100 + Math.random() * 60;
            this.ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            this.ctx.fillRect(sx, sy, 3 + Math.random() * 3, 3 + Math.random() * 3);
        }
    }

    private drawWoodSide(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#8B6914';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 8; i++) {
            const wy = py + i * 2;
            this.ctx.fillStyle = `rgb(${110 + Math.random() * 20},${85 + Math.random() * 20},${15 + Math.random() * 10})`;
            this.ctx.fillRect(px, wy, TILE_SIZE, 2);
        }
    }

    private drawWoodTop(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#A08050';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;
        for (let r = 6; r > 0; r -= 1) {
            this.ctx.strokeStyle = `rgb(${120 + r * 10},${90 + r * 10},${50 + r * 5})`;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    private drawLeaves(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#3a7d24';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 50; i++) {
            const lx = px + Math.random() * TILE_SIZE;
            const ly = py + Math.random() * TILE_SIZE;
            this.ctx.fillStyle = `rgb(${40 + Math.random() * 40},${100 + Math.random() * 50},${20 + Math.random() * 30})`;
            this.ctx.fillRect(lx, ly, 3, 3);
        }
    }

    private drawSand(col: number, row: number): void {
        this.addNoise(col, row, '#E8D5A3', 10);
    }

    private drawPlanks(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#BC8F4F';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 4; i++) {
            const py2 = py + i * 4;
            this.ctx.fillStyle = `rgb(${170 + Math.random() * 20},${130 + Math.random() * 20},${70 + Math.random() * 15})`;
            this.ctx.fillRect(px, py2, TILE_SIZE, 3);
        }
    }

    private drawCobblestone(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#6B6B6B';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        for (let i = 0; i < 12; i++) {
            const cx = px + Math.random() * TILE_SIZE;
            const cy = py + Math.random() * TILE_SIZE;
            const s = 3 + Math.random() * 5;
            const shade = 90 + Math.random() * 40;
            this.ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            this.ctx.fillRect(cx, cy, s, s);
        }
    }

    private drawBrick(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = '#B53C2C';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        this.ctx.strokeStyle = '#8B2500';
        this.ctx.lineWidth = 1;
        for (let row = 0; row < 4; row++) {
            const offset = row % 2 === 0 ? 0 : TILE_SIZE / 2;
            for (let col = -1; col < 3; col++) {
                this.ctx.strokeRect(px + col * 8 + offset, py + row * 4, 8, 4);
            }
        }
    }

    private drawGlass(col: number, row: number): void {
        const px = col * TILE_SIZE;
        const py = row * TILE_SIZE;
        this.ctx.fillStyle = 'rgba(180,220,255,0.4)';
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    private drawSnow(col: number, row: number): void {
        this.addNoise(col, row, '#F0F5F9', 5);
    }

    getUV(blockType: BlockType, face: number): [number, number, number, number] {
        let col = 0;
        let row = 0;

        switch (blockType) {
            case BlockType.GRASS:
                if (face === 0) { col = 0; row = 0; } // top
                else if (face === 1) { col = 2; row = 0; } // bottom = dirt
                else { col = 1; row = 0; } // side
                break;
            case BlockType.DIRT: col = 2; row = 0; break;
            case BlockType.STONE: col = 3; row = 0; break;
            case BlockType.WOOD:
                if (face === 0 || face === 1) { col = 5; row = 0; }
                else { col = 4; row = 0; }
                break;
            case BlockType.LEAVES: col = 6; row = 0; break;
            case BlockType.SAND: col = 7; row = 0; break;
            case BlockType.PLANKS: col = 0; row = 1; break;
            case BlockType.COBBLESTONE: col = 1; row = 1; break;
            case BlockType.BRICK: col = 2; row = 1; break;
            case BlockType.GLASS: col = 3; row = 1; break;
            case BlockType.SNOW: col = 4; row = 1; break;
            default: col = 2; row = 0; break;
        }

        const u = col / ATLAS_COLS;
        const v = 1.0 - (row + 1) / ATLAS_COLS; // Flip Y for OpenGL UV
        const uvSize = 1 / ATLAS_COLS;
        return [u, v, u + uvSize, v + uvSize];
    }
}