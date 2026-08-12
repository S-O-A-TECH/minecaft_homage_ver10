import * as THREE from 'three';
import { MobEntity } from './MobEntity';
import { World } from './World';
import { BlockType, MobType, VillagerProfession, VillagerTrade, VillagerState, ItemType } from './types';
import { AStarPathfinder } from './AStarPathfinder';

export class VillagerEntity extends MobEntity {
    public profession: VillagerProfession;
    public villagerState: VillagerState = VillagerState.WANDER;
    public trades: VillagerTrade[] = [];
    public tradeLevel: number = 1; // 1: Apprentice, 2: Journeyman, 3: Expert, 4: Master
    public tradeXp: number = 0;
    public demandIndex: Map<ItemType, number> = new Map(); // tracks dynamic demand factor

    private pathfinder: AStarPathfinder;
    private currentPath: THREE.Vector3[] = [];
    private pathTargetIndex: number = 0;
    private stateTimer: number = 0;

    // Home, Work, and Well anchors in voxel coordinates
    private homePos: THREE.Vector3;
    private workPos: THREE.Vector3;
    private wellPos: THREE.Vector3;

    // 3D Joint Parts
    private headGroup!: THREE.Group;
    private foldedArms!: THREE.Group;
    private robeMesh!: THREE.Mesh;

    constructor(id: string, startPos: THREE.Vector3, world: World, profession: VillagerProfession) {
        // Max HP: 20, Speed: 0.6, Damage: 0 (peaceful NPC)
        super(id, MobType.VILLAGER, startPos, world, 20, 0.6, 0);
        this.profession = profession;
        this.pathfinder = new AStarPathfinder(this.world);

        // Define building anchors based on spawn location
        this.homePos = startPos.clone();
        this.workPos = startPos.clone().add(new THREE.Vector3(5, 0, 5));
        this.wellPos = startPos.clone().add(new THREE.Vector3(-10, 0, -10));

        this.initTrades();
        this.buildMesh();
    }

    private initTrades(): void {
        this.demandIndex.clear();
        if (this.profession === VillagerProfession.FARMER) {
            this.trades = [
                { inputItem: ItemType.APPLE, inputCount: 15, outputItem: ItemType.EMERALD, outputCount: 1, demand: 0, maxUses: 12, uses: 0 },
                { inputItem: ItemType.EMERALD, inputCount: 1, outputItem: ItemType.BAKED_APPLE, outputCount: 4, demand: 0, maxUses: 16, uses: 0 }
            ];
        } else if (this.profession === VillagerProfession.WEAPONSMITH) {
            this.trades = [
                { inputItem: ItemType.IRON_INGOT, inputCount: 6, outputItem: ItemType.EMERALD, outputCount: 1, demand: 0, maxUses: 12, uses: 0 },
                { inputItem: ItemType.EMERALD, inputCount: 3, outputItem: ItemType.STONE_SWORD, outputCount: 1, demand: 0, maxUses: 8, uses: 0 }
            ];
        } else {
            // Cleric
            this.trades = [
                { inputItem: ItemType.GOLD_INGOT, inputCount: 4, outputItem: ItemType.EMERALD, outputCount: 1, demand: 0, maxUses: 12, uses: 0 },
                { inputItem: ItemType.EMERALD, inputCount: 2, outputItem: ItemType.COAL, outputCount: 12, demand: 0, maxUses: 16, uses: 0 }
            ];
        }

        // Initialize demand map
        for (const t of this.trades) {
            this.demandIndex.set(t.inputItem, 1.0);
        }
    }

