import * as THREE from 'three';
import { BlockType } from './types';
import { TextureAtlas } from './TextureAtlas';

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
}

export class BlockParticles {
    private scene: THREE.Scene;
    private textureAtlas: TextureAtlas;
    private particles: Particle[] = [];
    private material: THREE.MeshLambertMaterial;

    constructor(scene: THREE.Scene, textureAtlas: TextureAtlas) {
        this.scene = scene;
        this.textureAtlas = textureAtlas;
        
        // Shared material using the same texture atlas as blocks
        this.material = new THREE.MeshLambertMaterial({
            map: this.textureAtlas.texture,
            transparent: true,
            alphaTest: 0.1
        });
    }

    spawn(x: number, y: number, z: number, blockType: BlockType): void {
        const uvs = this.textureAtlas.getUV(blockType, 0); // Use top face texture for simplicity
        if (!uvs) return;

        const [u1, v1, u2, v2] = uvs;
        
        // Spawn 8 to 15 particles per broken block
        const count = 8 + Math.floor(Math.random() * 8);

        for (let i = 0; i < count; i++) {
            // Randomize particle sizes slightly
            const size = 0.1 + Math.random() * 0.15;
            const geo = new THREE.BoxGeometry(size, size, size);
            
            // Map the UVs to the specific block tile in the atlas
            const uvAttr = geo.attributes.uv;
            for (let j = 0; j < uvAttr.count; j++) {
                const u = uvAttr.getX(j);
                const v = uvAttr.getY(j);
                uvAttr.setXY(j, u1 + u * (u2 - u1), v1 + v * (v2 - v1));
            }

            const mesh = new THREE.Mesh(geo, this.material);
            
            // Random start position clustered near the center of the block
            mesh.position.set(
                x + 0.2 + Math.random() * 0.6,
                y + 0.2 + Math.random() * 0.6,
                z + 0.2 + Math.random() * 0.6
            );

            // Random rotation
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            this.scene.add(mesh);

            // Outward velocity burst (Minecraft popping effect)
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 4 + 2, // Pop upwards
                (Math.random() - 0.5) * 4
            );

            this.particles.push({
                mesh,
                velocity,
                life: 0,
                maxLife: 0.3 + Math.random() * 0.3 // Live for 0.3 - 0.6 seconds
            });
        }
    }

    update(deltaTime: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += deltaTime;

            if (p.life >= p.maxLife) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose(); // Free memory
                this.particles.splice(i, 1);
                continue;
            }

            // Heavy gravity for snappy fall
            p.velocity.y -= 15 * deltaTime; 

            // Apply velocity
            p.mesh.position.addScaledVector(p.velocity, deltaTime);

            // Spin continuously
            p.mesh.rotation.x += deltaTime * 4;
            p.mesh.rotation.y += deltaTime * 4;

            // Shrink as they approach end of life
            const shrink = 1 - Math.pow(p.life / p.maxLife, 2);
            p.mesh.scale.setScalar(Math.max(0, shrink));
        }
    }
}
