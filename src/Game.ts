import * as THREE from 'three';
import { InputManager, GameMode } from './InputManager';
import { World } from './World';
import { Player } from './Player';
import { BlockRaycaster } from './BlockRaycaster';
import { NoiseGenerator } from './NoiseGenerator';
import { TextureAtlas } from './TextureAtlas';
import { PlayerStats } from './PlayerStats';
import { TimeSystem } from './TimeSystem';
import { UIManager } from './UIManager';
import { Inventory } from './Inventory';
import { FirstPersonArms } from './CharacterModel';
import { BlockType, ItemType, MobType, VillagerProfession } from './types';
import { BLOCK_TO_ITEM, ITEM_TO_BLOCK, BLOCK_NAMES, ITEM_NAMES } from './constants';
import { BlockParticles } from './BlockParticles';
import { ItemEntity } from './ItemEntity';
import { AudioManager } from './AudioManager';
import { LiquidSimulator } from './LiquidSimulator';
import { FallingBlockEntity } from './FallingBlockEntity';
import { CombatManager } from './CombatManager';
import { MobEntity } from './MobEntity';
import { ZombieEntity } from './ZombieEntity';
import { SkeletonEntity, ArrowProjectile } from './SkeletonEntity';
import { CreeperEntity } from './CreeperEntity';
import { JigsawStructureBuilder } from './JigsawStructureBuilder';
import { VillagerEntity } from './VillagerEntity';

export class Game {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private input: InputManager;
    private world: World;
    private player: Player;
    private raycaster: BlockRaycaster;
    private textureAtlas: TextureAtlas;
    private noiseGen: NoiseGenerator;
    private clock: THREE.Clock;

    // New systems
    private stats: PlayerStats;
    private timeSystem: TimeSystem;
    public uiManager: UIManager;
    private inventory: Inventory;
    private particles: BlockParticles;
    private itemEntities: ItemEntity[] = [];
    private wasDead: boolean = false;

    // Phase 3 properties
    private liquidSim!: LiquidSimulator;
    private fallingBlocks: FallingBlockEntity[] = [];
    private liquidTimer: number = 0;
    private scanTimer: number = 0;

    // Phase 4 properties
    private activeMobs: MobEntity[] = [];
    private arrows: ArrowProjectile[] = [];
    private mobSpawnTimer: number = 0;
    private playerHurtTimer: number = 0;

    // First-person character model
    private characterModel: FirstPersonArms;
    private armsScene: THREE.Scene;
    private armsCamera: THREE.PerspectiveCamera;

    private highlightMesh: THREE.Mesh | null = null;
    private hitMarker!: THREE.Mesh;
    private fpsCounter: number = 0;
    private fpsTime: number = 0;
    private frameCount: number = 0;
    private ambientLight: THREE.AmbientLight;
    private sunLight: THREE.DirectionalLight;

    // Lock message state
    private hasEverLocked: boolean = false;
    private lockMessage: HTMLElement;
    private crosshair: HTMLElement;
    private modeIndicator: HTMLElement;
    private blockTooltip: HTMLElement;
    private cursorDot: HTMLElement;

    // Track mode/lock state to detect external changes (e.g., ESC releasing pointer lock)
    private prevGameMode: GameMode = 'cursor';
    private prevLockedState: boolean = false;
    private currentHeldItem: number | null = null;

    private paused: boolean = false;
    private pausedOverlay: HTMLElement;

    private lastPunchBlockPos: { x: number, y: number, z: number } | null = null;
    private screenShakeTime: number = 0;
    private screenShakeAmp: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

    constructor() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        const skyColor = new THREE.Color(0x87CEEB);
        this.scene.background = skyColor;
        const fog = new THREE.Fog(0x87CEEB, 50, 200);
        this.scene.fog = fog;

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // Input
        this.input = new InputManager();

        // Texture atlas
        this.textureAtlas = new TextureAtlas();

        // Particle system
        this.particles = new BlockParticles(this.scene, this.textureAtlas);

        // Noise generator
        this.noiseGen = new NoiseGenerator();

        // World
        this.world = new World(this.scene, this.camera, this.noiseGen, this.textureAtlas);

        // Player
        this.player = new Player(this.camera, this.input, this.world);

        // Raycaster
        this.raycaster = new BlockRaycaster(this.world);

        // Stats
        this.stats = new PlayerStats();

        // Phase 3 initializations
        this.liquidSim = new LiquidSimulator(this.world);
        this.fallingBlocks = [];

        // Inventory
        this.inventory = new Inventory();

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(100, 200, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 4096; // Upscaled from 2048
        this.sunLight.shadow.mapSize.height = 4096; // Upscaled from 2048
        this.sunLight.shadow.camera.left = -50; // Narrowed for extreme pixel density
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.sunLight.shadow.camera.far = 300;
        
        // High quality shadow filtering and acne prevention bias
        this.sunLight.shadow.bias = -0.0003;
        this.sunLight.shadow.normalBias = 0.02;
        this.sunLight.shadow.radius = 4.0; // Softens the shadow edges
        this.scene.add(this.sunLight);

        // Time system
        this.timeSystem = new TimeSystem(
            this.ambientLight,
            this.sunLight,
            skyColor,
            fog
        );

        // UI Manager
        this.uiManager = new UIManager(this.stats, this.timeSystem, this.inventory);

        // Clock
        this.clock = new THREE.Clock();

        // Character model (first-person visible body)
        this.characterModel = new FirstPersonArms(this.textureAtlas);
        this.armsScene = new THREE.Scene();
        this.armsScene.add(this.characterModel.group);
        
        this.currentHeldItem = this.uiManager.getSelectedItem();
        this.characterModel.equipItem(this.currentHeldItem);

        this.armsCamera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.01,
            10
        );

        // Block tooltip
        this.blockTooltip = document.getElementById('block-tooltip')!;
        this.cursorDot = document.getElementById('cursor-dot')!;

        // Highlight mesh for selected block
        this.setupHighlight();

        // Rely on pixel-perfect HTML/CSS overlay crosshair for guaranteed visibility and zero block culling/clipping
        this.scene.add(this.camera);

