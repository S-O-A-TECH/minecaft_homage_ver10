import * as THREE from 'three';
import { BlockType } from './types';
import { CHUNK_SIZE, WORLD_HEIGHT } from './constants';
import { Chunk } from './Chunk';
import { TextureAtlas } from './TextureAtlas';
import { World } from './World';

const FACE_VERTICES: Record<number, number[][]> = {
    0: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], // TOP (y+)
    1: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], // BOTTOM (y-)
    2: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], // NORTH (z-)
    3: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], // SOUTH (z+)
    4: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], // EAST (x+)
    5: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], // WEST (x-)
};

const FACE_NORMALS: Record<number, number[]> = {
    0: [0, 1, 0],
    1: [0, -1, 0],
    2: [0, 0, -1],
    3: [0, 0, 1],
    4: [1, 0, 0],
    5: [-1, 0, 0],
};

export class ChunkMeshBuilder {
    private chunk: Chunk;
    private textureAtlas: TextureAtlas;
    private world: World;

    constructor(chunk: Chunk, textureAtlas: TextureAtlas, world: World) {
        this.chunk = chunk;
        this.textureAtlas = textureAtlas;
        this.world = world;
    }

    build(): THREE.Mesh | null {
        const worldX = this.chunk.position.cx * CHUNK_SIZE;
        const worldZ = this.chunk.position.cz * CHUNK_SIZE;

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexCount = 0;

        for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                    const blockType = this.chunk.getBlock(lx, ly, lz);
                    if (blockType === BlockType.AIR) continue;

                    for (let face = 0; face < 6; face++) {
                        if (!this.isFaceVisible(lx, ly, lz, face)) continue;

                        const verts = FACE_VERTICES[face];
                        const normal = FACE_NORMALS[face];
                        const [u1, v1, u2, v2] = this.textureAtlas.getUV(blockType, face);

                        // Add 4 vertices for this face
                        for (let v = 0; v < 4; v++) {
                            positions.push(
                                worldX + lx + verts[v][0],
                                ly + verts[v][1],
                                worldZ + lz + verts[v][2]
                            );
                            normals.push(normal[0], normal[1], normal[2]);
                        }

                        // UVs (v is inverted: Canvas Y-down vs OpenGL Y-up)
                        uvs.push(u1, v1); // bottom-left in UV space
                        uvs.push(u2, v1); // bottom-right
                        uvs.push(u2, v2); // top-right
                        uvs.push(u1, v2); // top-left

                        // Two triangles (counter-clockwise winding for front face)
                        indices.push(
                            vertexCount, vertexCount + 1, vertexCount + 2,
                            vertexCount, vertexCount + 2, vertexCount + 3
                        );
                        vertexCount += 4;
                    }
                }
            }
        }

        if (positions.length === 0) return null;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();

        const material = new THREE.MeshLambertMaterial({
            map: this.textureAtlas.texture,
            side: THREE.FrontSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    private isFaceVisible(lx: number, ly: number, lz: number, face: number): boolean {
        const blockType = this.chunk.getBlock(lx, ly, lz);
        if (blockType === BlockType.AIR) return false;

        const worldX = this.chunk.position.cx * CHUNK_SIZE + lx;
        const worldZ = this.chunk.position.cz * CHUNK_SIZE + lz;

        let nx = worldX, ny = ly, nz = worldZ;
        switch (face) {
            case 0: ny++; break; // TOP
            case 1: ny--; break; // BOTTOM
            case 2: nz--; break; // NORTH
            case 3: nz++; break; // SOUTH
            case 4: nx++; break; // EAST
            case 5: nx--; break; // WEST
        }

        // Use World.getBlock to check across chunk boundaries
        const neighbor = this.world.getBlock(nx, ny, nz);

        // Face is visible if neighbor is air or transparent
        if (neighbor === BlockType.AIR) return true;
        if (neighbor === BlockType.WATER && blockType !== BlockType.WATER) return true;
        if (neighbor === BlockType.GLASS && blockType !== BlockType.GLASS) return true;
        if (neighbor === BlockType.LEAVES && blockType !== BlockType.LEAVES) return true;

        return false;
    }
}