import * as THREE from 'three';
import { TextureAtlas } from './TextureAtlas';
import { ItemType, BlockType } from './types';
import { ITEM_TO_BLOCK } from './constants';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class FirstPersonArms {
    public group: THREE.Group;
    public rightArm: THREE.Group;
    public leftArm: THREE.Group;
    
    private rightArmMesh: THREE.Mesh;
    private leftArmMesh: THREE.Mesh;

    private rightTool: THREE.Group | null = null;
    private leftTool: THREE.Group | null = null;
    
    private bobPhase: number = 0;
    private swingProgress: number = 0;
    private textureAtlas: TextureAtlas;

    // Loaded 3D models
    private woodenPickaxeModel: THREE.Group | null = null;
    private stonePickaxeModel: THREE.Group | null = null;
    private ironPickaxeModel: THREE.Group | null = null;
    private diamondPickaxeModel: THREE.Group | null = null;
    private lastEquippedItem: ItemType | null = null;

    public recoilOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

    constructor(textureAtlas: TextureAtlas) {
        this.textureAtlas = textureAtlas;
        this.group = new THREE.Group();

        // 1. ADD LIGHTING: Ensure the Lambert materials are visible and well-lit
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.group.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(2, 5, 2); 
        this.group.add(dirLight);

        // 2. Hand Dimensions - Tiny block just to show the grip
        const handGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const handMat = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });

        // RIGHT ARM SETUP
        this.rightArm = new THREE.Group();
        // Pivot exactly at the bottom-right of the screen view. 
        this.rightArm.position.set(0.4, -0.5, -0.8);
        
        // CRITICAL FIX: Change rotation order to ZYX so the arm tilts left FIRST, 
        // then pitches forward. This allows a pure diagonal chopping motion!
        this.rightArm.rotation.order = 'ZYX';
        
        this.rightArmMesh = new THREE.Mesh(handGeo, handMat);
        this.rightArmMesh.position.set(0, 0.05, 0);
        this.rightArm.add(this.rightArmMesh);
        
        // Base rotation: Pointing forward/up (-PI/6) and tilted slightly outward/right (-Math.PI / 12)
        this.rightArm.rotation.set(-Math.PI / 6, 0, -Math.PI / 12);
        
        this.group.add(this.rightArm);

        // LEFT ARM SETUP (Hidden by default)
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.4, -0.5, -0.8);
        this.leftArm.rotation.order = 'ZYX';
        
        this.leftArmMesh = new THREE.Mesh(handGeo, handMat);
        this.leftArmMesh.position.set(0, 0.05, 0);
        this.leftArm.add(this.leftArmMesh);
        
        this.leftArm.rotation.set(-Math.PI / 6, 0, -Math.PI / 6);
        this.group.add(this.leftArm);
        this.leftArm.visible = false;

        // Async load our Blender-generated 3D models!
        const loader = new GLTFLoader();
        
        const checkAndEquip = (loadedType: ItemType) => {
            if (this.lastEquippedItem === loadedType) {
                this.equipItem(loadedType);
            }
        };

        loader.load('/assets/wooden_pickaxe.glb', (gltf: any) => {
            this.woodenPickaxeModel = gltf.scene;
            checkAndEquip(ItemType.WOODEN_PICKAXE);
        }, undefined, (error: any) => {
            console.warn('Could not load wooden_pickaxe.glb, using fallback.', error);
        });

        loader.load('/assets/stone_pickaxe.glb', (gltf: any) => {
            this.stonePickaxeModel = gltf.scene;
            checkAndEquip(ItemType.STONE_PICKAXE);
        }, undefined, (error: any) => {
            console.warn('Could not load stone_pickaxe.glb, using fallback.', error);
        });

        loader.load('/assets/iron_pickaxe.glb', (gltf: any) => {
            this.ironPickaxeModel = gltf.scene;
            checkAndEquip(ItemType.IRON_PICKAXE);
        }, undefined, (error: any) => {
            console.warn('Could not load iron_pickaxe.glb, using fallback.', error);
        });

        loader.load('/assets/diamond_pickaxe.glb', (gltf: any) => {
            this.diamondPickaxeModel = gltf.scene;
            checkAndEquip(ItemType.DIAMOND_PICKAXE);
        }, undefined, (error: any) => {
            console.warn('Could not load diamond_pickaxe.glb, using fallback.', error);
        });
    }

    createPickaxeTool(itemTypeOrColor: ItemType | number): THREE.Group {
        const toolGroup = new THREE.Group();

        // Handle (stick) - brown wood
        const handleGeo = new THREE.BoxGeometry(0.03, 0.6, 0.03);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x8B5E3C });
        const handleMesh = new THREE.Mesh(handleGeo, handleMat);
        handleMesh.position.set(0, 0.3, 0); 
        toolGroup.add(handleMesh);

        // Head Material selection
        let headMat: THREE.Material;
        
        if (itemTypeOrColor === ItemType.WOODEN_PICKAXE) {
            headMat = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
        } else if (itemTypeOrColor === ItemType.STONE_PICKAXE) {
            headMat = new THREE.MeshLambertMaterial({ color: 0x7F7F7F });
        } else if (itemTypeOrColor === ItemType.IRON_PICKAXE) {
            headMat = new THREE.MeshStandardMaterial({ 
                color: 0xE6E6E6, 
                metalness: 0.9, 
                roughness: 0.1 
            });
        } else if (itemTypeOrColor === ItemType.DIAMOND_PICKAXE) {
            headMat = new THREE.MeshStandardMaterial({ 
                color: 0x33EBFF, 
                emissive: 0x115566,
                roughness: 0.1, 
                metalness: 0.1 
            });
        } else {
            // Fallback for color numbers or other cases
            const finalColor = typeof itemTypeOrColor === 'number' ? itemTypeOrColor : 0xB0B0B0;
            headMat = new THREE.MeshLambertMaterial({ color: finalColor });
        }

        // Curved premium crescent pickaxe head
        // 1. Center piece
        const centerHeadGeo = new THREE.BoxGeometry(0.05, 0.06, 0.15);
        const centerHeadMesh = new THREE.Mesh(centerHeadGeo, headMat);
        centerHeadMesh.position.set(0, 0.56, 0);
        toolGroup.add(centerHeadMesh);

        // 2. Left prong (curving down)
        const leftProngGeo = new THREE.BoxGeometry(0.04, 0.05, 0.16);
        const leftProngMesh = new THREE.Mesh(leftProngGeo, headMat);
        leftProngMesh.position.set(0, 0.53, 0.14);
        leftProngMesh.rotation.x = -Math.PI / 18; // 10 degrees down
        toolGroup.add(leftProngMesh);

        // 3. Right prong (curving down)
        const rightProngGeo = new THREE.BoxGeometry(0.04, 0.05, 0.16);
        const rightProngMesh = new THREE.Mesh(rightProngGeo, headMat);
        rightProngMesh.position.set(0, 0.53, -0.14);
        rightProngMesh.rotation.x = Math.PI / 18; // 10 degrees down
        toolGroup.add(rightProngMesh);

        return toolGroup;
    }

    createBlockTool(blockType: BlockType): THREE.Group {
        const group = new THREE.Group();
        const geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25).toNonIndexed(); 
        
        const uvAttribute = geometry.attributes.uv;
        const boxToBlockFace = [4, 5, 0, 1, 3, 2];
        
        for (let i = 0; i < 6; i++) {
            const blockFace = boxToBlockFace[i];
            const [u1, v1, u2, v2] = this.textureAtlas.getUV(blockType, blockFace);
            const offset = i * 6;
            
            uvAttribute.setXY(offset + 0, u1, v2);
            uvAttribute.setXY(offset + 1, u1, v1);
            uvAttribute.setXY(offset + 2, u2, v2);
            uvAttribute.setXY(offset + 3, u1, v1);
            uvAttribute.setXY(offset + 4, u2, v1);
            uvAttribute.setXY(offset + 5, u2, v2);
        }
        
        const material = new THREE.MeshLambertMaterial({ 
            map: this.textureAtlas.texture,
            transparent: true,
            alphaTest: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0.2, 0);
        group.add(mesh);
        
        return group;
    }

    equipTool(tool: THREE.Group, side: 'left' | 'right' = 'right'): void {
        this.clearTool(side);
        if (side === 'right') {
            this.rightTool = tool;
            this.rightArm.add(tool);
            // 🚨 CRITICAL GRAPHICS BUG FIX: Removed force reset of position/rotation to (0,0,0).
            // This preserves our painstakingly tuned pickaxe rotations and grip offsets!
        } else {
            this.leftTool = tool;
            this.leftArm.add(tool);
            // 🚨 CRITICAL GRAPHICS BUG FIX: Removed force reset of position/rotation to (0,0,0).
        }
    }

    createAppleTool(itemType: ItemType): THREE.Group {
        const group = new THREE.Group();
        const color = itemType === ItemType.APPLE ? 0xd32f2f : 0xb85d1d; // Red vs Baked brown-orange

        // Main body (blocky sphere)
        const appleGeo = new THREE.SphereGeometry(0.09, 6, 6);
        const appleMat = new THREE.MeshLambertMaterial({ color: color });
        const appleMesh = new THREE.Mesh(appleGeo, appleMat);
        appleMesh.position.set(0, 0.15, 0);
        appleMesh.castShadow = true;
        group.add(appleMesh);

        // Stem
        const stemGeo = new THREE.BoxGeometry(0.015, 0.06, 0.015);
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
        const stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.position.set(0, 0.23, -0.01);
        stemMesh.rotation.x = -0.2;
        stemMesh.castShadow = true;
        group.add(stemMesh);

        // Leaf (green box)
        const leafGeo = new THREE.BoxGeometry(0.04, 0.015, 0.02);
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x4caf50 });
        const leafMesh = new THREE.Mesh(leafGeo, leafMat);
        leafMesh.position.set(0.02, 0.23, 0.01);
        leafMesh.rotation.z = 0.3;
        leafMesh.castShadow = true;
        group.add(leafMesh);

        return group;
    }

    createSwordTool(itemType: ItemType): THREE.Group {
        const group = new THREE.Group();

        // Handle (stick)
        const handleGeo = new THREE.BoxGeometry(0.025, 0.16, 0.025);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 0.08, 0);
        group.add(handle);

        // Crossguard
        const guardGeo = new THREE.BoxGeometry(0.14, 0.025, 0.03);
        let guardMat: THREE.Material = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
        if (itemType === ItemType.IRON_SWORD) guardMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.2 });
        if (itemType === ItemType.DIAMOND_SWORD) guardMat = new THREE.MeshStandardMaterial({ color: 0x00acc1, roughness: 0.1 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.set(0, 0.16, 0);
        group.add(guard);

        // Blade
        const bladeGeo = new THREE.BoxGeometry(0.035, 0.45, 0.018);
        let bladeMat: THREE.Material;
        if (itemType === ItemType.WOODEN_SWORD) {
            bladeMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
        } else if (itemType === ItemType.STONE_SWORD) {
            bladeMat = new THREE.MeshLambertMaterial({ color: 0x757575 });
        } else if (itemType === ItemType.IRON_SWORD) {
            bladeMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9, roughness: 0.1 });
        } else {
            bladeMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.2, roughness: 0.1, emissive: 0x006064 });
        }
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(0, 0.38, 0);
        group.add(blade);

        return group;
    }

    createStickTool(): THREE.Group {
        const group = new THREE.Group();
        const handleGeo = new THREE.BoxGeometry(0.02, 0.4, 0.02);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 0.2, 0);
        group.add(handle);
        return group;
    }

    createCoalTool(): THREE.Group {
        const group = new THREE.Group();
        const coalGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const coalMat = new THREE.MeshLambertMaterial({ color: 0x212121 });
        const coal = new THREE.Mesh(coalGeo, coalMat);
        coal.position.set(0, 0.15, 0);
        coal.rotation.set(0.3, 0.4, 0.2);
        group.add(coal);
        return group;
    }

    createIngotTool(color: number, metalness: number): THREE.Group {
        const group = new THREE.Group();
        const ingotGeo = new THREE.BoxGeometry(0.06, 0.03, 0.12);
        const ingotMat = new THREE.MeshStandardMaterial({ color: color, metalness: metalness, roughness: 0.2 });
        const ingot = new THREE.Mesh(ingotGeo, ingotMat);
        ingot.position.set(0, 0.15, 0);
        ingot.rotation.set(0.2, 0.5, 0.1);
        group.add(ingot);
        return group;
    }

    createDiamondTool(): THREE.Group {
        const group = new THREE.Group();
        const diaGeo = new THREE.OctahedronGeometry(0.06, 0);
        const diaMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.1, roughness: 0.1, emissive: 0x006064 });
        const dia = new THREE.Mesh(diaGeo, diaMat);
        dia.position.set(0, 0.15, 0);
        group.add(dia);
        return group;
    }

    equipItem(itemType: ItemType | null): void {
        this.clearTool('right');
        if (itemType === null) return;
        this.lastEquippedItem = itemType;

        const blockType = ITEM_TO_BLOCK[itemType];
        if (blockType !== undefined) {
            this.equipTool(this.createBlockTool(blockType), 'right');
            return;
        }
        
        if (itemType >= 200 && itemType <= 203) {
            let modelToClone: THREE.Group | null = null;
            if (itemType === ItemType.WOODEN_PICKAXE) modelToClone = this.woodenPickaxeModel;
            else if (itemType === ItemType.STONE_PICKAXE) modelToClone = this.stonePickaxeModel;
            else if (itemType === ItemType.IRON_PICKAXE) modelToClone = this.ironPickaxeModel;
            else if (itemType === ItemType.DIAMOND_PICKAXE) modelToClone = this.diamondPickaxeModel;

            if (modelToClone) {
                const clonedModel = modelToClone.clone();
                clonedModel.traverse((node) => {
                    if ((node as THREE.Mesh).isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });
                
                // Adjust pickaxe alignment: Ensure the handle aligns perfectly straight with the player's fist (no inward bend)
                // by keeping X-pitch and Z-roll at 0, and rotate around Y-yaw by 90 degrees (Math.PI / 2) to make the crescent blade 100% vertical.
                clonedModel.rotation.order = 'ZYX';
                clonedModel.rotation.set(0, Math.PI / 2, 0);
                clonedModel.position.set(0.04, 0.05, -0.05); // Premium grip offset
                
                this.equipTool(clonedModel, 'right');
            } else {
                this.equipTool(this.createPickaxeTool(itemType), 'right');
            }
        } else if (itemType >= 210 && itemType <= 213) {
            // Swords (210 - 213)
            const sword = this.createSwordTool(itemType);
            sword.rotation.order = 'ZYX';
            sword.rotation.set(0, 0, -Math.PI / 4); // Tilt sword slightly forward
            sword.position.set(0.02, 0.05, -0.1);
            this.equipTool(sword, 'right');
        } else if (itemType === ItemType.APPLE || itemType === ItemType.BAKED_APPLE) {
            // Apples (300, 301)
            const apple = this.createAppleTool(itemType);
            apple.rotation.order = 'ZYX';
            apple.rotation.set(0.2, 0.2, 0.1);
            apple.position.set(0, 0.05, -0.05);
            this.equipTool(apple, 'right');
        } else if (itemType === ItemType.STICK) {
            // Stick (400)
            const stick = this.createStickTool();
            stick.rotation.order = 'ZYX';
            stick.rotation.set(Math.PI / 4, 0, 0);
            stick.position.set(0, 0.05, -0.1);
            this.equipTool(stick, 'right');
        } else if (itemType === ItemType.COAL) {
            // Coal (401)
            const coal = this.createCoalTool();
            coal.position.set(0, 0.05, -0.05);
            this.equipTool(coal, 'right');
        } else if (itemType === ItemType.IRON_INGOT) {
            // Iron Ingot (402)
            const ingot = this.createIngotTool(0xE6E6E6, 0.9);
            ingot.position.set(0, 0.05, -0.05);
            this.equipTool(ingot, 'right');
        } else if (itemType === ItemType.GOLD_INGOT) {
            // Gold Ingot (403)
            const ingot = this.createIngotTool(0xFFD700, 0.9);
            ingot.position.set(0, 0.05, -0.05);
            this.equipTool(ingot, 'right');
        } else if (itemType === ItemType.DIAMOND) {
            // Diamond (404)
            const diamond = this.createDiamondTool();
            diamond.position.set(0, 0.05, -0.05);
            this.equipTool(diamond, 'right');
        } else {
            const fallbackGroup = new THREE.Group();
            const fallbackMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshLambertMaterial({color: 0xffffff}));
            fallbackMesh.position.set(0, 0.1, 0);
            fallbackGroup.add(fallbackMesh);
            this.equipTool(fallbackGroup, 'right');
        }
    }

    setToolItem(color: number, side: 'left' | 'right' = 'right'): void {
        const toolGroup = this.createPickaxeTool(color);
        this.equipTool(toolGroup, side);
    }

    clearTool(side: 'left' | 'right' = 'right'): void {
        if (side === 'right' && this.rightTool) {
            this.rightArm.remove(this.rightTool);
            this.rightTool = null;
        } else if (side === 'left' && this.leftTool) {
            this.leftArm.remove(this.leftTool);
            this.leftTool = null;
        }
    }

    applyRecoilForce(): void {
        this.recoilOffset.set(0, -0.05, 0.04);
    }

    update(deltaTime: number, isMoving: boolean, isSprinting: boolean, onGround: boolean, targetDistance: number = 2.2): void {
        // Decay recoilOffset using rapid exponential spring dampening
        const recoilDecay = Math.exp(-18 * deltaTime);
        this.recoilOffset.multiplyScalar(recoilDecay);

        // View bobbing calculation
        if (isMoving && onGround) {
            this.bobPhase += deltaTime * (isSprinting ? 12 : 8);
        } else if (onGround) {
            this.bobPhase += deltaTime * 2;
        } else {
            this.bobPhase += deltaTime * 4;
        }

        const bobAmount = isSprinting ? 0.03 : (isMoving ? 0.015 : 0.005);
        const bobOffset = Math.sin(this.bobPhase) * bobAmount;
        
        // Base Y position for the pivot (raised from -0.5 to -0.32 to align the swing trajectory perfectly with the highlighted block center)
        const baseY = -0.32;
        this.leftArm.position.y = baseY + bobOffset;

        // Base rotations: Pointing forward/up (-PI/6) and tilted slightly outward/right (-PI/12) for a clean center view
        const baseRotX = -Math.PI / 6;
        const baseRotZ = -Math.PI / 12;

        // Ensure Y rotation is 0
        this.rightArm.rotation.y = 0;

        // Hybrid Strike & Swing Animation (Thrusts deeply forward to targetDistance while simultaneously sweeping down)
        if (this.swingProgress > 0) {
            // Faster swing speed for a snappy strike
            this.swingProgress = Math.max(0, this.swingProgress - deltaTime * 6.0); 
            
            const swingArc = Math.sin(this.swingProgress * Math.PI); 
            
            // 1. Enlarge rotational swing scale (Make it look much larger and epic!)
            // Pitch down heavily (nearly 100 degrees) to force a vertical sweep
            this.rightArm.rotation.x = baseRotX - swingArc * (Math.PI * 0.55); 
            
            // Sweeps diagonally inward (from outward/right to inward/left) to target the block center
            this.rightArm.rotation.z = baseRotZ + swingArc * (Math.PI / 3.3); 
            
            // Keep Y-rotation at 0 to prevent the pickaxe from spinning around its handle, ensuring the blades remain 100% vertical during swings
            this.rightArm.rotation.y = 0;
            
            // 2. Trajectory: Stronger Forward Thrust (Z) + Extremely Reduced Vertical Drop (Y)
            // Bring arm slightly left to cross the chest
            this.rightArm.position.x = 0.4 - (swingArc * 0.35);
            
            // REDUCED FOG Y-DROP: Keep vertical height drop very tight (max 0.2m) to prevent vertical slipping!
            this.rightArm.position.y = baseY + bobOffset + (swingArc * 0.15) - (swingArc * swingArc * 0.20); 
            
            // AMPLIFIED Z-THRUST: Stretch the arm forward even deeper into the highlighted block by narrowing margin to 0.15m!
            const zThrust = Math.max(0.8, targetDistance - 0.15);
            this.rightArm.position.z = -0.8 - (swingArc * zThrust);
        } else {
            // Return to idle smoothly
            const lerp = 1 - Math.exp(-15 * deltaTime);
            this.rightArm.rotation.x += (baseRotX - this.rightArm.rotation.x) * lerp;
            this.rightArm.rotation.z += (baseRotZ - this.rightArm.rotation.z) * lerp;
            
            this.rightArm.position.x += (0.4 - this.rightArm.position.x) * lerp;
            this.rightArm.position.y += (baseY + bobOffset - this.rightArm.position.y) * lerp;
            this.rightArm.position.z += (-0.8 - this.rightArm.position.z) * lerp;
        }

        // Apply recoil offset to rightArm position
        this.rightArm.position.add(this.recoilOffset);
    }

    triggerSwing(): void {
        if (this.swingProgress < 0.2) {
            this.swingProgress = 1.0;
        }
    }
}
