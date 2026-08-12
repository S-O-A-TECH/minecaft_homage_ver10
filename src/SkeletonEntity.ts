import * as THREE from 'three';
import { MobEntity } from './MobEntity';
import { World } from './World';
import { MobType } from './types';

export class ArrowProjectile {
    public mesh: THREE.Mesh;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public isDead: boolean = false;
    private world: World;
    private scene: THREE.Scene;
    private damage: number = 4; // arrow damage: 4 HP (2 hearts)
    private lifeTime: number = 0;

    constructor(startPos: THREE.Vector3, targetPos: THREE.Vector3, world: World, scene: THREE.Scene) {
        this.position = startPos.clone();
        this.world = world;
        this.scene = scene;

        // Build arrow mesh (thin cylinder)
        const arrowGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
        arrowGeo.rotateX(Math.PI / 2); // align forward
        const arrowMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 }); // light brown wood
        this.mesh = new THREE.Mesh(arrowGeo, arrowMat);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // Vector pointing to target with minor parabolic arch bias
        const dir = new THREE.Vector3().subVectors(targetPos, startPos);
        const dist = dir.length();
        dir.y += dist * 0.15; // upward arch bias based on distance
        dir.normalize();

        // Speed: 25 m/s
        this.velocity = dir.multiplyScalar(22.0);
    }

    public update(deltaTime: number, playerPos: THREE.Vector3, triggerPlayerDamageCallback: (amount: number) => void): void {
        if (this.isDead) return;

        this.lifeTime += deltaTime;
        if (this.lifeTime > 8.0) {
            this.destroy();
            return;
        }

        // Apply arrow gravity (12 m/s^2 downward, lighter than entities)
        this.velocity.y -= 12.0 * deltaTime;

        // Update position
        this.position.addScaledVector(this.velocity, deltaTime);
        this.mesh.position.copy(this.position);

        // Rotate arrow to align with velocity vector
        if (this.velocity.lengthSq() > 0.01) {
            const currentDir = this.velocity.clone().normalize();
            const angleY = Math.atan2(currentDir.x, currentDir.z);
            const angleX = -Math.asin(currentDir.y);
            this.mesh.rotation.set(angleX, angleY, 0);
        }

        // 1. Check world voxel collision
        const cx = Math.floor(this.position.x);
        const cy = Math.floor(this.position.y);
        const cz = Math.floor(this.position.z);
        const hitBlock = this.world.getBlock(cx, cy, cz);
        if (hitBlock !== 0 && hitBlock !== 7 && hitBlock !== 28 && hitBlock !== 19) {
            // Landed on solid block -> kill arrow projectile
            this.destroy();
            return;
        }

        // 2. Check player bounding box overlap
        const distToPlayerH = Math.sqrt(Math.pow(this.position.x - playerPos.x, 2) + Math.pow(this.position.z - playerPos.z, 2));
        const distToPlayerV = Math.abs(this.position.y - (playerPos.y + 0.9)); // against player chest height
        if (distToPlayerH < 0.5 && distToPlayerV < 0.9) {
            triggerPlayerDamageCallback(this.damage);
            this.destroy();
        }
    }

    public destroy(): void {
        this.isDead = true;
        this.scene.remove(this.mesh);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (Array.isArray(this.mesh.material)) {
            this.mesh.material.forEach(m => m.dispose());
        } else {
            this.mesh.material.dispose();
        }
    }
}

export class SkeletonEntity extends MobEntity {
    private shootTimer: number = 0;
    private strafeTimer: number = 0;
    private strafeDir: number = 1; // 1 = right, -1 = left

    constructor(id: string, startPos: THREE.Vector3, world: World) {
        // Max HP: 20, Speed: 2.8, Damage: 2 (melee contact, skeleton relies on arrow shoots)
        super(id, MobType.SKELETON, startPos, world, 20, 2.8, 2);
        this.buildMesh();
    }

