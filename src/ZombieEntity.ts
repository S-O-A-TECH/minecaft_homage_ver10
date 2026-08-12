import * as THREE from 'three';
import { MobEntity } from './MobEntity';
import { World } from './World';
import { MobType } from './types';

export class ZombieEntity extends MobEntity {
    private isAlerted: boolean = false;
    private alertTimer: number = 0;

    private headGroup!: THREE.Group;
    private leftArm!: THREE.Group;
    private rightArm!: THREE.Group;

    constructor(id: string, startPos: THREE.Vector3, world: World) {
        // Max HP: 20, Speed: 2.5, Damage: 3 (hearts = 1.5)
        super(id, MobType.ZOMBIE, startPos, world, 20, 2.5, 3);
        this.buildMesh();
    }

    private buildMesh(): void {
        // Main high-fidelity materials for zombie
        const skinMat = new THREE.MeshLambertMaterial({ color: 0x388e3c }); // Green decaying skin
        const skinDarkMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 }); // Dark green rotting skin/hair
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x00838f }); // Tattered teal shirt
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x283593 }); // Indigo pants
        const fleshMat = new THREE.MeshLambertMaterial({ color: 0xc62828 }); // Red blood/exposed flesh
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee }); // Rotting bone/teeth
        const eyeSocketMat = new THREE.MeshLambertMaterial({ color: 0x111111 }); // Dark hollow eyes
        const eyePupilMat = new THREE.MeshLambertMaterial({ color: 0xff3d00 }); // Glowing orange-red pupils
        const bootMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 }); // Worn brown leather boots

        // 1. HEAD GROUP (Detailed with hair, nose, hollow eye sockets, glowing pupils, jaw, fangs)
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.75, 0);

        // Head Main Box
        const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headMesh.castShadow = true;
        this.headGroup.add(headMesh);

        // Rotting hair cap on top of head
        const hairGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5);
        const hairMesh = new THREE.Mesh(hairGeo, skinDarkMat);
        hairMesh.position.set(0, 0.24, 0);
        hairMesh.castShadow = true;
        this.headGroup.add(hairMesh);

        // Clumps of rotting hair on the back and sides
        const hairClump1Geo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        const hairClump1 = new THREE.Mesh(hairClump1Geo, skinDarkMat);
        hairClump1.position.set(-0.2, 0.15, -0.24);
        this.headGroup.add(hairClump1);

        const hairClump2 = new THREE.Mesh(hairClump1Geo, skinDarkMat);
        hairClump2.position.set(0.2, 0.1, -0.24);
        this.headGroup.add(hairClump2);

        // 3D Rotting nose
        const noseGeo = new THREE.BoxGeometry(0.08, 0.14, 0.08);
        const nose = new THREE.Mesh(noseGeo, skinDarkMat);
        nose.position.set(0, -0.02, 0.25);
        nose.castShadow = true;
        this.headGroup.add(nose);

        // Eyes: Hollow sockets with glowing pupils
        const eyeSocketGeo = new THREE.BoxGeometry(0.12, 0.08, 0.02);
        const eyePupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);

        // Left Eye
        const leftSocket = new THREE.Mesh(eyeSocketGeo, eyeSocketMat);
        leftSocket.position.set(-0.13, 0.08, 0.24);
        this.headGroup.add(leftSocket);
        const leftPupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
        leftPupil.position.set(-0.13, 0.08, 0.25);
        this.headGroup.add(leftPupil);

        // Right Eye
        const rightSocket = new THREE.Mesh(eyeSocketGeo, eyeSocketMat);
        rightSocket.position.set(0.13, 0.08, 0.24);
        this.headGroup.add(rightSocket);
        const rightPupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
        rightPupil.position.set(0.13, 0.08, 0.25);
        this.headGroup.add(rightPupil);

        // Hanging rotting jaw/teeth
        const jawGeo = new THREE.BoxGeometry(0.24, 0.06, 0.02);
        const jaw = new THREE.Mesh(jawGeo, skinDarkMat);
        jaw.position.set(0, -0.16, 0.23);
        this.headGroup.add(jaw);

        // Rotting fangs/teeth inside mouth
        const toothGeo = new THREE.BoxGeometry(0.03, 0.04, 0.02);
        const tooth1 = new THREE.Mesh(toothGeo, boneMat);
        tooth1.position.set(-0.06, -0.12, 0.24);
        this.headGroup.add(tooth1);
        const tooth2 = new THREE.Mesh(toothGeo, boneMat);
        tooth2.position.set(0.06, -0.12, 0.24);
        this.headGroup.add(tooth2);

        this.mesh.add(this.headGroup);

        // 2. TORSO GROUP (Detailed with torn shirt, neck, belt, and exposed cuts)
        const torsoGroup = new THREE.Group();
        torsoGroup.position.set(0, 0.2, 0);

        // Torso shirt main box
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
        const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
        torsoMesh.castShadow = true;
        torsoGroup.add(torsoMesh);

        // Neck (visible decayed skin)
        const neckGeo = new THREE.BoxGeometry(0.14, 0.12, 0.14);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.set(0, 0.32, 0);
        torsoGroup.add(neck);

        // Torso shirt collar
        const collarGeo = new THREE.BoxGeometry(0.22, 0.03, 0.22);
        const collar = new THREE.Mesh(collarGeo, shirtMat);
        collar.position.set(0, 0.3, 0);
        torsoGroup.add(collar);

        // Left Ribs exposed cut
        const ribCutSkin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.02), skinDarkMat);
        ribCutSkin.position.set(-0.12, 0.08, 0.13);
        torsoGroup.add(ribCutSkin);
        const ribsExposed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), fleshMat);
        ribsExposed.position.set(-0.12, 0.08, 0.14);
        torsoGroup.add(ribsExposed);

        // Right stomach tear exposing flesh
        const stomachTear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), skinDarkMat);
        stomachTear.position.set(0.12, -0.15, 0.13);
        torsoGroup.add(stomachTear);
        const fleshExposed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), fleshMat);
        fleshExposed.position.set(0.12, -0.15, 0.14);
        torsoGroup.add(fleshExposed);

        // Worn brown belt
        const beltGeo = new THREE.BoxGeometry(0.52, 0.05, 0.27);
        const belt = new THREE.Mesh(beltGeo, bootMat);
        belt.position.set(0, -0.28, 0);
        torsoGroup.add(belt);

        this.mesh.add(torsoGroup);

        // 3. LEFT LEG GROUP (Pants with tattered cuffs and boots)
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.15, -0.4, 0);

        // Pants Main Leg Box
        const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
        leftLegMesh.castShadow = true;
        leftLegGroup.add(leftLegMesh);

        // Worn boot at bottom
        const bootGeo = new THREE.BoxGeometry(0.22, 0.08, 0.24);
        const leftBoot = new THREE.Mesh(bootGeo, bootMat);
        leftBoot.position.set(0, -0.28, 0.02);
        leftBoot.castShadow = true;
        leftLegGroup.add(leftBoot);

        // Knee tear exposing green rot
        const kneeTear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.02), skinDarkMat);
        kneeTear.position.set(0, 0.05, 0.11);
        leftLegGroup.add(kneeTear);

        this.mesh.add(leftLegGroup);

        // 4. RIGHT LEG GROUP
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.15, -0.4, 0);

        // Pants Main Leg Box
        const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
        rightLegMesh.castShadow = true;
        rightLegGroup.add(rightLegMesh);

        // Worn boot at bottom
        const rightBoot = new THREE.Mesh(bootGeo, bootMat);
        rightBoot.position.set(0, -0.28, 0.02);
        rightBoot.castShadow = true;
        rightLegGroup.add(rightBoot);

        this.mesh.add(rightLegGroup);

        // 5. LEFT ARM GROUP (Decayed skin, tattered sleeve, rotting patches)
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.34, 0.35, 0.2);

        // Arm decaying skin main box
        const armGeo = new THREE.BoxGeometry(0.18, 0.18, 0.5);
        const leftArmMesh = new THREE.Mesh(armGeo, skinMat);
        leftArmMesh.castShadow = true;
        this.leftArm.add(leftArmMesh);

        // Torn shirt sleeve box on upper arm (near shoulder/back)
        const sleeveGeo = new THREE.BoxGeometry(0.2, 0.2, 0.18);
        const leftSleeve = new THREE.Mesh(sleeveGeo, shirtMat);
        leftSleeve.position.set(0, 0, -0.14);
        leftSleeve.castShadow = true;
        this.leftArm.add(leftSleeve);

        // Rotting patches on the arm
        const rotPatchGeo = new THREE.BoxGeometry(0.04, 0.06, 0.2);
        const leftRotPatch = new THREE.Mesh(rotPatchGeo, skinDarkMat);
        leftRotPatch.position.set(-0.08, 0.04, 0.05);
        this.leftArm.add(leftRotPatch);

        this.mesh.add(this.leftArm);

        // 6. RIGHT ARM GROUP (Decayed skin, tattered sleeve, rotting patches)
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.34, 0.35, 0.2);

        // Arm decaying skin main box
        const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
        rightArmMesh.castShadow = true;
        this.rightArm.add(rightArmMesh);

        // Torn shirt sleeve box on upper arm
        const rightSleeve = new THREE.Mesh(sleeveGeo, shirtMat);
        rightSleeve.position.set(0, 0, -0.14);
        rightSleeve.castShadow = true;
        this.rightArm.add(rightSleeve);

        // Rotting patches on the arm
        const rightRotPatch = new THREE.Mesh(rotPatchGeo, skinDarkMat);
        rightRotPatch.position.set(0.08, 0.04, 0.05);
        this.rightArm.add(rightRotPatch);

        this.mesh.add(this.rightArm);
    }

    public update(deltaTime: number, playerPos: THREE.Vector3, scene: THREE.Scene, activeMobs: MobEntity[]): void {
        if (this.isDead) return;

        this.updateHurtFlash(deltaTime);

        // Calculate horizontal offset vector to player
        const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
        toPlayer.y = 0; // horizontal tracking
        const distance = toPlayer.length();

        // 35 block default detection range, or alert state
        const detectionRange = this.isAlerted ? 50.0 : 35.0;

        if (distance <= detectionRange) {
            // Face the player
            const angle = Math.atan2(toPlayer.x, toPlayer.z);
            this.mesh.rotation.y = angle;

            // Move towards player
            toPlayer.normalize();
            this.velocity.x = toPlayer.x * this.speed;
            this.velocity.z = toPlayer.z * this.speed;
            
            // Premium crawling/swaying animations
            const time = Date.now() * 0.005;
            
            // Asymmetric zombie arm dragging motion
            this.leftArm.position.y = 0.35 + Math.sin(time) * 0.04;
            this.rightArm.position.y = 0.35 - Math.sin(time) * 0.04;
            
            // Wobble/dragging head tilt animation for premium voxel character feel
            this.headGroup.rotation.z = Math.sin(time * 0.5) * 0.05;
            this.headGroup.rotation.x = 0.1 + Math.cos(time * 0.5) * 0.05;
        } else {
            // Passive wandering / idle
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Apply physics
        this.moveWithCollision(deltaTime);
    }

    /**
     * Alert nearby zombies to coordinate a swarm when this zombie is hit!
     */
    public takeDamage(amount: number, knockbackDir?: THREE.Vector3): void {
        super.takeDamage(amount, knockbackDir);
        this.isAlerted = true;
    }

    public alert(): void {
        this.isAlerted = true;
    }
}
