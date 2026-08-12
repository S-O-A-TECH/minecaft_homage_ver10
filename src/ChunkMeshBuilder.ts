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

    // High performance lookup to check if a block blocks ambient light
    private isOccludingBlock(x: number, y: number, z: number): boolean {
        const block = this.world.getBlock(x, y, z);
        return block !== BlockType.AIR && block !== BlockType.WATER && block !== BlockType.GLASS && block !== BlockType.LEAVES;
    }

    // Voxel Ambient Occlusion calculation for each vertex
    private getVertexAO(wx: number, wy: number, wz: number, face: number, vertIndex: number): number {
        let side1 = false;
        let side2 = false;
        let corner = false;

        // Perform spatial checks relative to the vertex and face
        switch (face) {
            case 0: // TOP (y+)
                if (vertIndex === 0) { // [0, 1, 1]
                    side1 = this.isOccludingBlock(wx - 1, wy + 1, wz);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz + 1);
                    corner = this.isOccludingBlock(wx - 1, wy + 1, wz + 1);
                } else if (vertIndex === 1) { // [1, 1, 1]
                    side1 = this.isOccludingBlock(wx + 1, wy + 1, wz);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz + 1);
                    corner = this.isOccludingBlock(wx + 1, wy + 1, wz + 1);
                } else if (vertIndex === 2) { // [1, 1, 0]
                    side1 = this.isOccludingBlock(wx + 1, wy + 1, wz);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz - 1);
                    corner = this.isOccludingBlock(wx + 1, wy + 1, wz - 1);
                } else { // [0, 1, 0]
                    side1 = this.isOccludingBlock(wx - 1, wy + 1, wz);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz - 1);
                    corner = this.isOccludingBlock(wx - 1, wy + 1, wz - 1);
                }
                break;
            case 1: // BOTTOM (y-)
                if (vertIndex === 0) { // [0, 0, 0]
                    side1 = this.isOccludingBlock(wx - 1, wy - 1, wz);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz - 1);
                    corner = this.isOccludingBlock(wx - 1, wy - 1, wz - 1);
                } else if (vertIndex === 1) { // [1, 0, 0]
                    side1 = this.isOccludingBlock(wx + 1, wy - 1, wz);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz - 1);
                    corner = this.isOccludingBlock(wx + 1, wy - 1, wz - 1);
                } else if (vertIndex === 2) { // [1, 0, 1]
                    side1 = this.isOccludingBlock(wx + 1, wy - 1, wz);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz + 1);
                    corner = this.isOccludingBlock(wx + 1, wy - 1, wz + 1);
                } else { // [0, 0, 1]
                    side1 = this.isOccludingBlock(wx - 1, wy - 1, wz);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz + 1);
                    corner = this.isOccludingBlock(wx - 1, wy - 1, wz + 1);
                }
                break;
            case 2: // NORTH (z-)
                if (vertIndex === 0) { // [0, 0, 0]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz - 1);
                    corner = this.isOccludingBlock(wx - 1, wy - 1, wz - 1);
                } else if (vertIndex === 1) { // [0, 1, 0]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz - 1);
                    corner = this.isOccludingBlock(wx - 1, wy + 1, wz - 1);
                } else if (vertIndex === 2) { // [1, 1, 0]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz - 1);
                    corner = this.isOccludingBlock(wx + 1, wy + 1, wz - 1);
                } else { // [1, 0, 0]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz - 1);
                    corner = this.isOccludingBlock(wx + 1, wy - 1, wz - 1);
                }
                break;
            case 3: // SOUTH (z+)
                if (vertIndex === 0) { // [1, 0, 1]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz + 1);
                    corner = this.isOccludingBlock(wx + 1, wy - 1, wz + 1);
                } else if (vertIndex === 1) { // [1, 1, 1]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz + 1);
                    corner = this.isOccludingBlock(wx + 1, wy + 1, wz + 1);
                } else if (vertIndex === 2) { // [0, 1, 1]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx, wy + 1, wz + 1);
                    corner = this.isOccludingBlock(wx - 1, wy + 1, wz + 1);
                } else { // [0, 0, 1]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx, wy - 1, wz + 1);
                    corner = this.isOccludingBlock(wx - 1, wy - 1, wz + 1);
                }
                break;
            case 4: // EAST (x+)
                if (vertIndex === 0) { // [1, 0, 0]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx + 1, wy - 1, wz);
                    corner = this.isOccludingBlock(wx + 1, wy - 1, wz - 1);
                } else if (vertIndex === 1) { // [1, 1, 0]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx + 1, wy + 1, wz);
                    corner = this.isOccludingBlock(wx + 1, wy + 1, wz - 1);
                } else if (vertIndex === 2) { // [1, 1, 1]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx + 1, wy + 1, wz);
                    corner = this.isOccludingBlock(wx + 1, wy + 1, wz + 1);
                } else { // [1, 0, 1]
                    side1 = this.isOccludingBlock(wx + 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx + 1, wy - 1, wz);
                    corner = this.isOccludingBlock(wx + 1, wy - 1, wz + 1);
                }
                break;
            case 5: // WEST (x-)
                if (vertIndex === 0) { // [0, 0, 1]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx - 1, wy - 1, wz);
                    corner = this.isOccludingBlock(wx - 1, wy - 1, wz + 1);
                } else if (vertIndex === 1) { // [0, 1, 1]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz + 1);
                    side2 = this.isOccludingBlock(wx - 1, wy + 1, wz);
                    corner = this.isOccludingBlock(wx - 1, wy + 1, wz + 1);
                } else if (vertIndex === 2) { // [0, 1, 0]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx - 1, wy + 1, wz);
                    corner = this.isOccludingBlock(wx - 1, wy + 1, wz - 1);
                } else { // [0, 0, 0]
                    side1 = this.isOccludingBlock(wx - 1, wy, wz - 1);
                    side2 = this.isOccludingBlock(wx - 1, wy - 1, wz);
                    corner = this.isOccludingBlock(wx - 1, wy - 1, wz - 1);
                }
                break;
        }

        // Return a color factor multiplier based on vertex occlusion density
        if (side1 && side2) return 0.50;
        if ((side1 && corner) || (side2 && corner)) return 0.70;
        if (side1 || side2) return 0.80;
        if (corner) return 0.88;
        return 1.0;
    }

    build(): THREE.Mesh | null {
        const worldX = this.chunk.position.cx * CHUNK_SIZE;
        const worldZ = this.chunk.position.cz * CHUNK_SIZE;

        const positions: number[] = [];
        const normals: number[] = [];
        const colors: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        let vertexCount = 0;

        for (let ly = 0; ly < WORLD_HEIGHT; ly++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                    const blockType = this.chunk.getBlock(lx, ly, lz);
                    if (blockType === BlockType.AIR) continue;

                    const wx = worldX + lx;
                    const wz = worldZ + lz;

                    if (blockType === BlockType.FURNACE) {
                        vertexCount = this.buildFurnace(lx, ly, lz, worldX, worldZ, positions, normals, colors, uvs, indices, vertexCount);
                    } else if (blockType === BlockType.CAMPFIRE) {
                        vertexCount = this.buildCampfire(lx, ly, lz, worldX, worldZ, positions, normals, colors, uvs, indices, vertexCount);
                    } else if (blockType === BlockType.TORCH) {
                        vertexCount = this.buildTorch(lx, ly, lz, worldX, worldZ, positions, normals, colors, uvs, indices, vertexCount);
                    } else {
                        const isLiquid = blockType === BlockType.WATER || blockType === BlockType.LAVA;
                        let h = 1.0;
                        if (isLiquid) {
                            let level = this.chunk.getLiquidLevel(lx, ly, lz);
                            if (level === 0) level = 8;
                            h = 0.15 + (level - 1) * 0.114;
                        }

                        for (let face = 0; face < 6; face++) {
                            if (!this.isFaceVisible(lx, ly, lz, face)) continue;

                            const verts = FACE_VERTICES[face];
                            const normal = FACE_NORMALS[face];
                            const [u1, v1, u2, v2] = this.textureAtlas.getUV(blockType, face);

                            // Apply directional lighting contrast (Minecraft shading)
                            // Top is brightest, bottom is darkest, walls are in between
                            let faceShade = 1.0;
                            if (face === 1) faceShade = 0.50; // BOTTOM
                            else if (face === 4 || face === 5) faceShade = 0.85; // EAST / WEST
                            else if (face === 2 || face === 3) faceShade = 0.70; // NORTH / SOUTH

                            for (let v = 0; v < 4; v++) {
                                const vertY = verts[v][1] === 1 ? h : 0;
                                positions.push(
                                    wx + verts[v][0],
                                    ly + vertY,
                                    wz + verts[v][2]
                                );
                                normals.push(normal[0], normal[1], normal[2]);
                                
                                // Fetch vertex AO factor
                                const ao = this.getVertexAO(wx, ly, wz, face, v);
                                const finalColorShade = ao * faceShade;
                                colors.push(finalColorShade, finalColorShade, finalColorShade);
                            }

                            uvs.push(u1, v1);
                            uvs.push(u2, v1);
                            uvs.push(u2, v2);
                            uvs.push(u1, v2);

                            indices.push(
                                vertexCount, vertexCount + 1, vertexCount + 2,
                                vertexCount, vertexCount + 2, vertexCount + 3
                            );
                            vertexCount += 4;
                        }
                    }
                }
            }
        }

        if (positions.length === 0) return null;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();

        const material = new THREE.MeshLambertMaterial({
            map: this.textureAtlas.texture,
            vertexColors: true, // Crucial for vertex-based smooth lighting!
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }


    private buildFurnace(
        lx: number, ly: number, lz: number, worldX: number, worldZ: number,
        positions: number[], normals: number[], colors: number[], uvs: number[], indices: number[], vertexCount: number
    ): number {
        // Hearth stone walls
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0, 0, 0, 0.2, 0.35, 1, BlockType.COBBLESTONE, positions, normals, colors, uvs, indices, vertexCount, false);
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.8, 0, 0, 1.0, 0.35, 1, BlockType.COBBLESTONE, positions, normals, colors, uvs, indices, vertexCount, false);
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.2, 0, 0, 0.8, 0.35, 0.2, BlockType.COBBLESTONE, positions, normals, colors, uvs, indices, vertexCount, false);
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.2, 0, 0.8, 0.8, 0.35, 1.0, BlockType.COBBLESTONE, positions, normals, colors, uvs, indices, vertexCount, false);
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.2, 0, 0.2, 0.8, 0.1, 0.8, BlockType.COBBLESTONE, positions, normals, colors, uvs, indices, vertexCount, false);

        // Fire planes inside
        vertexCount = this.buildIntersectingPlanes(lx, ly, lz, worldX, worldZ, 0.1, 0.9, BlockType.FURNACE, positions, normals, colors, uvs, indices, vertexCount);
        return vertexCount;
    }

    private buildCampfire(
        lx: number, ly: number, lz: number, worldX: number, worldZ: number,
        positions: number[], normals: number[], colors: number[], uvs: number[], indices: number[], vertexCount: number
    ): number {
        // Wooden logs at bottom
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.1, 0, 0.25, 0.9, 0.2, 0.45, BlockType.WOOD, positions, normals, colors, uvs, indices, vertexCount, false);
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.1, 0, 0.55, 0.9, 0.2, 0.75, BlockType.WOOD, positions, normals, colors, uvs, indices, vertexCount, false);

        // Intersecting fire planes
        vertexCount = this.buildIntersectingPlanes(lx, ly, lz, worldX, worldZ, 0.15, 0.9, BlockType.FURNACE, positions, normals, colors, uvs, indices, vertexCount);
        return vertexCount;
    }

    private buildTorch(
        lx: number, ly: number, lz: number, worldX: number, worldZ: number,
        positions: number[], normals: number[], colors: number[], uvs: number[], indices: number[], vertexCount: number
    ): number {
        // Torch stick
        vertexCount = this.buildCuboid(lx, ly, lz, worldX, worldZ, 0.45, 0, 0.45, 0.55, 0.6, 0.55, BlockType.WOOD, positions, normals, colors, uvs, indices, vertexCount, false);

        // Flame planes
        const [u1, v1, u2, v2] = this.textureAtlas.getUV(BlockType.FURNACE, 0);
        const planes = [
            [[0.4, 0.6, 0.4], [0.6, 0.6, 0.6], [0.6, 0.9, 0.6], [0.4, 0.9, 0.4]],
            [[0.4, 0.6, 0.6], [0.6, 0.6, 0.4], [0.6, 0.9, 0.4], [0.4, 0.9, 0.6]]
        ];
        for (const plane of planes) {
            for (let v = 0; v < 4; v++) {
                positions.push(
                    worldX + lx + plane[v][0],
                    ly + plane[v][1],
                    worldZ + lz + plane[v][2]
                );
                normals.push(0, 1, 0);
                colors.push(1.0, 0.9, 0.7); // Bright warm flame color
            }
            uvs.push(u1, v1);
            uvs.push(u2, v1);
            uvs.push(u2, v2);
            uvs.push(u1, v2);
            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount, vertexCount + 2, vertexCount + 3
            );
            vertexCount += 4;
        }
        return vertexCount;
    }

    private buildIntersectingPlanes(
        lx: number, ly: number, lz: number, worldX: number, worldZ: number,
        minY: number, maxY: number,
        textureBlockType: BlockType,
        positions: number[], normals: number[], colors: number[], uvs: number[], indices: number[], vertexCount: number
    ): number {
        const [u1, v1, u2, v2] = this.textureAtlas.getUV(textureBlockType, 0);
        const planes = [
            [[0.2, minY, 0.2], [0.8, minY, 0.8], [0.8, maxY, 0.8], [0.2, maxY, 0.2]],
            [[0.2, minY, 0.8], [0.8, minY, 0.2], [0.8, maxY, 0.2], [0.2, maxY, 0.8]]
        ];
        
        for (const plane of planes) {
            for (let v = 0; v < 4; v++) {
                positions.push(
                    worldX + lx + plane[v][0],
                    ly + plane[v][1],
                    worldZ + lz + plane[v][2]
                );
                normals.push(0, 1, 0);
                colors.push(1.0, 0.85, 0.5); // Warm fiery ambient glow
            }
            uvs.push(u1, v1);
            uvs.push(u2, v1);
            uvs.push(u2, v2);
            uvs.push(u1, v2);
            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount, vertexCount + 2, vertexCount + 3
            );
            vertexCount += 4;
        }
        return vertexCount;
    }

    private buildCuboid(
        lx: number, ly: number, lz: number, worldX: number, worldZ: number,
        minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number,
        blockType: BlockType,
        positions: number[], normals: number[], colors: number[], uvs: number[], indices: number[], vertexCount: number,
        isTopPlate: boolean
    ): number {
        const customVertices: Record<number, number[][]> = {
            0: [[minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ], [minX, maxY, minZ]], // TOP
            1: [[minX, minY, minZ], [maxX, minY, minZ], [maxX, minY, maxZ], [minX, minY, maxZ]], // BOTTOM
            2: [[minX, minY, minZ], [minX, maxY, minZ], [maxX, maxY, minZ], [maxX, minY, minZ]], // NORTH
            3: [[maxX, minY, maxZ], [maxX, maxY, maxZ], [minX, maxY, maxZ], [minX, minY, maxZ]], // SOUTH
            4: [[maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ], [maxX, minY, maxZ]], // EAST
            5: [[minX, minY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ], [minX, minY, minZ]], // WEST
        };

        for (let face = 0; face < 6; face++) {
            if (face === 1 && !isTopPlate && !this.isFaceVisible(lx, ly, lz, 1)) continue;

            const verts = customVertices[face];
            const normal = FACE_NORMALS[face];
            const [u1, v1, u2, v2] = this.textureAtlas.getUV(blockType, face);

            // Shading offsets
            let faceShade = 1.0;
            if (face === 1) faceShade = 0.50;
            else if (face === 4 || face === 5) faceShade = 0.85;
            else if (face === 2 || face === 3) faceShade = 0.70;

            for (let v = 0; v < 4; v++) {
                positions.push(
                    worldX + lx + verts[v][0],
                    ly + verts[v][1],
                    worldZ + lz + verts[v][2]
                );
                normals.push(normal[0], normal[1], normal[2]);
                
                // Get vertex AO factor for custom shapes
                const ao = this.getVertexAO(worldX + lx, ly, worldZ + lz, face, v);
                const finalColorShade = ao * faceShade;
                colors.push(finalColorShade, finalColorShade, finalColorShade);
            }

            uvs.push(u1, v1);
            uvs.push(u2, v1);
            uvs.push(u2, v2);
            uvs.push(u1, v2);

            indices.push(
                vertexCount, vertexCount + 1, vertexCount + 2,
                vertexCount, vertexCount + 2, vertexCount + 3
            );
            vertexCount += 4;
        }
        return vertexCount;
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

        const neighbor = this.world.getBlock(nx, ny, nz);

        if (neighbor === BlockType.AIR) return true;
        if (neighbor === BlockType.WATER && blockType !== BlockType.WATER) return true;
        if (neighbor === BlockType.GLASS && blockType !== BlockType.GLASS) return true;
        if (neighbor === BlockType.LEAVES && blockType !== BlockType.LEAVES) return true;

        return false;
    }
}