    private buildMesh(): void {
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 }); // bone grey
        const darkBoneMat = new THREE.MeshLambertMaterial({ color: 0xb5b5b5 }); // shaded bone grey for depth
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }); // deep hollow sockets for eyes & mouth
        const bowMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 }); // brown oak wood for the bow
        const bowStringMat = new THREE.MeshBasicMaterial({ color: 0xdddddd }); // light grey string

        // 1. 머리 (Detailed Head - 0.48 x 0.48 x 0.48)
        const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
        const head = new THREE.Mesh(headGeo, boneMat);
        head.position.set(0, 0.75, 0);
        head.castShadow = true;
        this.mesh.add(head);

        // 1-1. 입체감 있는 해골 얼굴 조형 (Hollow Eyes & Mouth)
        // 왼쪽 눈구멍 복셀
        const leftEyeGeo = new THREE.BoxGeometry(0.09, 0.07, 0.02);
        const leftEye = new THREE.Mesh(leftEyeGeo, eyeMat);
        leftEye.position.set(-0.11, 0.04, 0.241); // slightly forward to avoid z-fighting
        head.add(leftEye);

        // 오른쪽 눈구멍 복셀
        const rightEyeGeo = new THREE.BoxGeometry(0.09, 0.07, 0.02);
        const rightEye = new THREE.Mesh(rightEyeGeo, eyeMat);
        rightEye.position.set(0.11, 0.04, 0.241);
        head.add(rightEye);

        // 이가 빠진 벌어진 입 틈새 복셀
        const mouthGeo = new THREE.BoxGeometry(0.22, 0.05, 0.02);
        const mouth = new THREE.Mesh(mouthGeo, eyeMat);
        mouth.position.set(0, -0.11, 0.241);
        head.add(mouth);

        // 2. 몸통 - 입체 갈비뼈 골격 구조! (Ribcage & Spine)
        // 척추 대 (Central Spine Column)
        const spineGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
        const spine = new THREE.Mesh(spineGeo, darkBoneMat);
        spine.position.set(0, 0.2, 0);
        spine.castShadow = true;
        this.mesh.add(spine);

        // 어깨뼈/빗장뼈 (Shoulder / Clavicle)
        const clavicleGeo = new THREE.BoxGeometry(0.38, 0.06, 0.12);
        const clavicle = new THREE.Mesh(clavicleGeo, boneMat);
        clavicle.position.set(0, 0.47, 0);
        clavicle.castShadow = true;
        this.mesh.add(clavicle);

        // 3단 가로 갈비뼈 (3-tier Horizontal Ribs)
        const ribYPositions = [0.36, 0.24, 0.12];
        ribYPositions.forEach(yVal => {
            const ribGeo = new THREE.BoxGeometry(0.32, 0.05, 0.12);
            const rib = new THREE.Mesh(ribGeo, boneMat);
            rib.position.set(0, yVal, 0);
            rib.castShadow = true;
            this.mesh.add(rib);
        });

        // 골반 뼈 (Pelvis)
        const pelvisGeo = new THREE.BoxGeometry(0.28, 0.06, 0.12);
        const pelvis = new THREE.Mesh(pelvisGeo, boneMat);
        pelvis.position.set(0, -0.06, 0);
        pelvis.castShadow = true;
        this.mesh.add(pelvis);

        // 3. 다리 (가느다란 해골 뼈다귀 다리 - 두께 0.08)
        const legGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
        
        // 왼쪽 다리
        const leftLeg = new THREE.Mesh(legGeo, boneMat);
        leftLeg.position.set(-0.10, -0.4, 0);
        leftLeg.castShadow = true;
        this.mesh.add(leftLeg);

        // 오른쪽 다리
        const rightLeg = new THREE.Mesh(legGeo, boneMat);
        rightLeg.position.set(0.10, -0.4, 0);
        rightLeg.castShadow = true;
        this.mesh.add(rightLeg);

        // 4. 가느다란 뼈다귀 팔 (두께 0.08)
        const armGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);

        // 왼팔
        const leftArm = new THREE.Mesh(armGeo, boneMat);
        leftArm.position.set(-0.23, 0.2, 0);
        leftArm.castShadow = true;
        this.mesh.add(leftArm);

        // 오른팔
        const rightArm = new THREE.Mesh(armGeo, boneMat);
        rightArm.position.set(0.23, 0.2, 0);
        rightArm.castShadow = true;
        this.mesh.add(rightArm);

        // 5. 입체감 있는 목제 활 (Detailed Curved Bow)
        const bowGroup = new THREE.Group();
        
        // 활대 중앙부 (Bow Grip)
        const bowGripGeo = new THREE.BoxGeometry(0.03, 0.22, 0.03);
        const bowGrip = new THREE.Mesh(bowGripGeo, bowMat);
        bowGroup.add(bowGrip);

        const bowPartGeo = new THREE.BoxGeometry(0.03, 0.16, 0.03);
        
        // 활대 상단부 (Curved Upper Bow)
        const bowUpper = new THREE.Mesh(bowPartGeo, bowMat);
        bowUpper.position.set(0.02, 0.16, -0.04);
        bowUpper.rotation.z = -0.15; // inward curve
        bowGroup.add(bowUpper);

        // 활대 하단부 (Curved Lower Bow)
        const bowLower = new THREE.Mesh(bowPartGeo, bowMat);
        bowLower.position.set(0.02, -0.16, -0.04);
        bowLower.rotation.z = 0.15; // inward curve
        bowGroup.add(bowLower);

        // 팽팽한 활시위 (Bow String)
        const stringGeo = new THREE.BoxGeometry(0.008, 0.48, 0.008);
        const bowString = new THREE.Mesh(stringGeo, bowStringMat);
        bowString.position.set(0.03, 0, -0.09);
        bowGroup.add(bowString);

        // 활 장착 (오른팔에 부착 및 오프셋 미세 조율)
        bowGroup.position.set(0, -0.22, 0.08);
        rightArm.add(bowGroup);

        // 시그니처 활 조준 포즈 세팅 (양팔을 앞으로 치켜들어 화살을 조준하는 모습)
        leftArm.rotation.x = -Math.PI / 2.25;  // 왼팔 앞으로 쭉 뻗기
        leftArm.rotation.y = 0.18;            // 가볍게 몸 안쪽으로 조준 정렬
        rightArm.rotation.x = -Math.PI / 2.25; // 오른팔 앞으로 쭉 뻗어 활 고정
        rightArm.rotation.y = -0.18;           // 안쪽으로 조준 정렬
    }

    public update(
        deltaTime: number,
        playerPos: THREE.Vector3,
        scene: THREE.Scene,
        activeMobs: MobEntity[],
        spawnArrowCallback?: (arrow: ArrowProjectile) => void
    ): void {
        if (this.isDead) return;

        this.updateHurtFlash(deltaTime);

        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
        const dist = toPlayer.length();

        if (dist <= 16.0) {
            // Face the player
            const angle = Math.atan2(toPlayer.x, toPlayer.z);
            this.mesh.rotation.y = angle;

            // FSM AI: Strait, Strafing, Backstepping
            if (dist < 6.0) {
                // Backstep to maintain archer range!
                toPlayer.y = 0;
                toPlayer.normalize();
                this.velocity.x = -toPlayer.x * this.speed;
                this.velocity.z = -toPlayer.z * this.speed;
            } else if (dist <= 12.0) {
                // Strafe sideways to dodge player hits!
                this.strafeTimer += deltaTime;
                if (this.strafeTimer > 1.5) {
                    this.strafeTimer = 0;
                    if (Math.random() < 0.5) this.strafeDir *= -1; // toggle left/right
                }

                // Perpendicular vector for strafing
                const strafeVector = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
                this.velocity.x = strafeVector.x * this.speed * this.strafeDir;
                this.velocity.z = strafeVector.z * this.speed * this.strafeDir;
            } else {
                // Chase to enter range
                toPlayer.y = 0;
                toPlayer.normalize();
                this.velocity.x = toPlayer.x * this.speed;
                this.velocity.z = toPlayer.z * this.speed;
            }

            // Shoot arrow projectile every 2.0 seconds
            this.shootTimer += deltaTime;
            if (this.shootTimer >= 2.0) {
                this.shootTimer = 0;
                if (spawnArrowCallback) {
                    // Spawn arrow from skeleton chest height to player chest height
                    const start = this.position.clone().add(new THREE.Vector3(0, 0.4, 0));
                    const arrow = new ArrowProjectile(start, playerPos.clone().add(new THREE.Vector3(0, 0.9, 0)), this.world, scene);
                    spawnArrowCallback(arrow);
                }
            }
        } else {
            // Idle
            this.velocity.x = 0;
            this.velocity.z = 0;
            this.shootTimer = 0;
        }

        // Move mesh and process AABB collisions
        this.moveWithCollision(deltaTime);
    }
}