        // Hit marker for debugging precise raycast hit point
        const hitGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const hitMat = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, depthWrite: false });
        this.hitMarker = new THREE.Mesh(hitGeo, hitMat);
        this.hitMarker.renderOrder = 9998;
        this.scene.add(this.hitMarker);

        // UI elements
        this.lockMessage = document.getElementById('lock-message')!;
        this.crosshair = document.getElementById('crosshair')!;
        this.modeIndicator = document.getElementById('mode-indicator')!;

        // Resize handler
        window.addEventListener('resize', this.onResize.bind(this));

        // Click to lock pointer (initial) - Use mousedown and stopPropagation to prevent unintended block breaks
        this.lockMessage.addEventListener('mousedown', (e: MouseEvent) => {
            e.stopPropagation();
            // Force AudioContext resume synchronously inside a trusted user gesture to unblock sound output
            AudioManager.getInstance().playPickup();
            this.input.setGameMode('game');
            this.uiManager.isHotbarFocused = false;
            this.hasEverLocked = true;
            this.updateLockMessage();
        });

        // Use mousedown and stopPropagation to prevent unintended block breaks when returning to game mode
        this.renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
            if (!this.paused && this.input.gameMode === 'cursor' && !this.input.isPointerLocked) {
                e.stopPropagation();
                // Force AudioContext resume synchronously inside a trusted user gesture to unblock sound output
                AudioManager.getInstance().playPickup();
                this.input.setGameMode('game');
                this.uiManager.isHotbarFocused = false;
                this.hasEverLocked = true;
                this.updateLockMessage();
            }
        });

        this.pausedOverlay = document.createElement('div');
        this.pausedOverlay.id = 'paused-overlay';
        this.pausedOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 50;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-family: 'Segoe UI', sans-serif;
            user-select: none;
        `;
        this.pausedOverlay.innerHTML = `
            <div id="pause-main-menu" style="display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 48px; font-weight: bold; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Game Paused</div>
                <button id="btn-resume" style="padding: 12px 40px; font-size: 22px; margin-bottom: 12px; width: 320px; cursor: pointer; background: #4CAF50; color: white; border: 2px solid #388E3C; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Resume Game</button>
                <button id="btn-save-menu" style="padding: 12px 40px; font-size: 22px; margin-bottom: 12px; width: 320px; cursor: pointer; background: #2196F3; color: white; border: 2px solid #1976D2; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Save Game</button>
                <button id="btn-load-menu" style="padding: 12px 40px; font-size: 22px; margin-bottom: 12px; width: 320px; cursor: pointer; background: #FF9800; color: white; border: 2px solid #F57C00; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Load Game</button>
                <button id="btn-encyclopedia-menu" style="padding: 12px 40px; font-size: 22px; margin-bottom: 12px; width: 320px; cursor: pointer; background: #E91E63; color: white; border: 2px solid #C2185B; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold;">📖 캐릭터 도감 (Catalog)</button>
                <button id="btn-settings-menu" style="padding: 12px 40px; font-size: 22px; margin-bottom: 12px; width: 320px; cursor: pointer; background: #9C27B0; color: white; border: 2px solid #7B1FA2; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">설정 (Settings)</button>
                <button id="btn-restart" style="padding: 12px 40px; font-size: 22px; width: 320px; cursor: pointer; background: #f44336; color: white; border: 2px solid #d32f2f; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Restart (Respawn)</button>
            </div>
            
            <div id="pause-slot-menu" style="display: none; flex-direction: column; align-items: center;">
                <div id="slot-menu-title" style="font-size: 48px; font-weight: bold; margin-bottom: 40px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Select Slot</div>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    ${[1, 2, 3, 4, 5].map(i => `<button class="btn-slot" data-slot="${i}" style="padding: 10px 40px; font-size: 24px; width: 360px; height: 80px; cursor: pointer; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid #455A64; text-align: center; color: white; font-family: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center;"></button>`).join('')}
                </div>
                <button id="btn-slot-back" style="padding: 10px 40px; font-size: 20px; width: 360px; cursor: pointer; background: #9E9E9E; color: white; border: 2px solid #616161; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Back</button>
            </div>

            <div id="pause-settings-menu" style="display: none; flex-direction: column; align-items: center; background: rgba(30, 30, 30, 0.95); padding: 30px; border-radius: 8px; border: 2px solid #555; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 360px;">
                <div style="font-size: 36px; font-weight: bold; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); text-align: center;">설정 (Settings)</div>
                
                <div style="display: flex; flex-direction: column; gap: 25px; width: 100%; margin-bottom: 35px;">
                    <!-- Sound Toggle -->
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 20px;">
                        <span>사운드 활성화</span>
                        <input type="checkbox" id="check-sound-toggle" style="width: 25px; height: 25px; cursor: pointer;">
                    </div>
                    
                    <!-- Volume Level Slider -->
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 20px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>마스터 볼륨</span>
                            <span id="label-volume-value">80%</span>
                        </div>
                        <input type="range" id="range-volume-level" min="0" max="100" value="80" style="width: 100%; cursor: pointer;">
                    </div>
                </div>
                
                <button id="btn-settings-back" style="padding: 10px 40px; font-size: 20px; width: 100%; cursor: pointer; background: #9E9E9E; color: white; border: 2px solid #616161; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">Back</button>
            </div>

            <div id="pause-encyclopedia-menu" style="display: none; flex-direction: column; align-items: center; background: rgba(20, 20, 20, 0.95); padding: 30px; border-radius: 12px; border: 2px solid #E91E63; box-shadow: 0 15px 35px rgba(0,0,0,0.6); width: 620px; font-family: 'Segoe UI', sans-serif;">
                <div style="font-size: 36px; font-weight: bold; margin-bottom: 25px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); text-align: center; color: #ff4081;">📖 월드 캐릭터 도감</div>
                
                <div style="display: flex; gap: 8px; width: 100%; margin-bottom: 20px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-enc-tab" data-tab="villager" style="padding: 10px 16px; font-size: 15px; cursor: pointer; border-radius: 6px; border: 2px solid #E91E63; background: #E91E63; color: white; font-weight: bold; transition: all 0.2s;">마을 주민</button>
                    <button class="btn-enc-tab" data-tab="skeleton" style="padding: 10px 16px; font-size: 15px; cursor: pointer; border-radius: 6px; border: 2px solid #E91E63; background: transparent; color: white; font-weight: bold; transition: all 0.2s;">스켈레톤</button>
                    <button class="btn-enc-tab" data-tab="zombie" style="padding: 10px 16px; font-size: 15px; cursor: pointer; border-radius: 6px; border: 2px solid #E91E63; background: transparent; color: white; font-weight: bold; transition: all 0.2s;">좀비</button>
                    <button class="btn-enc-tab" data-tab="creeper" style="padding: 10px 16px; font-size: 15px; cursor: pointer; border-radius: 6px; border: 2px solid #E91E63; background: transparent; color: white; font-weight: bold; transition: all 0.2s;">크리퍼</button>
                    <button class="btn-enc-tab" data-tab="player" style="padding: 10px 16px; font-size: 15px; cursor: pointer; border-radius: 6px; border: 2px solid #E91E63; background: transparent; color: white; font-weight: bold; transition: all 0.2s;">플레이어</button>
                </div>

                <div id="encyclopedia-content" style="background: rgba(0,0,0,0.55); padding: 25px; border-radius: 8px; width: 100%; border: 1px solid rgba(255,255,255,0.12); margin-bottom: 25px; min-height: 250px; text-align: left; line-height: 1.6; color: #eee; font-size: 15px;">
                    <!-- Will be loaded dynamically -->
                </div>

                <button id="btn-encyclopedia-back" style="padding: 12px 40px; font-size: 20px; width: 100%; cursor: pointer; background: #9E9E9E; color: white; border: 2px solid #616161; border-radius: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">뒤로가기 (Back)</button>
            </div>
        `;
        document.body.appendChild(this.pausedOverlay);

        // Prevent pause overlay interactions from registering globally and causing unintended block breaks
        this.pausedOverlay.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        const mainMenu = document.getElementById('pause-main-menu')!;
        const slotMenu = document.getElementById('pause-slot-menu')!;
        const settingsMenu = document.getElementById('pause-settings-menu')!;
        const slotTitle = document.getElementById('slot-menu-title')!;
        let currentSlotAction: 'save' | 'load' = 'save';

        const showMainMenu = () => {
            mainMenu.style.display = 'flex';
            slotMenu.style.display = 'none';
            settingsMenu.style.display = 'none';
        };

        const showSlotMenu = (action: 'save' | 'load') => {
            currentSlotAction = action;
            slotTitle.textContent = action === 'save' ? 'Save Game' : 'Load Game';
            
            // Update slot button text based on existence and metadata
            document.querySelectorAll('.btn-slot').forEach((btn) => {
                const slotNum = btn.getAttribute('data-slot');
                const hasData = localStorage.getItem(`minecaft_homage_slot_${slotNum}`) !== null;
                const metadata = localStorage.getItem(`minecaft_homage_slot_${slotNum}_metadata`);
                
                if (hasData) {
                    const timeLabel = metadata ? `[${metadata}]` : '(Data)';
                    btn.innerHTML = `<span style="font-size: 20px; font-weight: bold; margin-bottom: 2px;">Slot ${slotNum}</span><span style="font-size: 13px; opacity: 0.85; font-family: monospace;">${timeLabel}</span>`;
                    (btn as HTMLElement).style.background = '#009688';
                } else {
                    btn.innerHTML = `<span style="font-size: 20px; font-weight: bold; margin-bottom: 2px;">Slot ${slotNum}</span><span style="font-size: 13px; opacity: 0.65;">(Empty)</span>`;
                    (btn as HTMLElement).style.background = '#607D8B';
                }
            });

            mainMenu.style.display = 'none';
            slotMenu.style.display = 'flex';
            settingsMenu.style.display = 'none';
        };

        const resumeGame = () => {
            this.paused = false;
            this.pausedOverlay.style.display = 'none';
            showMainMenu();
            this.input.setGameMode('game');
            this.hasEverLocked = true;
            this.updateLockMessage();
            this.updateModeIndicator();
        };

        document.getElementById('btn-resume')!.addEventListener('click', resumeGame);
        document.getElementById('btn-save-menu')!.addEventListener('click', () => showSlotMenu('save'));
        document.getElementById('btn-load-menu')!.addEventListener('click', () => showSlotMenu('load'));
        document.getElementById('btn-slot-back')!.addEventListener('click', showMainMenu);

        // Settings Menu Event listeners
        const btnSettingsMenu = document.getElementById('btn-settings-menu')!;
        const btnSettingsBack = document.getElementById('btn-settings-back')!;
        const checkSoundToggle = document.getElementById('check-sound-toggle') as HTMLInputElement;
        const rangeVolumeLevel = document.getElementById('range-volume-level') as HTMLInputElement;
        const labelVolumeValue = document.getElementById('label-volume-value')!;

        btnSettingsMenu.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            settingsMenu.style.display = 'flex';
            
            // Sync UI inputs with AudioManager state
            checkSoundToggle.checked = AudioManager.getInstance().getSoundEnabled();
            const vol = Math.round(AudioManager.getInstance().getMasterVolume() * 100);
            rangeVolumeLevel.value = vol.toString();
            labelVolumeValue.textContent = `${vol}%`;
        });

        btnSettingsBack.addEventListener('click', showMainMenu);

        // --- CHARACTER ENCYCLOPEDIA LISTENERS & INJECTION ---
        const btnEncyclopediaMenu = document.getElementById('btn-encyclopedia-menu')!;
        const btnEncyclopediaBack = document.getElementById('btn-encyclopedia-back')!;
        const encyclopediaMenu = document.getElementById('pause-encyclopedia-menu')!;

        const showEncyclopediaTab = (tab: string) => {
            const contentBox = document.getElementById('encyclopedia-content')!;
            let html = '';
            if (tab === 'villager') {
                html = `
                    <h3 style="color: #4CAF50; font-size: 22px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">🏡 마을 주민 (Villager)</h3>
                    <p style="margin-bottom: 10px;"><strong>직무</strong>: Farmer (농부), Weaponsmith (무기 전문가), Cleric (성직자)</p>
                    <p style="margin-bottom: 10px;"><strong>설명</strong>: 평화로운 마을 NPC입니다. 낮에는 각자의 업무지(농장, 대장간, 성당) 및 우물가 광장으로 이동하며 일과를 보내고, 밤이 되면 본인의 침대에 누워 수면 상태에 들어갑니다.</p>
                    <p style="margin-bottom: 10px;"><strong>상호작용</strong>: 마우스 우클릭 시 <strong>상점 모달 UI</strong>가 열리며 에메랄드(Emerald)를 사용해 도구, 무기, 사과 등을 교환할 수 있습니다. 거래를 할수록 주민 등급(Apprentice ➡️ Journeyman ➡️ Expert ➡️ Master)이 올라가며 다이아몬드 검 등 더 가치 있는 고급 상품이 해금됩니다.</p>
                    <p style="color: #ff9800; font-weight: bold;">⚠️ 주의: 타격 시 온몸이 붉게 깜빡이며 넉백됩니다. 주민이 사망하면 거래를 할 수 없으니 밤에는 몬스터들로부터 이들을 적극 보호해 주세요.</p>
                `;
            } else if (tab === 'skeleton') {
                html = `
                    <h3 style="color: #ff4081; font-size: 22px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">💀 스켈레톤 (Skeleton)</h3>
                    <p style="margin-bottom: 10px;"><strong>공격 형태</strong>: <strong>원거리 화살 투척 공격</strong></p>
                    <p style="margin-bottom: 10px;"><strong>정체 규명</strong>: 질문하신 **"뭔가를 막 던져서 공격하는 몬스터"**의 정체가 바로 이 **스켈레톤(Skeleton)**입니다! 활을 든 뼈다귀 모양의 언데드 몹으로, 플레이어를 감지하면 조준하여 **3D 화살 투척체(Arrow Projectile)**를 계속 쏘아 날려 플레이어를 공격합니다.</p>
                    <p style="margin-bottom: 10px;"><strong>특성</strong>: 주로 밤에 출현하며, 낮이 되면 햇빛에 노출되어 스스로 불타오르므로 그늘이나 그늘진 건물 뒤에 숨어 플레이어를 노립니다.</p>
                    <p style="color: #2ecc71; font-weight: bold;">💡 공략팁: 방패가 없으므로 정면 돌격 시에는 좌우 지그재그 회피 기동을 섞어 화살을 피한 후, 근접해서 검으로 제압해야 피해를 줄일 수 있습니다.</p>
                `;
            } else if (tab === 'zombie') {
                html = `
                    <h3 style="color: #2ecc71; font-size: 22px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">🧟 좀비 (Zombie)</h3>
                    <p style="margin-bottom: 10px;"><strong>공격 형태</strong>: 근접 육탄 물리 공격</p>
                    <p style="margin-bottom: 10px;"><strong>설명</strong>: 밤에 소리 없이 기어오는 전통적인 언데드 몹입니다. 썩어가는 초록색 피부, 돌출된 입체 3D 코, 무섭게 벌어진 턱뼈, 찢어진 남방 사이로 보이는 붉은 늑골 속살 등 고해상도 좀비 모델로 완성되어 있습니다.</p>
                    <p style="margin-bottom: 10px;"><strong>특성</strong>: 플레이어를 발견하면 팔을 비대칭으로 으스스하게 흔들면서 빠른 걸음으로 다가와 근접 물리 데미지를 줍니다.</p>
                `;
            } else if (tab === 'creeper') {
                html = `
                    <h3 style="color: #f1c40f; font-size: 22px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">💣 크리퍼 (Creeper)</h3>
                    <p style="margin-bottom: 10px;"><strong>공격 형태</strong>: <strong>치명적인 자폭 폭발 공격</strong></p>
                    <p style="margin-bottom: 10px;"><strong>설명</strong>: 녹색의 네 다리를 가진 무소음 자폭 몹입니다. 플레이어에게 몰래 다가온 후, 사정거리 안에 들어오면 "치이이익-" 하는 카운트다운 도화선 점화 소리와 함께 **몸체를 붉게 팽창시킨 뒤 거대한 자폭 폭발**을 일으킵니다.</p>
                    <p style="margin-bottom: 10px;"><strong>위험성</strong>: 폭발 시 주변 블록을 완전히 날려버리며, 즉사에 이르는 큰 데미지를 줍니다.</p>
                    <p style="color: #ff9800; font-weight: bold;">💡 대처법: 폭화선 타는 "치익-" 소리가 나자마자 즉시 뒷걸음질 쳐서 폭발 반경(Chebyshev range)을 탈출해야 합니다. 폭발하기 전에 칼로 쳐서 넉백시키면 폭화선이 취소됩니다.</p>
                `;
            } else if (tab === 'player') {
                html = `
                    <h3 style="color: #3498db; font-size: 22px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">👤 플레이어 (Player - 본인)</h3>
                    <p style="margin-bottom: 10px;"><strong>직무</strong>: 모험가 / 생존자</p>
                    <p style="margin-bottom: 10px;"><strong>특성</strong>: 복셀 월드의 유일무이한 마스터 빌더입니다. 아이템을 채굴 및 수확하고, 제작대(Crafting Table)를 활용해 고급 도구(검, 곡괭이)를 만들어 밤의 몬스터 무리로부터 살아남아야 합니다.</p>
                    <p style="margin-bottom: 10px;"><strong>상태 지표</strong>: 배고픔을 일정 이상 채우면 기력이 고속 회복되고, HP가 소진되면 사망하여 모든 인벤토리 아이템을 바닥에 떨굽니다.</p>
                `;
            }
            contentBox.innerHTML = html;
        };

        btnEncyclopediaMenu.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            encyclopediaMenu.style.display = 'flex';
            // Show default tab 'villager'
            showEncyclopediaTab('villager');
            
            // Reset active tab button styles
            const encTabs = document.querySelectorAll('.btn-enc-tab');
            encTabs.forEach(t => {
                if (t.getAttribute('data-tab') === 'villager') {
                    (t as HTMLElement).style.background = '#E91E63';
                } else {
                    (t as HTMLElement).style.background = 'transparent';
                }
            });
        });

        btnEncyclopediaBack.addEventListener('click', () => {
            encyclopediaMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });

        const encTabs = document.querySelectorAll('.btn-enc-tab');
        encTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab')!;
                // Update active tab button style
                encTabs.forEach(t => {
                    if (t.getAttribute('data-tab') === targetTab) {
                        (t as HTMLElement).style.background = '#E91E63';
                    } else {
                        (t as HTMLElement).style.background = 'transparent';
                    }
                });
                showEncyclopediaTab(targetTab);
            });
        });

        checkSoundToggle.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            AudioManager.getInstance().setSoundEnabled(enabled);
            localStorage.setItem('minecaft_homage_setting_sound_enabled', enabled ? 'true' : 'false');
        });

        rangeVolumeLevel.addEventListener('input', (e) => {
            const vol = parseInt((e.target as HTMLInputElement).value);
            labelVolumeValue.textContent = `${vol}%`;
            AudioManager.getInstance().setMasterVolume(vol / 100);
            localStorage.setItem('minecaft_homage_setting_volume_level', vol.toString());
        });

        document.querySelectorAll('.btn-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const slot = parseInt(btn.getAttribute('data-slot')!);
                if (currentSlotAction === 'save') {
                    this.saveGame(slot);
                    showMainMenu();
                } else {
                    if (this.loadGame(slot)) {
                        resumeGame();
                    }
                }
            });
        });

        document.getElementById('btn-restart')!.addEventListener('click', () => {
            this.respawn();
            this.paused = false;
            this.pausedOverlay.style.display = 'none';
            showMainMenu();
        });

        // Global ESC handler for consistent UI escaping
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                if (this.input.gameMode === 'ui') {
                    // Close UI and return to Cursor Mode (waiting for click to lock)
                    // We cannot auto-lock on Escape due to browser security.
                    this.uiManager.toggleInventory();
                    this.input.setGameMode('cursor');
                    this.updateLockMessage();
                    this.updateModeIndicator();
                } else if (this.paused) {
                    // If in slot menu or settings menu, back to main pause menu. If in main pause menu, resume game.
                    if (slotMenu.style.display === 'flex' || settingsMenu.style.display === 'flex') {
                        showMainMenu();
                    } else {
                        // Delay resume slightly to avoid collision with browser's native Escape lock release frame
                        setTimeout(() => {
                            resumeGame();
                        }, 150);
                    }
                } else if (this.input.gameMode === 'game' || this.input.gameMode === 'cursor') {
                    // Open Pause Menu
                    this.paused = true;
                    this.pausedOverlay.style.display = 'flex';
                    this.input.setGameMode('cursor');
                    this.updateLockMessage();
                    this.updateModeIndicator();
                }
            }
        });

        // Death respawn
        const deathRespawn = document.getElementById('death-respawn')!;
        deathRespawn.addEventListener('click', () => {
            this.respawn();
        });

        // Start in cursor mode (not game mode) so player sees the lock message
        this.input.setGameMode('cursor');
        this.updateLockMessage();

        // Procedural Village Spawner (centerX = 64, centerZ = 64)
        const villageBuilder = new JigsawStructureBuilder();
        const villagers = villageBuilder.buildVillage(this.world, 64, 64);
        
        // Spawn Villagers in Scene and register to activeMobs list
        for (const v of villagers) {
            const villager = new VillagerEntity(
                Math.random().toString(36).substr(2, 9),
                v.pos,
                this.world,
                v.profession
            );
            this.scene.add(villager.mesh);
            this.activeMobs.push(villager);
        }

        // Start game loop
        this.animate();
    }

    private triggerScreenShake(isBreak: boolean): void {
        this.screenShakeTime = 0.001; // Start timer
        if (isBreak) {
            this.screenShakeAmp.set(0.015, 0.015, 0.008);
        } else {
            this.screenShakeAmp.set(0.008, 0.008, 0.004);
        }
    }

    private setupHighlight(): void {
        // Semi-transparent white overlay box for visibility on all block colors
        const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.25,
            depthTest: true,
            depthWrite: false,
        });
        this.highlightMesh = new THREE.Mesh(geometry, material);
        this.highlightMesh.renderOrder = 999;
        (this.highlightMesh.material as THREE.MeshBasicMaterial).depthTest = true;
        (this.highlightMesh.material as THREE.MeshBasicMaterial).depthWrite = false;
        this.highlightMesh.visible = false;
        this.scene.add(this.highlightMesh);

        // Bright outline via wireframe overlay
        const edgeGeo = new THREE.EdgesGeometry(geometry);
        const edgeMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1,
            depthTest: true,
            depthWrite: false,
        });
        const wireframe = new THREE.LineSegments(edgeGeo, edgeMat);
        wireframe.renderOrder = 1000;
        this.highlightMesh.add(wireframe);
    }

    private updateLockMessage(): void {
        if (this.input.gameMode === 'game') {
            if (!this.input.isPointerLocked) {
                this.lockMessage.textContent = 'Click to play';
                this.lockMessage.style.display = 'block';
            } else {
                this.lockMessage.style.display = 'none';
            }
        } else if (this.input.gameMode === 'cursor') {
            if (this.hasEverLocked) {
                this.lockMessage.style.display = 'none';
                this.modeIndicator.textContent = '🖱️ Cursor Mode | Click to play | E: inventory';
                this.modeIndicator.style.display = 'block';
            } else {
                this.lockMessage.textContent = 'Click to play';
                this.lockMessage.style.display = 'block';
            }
        } else {
            this.lockMessage.style.display = 'none';
        }
    }

    private updateModeIndicator(): void {
        switch (this.input.gameMode) {
            case 'game':
                this.modeIndicator.textContent = '🎮 Game Mode';
                this.modeIndicator.style.display = 'none'; // Hide in game mode
                this.crosshair.style.display = 'block'; // Show HTML crosshair!
                break;
            case 'cursor':
                this.modeIndicator.textContent = '🖱️ Cursor Mode (Click to play)';
                this.modeIndicator.style.display = 'block';
                this.crosshair.style.display = 'none'; // Hide HTML crosshair!
                break;
            case 'ui':
                this.modeIndicator.textContent = '📋 UI Mode';
                this.modeIndicator.style.display = 'block';
                this.crosshair.style.display = 'none'; // Hide HTML crosshair!
                break;
        }
    }

    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.armsCamera.aspect = window.innerWidth / window.innerHeight;
        this.armsCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        if (this.input.isKeyDown('Escape')) {
            this.input.keys.delete('Escape');
        }

        // Fallback: If pointer lock was lost externally (e.g. browser intercepted ESC)
        if (this.prevGameMode === 'game' && this.input.gameMode === 'cursor' && !this.paused) {
            this.paused = true;
            this.pausedOverlay.style.display = 'flex';
        }

        if (this.paused) {
            this.renderer.autoClear = true;
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.stats.isDead()) {
            if (!this.wasDead) {
                this.dropAllItemsOnDeath();
                this.wasDead = true;
            }
            this.uiManager.showDeathScreen();
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Handle mode switching
        this.handleModeSwitching();

        // If the UI is closed externally (e.g. click close button), set gameMode back to cursor
        if (this.input.gameMode === 'ui' && !this.uiManager.isUIOpen()) {
            this.input.setGameMode('cursor');
            this.updateLockMessage();
            this.updateModeIndicator();
        }

        // Detect external mode/lock changes (e.g., ESC releases pointer lock, click acquires it)
        const currentMode = this.input.gameMode;
        const currentLocked = this.input.isPointerLocked;
        if (currentMode !== this.prevGameMode || currentLocked !== this.prevLockedState) {
            this.updateLockMessage();
            this.updateModeIndicator();
        }
        this.prevGameMode = currentMode;
        this.prevLockedState = currentLocked;

        // Update time system
        this.timeSystem.update(deltaTime);

        // Update player stats with environmental states
        this.stats.setSprinting(this.input.isKeyDown('ShiftLeft'));
        this.stats.setDaytime(this.timeSystem.isDaytime());
        this.updatePlayerStats(deltaTime);

        // Update player (movement + camera rotation in game mode)
        this.player.update(deltaTime);

        // Apply screen shake offset to camera rotation
        if (this.screenShakeTime > 0) {
            this.screenShakeTime += deltaTime;
            if (this.screenShakeTime > 0.15) {
                this.screenShakeTime = 0;
                this.screenShakeAmp.set(0, 0, 0);
            } else {
                const t = this.screenShakeTime;
                const decay = Math.exp(-20.0 * t);
                const osc = Math.cos(2 * Math.PI * 25.0 * t);
                this.camera.rotation.x += this.screenShakeAmp.x * decay * osc;
                this.camera.rotation.y += this.screenShakeAmp.y * decay * osc;
                this.camera.rotation.z += this.screenShakeAmp.z * decay * osc;
            }
        }

        this.updateCharacterModel(deltaTime);

        // Update world (chunk loading)
        this.world.update(this.player.position.x, this.player.position.z);
        this.particles.update(deltaTime);

        // Update item entities physics and attraction
        this.updateItemEntities(deltaTime);

        // Phase 3: Tick Cellular Automata Liquid Simulation every 250ms
        this.liquidTimer += deltaTime;
        if (this.liquidTimer >= 0.25) {
            this.liquidSim.update(this.liquidTimer, this.player.position.x, this.player.position.z);
            this.liquidTimer = 0;
        }

        // Phase 3: Scan for and update Sand/Gravel gravity falling blocks
        this.scanTimer += deltaTime;
        if (this.scanTimer >= 0.20) {
            this.scanTimer = 0;
            this.scanFloatingBlocks();
        }

        // Update active falling block entities
        for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
            const fb = this.fallingBlocks[i];
            fb.update(
                deltaTime,
                this.world,
                this.scene,
                this.player.position,
                (amount) => {
                    this.stats.takeDamage(amount);
                },
                (itemEntity) => {
                    this.itemEntities.push(itemEntity);
                    this.scene.add(itemEntity.mesh);
                }
            );
            if (fb.isFinished) {
                this.fallingBlocks.splice(i, 1);
            }
        }

        // Phase 4: Update active Mob entities
        if (this.playerHurtTimer > 0) {
            this.playerHurtTimer -= deltaTime;
        }

        for (let i = this.activeMobs.length - 1; i >= 0; i--) {
            const mob = this.activeMobs[i];
            
            if (mob instanceof SkeletonEntity) {
                mob.update(deltaTime, this.player.position, this.scene, this.activeMobs, (arrow) => {
                    this.arrows.push(arrow);
                });
            } else if (mob instanceof CreeperEntity) {
                mob.update(deltaTime, this.player.position, this.scene, this.activeMobs, (damage) => {
                    const finalDmg = CombatManager.getInstance().calculateArmorMitigation(damage, 0, 0);
                    this.stats.takeDamage(finalDmg);
                    this.triggerScreenShake(true);
                });
            } else {
                mob.update(deltaTime, this.player.position, this.scene, this.activeMobs);
                
                // Zombie melee contact damage
                const dist = mob.position.distanceTo(this.player.position);
                if (dist < 1.2 && !mob.isDead) {
                    if (this.playerHurtTimer <= 0) {
                        this.playerHurtTimer = 0.5;
                        this.stats.takeDamage(mob.damage);
                        this.triggerScreenShake(true);
                    }
                }
            }

            if (mob.isDead) {
                mob.dispose(this.scene);
                this.activeMobs.splice(i, 1);
            }
        }

        // Phase 4: Update active arrow projectiles
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            arrow.update(deltaTime, this.player.position, (damage) => {
                const finalDmg = CombatManager.getInstance().calculateArmorMitigation(damage, 0, 0);
                this.stats.takeDamage(finalDmg);
                this.triggerScreenShake(true);
            });
            if (arrow.isDead) {
                this.arrows.splice(i, 1);
            }
        }

        // Phase 4: Tick mob spawner candidates
        this.mobSpawnTimer += deltaTime;
        if (this.mobSpawnTimer >= 5.0) {
            this.mobSpawnTimer = 0;
            this.updateMobSpawner();
        }

        // Keep high-fidelity shadow map camera centered around the player
        if (this.sunLight && this.sunLight.shadow && this.sunLight.shadow.camera) {
            const playerPos = this.player.position;
            this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
            if (!this.scene.children.includes(this.sunLight.target)) {
                this.scene.add(this.sunLight.target);
            }
            
            // Scale and keep the light source offset from the player while keeping its relative angle
            const currentDir = new THREE.Vector3().copy(this.sunLight.position).normalize();
            const dist = 120;
            this.sunLight.position.set(
                playerPos.x + currentDir.x * dist,
                playerPos.y + currentDir.y * dist,
                playerPos.z + currentDir.z * dist
            );
        }

        // Handle block interaction
        this.handleBlockInteraction();

        // Update highlight and tooltip
        this.updateHighlight();
        this.updateBlockTooltip();

        // Update UI
        this.uiManager.updateHUD();
        this.uiManager.updateHotbar();

        // Focused scroll wheel cycling
        if (this.input.gameMode !== 'game' && this.uiManager.isHotbarFocused) {
            const scroll = this.input.consumeScrollDelta();
            if (scroll !== 0) {
                const dir = Math.sign(scroll);
                let newSlot = this.inventory.selectedSlot + dir;
                if (newSlot < 0) newSlot = 8;
                if (newSlot > 8) newSlot = 0;
                
                this.inventory.selectedSlot = newSlot;
                this.uiManager.updateHotbar();
                this.uiManager.updateInventory();
            }
        }

        this.updateFPS(deltaTime);

        // Render
        this.renderer.autoClear = true;
        this.renderer.render(this.scene, this.camera);

        this.renderer.autoClear = false;
        this.renderer.clearDepth();
        this.armsCamera.position.set(0, 0, 0);
        this.armsCamera.quaternion.identity();
        this.renderer.render(this.armsScene, this.armsCamera);
    }

    private handleModeSwitching(): void {
        if (this.input.isKeyDown('KeyE')) {
            this.input.keys.delete('KeyE');
            if (this.input.gameMode === 'ui') {
                this.uiManager.toggleInventory();
                this.input.setGameMode('game');
                this.uiManager.isHotbarFocused = false;
                this.updateLockMessage();
                this.updateModeIndicator();
            } else if (!this.paused) {
                this.input.setGameMode('ui');
                this.uiManager.toggleInventory();
                this.updateLockMessage();
                this.updateModeIndicator();
            }
        }
    }

    private updatePlayerStats(deltaTime: number): void {
        const playerPos = this.player.position;
        let nearCampfire = false;
        let nearFurnace = false;
        let inTent = false;

        for (let dx = -5; dx <= 5; dx++) {
            for (let dy = -5; dy <= 5; dy++) {
                for (let dz = -5; dz <= 5; dz++) {
                    const bx = Math.floor(playerPos.x + dx);
                    const by = Math.floor(playerPos.y + dy);
                    const bz = Math.floor(playerPos.z + dz);
                    const block = this.world.getBlock(bx, by, bz);
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (block === BlockType.CAMPFIRE && dist <= 5) {
                        nearCampfire = true;
                    }
                    if (block === BlockType.FURNACE && dist <= 3) {
                        nearFurnace = true;
                    }
                    if (block === BlockType.TENT && dist <= 2) {
                        inTent = true;
                    }
                }
            }
        }

        this.stats.setNearCampfire(nearCampfire);
        this.stats.setNearFurnace(nearFurnace);
        this.stats.setInTent(inTent);

        this.stats.update(deltaTime);
    }

    private handleBlockInteraction(): void {
        // Only allow block interaction in game or cursor mode
        if (this.input.gameMode === 'ui') return;

        // Always cast from camera center (crosshair position)
        const result = this.raycaster.cast(this.camera);

        if (this.input.isMouseButtonDown(0)) {
            // Phase 4: Attack Mob check first
            let hitMob: MobEntity | null = null;
            let bestDist = 4.0;
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            
            for (const mob of this.activeMobs) {
                if (mob.isDead) continue;
                const intersects = raycaster.intersectObjects(mob.mesh.children);
                if (intersects.length > 0) {
                    const dist = intersects[0].distance;
                    if (dist < bestDist) {
                        bestDist = dist;
                        hitMob = mob;
                    }
                }
            }

            if (hitMob) {
                const combat = CombatManager.getInstance();
                const heldItem = this.uiManager.getSelectedItem();
                const now = performance.now() / 1000;
                const ratio = combat.getAttackStrengthRatio(now, heldItem);
                combat.recordAttack(now);

                let damage = combat.getBaseDamage(heldItem);
                let isCrit = false;

                if (ratio < 0.9) {
                    damage *= 0.2; // penalty
                } else {
                    if (this.player.velocity.y < -0.1 && !this.player.onGround) {
                        damage *= 1.5;
                        isCrit = true;
                        
                        // Spawn blue critical particles
                        for (let p = 0; p < 12; p++) {
                            this.particles.spawn(
                                hitMob.position.x + (Math.random() - 0.5) * 0.4,
                                hitMob.position.y + 0.9 + (Math.random() - 0.5) * 0.6,
                                hitMob.position.z + (Math.random() - 0.5) * 0.4,
                                BlockType.ICE
                            );
                        }
                    }
                }

                const knockbackForce = ratio >= 0.9 ? 1.0 : 0.0;
                let knockbackDir: THREE.Vector3 | undefined = undefined;
                if (knockbackForce > 0) {
                    const camDir = new THREE.Vector3();
                    this.camera.getWorldDirection(camDir);
                    camDir.y = 0;
                    camDir.normalize().multiplyScalar(knockbackForce);
                    knockbackDir = camDir;
                }

                hitMob.takeDamage(damage, knockbackDir);

                if (hitMob instanceof ZombieEntity) {
                    for (const m of this.activeMobs) {
                        if (m instanceof ZombieEntity && m.position.distanceTo(hitMob.position) < 40.0) {
                            m.alert();
                        }
                    }
                }

                // Impact particles
                this.particles.spawn(
                    hitMob.position.x,
                    hitMob.position.y + 0.9,
                    hitMob.position.z,
                    BlockType.DIRT
                );

                AudioManager.getInstance().playPickup();

                this.characterModel.triggerSwing();
                this.characterModel.applyRecoilForce();
                this.triggerScreenShake(true);

                this.input.mouseDown.delete(0);
                return;
            }

            // Left click - destroy block
            if (result) {
                const isFist = (this.uiManager.getSelectedItem() === null);

                if (isFist) {
                    const blockPos = result.position;
                    const sameBlock = this.lastPunchBlockPos && 
                        this.lastPunchBlockPos.x === blockPos.x &&
                        this.lastPunchBlockPos.y === blockPos.y &&
                        this.lastPunchBlockPos.z === blockPos.z;

                    if (!sameBlock) {
                        // First punch: save position, play feedback, but do not destroy yet.
                        this.lastPunchBlockPos = { x: blockPos.x, y: blockPos.y, z: blockPos.z };
                        
                        AudioManager.getInstance().playPickup(); // punch/hit feedback sound
                        this.characterModel.triggerSwing();
                        this.triggerScreenShake(false);
                        
                        // Spawn light dust particles
                        const bType = this.world.getBlock(blockPos.x, blockPos.y, blockPos.z);
                        for (let p = 0; p < 4; p++) {
                            this.particles.spawn(
                                blockPos.x + 0.5 + (Math.random() - 0.5) * 0.4,
                                blockPos.y + 0.5 + (Math.random() - 0.5) * 0.4,
                                blockPos.z + 0.5 + (Math.random() - 0.5) * 0.4,
                                bType
                            );
                        }
                        
                        this.input.mouseDown.delete(0);
                        return;
                    }
                }
                
                // Reset fist punch tracking on successful break or tool usage
                this.lastPunchBlockPos = null;

                const blockType = this.world.getBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z
                );

                let itemTypeToDrop: ItemType | undefined = BLOCK_TO_ITEM[blockType];
                
                // Food gathering system (Random drops)
                if (blockType === BlockType.LEAVES) {
                    if (Math.random() < 0.20) {
                        itemTypeToDrop = ItemType.APPLE; // 20% chance for Apple
                    }
                }

                if (itemTypeToDrop !== undefined) {
                    this.inventory.addItem(itemTypeToDrop, 1);
                }

                // Pickaxe Hidden Item/Block Discovery System
                const heldItem = this.uiManager.getSelectedItem();
                let discoveryChance = 0;
                let pickaxeName = '';
                if (heldItem === ItemType.WOODEN_PICKAXE) {
                    discoveryChance = 0.05;
                    pickaxeName = '나무 곡괭이';
                } else if (heldItem === ItemType.STONE_PICKAXE) {
                    discoveryChance = 0.15;
                    pickaxeName = '돌 곡괭이';
                } else if (heldItem === ItemType.IRON_PICKAXE) {
                    discoveryChance = 0.40;
                    pickaxeName = '철 곡괭이';
                } else if (heldItem === ItemType.DIAMOND_PICKAXE) {
                    discoveryChance = 0.80;
                    pickaxeName = '다이아몬드 곡괭이';
                }

                if (discoveryChance > 0 && Math.random() < discoveryChance) {
                    const hiddenPool = [
                        ItemType.COAL,
                        ItemType.IRON_INGOT,
                        ItemType.GOLD_INGOT,
                        ItemType.DIAMOND,
                        ItemType.APPLE,
                        ItemType.TORCH_BLOCK,
                        ItemType.CAMPFIRE_BLOCK,
                        ItemType.STONE_BLOCK,
                        ItemType.WOOD_BLOCK,
                        ItemType.STICK
                    ];
                    const hiddenItem = hiddenPool[Math.floor(Math.random() * hiddenPool.length)];
                    this.inventory.addItem(hiddenItem, 1);
                    this.uiManager.updateHotbar();
                    this.uiManager.updateInventory();
                    
                    const itemName = ITEM_NAMES[hiddenItem] ?? '아이템';
                    this.uiManager.showNotification(`${pickaxeName}로 숨겨진 ${itemName}을(를) 발견했습니다!`);
                }

                this.stats.consumeEPForBreak(false);

                // Play break sound
                const blockMat = this.getAudioMaterialFromBlock(blockType);
                AudioManager.getInstance().playBlockBreak(blockMat);

                this.world.setBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z,
                    BlockType.AIR
                );

                this.checkAndSpawnFallingBlock(result.position.x, result.position.y + 1, result.position.z);
                
                // Spawn breaking particles
                this.particles.spawn(
                    result.position.x,
                    result.position.y,
                    result.position.z,
                    blockType
                );

                this.characterModel.triggerSwing();
                this.characterModel.applyRecoilForce();
                this.triggerScreenShake(true);
                this.input.mouseDown.delete(0);
            }
        }

        if (this.input.isMouseButtonDown(2)) {
            // Villager Right-click Raycast detection
            const villagerRaycaster = new THREE.Raycaster();
            const villagerMouse = new THREE.Vector2(0, 0); // Center by default
            if (this.input.gameMode === 'cursor') {
                villagerMouse.set(this.input.cursorX, this.input.cursorY);
            }
            villagerRaycaster.setFromCamera(villagerMouse, this.camera);
            
            const villagerMeshes = this.activeMobs
                .filter(m => !m.isDead && m.type === MobType.VILLAGER)
                .map(m => m.mesh);
                
            const villagerIntersects = villagerRaycaster.intersectObjects(villagerMeshes, true);
            if (villagerIntersects.length > 0) {
                const hitObj = villagerIntersects[0].object;
                let rootGrp = hitObj;
                while (rootGrp.parent && rootGrp.parent !== this.scene) {
                    rootGrp = rootGrp.parent;
                }
                
                const clickedVillager = this.activeMobs.find(m => m.mesh === rootGrp) as VillagerEntity | undefined;
                if (clickedVillager) {
                    this.input.setGameMode('ui');
                    this.uiManager.openTradeUI(clickedVillager);
                    this.updateLockMessage();
                    this.updateModeIndicator();
                    this.input.mouseDown.delete(2);
                    return;
                }
            }

            const selectedItem = this.uiManager.getSelectedItem();
            if (selectedItem === ItemType.APPLE || selectedItem === ItemType.BAKED_APPLE) {
                if (this.stats.hunger >= this.stats.maxHunger) {
                    this.uiManager.showNotification('🍗 배가 불러서 음식을 더 먹을 수 없습니다!');
                } else {
                    const eaten = this.stats.eatFood(selectedItem);
                    if (eaten) {
                        this.inventory.removeItem(this.inventory.selectedSlot, 1);
                        AudioManager.getInstance().playPickup(); // Play pickup chime as eating sound
                        
                        const foodName = selectedItem === ItemType.APPLE ? '사과' : '구운사과';
                        this.uiManager.showNotification(`😋 ${foodName}을(를) 맛있게 먹었습니다!`);
                        
                        this.uiManager.updateHotbar();
                        this.uiManager.updateInventory();
                        this.characterModel.equipItem(this.uiManager.getSelectedItem());
                        this.characterModel.triggerSwing();
                    }
                }
                this.input.mouseDown.delete(2);
                return;
            }

            // Right click - place block
            if (result) {
                const placeX = result.position.x + result.normal.x;
                const placeY = result.position.y + result.normal.y;
                const placeZ = result.position.z + result.normal.z;

                const targetBlock = this.world.getBlock(
                    result.position.x,
                    result.position.y,
                    result.position.z
                );
                if (targetBlock === BlockType.FURNACE) {
                    const heldItem = this.uiManager.getSelectedItem();
                    if (heldItem === ItemType.APPLE) {
                        this.inventory.removeItem(this.inventory.selectedSlot, 1);
                        const added = this.inventory.addItem(ItemType.BAKED_APPLE, 1);
                        if (!added) {
                            // Rollback
                            this.inventory.addItem(ItemType.APPLE, 1);
                            this.uiManager.showNotification('⚠️ 인벤토리가 가득 차서 구운사과을(를) 만들 수 없습니다!');
                        } else {
                            this.characterModel.triggerSwing();
                            this.particles.spawn(
                                result.position.x,
                                result.position.y + 0.5,
                                result.position.z,
                                BlockType.FURNACE
                            );
                            this.uiManager.showNotification('🔥 화롯불에 사과를 구워 구운사과을(를) 만들었습니다!');
                            this.uiManager.updateHotbar();
                            this.characterModel.equipItem(this.uiManager.getSelectedItem());
                        }
                    } else {
                        this.uiManager.showNotification('🔥 화롯불입니다. 사과를 들고 우클릭하면 구운사과로 구울 수 있습니다.');
                    }
                    this.input.mouseDown.delete(2);
                    return;
                }

                const playerPos = this.player.position;
                const playerHeight = 1.8;
                if (
                    placeX >= Math.floor(playerPos.x - 0.3) &&
                    placeX <= Math.floor(playerPos.x + 0.3) &&
                    placeY >= Math.floor(playerPos.y) &&
                    placeY <= Math.floor(playerPos.y + playerHeight) &&
                    placeZ >= Math.floor(playerPos.z - 0.3) &&
                    placeZ <= Math.floor(playerPos.z + 0.3)
                ) {
                    // Block would be inside player
                } else {
                    const selectedItem = this.uiManager.getSelectedItem();
                    if (selectedItem !== null) {
                        const blockType = ITEM_TO_BLOCK[selectedItem];
                        if (blockType !== undefined) {
                            this.world.setBlock(placeX, placeY, placeZ, blockType);
                            this.checkAndSpawnFallingBlock(placeX, placeY, placeZ);

                            // Play place sound
                            const placedBlockMat = this.getAudioMaterialFromBlock(blockType);
                            AudioManager.getInstance().playBlockPlace(placedBlockMat);

                            this.inventory.removeItem(this.inventory.selectedSlot, 1);
                            this.characterModel.triggerSwing();
                            this.characterModel.applyRecoilForce();
                            this.triggerScreenShake(false);
                        }
                    }
                }
                this.input.mouseDown.delete(2);
            }
        }

        // Number keys to select hotbar slot
        for (let i = 0; i < 9; i++) {
            if (this.input.isKeyDown(`Digit${i + 1}`)) {
                this.inventory.selectedSlot = i;
                this.uiManager.updateHotbar();
            }
        }
    }

    private checkAndSpawnFallingBlock(x: number, y: number, z: number): void {
        const block = this.world.getBlock(x, y, z);
        if (block === BlockType.SAND || block === BlockType.GRAVEL) {
            const below = this.world.getBlock(x, y - 1, z);
            if (below === BlockType.AIR || below === BlockType.WATER || below === BlockType.LAVA || below === BlockType.TORCH) {
                this.world.setBlock(x, y, z, BlockType.AIR);
                const fb = new FallingBlockEntity(block, new THREE.Vector3(x, y, z));
                this.fallingBlocks.push(fb);
                this.scene.add(fb.mesh);
                
                // Recursively check block above
                this.checkAndSpawnFallingBlock(x, y + 1, z);
            }
        }
    }

    private scanFloatingBlocks(): void {
        const px = Math.floor(this.player.position.x);
        const py = Math.floor(this.player.position.y);
        const pz = Math.floor(this.player.position.z);
        const radius = 16;
        
        for (let x = px - radius; x <= px + radius; x++) {
            for (let z = pz - radius; z <= pz + radius; z++) {
                const minY = Math.max(1, py - 12);
                const maxY = Math.min(120, py + 16);
                for (let y = minY; y <= maxY; y++) {
                    const block = this.world.getBlock(x, y, z);
                    if (block === BlockType.SAND || block === BlockType.GRAVEL) {
                        const below = this.world.getBlock(x, y - 1, z);
                        if (below === BlockType.AIR || below === BlockType.WATER || below === BlockType.LAVA || below === BlockType.TORCH) {
                            this.world.setBlock(x, y, z, BlockType.AIR);
                            const fb = new FallingBlockEntity(block, new THREE.Vector3(x, y, z));
                            this.fallingBlocks.push(fb);
                            this.scene.add(fb.mesh);
                        }
                    }
                }
            }
        }
    }

    private updateMobSpawner(): void {
        // Clean up far away mobs (distance > 128m) or randomly despawn wandering mobs (> 32m)
        for (let i = this.activeMobs.length - 1; i >= 0; i--) {
            const mob = this.activeMobs[i];
            const dist = mob.position.distanceTo(this.player.position);
            if (dist > 128.0) {
                mob.dispose(this.scene);
                this.activeMobs.splice(i, 1);
            } else if (dist > 32.0 && Math.random() < 0.1) {
                mob.dispose(this.scene);
                this.activeMobs.splice(i, 1);
            }
        }

        if (this.activeMobs.length >= 10) return; // Cap maximum active mobs around player

        // Spawns only during the night or inside deep caves (Y < 42)
        const isNight = !this.timeSystem.isDaytime();
        const playerY = this.player.position.y;
        const isCave = playerY < 42.0;

        if (!isNight && !isCave) return;

        const px = Math.floor(this.player.position.x);
        const py = Math.floor(this.player.position.y);
        const pz = Math.floor(this.player.position.z);

        const spawnCount = 2 + Math.floor(Math.random() * 3); // spawn 2-4 mobs per tick
        for (let attempt = 0; attempt < 12; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 24.0 + Math.random() * 26.0; // spawn in 24m ~ 50m range
            const sx = Math.floor(px + Math.cos(angle) * radius);
            const sz = Math.floor(pz + Math.sin(angle) * radius);

            // Find suitable Y ground position
            let sy = -1;
            for (let y = Math.max(5, py - 16); y < Math.min(120, py + 16); y++) {
                const currentBlock = this.world.getBlock(sx, y, sz);
                const belowBlock = this.world.getBlock(sx, y - 1, sz);
                const aboveBlock = this.world.getBlock(sx, y + 1, sz);

                // Spot must have solid below, and air for head and torso
                if (belowBlock !== 0 && currentBlock === 0 && aboveBlock === 0) {
                    sy = y;
                    break;
                }
            }

            if (sy !== -1) {
                const startPos = new THREE.Vector3(sx + 0.5, sy, sz + 0.5);
                const rand = Math.random();
                let mob: MobEntity;
                if (rand < 0.4) {
                    mob = new ZombieEntity(Math.random().toString(36).substr(2, 9), startPos, this.world);
                } else if (rand < 0.7) {
                    mob = new SkeletonEntity(Math.random().toString(36).substr(2, 9), startPos, this.world);
                } else {
                    mob = new CreeperEntity(Math.random().toString(36).substr(2, 9), startPos, this.world, this.particles);
                }
                this.activeMobs.push(mob);
                this.scene.add(mob.mesh);
                
                if (this.activeMobs.length >= 10) break;
            }
        }
    }

    private updateHighlight(): void {
        if (!this.highlightMesh) return;

        if (this.input.gameMode === 'ui') {
            this.highlightMesh.visible = false;
            return;
        }

        // Always cast from camera center
        const result = this.raycaster.cast(this.camera);

        if (result) {
            this.highlightMesh.position.set(
                result.position.x + 0.5,
                result.position.y + 0.5,
                result.position.z + 0.5
            );
            this.highlightMesh.visible = true;

            if (result.exactHitPoint) {
                this.hitMarker.position.copy(result.exactHitPoint);
                this.hitMarker.visible = true;
            } else {
                this.hitMarker.visible = false;
            }
        } else {
            this.highlightMesh.visible = false;
            this.hitMarker.visible = false;
        }
    }

    private updateBlockTooltip(): void {
        // Show/hide cursor dot based on mode
        if (this.input.gameMode === 'cursor') {
            this.cursorDot.style.display = 'block';
            this.cursorDot.style.left = `${this.input.cursorX * 100}%`;
            this.cursorDot.style.top = `${this.input.cursorY * 100}%`;
        } else {
            this.cursorDot.style.display = 'none';
        }

        if (this.input.gameMode === 'ui') {
            this.blockTooltip.style.display = 'none';
            return;
        }

        // Always cast from camera center (crosshair position)
        const result = this.raycaster.cast(this.camera);

        if (result) {
            const blockType = this.world.getBlock(
                result.position.x,
                result.position.y,
                result.position.z
            );
            let blockName = BLOCK_NAMES[blockType] ?? 'Unknown';
            this.blockTooltip.textContent = blockName;
            this.blockTooltip.style.display = 'block';
        } else {
            this.blockTooltip.style.display = 'none';
        }
    }

    private updateFPS(deltaTime: number): void {
        this.frameCount++;
        this.fpsTime += deltaTime;

        if (this.fpsTime >= 0.5) {
            this.fpsCounter = Math.round(this.frameCount / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;

            const pos = this.player.position;
            this.uiManager.updateInfo(
                this.fpsCounter,
                pos.x,
                pos.y,
                pos.z,
                this.world.getLoadedChunkCount()
            );
        }
    }

    private saveGame(slot: number): void {
        try {
            const now = new Date();
            const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${String(now.getMinutes()).padStart(2, '0')}분 ${String(now.getSeconds()).padStart(2, '0')}초`;

            const data = {
                player: this.player.getState(),
                stats: this.stats.getState(),
                inventory: this.inventory.getState(),
                time: this.timeSystem.getState(),
                world: this.world.getState(),
                saveTime: dateStr
            };
            localStorage.setItem(`minecaft_homage_slot_${slot}`, JSON.stringify(data));
            localStorage.setItem(`minecaft_homage_slot_${slot}_metadata`, dateStr);
            console.log(`Saved to slot ${slot} at ${dateStr}`);
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    private loadGame(slot: number): boolean {
        try {
            const dataStr = localStorage.getItem(`minecaft_homage_slot_${slot}`);
            if (!dataStr) return false;

            const data = JSON.parse(dataStr);
            this.player.setState(data.player);
            this.stats.setState(data.stats);
            this.inventory.setState(data.inventory);
            this.timeSystem.setState(data.time);
            this.world.setState(data.world);
            
            this.uiManager.updateInventory();
            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }

    private respawn(): void {
        this.stats.fullHeal();
        const spawnY = this.world.getTerrainHeight(64, 64) + 15;
        this.player.position.set(64, spawnY, 64);
        this.player.velocity.set(0, 0, 0);
        this.input.setGameMode('game');
        this.updateLockMessage();
        this.updateModeIndicator();
        this.uiManager.hideDeathScreen();
        this.wasDead = false;
    }

    private updateCharacterModel(deltaTime: number): void {
        const selectedItem = this.uiManager.getSelectedItem();
        if (selectedItem !== this.currentHeldItem) {
            this.currentHeldItem = selectedItem;
            this.characterModel.equipItem(selectedItem);
        }

        const isMoving = this.input.isKeyDown('KeyW') || this.input.isKeyDown('KeyA') ||
                        this.input.isKeyDown('KeyS') || this.input.isKeyDown('KeyD');
        const isSprinting = this.input.isKeyDown('ShiftLeft') && isMoving;

        // Calculate dynamic raycast hit distance to stretch the pickaxe arm perfectly to the highlighted block!
        const result = this.raycaster.cast(this.camera);
        const targetDistance = result ? result.distance : 2.2;

        this.characterModel.update(deltaTime, isMoving, isSprinting, this.player.onGround, targetDistance);
    }

    private getAudioMaterialFromBlock(blockType: BlockType): string {
        switch (blockType) {
            case BlockType.GRASS:
            case BlockType.LEAVES:
                return 'grass';
            case BlockType.DIRT:
                return 'dirt';
            case BlockType.WOOD:
            case BlockType.PLANKS:
                return 'wood';
            case BlockType.SAND:
            case BlockType.CACTUS:
                return 'sand';
            case BlockType.GRAVEL:
                return 'sand';
            case BlockType.STONE:
            case BlockType.COBBLESTONE:
            case BlockType.BRICK:
            case BlockType.FURNACE:
            case BlockType.COAL_ORE:
            case BlockType.IRON_ORE:
            case BlockType.GOLD_ORE:
            case BlockType.DIAMOND_ORE:
                return 'stone';
            default:
                return 'stone';
        }
    }

    private dropAllItemsOnDeath(): void {
        const playerPos = this.player.position.clone();
        playerPos.y += 0.5; // drop slightly above feet

        // Helper to spawn a drop
        const spawnDrop = (itemType: ItemType, count: number) => {
            if (itemType === null || count <= 0) return;
            const drop = new ItemEntity(itemType, count, playerPos);
            this.itemEntities.push(drop);
            this.scene.add(drop.mesh);
        };

        // 1. Inventory slots 0-35
        for (let i = 0; i < 36; i++) {
            const slot = this.inventory.slots[i];
            if (slot.itemType !== null && slot.count > 0) {
                spawnDrop(slot.itemType, slot.count);
                slot.itemType = null;
                slot.count = 0;
            }
        }

        // 2. Held item
        if (this.inventory.heldItem.itemType !== null && this.inventory.heldItem.count > 0) {
            spawnDrop(this.inventory.heldItem.itemType, this.inventory.heldItem.count);
            this.inventory.heldItem.itemType = null;
            this.inventory.heldItem.count = 0;
        }

        // 3. Crafting grid (100-108)
        for (let i = 100; i <= 108; i++) {
            const slot = this.inventory.slots[i];
            if (slot.itemType !== null && slot.count > 0) {
                spawnDrop(slot.itemType, slot.count);
                slot.itemType = null;
                slot.count = 0;
            }
        }

        // Clear crafting output slot (109)
        this.inventory.slots[109].itemType = null;
        this.inventory.slots[109].count = 0;

        // Update UI after inventory is completely emptied on death
        this.uiManager.updateInventory();
        this.uiManager.updateHotbar();
        this.characterModel.equipItem(null); // unequip held item arm mesh
    }

    private updateItemEntities(deltaTime: number): void {
        const playerPos = this.player.position;
        // Iterate backwards so we can safely remove elements
        for (let i = this.itemEntities.length - 1; i >= 0; i--) {
            const entity = this.itemEntities[i];
            entity.update(deltaTime, this.world, playerPos);

            // Distance to player
            const dist = entity.position.distanceTo(playerPos);

            // Magnet pulling range is 1.8m. Let's pull items to player's center.
            // When distance is extremely small (e.g. <= 0.45m) and player is alive, try to collect it.
            if (dist <= 0.45 && !this.stats.isDead()) {
                const added = this.inventory.addItem(entity.itemType, entity.count);
                if (added) {
                    // Play pop pickup sound
                    AudioManager.getInstance().playPickup();
                    // Clean up entity
                    entity.destroy(this.scene);
                    this.itemEntities.splice(i, 1);
                    
                    // Update hotbar and inventory display
                    this.uiManager.updateHotbar();
                    this.uiManager.updateInventory();
                    this.characterModel.equipItem(this.uiManager.getSelectedItem());
                    continue;
                }
            }

            // Despawn after 5 minutes (300 seconds)
            if (entity.despawnTimer >= 300) {
                entity.destroy(this.scene);
                this.itemEntities.splice(i, 1);
            }
        }
    }
}