    private buildMesh(): void {
        // High-Fidelity Voxel Villager Materials
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xbd9f83 }); // Peach peach skin
        const noseMat = new THREE.MeshLambertMaterial({ color: 0xa18265 }); // Slightly darker nose
        const bootsMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 }); // Worn brown boots

        // Profession-based Robes colors
        let robeColor = 0x795548; // Brown for Farmer
        if (this.profession === VillagerProfession.WEAPONSMITH) {
            robeColor = 0x37474f; // Dark Slate / apron look
        } else if (this.profession === VillagerProfession.CLERIC) {
            robeColor = 0x9c27b0; // Purple Robe
        }
        const robeMat = new THREE.MeshLambertMaterial({ color: robeColor });

        // 1. HEAD GROUP (Detailed with iconic unibrow, glowing black eyes, big nose)
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.75, 0);

        // Main Voxel Head Box
        const headGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headMesh.castShadow = true;
        this.headGroup.add(headMesh);

        // Huge protruding Villager Nose
        const noseGeo = new THREE.BoxGeometry(0.12, 0.22, 0.14);
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.position.set(0, -0.06, 0.26);
        noseMesh.castShadow = true;
        this.headGroup.add(noseMesh);

        // Unibrow (Black bar above eyes)
        const browGeo = new THREE.BoxGeometry(0.38, 0.05, 0.04);
        const browMesh = new THREE.Mesh(browGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
        browMesh.position.set(0, 0.1, 0.22);
        this.headGroup.add(browMesh);

        // Eyes (Hollow sockets with pupils)
        const eyeSocketGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
        const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        // Left Eye
        const leftWhite = new THREE.Mesh(eyeSocketGeo, whiteMat);
        leftWhite.position.set(-0.11, 0.02, 0.22);
        this.headGroup.add(leftWhite);
        const leftPupil = new THREE.Mesh(pupilGeo, blackMat);
        leftPupil.position.set(-0.11, 0.02, 0.23);
        this.headGroup.add(leftPupil);

        // Right Eye
        const rightWhite = new THREE.Mesh(eyeSocketGeo, whiteMat);
        rightWhite.position.set(0.11, 0.02, 0.22);
        this.headGroup.add(rightWhite);
        const rightPupil = new THREE.Mesh(pupilGeo, blackMat);
        rightPupil.position.set(0.11, 0.02, 0.23);
        this.headGroup.add(rightPupil);

        this.mesh.add(this.headGroup);

        // 2. ROBE TORSO (Thick block representing robes)
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.72, 0.32);
        this.robeMesh = new THREE.Mesh(torsoGeo, robeMat);
        this.robeMesh.position.set(0, 0.2, 0);
        this.robeMesh.castShadow = true;
        this.mesh.add(this.robeMesh);

        // 3. FOLDED ARMS (Iconic Villager posture - arms crossed inside sleeves)
        this.foldedArms = new THREE.Group();
        this.foldedArms.position.set(0, 0.25, 0.22);

        // Horizontal sleeve box
        const armSleeveGeo = new THREE.BoxGeometry(0.48, 0.18, 0.18);
        const armSleeve = new THREE.Mesh(armSleeveGeo, robeMat);
        armSleeve.castShadow = true;
        this.foldedArms.add(armSleeve);

        // Exposed folded hands/cuffs underneath
        const handGeo = new THREE.BoxGeometry(0.32, 0.12, 0.12);
        const hands = new THREE.Mesh(handGeo, skinMat);
        hands.position.set(0, -0.06, 0.04);
        hands.castShadow = true;
        this.foldedArms.add(hands);

        this.mesh.add(this.foldedArms);

        // 4. LEGS AND BOOTS (Combined blocky legs moving together)
        const legsGeo = new THREE.BoxGeometry(0.38, 0.45, 0.26);
        const legsMesh = new THREE.Mesh(legsGeo, robeMat);
        legsMesh.position.set(0, -0.38, 0);
        legsMesh.castShadow = true;
        this.mesh.add(legsMesh);

        // Boots base
        const bootGeo = new THREE.BoxGeometry(0.42, 0.08, 0.3);
        const boots = new THREE.Mesh(bootGeo, bootsMat);
        boots.position.set(0, -0.6, 0.02);
        boots.castShadow = true;
        this.mesh.add(boots);
    }

    public update(deltaTime: number, playerPos: THREE.Vector3, scene: THREE.Scene, activeMobs: MobEntity[]): void {
        if (this.isDead) return;

        // Freeze trading villager: face the player and halt movement AI!
        const game = (window as any).game;
        const isTrading = game && game.uiManager && game.uiManager.getActiveVillager() === this;

        if (isTrading) {
            this.velocity.set(0, 0, 0);
            this.currentPath = [];
            
            // Turn to face the player directly
            const dir = playerPos.clone().sub(this.position);
            dir.y = 0;
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

            // Process core animations: hurt flash and gentle breathing bobbing
            if (this.hurtTimer > 0) {
                this.hurtTimer -= deltaTime;
                this.headGroup.children.forEach(c => {
                    const m = c as THREE.Mesh;
                    if (m.material) (m.material as any).color?.setHex(0xff3333);
                });
                if (this.hurtTimer <= 0) {
                    this.buildMesh();
                }
            }
            const time = Date.now() * 0.0035;
            this.headGroup.rotation.y = Math.sin(time) * 0.04;
            this.headGroup.rotation.z = Math.cos(time * 0.5) * 0.02;

            // Apply slight gravity/friction to stay grounded
            if (!this.onGround) {
                this.velocity.y -= 22 * deltaTime;
            } else {
                this.velocity.y = 0;
            }
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            this.mesh.position.copy(this.position);
            return; // Halt regular walking AI!
        }

        // Apply visual red hurt flash overlay
        if (this.hurtTimer > 0) {
            this.hurtTimer -= deltaTime;
            this.headGroup.children.forEach(c => {
                const m = c as THREE.Mesh;
                if (m.material) (m.material as any).color?.setHex(0xff3333);
            });
            if (this.hurtTimer <= 0) {
                this.buildMesh(); // Restores skin & robes material
            }
        }

        // 1. Core FSM scheduler based on game TimeSystem
        this.stateTimer += deltaTime;
        if (this.stateTimer > 12.0) { // Cycle FSM status every 12s for simulation
            this.stateTimer = 0;
            this.cycleState();
        }

        // 2. Idle animations: gentle head breathing bobbing
        const time = Date.now() * 0.0035;
        this.headGroup.rotation.y = Math.sin(time) * 0.04;
        this.headGroup.rotation.z = Math.cos(time * 0.5) * 0.02;

        // 3. Sleeping animation: tilt entire mesh horizontal
        if (this.villagerState === VillagerState.SLEEP) {
            this.mesh.rotation.x = Math.PI / 2; // Lie down
            this.mesh.position.y = this.homePos.y + 0.15; // float slightly on bed height
            this.velocity.set(0, 0, 0);
            return; // Halt movement AI
        } else {
            this.mesh.rotation.x = 0; // Stand upright
        }

        // 4. Movement AI towards path targets
        if (this.currentPath.length > 0) {
            this.followPath(deltaTime);
        } else {
            // Apply standard environmental gravity friction when idle
            if (!this.onGround) {
                this.velocity.y -= 22 * deltaTime;
            } else {
                this.velocity.y = 0;
            }
            
            // Randomly request a new walk target within current state anchor
            if (Math.random() < 0.015) {
                this.requestPathToAnchor();
            }
        }

        // Apply physics displacement with basic voxel step resolution
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.position.copy(this.position);

        // Quick bounding ground lock
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y - 0.5);
        const bz = Math.floor(this.position.z);
        const groundBlock = this.world.getBlock(bx, by, bz);
        if (groundBlock !== BlockType.AIR) {
            this.position.y = by + 1.0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
    }

    private cycleState(): void {
        const states = [VillagerState.WANDER, VillagerState.WORK, VillagerState.WELL, VillagerState.SLEEP];
        const nextIdx = (states.indexOf(this.villagerState) + 1) % states.length;
        this.villagerState = states[nextIdx];
        this.currentPath = []; // reset path for new anchor destination
        this.requestPathToAnchor();
    }

    private requestPathToAnchor(): void {
        let anchor = this.homePos;
        if (this.villagerState === VillagerState.WORK) {
            anchor = this.workPos;
        } else if (this.villagerState === VillagerState.WELL) {
            anchor = this.wellPos;
        }

        // Random jitter offset within anchor boundary
        const jitter = new THREE.Vector3(
            (Math.random() * 6 - 3),
            0,
            (Math.random() * 6 - 3)
        );
        const dest = anchor.clone().add(jitter);

        const newPath = this.pathfinder.findPath(this.position, dest);
        if (newPath && newPath.length > 1) {
            this.currentPath = newPath;
            this.pathTargetIndex = 1; // start moving to first target node
        }
    }

    private followPath(deltaTime: number): void {
        if (this.pathTargetIndex >= this.currentPath.length) {
            this.currentPath = [];
            this.velocity.set(0, 0, 0);
            return;
        }

        const target = this.currentPath[this.pathTargetIndex];
        const diff = target.clone().sub(this.position);
        diff.y = 0; // ignore vertical axis for movement direction

        const dist = diff.length();

        if (dist < 0.25) {
            // Target node reached, step to next node!
            this.pathTargetIndex++;
            return;
        }

        // Calculate horizontal velocity towards current path node
        const dir = diff.normalize();
        this.velocity.x = dir.x * this.speed;
        this.velocity.z = dir.z * this.speed;

        // Apply path vertical node steps
        const currentTargetY = target.y;
        if (currentTargetY > this.position.y + 0.1) {
            // Step up / Jump step
            this.velocity.y = 5.2;
            this.onGround = false;
        } else if (!this.onGround) {
            this.velocity.y -= 22 * deltaTime;
        } else {
            this.velocity.y = 0;
        }

        // Turn body mesh towards movement direction
        const angle = Math.atan2(dir.x, dir.z);
        this.mesh.rotation.y = angle;
    }

    // Increases dynamic pricing demand index upon successful transactions
    public recordTransaction(inputItem: ItemType): void {
        const curDemand = this.demandIndex.get(inputItem) ?? 1.0;
        // Increase dynamic demand by +12%, leading to price hikes
        this.demandIndex.set(inputItem, Math.min(curDemand * 1.12, 2.5));
    }

    // Reduces dynamic pricing demand index over time representing market stabilization
    public decayDemand(): void {
        this.demandIndex.forEach((val, key) => {
            this.demandIndex.set(key, Math.max(val * 0.95, 0.7)); // settles back towards default 1.0
        });
    }

    // Adds Trade XP, upgrading villager titles and unlocking upper trades
    public addTradeXp(amount: number): boolean {
        this.tradeXp += amount;
        const requiredXp = this.tradeLevel * 100;
        if (this.tradeXp >= requiredXp && this.tradeLevel < 4) {
            this.tradeLevel++;
            this.tradeXp = 0;
            this.unlockNewTrades();
            return true; // Leveled up!
        }
        return false;
    }

    private unlockNewTrades(): void {
        if (this.profession === VillagerProfession.FARMER) {
            if (this.tradeLevel === 2) {
                this.trades.push({ inputItem: ItemType.EMERALD, inputCount: 2, outputItem: ItemType.PLANKS_BLOCK, outputCount: 8, demand: 0, maxUses: 12, uses: 0 });
            } else if (this.tradeLevel === 3) {
                this.trades.push({ inputItem: ItemType.EMERALD, inputCount: 16, outputItem: ItemType.DIAMOND, outputCount: 1, demand: 0, maxUses: 4, uses: 0 });
            }
        } else if (this.profession === VillagerProfession.WEAPONSMITH) {
            if (this.tradeLevel === 2) {
                this.trades.push({ inputItem: ItemType.EMERALD, inputCount: 8, outputItem: ItemType.IRON_SWORD, outputCount: 1, demand: 0, maxUses: 6, uses: 0 });
            } else if (this.tradeLevel === 3) {
                this.trades.push({ inputItem: ItemType.EMERALD, inputCount: 22, outputItem: ItemType.DIAMOND_SWORD, outputCount: 1, demand: 0, maxUses: 3, uses: 0 });
            }
        } else {
            // Cleric
            if (this.tradeLevel === 2) {
                this.trades.push({ inputItem: ItemType.GOLD_INGOT, inputCount: 6, outputItem: ItemType.EMERALD, outputCount: 2, demand: 0, maxUses: 10, uses: 0 });
            } else if (this.tradeLevel === 3) {
                this.trades.push({ inputItem: ItemType.EMERALD, inputCount: 1, outputItem: ItemType.GOLD_INGOT, outputCount: 3, demand: 0, maxUses: 8, uses: 0 });
            }
        }
    }
}
