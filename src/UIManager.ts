import { PlayerStats } from './PlayerStats';
import { TimeSystem } from './TimeSystem';
import { Inventory } from './Inventory';
import { ItemType, CraftingRecipe, VillagerProfession, VillagerTrade, VillagerState } from './types';
import { ITEM_NAMES, ITEM_DESCRIPTIONS, CRAFTING_RECIPES } from './constants';
import { CombatManager } from './CombatManager';
import { VillagerEntity } from './VillagerEntity';
import { AudioManager } from './AudioManager';

interface RecipeStatus {
    recipe: CraftingRecipe;
    canCraft: boolean;
    missingIngredients: { item: ItemType; needed: number; have: number }[];
}

export class UIManager {
    private stats: PlayerStats;
    private timeSystem: TimeSystem;
    private inventory: Inventory;

    // Trade Panel elements
    private tradePanel!: HTMLElement;
    private activeVillager: VillagerEntity | null = null;
    private selectedTradeIndex: number = -1;

    // HUD elements
    private hpBar: HTMLElement;
    private hpText: HTMLElement;
    private epBar: HTMLElement;
    private epText: HTMLElement;
    private hungerBar: HTMLElement;
    private hungerText: HTMLElement;
    private timeDisplay: HTMLElement;
    private dayDisplay: HTMLElement;
    private infoDisplay: HTMLElement;
    private cooldownContainer!: HTMLElement;
    private cooldownFill!: HTMLElement;

    // UI elements
    private uiOverlay: HTMLElement;
    private inventoryGrid: HTMLElement;
    private hotbarContainer: HTMLElement;
    
    // Crafting UI
    private recipeList: HTMLElement;
    private recipeDetail: HTMLElement;
    private craftingTitle: HTMLElement;
    
    // State
    private uiOpen: boolean = false;
    private isAdvancedCrafting: boolean = false;
    private selectedRecipe: CraftingRecipe | null = null;
    private selectedInventorySlot: number | null = null;

    // Phase 1 properties
    public isHotbarFocused: boolean = false;
    private floatingHeldItem: HTMLElement | null = null;
    private tooltipElement: HTMLElement | null = null;
    private tooltipTimeout: any = null;
    private prevSelectedSlot: number = -1;

    constructor(stats: PlayerStats, timeSystem: TimeSystem, inventory: Inventory) {
        this.stats = stats;
        this.timeSystem = timeSystem;
        this.inventory = inventory;

        this.hpBar = this.getElement('hp-bar');
        this.hpText = this.getElement('hp-text');
        this.epBar = this.getElement('ep-bar');
        this.epText = this.getElement('ep-text');
        this.hungerBar = this.getElement('hunger-bar');
        this.hungerText = this.getElement('hunger-text');
        this.timeDisplay = this.getElement('time-display');
        this.dayDisplay = this.getElement('day-display');
        this.infoDisplay = this.getElement('info');

        // Dynamically append cooldown progress bar next to crosshair
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            const container = document.createElement('div');
            container.id = 'cooldown-container';
            container.style.cssText = `
                position: absolute;
                top: 25px;
                left: 50%;
                transform: translateX(-50%);
                width: 32px;
                height: 4px;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid #333;
                border-radius: 2px;
                display: none;
            `;
            const fill = document.createElement('div');
            fill.id = 'cooldown-fill';
            fill.style.cssText = `
                width: 0%;
                height: 100%;
                background: #fff;
                border-radius: 1px;
                transition: width 0.05s linear;
            `;
            container.appendChild(fill);
            crosshair.appendChild(container);
            
            this.cooldownContainer = container;
            this.cooldownFill = fill;
        } else {
            // Fallback
            this.cooldownContainer = document.createElement('div');
            this.cooldownFill = document.createElement('div');
        }

        this.uiOverlay = this.getElement('ui-overlay');
        this.inventoryGrid = this.getElement('inventory-grid');
        this.hotbarContainer = this.getElement('hotbar-container');

        this.recipeList = this.getElement('recipe-list');
        this.recipeDetail = this.getElement('recipe-detail');
        this.craftingTitle = this.getElement('crafting-title');

        this.setupHotbar();
        this.setupInventoryGrid();
        
        // Initialize tooltip and held item elements
        this.setupTooltipElement();
        this.setupFloatingHeldItem();
        this.setupTradeUI();
        
        // Clear hotbar focus on clicking elsewhere
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (!this.hotbarContainer.contains(target) && !this.inventoryGrid.contains(target)) {
                const crafting3x3 = document.getElementById('crafting-3x3');
                const craftingOutput = document.getElementById('crafting-output-container');
                if ((!crafting3x3 || !crafting3x3.contains(target)) && (!craftingOutput || !craftingOutput.contains(target))) {
                    this.isHotbarFocused = false;
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.uiOpen) {
                if (this.floatingHeldItem) this.floatingHeldItem.style.display = 'none';
                return;
            }
            this.updateFloatingItemPosition(e.clientX, e.clientY);
        });
    }

    private getElement(id: string): HTMLElement {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`UI element #${id} not found`);
            return document.createElement('div');
        }
        return el;
    }

    // === HUD UPDATE ===
    updateHUD(): void {
        const data = this.stats.getState();

        // HP bar
        const hpPercent = (data.hp / data.maxHp) * 100;
        this.hpBar.style.width = `${hpPercent}%`;
        this.hpText.textContent = `${Math.ceil(data.hp)}/${data.maxHp}`;
        if (hpPercent < 25) {
            this.hpBar.style.backgroundColor = '#e74c3c';
        } else if (hpPercent < 50) {
            this.hpBar.style.backgroundColor = '#f39c12';
        } else {
            this.hpBar.style.backgroundColor = '#2ecc71';
        }

        // EP bar
        const epPercent = (data.ep / data.maxEp) * 100;
        this.epBar.style.width = `${epPercent}%`;
        this.epText.textContent = `${Math.ceil(data.ep)}/${data.maxEp}`;

        // Hunger bar
        const hungerPercent = (data.hunger / data.maxHunger) * 100;
        this.hungerBar.style.width = `${hungerPercent}%`;
        this.hungerText.textContent = `${Math.ceil(data.hunger)}/${data.maxHunger}`;
        
        if (data.saturation && data.saturation > 0) {
            this.hungerBar.style.backgroundColor = '#ffd700';
            this.hungerBar.style.boxShadow = '0 0 8px #ffd700';
            this.hungerBar.style.border = '1px solid #ffd700';
        } else {
            this.hungerBar.style.backgroundColor = '#e67e22';
            this.hungerBar.style.boxShadow = 'none';
            this.hungerBar.style.border = 'none';
        }

        // Time
        this.timeDisplay.textContent = this.timeSystem.getFormattedTime();
        this.dayDisplay.textContent = `Day ${this.timeSystem.dayCount}`;

        // Update combat attack cooldown progress bar
        const combat = CombatManager.getInstance();
        const heldItem = this.getSelectedItem();
        const now = performance.now() / 1000;
        const ratio = combat.getAttackStrengthRatio(now, heldItem);
        
        if (ratio < 1.0) {
            this.cooldownContainer.style.display = 'block';
            this.cooldownFill.style.width = `${ratio * 100}%`;
            this.cooldownFill.style.backgroundColor = ratio >= 0.9 ? '#2ecc71' : '#f39c12';
        } else {
            this.cooldownContainer.style.display = 'none';
        }
    }

    updateInfo(fps: number, x: number, y: number, z: number, chunks: number): void {
        this.infoDisplay.textContent =
            `FPS: ${fps} | Pos: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)} | Chunks: ${chunks}`;
    }

    showNotification(message: string): void {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
        }

        const card = document.createElement('div');
        card.style.background = 'rgba(0, 0, 0, 0.85)';
        card.style.borderLeft = '4px solid #33EBFF';
        card.style.color = '#fff';
        card.style.padding = '12px 20px';
        card.style.borderRadius = '4px';
        card.style.fontSize = '14px';
        card.style.fontWeight = 'bold';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
        card.style.transform = 'translateX(120%)';
        card.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s';
        card.style.opacity = '0';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.gap = '10px';
        
        card.innerHTML = `✨ <span>${message}</span>`;
        container.appendChild(card);
        
        setTimeout(() => {
            card.style.transform = 'translateX(0)';
            card.style.opacity = '1';
        }, 50);
        
        setTimeout(() => {
            card.style.transform = 'translateX(120%)';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
            }, 300);
        }, 3000);
    }

    // === HOTBAR ===
    private setupHotbar(): void {
        this.hotbarContainer.innerHTML = '';

        // Prevent resets when clicking hotbar container
        this.hotbarContainer.addEventListener('mousedown', (e) => {
            this.isHotbarFocused = true;
            e.stopPropagation();
        });

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.slotIndex = i.toString();
            slot.addEventListener('mousedown', (e) => {
                this.inventory.selectedSlot = i;
                this.isHotbarFocused = true;
                e.stopPropagation();
                this.updateHotbar();
            });
            this.hotbarContainer.appendChild(slot);
        }
    }

    updateHotbar(): void {
        const slots = this.hotbarContainer.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            const htmlSlot = slot as HTMLElement;
            const invSlot = this.inventory.getSlot(index);
            const itemType = invSlot.itemType as ItemType | null;
            
            htmlSlot.innerHTML = '';
            htmlSlot.style.position = 'relative';
            
            const hotkeyEl = document.createElement('span');
            hotkeyEl.className = 'slot-hotkey';
            hotkeyEl.style.cssText = `
                position: absolute;
                top: 2px;
                left: 4px;
                font-size: 10px;
                font-weight: bold;
                color: rgba(255, 255, 255, 0.45);
                text-shadow: 1px 1px 1px #000;
                pointer-events: none;
                z-index: 6;
                font-family: sans-serif;
            `;
            hotkeyEl.textContent = (index + 1).toString();
            htmlSlot.appendChild(hotkeyEl);
            
            if (itemType !== null) {
                const name = ITEM_NAMES[itemType as ItemType] ?? 'Unknown';
                const desc = ITEM_DESCRIPTIONS[itemType as ItemType] ?? '';
                const tooltipText = desc ? `${name}\n\n${desc}` : name;
                
                const wrapper = document.createElement('div');
                wrapper.style.position = 'relative';
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.justifyContent = 'center';
                
                const canvas = document.createElement('canvas');
                canvas.width = 40;
                canvas.height = 40;
                canvas.style.width = '40px';
                canvas.style.height = '40px';
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    this.drawItemIcon(ctx, itemType, 40);
                }
                wrapper.appendChild(canvas);
                
                if (invSlot.count > 1) {
                    const countEl = document.createElement('span');
                    countEl.className = 'slot-count';
                    countEl.textContent = invSlot.count.toString();
                    wrapper.appendChild(countEl);
                }
                
                htmlSlot.appendChild(wrapper);
                htmlSlot.title = tooltipText;
            } else {
                htmlSlot.title = '';
            }
            
            if (index === this.inventory.selectedSlot) {
                htmlSlot.classList.add('selected');
            } else {
                htmlSlot.classList.remove('selected');
            }
        });

        // Trigger tooltip if selectedSlot has changed!
        if (this.inventory.selectedSlot !== this.prevSelectedSlot) {
            this.prevSelectedSlot = this.inventory.selectedSlot;
            const slot = this.inventory.getSlot(this.inventory.selectedSlot);
            if (slot.itemType !== null) {
                const name = ITEM_NAMES[slot.itemType] ?? 'Unknown';
                this.showItemNameTooltip(name);
            }
        }
    }

    getSelectedItem(): ItemType | null {
        const slot = this.inventory.getSlot(this.inventory.selectedSlot);
        return slot.itemType;
    }

    // === INVENTORY ===
    private setupInventoryGrid(): void {
        this.inventoryGrid.innerHTML = '';
        
        // Organise bag slots (9-35) on top
        for (let i = 9; i <= 35; i++) {
            const slot = this.createInventorySlotElement(i);
            this.inventoryGrid.appendChild(slot);
        }

        // Organise hotbar slots (0-8) at the bottom
        for (let i = 0; i < 9; i++) {
            const slot = this.createInventorySlotElement(i);
            this.inventoryGrid.appendChild(slot);
        }
    }

    private createInventorySlotElement(i: number): HTMLElement {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.slotIndex = i.toString();
        
        slot.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // Set hotbar focus flag
            if (i >= 0 && i <= 8) {
                this.isHotbarFocused = true;
            } else {
                this.isHotbarFocused = false;
            }
            e.stopPropagation();

            const isRightClick = e.button === 2;
            const isShiftClick = e.shiftKey;
            this.handleSlotClick(i, isRightClick, isShiftClick);
        });

        slot.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        return slot;
    }

    private handleSlotClick(index: number, isRightClick: boolean, isShiftClick: boolean): void {
        const slot = this.inventory.getSlot(index);
        const held = this.inventory.heldItem;

        // 1. Shift Click handling
        if (isShiftClick) {
            if (index === 109) {
                this.showNotification("⚠️ 아래의 '생성' 버튼을 클릭하여 제작해 주세요!");
                return;
            }
            this.inventory.shiftClickTransfer(index);
            this.updateInventory();
            this.updateHotbar();
            return;
        }

        // 2. Click on Output slot (slot 109)
        if (index === 109) {
            if (slot.itemType !== null && slot.count > 0) {
                this.showNotification("⚠️ 아래의 '생성' 버튼을 클릭하여 제작해 주세요!");
            }
            return;
        }

        // 3. Right Click handling
        if (isRightClick) {
            if (held.itemType === null) {
                // Split stack
                if (slot.itemType !== null && slot.count > 0) {
                    const take = Math.floor(slot.count / 2);
                    const remain = slot.count - take;
                    if (take > 0) {
                        held.itemType = slot.itemType;
                        held.count = take;
                        slot.count = remain;
                    }
                    if (slot.count <= 0) {
                        slot.itemType = null;
                        slot.count = 0;
                    }
                }
            } else {
                // Place 1 item
                if (slot.itemType === null) {
                    slot.itemType = held.itemType;
                    slot.count = 1;
                    held.count--;
                } else if (slot.itemType === held.itemType && slot.count < 64) {
                    slot.count++;
                    held.count--;
                }

                if (held.count <= 0) {
                    held.itemType = null;
                    held.count = 0;
                }
            }

            if (index >= 100 && index <= 108) {
                this.inventory.updateCraftingOutput();
            }
            this.updateInventory();
            this.updateHotbar();
            return;
        }

        // 4. Left Click handling (Standard Drag & Drop / Swap)
        if (held.itemType === null) {
            // Pick up all
            if (slot.itemType !== null) {
                held.itemType = slot.itemType;
                held.count = slot.count;
                slot.itemType = null;
                slot.count = 0;
            }
        } else {
            // Deposit / Swap
            if (slot.itemType === null) {
                slot.itemType = held.itemType;
                slot.count = held.count;
                held.itemType = null;
                held.count = 0;
            } else if (slot.itemType === held.itemType) {
                const add = Math.min(held.count, 64 - slot.count);
                slot.count += add;
                held.count -= add;
                if (held.count <= 0) {
                    held.itemType = null;
                    held.count = 0;
                }
            } else {
                // Swap
                const tempType = slot.itemType;
                const tempCount = slot.count;
                slot.itemType = held.itemType;
                slot.count = held.count;
                held.itemType = tempType;
                held.count = tempCount;
            }
        }

        if (index >= 100 && index <= 108) {
            this.inventory.updateCraftingOutput();
        }
        this.updateInventory();
        this.updateHotbar();
    }

    private isFood(itemType: ItemType): boolean {
        return itemType >= 300 && itemType < 400;
    }

    updateInventorySlot(index: number, htmlSlot: HTMLElement): void {
        const invSlot = this.inventory.getSlot(index);
        const itemType = invSlot.itemType as ItemType | null;
        
        htmlSlot.innerHTML = '';
        htmlSlot.style.position = 'relative';

        // Add hotbar slot number (1-9) for slots 0-8 inside inventory grid
        if (index >= 0 && index <= 8) {
            const hotkeyEl = document.createElement('span');
            hotkeyEl.className = 'slot-hotkey';
            hotkeyEl.style.cssText = `
                position: absolute;
                top: 2px;
                left: 4px;
                font-size: 10px;
                font-weight: bold;
                color: rgba(255, 255, 255, 0.45);
                text-shadow: 1px 1px 1px #000;
                pointer-events: none;
                z-index: 6;
                font-family: sans-serif;
            `;
            hotkeyEl.textContent = (index + 1).toString();
            htmlSlot.appendChild(hotkeyEl);
        }
        
        if (itemType !== null) {
            const name = ITEM_NAMES[itemType as ItemType] ?? 'Unknown';
            const desc = ITEM_DESCRIPTIONS[itemType as ItemType] ?? '';
            const tooltipText = desc ? `${name}\n\n${desc}` : name;
            
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
            
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            canvas.style.width = '40px';
            canvas.style.height = '40px';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                this.drawItemIcon(ctx, itemType, 40);
            }
            wrapper.appendChild(canvas);
            
            if (invSlot.count > 1) {
                const countEl = document.createElement('span');
                countEl.className = 'slot-count';
                countEl.textContent = invSlot.count.toString();
                wrapper.appendChild(countEl);
            }
            
            htmlSlot.appendChild(wrapper);
            htmlSlot.title = tooltipText;
        } else {
            htmlSlot.title = '';
        }
        
        if (index === this.selectedInventorySlot) {
            htmlSlot.classList.add('swap-selected');
        } else {
            htmlSlot.classList.remove('swap-selected');
        }
    }

    updateInventory(): void {
        // 1. Update main inventory grid (bag + hotbar)
        const slots = this.inventoryGrid.querySelectorAll('.inventory-slot');
        slots.forEach((slot) => {
            const htmlSlot = slot as HTMLElement;
            const index = parseInt(htmlSlot.dataset.slotIndex ?? '0');
            this.updateInventorySlot(index, htmlSlot);
        });

        // 2. Update crafting grid input slots (100-108)
        for (let i = 100; i <= 108; i++) {
            const slotEl = document.querySelector(`[data-slot-index="${i}"]`) as HTMLElement | null;
            if (slotEl) {
                this.updateInventorySlot(i, slotEl);
            }
        }

        // 3. Update crafting grid output slot (109)
        const outputEl = document.querySelector(`[data-slot-index="109"]`) as HTMLElement | null;
        if (outputEl) {
            this.updateInventorySlot(109, outputEl);
        }

        // Update craft action button state!
        this.updateCraftButtonState();

        // 4. Update recipe book craftable statuses
        this.updateRecipeBook();

        // Update selected recipe detail box reactively!
        if (this.selectedRecipe) {
            this.updateRecipeDetailBox(this.selectedRecipe);
        } else {
            const detailBox = document.getElementById('recipe-detail-box');
            if (detailBox) {
                detailBox.innerHTML = `💡 조합법 목록의 아이템을 클릭해 보세요. 부족한 재료가 이곳에 상세히 표시됩니다.`;
            }
        }
    }

    toggleInventory(): void {
        if (this.uiOpen) {
            this.closeUI();
        } else {
            this.openUI(false);
        }
    }

    isUIOpen(): boolean {
        return this.uiOpen;
    }

    getActiveVillager(): VillagerEntity | null {
        return this.activeVillager;
    }

    private setupCraftingGridDOM(): void {
        const craftingPanel = this.getElement('crafting-panel');
        craftingPanel.innerHTML = `
            <div class="ui-title" id="crafting-title">🔨 Crafting Dashboard</div>
            <div class="crafting-dashboard" style="display: flex; gap: 20px; align-items: flex-start;">
                <!-- 3x3 Crafting Table -->
                <div class="crafting-layout" style="display: flex; align-items: center; gap: 20px; background: rgba(0, 0, 0, 0.55); padding: 25px; border-radius: 8px; border: 2px solid #555;">
                    <div id="crafting-3x3" style="display: grid; grid-template-columns: repeat(3, 52px); grid-template-rows: repeat(3, 52px); gap: 4px;"></div>
                    <div class="crafting-arrow" style="font-size: 32px; color: #fff; text-shadow: 1px 1px 2px #000; user-select: none;">➔</div>
                    <div id="crafting-output-wrapper" style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                        <div id="crafting-output-container" style="display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border: 2px solid #33EBFF; border-radius: 6px; background: rgba(0, 0, 0, 0.4); box-shadow: 0 0 10px rgba(51, 235, 255, 0.35);">
                            <div id="crafting-output-slot" class="inventory-slot" style="width: 52px; height: 52px; border: 2px solid #555; border-radius: 4px; display: flex; align-items: center; justify-content: center;"></div>
                        </div>
                        <button id="craft-create-btn" style="
                            width: 72px;
                            padding: 6px 0;
                            font-family: 'Outfit', 'Segoe UI', sans-serif;
                            font-size: 13px;
                            font-weight: bold;
                            color: #fff;
                            background: linear-gradient(135deg, #2ecc71, #27ae60);
                            border: 1px solid #27ae60;
                            border-radius: 4px;
                            cursor: pointer;
                            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                            text-shadow: 1px 1px 1px rgba(0,0,0,0.4);
                            transition: all 0.2s ease;
                            user-select: none;
                        ">생성</button>
                    </div>
                </div>

                <!-- Recipe Book Panel -->
                <div class="recipe-book-panel" style="display: flex; flex-direction: column; width: 240px; background: rgba(0, 0, 0, 0.6); border-radius: 8px; border: 2px solid #555; padding: 12px; height: 290px;">
                    <div style="font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px; user-select: none;">📖 Recipe Book (Auto-fill)</div>
                    <div id="recipe-book-list" style="display: flex; flex-direction: column; gap: 4px; overflow-y: auto; height: 160px; padding-right: 4px; margin-bottom: 8px;"></div>
                    <!-- Recipe Detail & Missing Materials Box -->
                    <div id="recipe-detail-box" style="
                        background: rgba(0, 0, 0, 0.45);
                        border: 1px dashed #666;
                        border-radius: 4px;
                        padding: 8px;
                        height: 78px;
                        overflow-y: auto;
                        font-size: 11px;
                        color: #ccc;
                        line-height: 1.4;
                        user-select: none;
                    ">
                        💡 조합법 목록의 아이템을 클릭해 보세요. 부족한 재료가 이곳에 상세히 표시됩니다.
                    </div>
                </div>
            </div>
        `;

        const gridContainer = document.getElementById('crafting-3x3')!;
        gridContainer.innerHTML = '';
        for (let i = 100; i <= 108; i++) {
            const slot = this.createInventorySlotElement(i);
            gridContainer.appendChild(slot);
        }

        const outputContainer = document.getElementById('crafting-output-slot')!;
        outputContainer.innerHTML = '';
        const outputSlot = this.createInventorySlotElement(109);
        outputContainer.replaceWith(outputSlot);

        const createBtn = document.getElementById('craft-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.performCraftAction();
            });
        }
        
        this.updateCraftButtonState();
    }

    private updateRecipeBook(): void {
        const listContainer = document.getElementById('recipe-book-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        for (const recipe of CRAFTING_RECIPES) {
            const resultName = ITEM_NAMES[recipe.result] ?? 'Unknown';
            const count = recipe.count;
            
            const canCraft = this.canPlayerCraftRecipe(recipe);
            
            const btn = document.createElement('div');
            btn.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                border-radius: 4px;
                background: ${canCraft ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.05)'};
                border: 1px solid ${canCraft ? '#2ecc71' : 'rgba(231, 76, 60, 0.35)'};
                color: ${canCraft ? '#fff' : '#bbb'};
                font-size: 13px;
                cursor: pointer;
                user-select: none;
                transition: background 0.15s, border-color 0.15s;
            `;
            
            btn.addEventListener('mouseenter', () => {
                btn.style.background = canCraft ? 'rgba(46, 204, 113, 0.35)' : 'rgba(231, 76, 60, 0.12)';
                btn.style.borderColor = canCraft ? '#2ecc71' : 'rgba(231, 76, 60, 0.55)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = canCraft ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.05)';
                btn.style.borderColor = canCraft ? '#2ecc71' : 'rgba(231, 76, 60, 0.35)';
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;
            canvas.style.width = '20px';
            canvas.style.height = '20px';
            canvas.style.flexShrink = '0';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                this.drawItemIcon(ctx, recipe.result, 20);
            }
            
            const label = document.createElement('span');
            label.textContent = count > 1 ? `${resultName} x${count}` : resultName;
            label.style.flexGrow = '1';
            label.style.whiteSpace = 'nowrap';
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            
            btn.appendChild(canvas);
            btn.appendChild(label);
            
            btn.title = this.getRecipeIngredientsText(recipe);
            
            btn.addEventListener('click', () => {
                this.autoFillRecipe(recipe);
            });
            
            listContainer.appendChild(btn);
        }
    }

    private performCraftAction(): void {
        const outputSlot = this.inventory.getSlot(109);
        if (outputSlot.itemType === null || outputSlot.count <= 0) {
            return;
        }

        const itemType = outputSlot.itemType;
        const count = outputSlot.count;

        // Transaction logic: Backup bag slots (0-35) to allow rollback
        const backup = this.inventory.slots.slice(0, 36).map(s => ({ itemType: s.itemType, count: s.count }));
        
        const success = this.inventory.addItem(itemType, count);
        if (success) {
            this.inventory.consumeCraftingIngredients();
            const itemName = ITEM_NAMES[itemType] ?? '아이템';
            this.showNotification(`🎉 ${itemName} x${count}을(를) 제작했습니다!`);
            this.updateInventory();
            this.updateHotbar();
        } else {
            // Rollback
            for (let i = 0; i < 36; i++) {
                this.inventory.slots[i].itemType = backup[i].itemType;
                this.inventory.slots[i].count = backup[i].count;
            }
            this.showNotification("⚠️ 인벤토리가 가득 차서 제작된 아이템을 넣을 수 없습니다!");
        }
    }

    private updateCraftButtonState(): void {
        const createBtn = document.getElementById('craft-create-btn') as HTMLButtonElement | null;
        if (!createBtn) return;

        const outputSlot = this.inventory.getSlot(109);
        if (outputSlot.itemType === null || outputSlot.count <= 0) {
            createBtn.disabled = true;
            createBtn.style.background = 'linear-gradient(135deg, #7f8c8d, #95a5a6)';
            createBtn.style.borderColor = '#7f8c8d';
            createBtn.style.cursor = 'not-allowed';
            createBtn.style.opacity = '0.55';
            createBtn.style.boxShadow = 'none';
        } else {
            createBtn.disabled = false;
            createBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            createBtn.style.borderColor = '#27ae60';
            createBtn.style.cursor = 'pointer';
            createBtn.style.opacity = '1';
            createBtn.style.boxShadow = '0 0 10px rgba(46, 204, 113, 0.55)';
        }
    }

    private updateRecipeDetailBox(recipe: CraftingRecipe): void {
        const detailBox = document.getElementById('recipe-detail-box');
        if (!detailBox) return;

        const resultName = ITEM_NAMES[recipe.result] ?? '알 수 없음';
        const required = new Map<ItemType, number>();
        for (const row of recipe.pattern) {
            for (const item of row) {
                if (item !== null) {
                    required.set(item, (required.get(item) || 0) + 1);
                }
            }
        }

        const canCraft = this.canPlayerCraftRecipe(recipe);
        let html = '';

        if (canCraft) {
            html += `<div style="color: #2ecc71; font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">✅ ${resultName} x${recipe.count} 제작 가능</div>`;
            html += `<div style="color: #aaa;">모든 재료가 충분합니다! 조합대 그리드에 자동 배치되었습니다. 아래 '생성' 버튼을 눌러 인벤토리에 넣으세요.</div>`;
        } else {
            html += `<div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">❌ ${resultName} 재료 부족</div>`;
            html += `<div style="display: flex; flex-direction: column; gap: 2px;">`;
            for (const [item, needed] of required) {
                const name = ITEM_NAMES[item] ?? '알 수 없음';
                const current = this.inventory.getItemCount(item);
                const enough = current >= needed;
                const color = enough ? '#2ecc71' : '#ff4d4d';
                const statusIcon = enough ? '✔' : '✖';
                html += `<div style="color: ${color}; font-size: 11px;">${statusIcon} ${name} : ${current} / ${needed} ${enough ? '(충분)' : '(부족!)'}</div>`;
            }
            html += `</div>`;
        }

        detailBox.innerHTML = html;
    }

    private canPlayerCraftRecipe(recipe: CraftingRecipe): boolean {
        const required = new Map<ItemType, number>();
        for (const row of recipe.pattern) {
            for (const item of row) {
                if (item !== null) {
                    required.set(item, (required.get(item) || 0) + 1);
                }
            }
        }
        for (const [item, needed] of required) {
            if (this.inventory.getItemCount(item) < needed) {
                return false;
            }
        }
        return true;
    }

    private getRecipeIngredientsText(recipe: CraftingRecipe): string {
        const required = new Map<ItemType, number>();
        for (const row of recipe.pattern) {
            for (const item of row) {
                if (item !== null) {
                    required.set(item, (required.get(item) || 0) + 1);
                }
            }
        }
        let txt = "🔧 제작 재료 정보:\n";
        const entries: string[] = [];
        for (const [item, needed] of required) {
            const name = ITEM_NAMES[item] ?? '알 수 없음';
            const current = this.inventory.getItemCount(item);
            const status = current >= needed ? "✅ 보유" : "❌ 부족";
            entries.push(`• ${name} x${needed} (현재: ${current}/${needed}) [${status}]`);
        }
        return txt + entries.join('\n');
    }

    private autoFillRecipe(recipe: CraftingRecipe): void {
        // Set selected recipe so detail box updates reactively!
        this.selectedRecipe = recipe;

        // 1. Return current grid items back to player bag
        for (let i = 100; i <= 108; i++) {
            const gridSlot = this.inventory.getSlot(i);
            if (gridSlot.itemType !== null && gridSlot.count > 0) {
                this.inventory.addItem(gridSlot.itemType, gridSlot.count);
                gridSlot.itemType = null;
                gridSlot.count = 0;
            }
        }

        // 2. Check if player has all ingredients in slots 0-35
        if (!this.canPlayerCraftRecipe(recipe)) {
            // Find missing items to display in notification
            const required = new Map<ItemType, number>();
            for (const row of recipe.pattern) {
                for (const item of row) {
                    if (item !== null) {
                        required.set(item, (required.get(item) || 0) + 1);
                    }
                }
            }
            const missingList: string[] = [];
            for (const [item, needed] of required) {
                const current = this.inventory.getItemCount(item);
                if (current < needed) {
                    const name = ITEM_NAMES[item] ?? '알 수 없음';
                    missingList.push(`${name} x${needed - current}`);
                }
            }
            this.showNotification(`⚠️ 재료 부족! 부족 재료: ${missingList.join(', ')}`);
            this.inventory.updateCraftingOutput();
            this.updateInventory();
            return;
        }

        // 3. Auto fill matching pattern slots 100-108
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const itemType = recipe.pattern[row][col];
                if (itemType !== null) {
                    // Consume 1 from slots 0-35
                    this.inventory.consumeItem(itemType, 1);
                    // Place 1 in crafting slot (100 + row * 3 + col)
                    const targetSlotIndex = 100 + row * 3 + col;
                    this.inventory.slots[targetSlotIndex].itemType = itemType;
                    this.inventory.slots[targetSlotIndex].count = 1;
                }
            }
        }

        // 4. Success updates
        this.inventory.updateCraftingOutput();
        this.updateInventory();
        
        const resultName = ITEM_NAMES[recipe.result] ?? '아이템';
        this.showNotification(`⚙️ ${resultName} 제작법이 자동 적용되었습니다!`);
    }

    // === UNIFIED UI ===
    openUI(isAdvanced: boolean = true): void {
        this.uiOpen = true;
        this.isAdvancedCrafting = true; // Always true as physical crafting tables are deprecated
        this.uiOverlay.style.display = 'flex';
        
        // Render advanced side-by-side 3x3 crafting grid
        this.setupCraftingGridDOM();
        
        this.updateInventory();
    }

    closeUI(): void {
        this.uiOpen = false;
        this.uiOverlay.style.display = 'none';
        this.selectedRecipe = null;
        this.selectedInventorySlot = null;

        // Return ingredients in 3x3 grid back to player bag
        for (let i = 100; i <= 108; i++) {
            const slot = this.inventory.getSlot(i);
            if (slot.itemType !== null && slot.count > 0) {
                this.inventory.addItem(slot.itemType, slot.count);
                slot.itemType = null;
                slot.count = 0;
            }
        }
        // Clear output
        this.inventory.slots[109].itemType = null;
        this.inventory.slots[109].count = 0;

        // Return held items back to player bag
        const held = this.inventory.heldItem;
        if (held.itemType !== null && held.count > 0) {
            this.inventory.addItem(held.itemType, held.count);
            held.itemType = null;
            held.count = 0;
        }

        if (this.floatingHeldItem) {
            this.floatingHeldItem.style.display = 'none';
        }
        if (this.tradePanel) {
            this.tradePanel.style.display = 'none';
        }
        this.activeVillager = null;
    }

    private setupTooltipElement(): void {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'hotbar-item-tooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            bottom: 85px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.65);
            color: #fff;
            padding: 6px 14px;
            border-radius: 4px;
            font-family: 'Outfit', 'Segoe UI', sans-serif;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            z-index: 1000;
            pointer-events: none;
            display: none;
            opacity: 0;
            transition: opacity 0.5s ease-out;
        `;
        document.body.appendChild(this.tooltipElement);
    }

    public showItemNameTooltip(itemName: string): void {
        if (!this.tooltipElement) return;

        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
        }

        this.tooltipElement.textContent = itemName;
        this.tooltipElement.style.display = 'block';
        this.tooltipElement.offsetHeight; // force reflow
        this.tooltipElement.style.opacity = '1';

        this.tooltipTimeout = setTimeout(() => {
            if (this.tooltipElement) {
                this.tooltipElement.style.opacity = '0';
                this.tooltipTimeout = setTimeout(() => {
                    if (this.tooltipElement) {
                        this.tooltipElement.style.display = 'none';
                    }
                }, 500);
            }
        }, 2000);
    }

    private setupFloatingHeldItem(): void {
        this.floatingHeldItem = document.createElement('div');
        this.floatingHeldItem.id = 'floating-held-item';
        this.floatingHeldItem.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 10000;
            display: none;
            width: 40px;
            height: 40px;
            transform: translate(-50%, -50%);
        `;
        document.body.appendChild(this.floatingHeldItem);
    }

    private updateFloatingItemPosition(x: number, y: number): void {
        if (!this.floatingHeldItem) return;
        const held = this.inventory.heldItem;
        if (held.itemType === null || held.count <= 0) {
            this.floatingHeldItem.style.display = 'none';
            return;
        }

        this.floatingHeldItem.style.display = 'block';
        this.floatingHeldItem.style.left = `${x}px`;
        this.floatingHeldItem.style.top = `${y}px`;

        this.floatingHeldItem.innerHTML = '';
        
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 40;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            this.drawItemIcon(ctx, held.itemType, 40);
        }
        this.floatingHeldItem.appendChild(canvas);

        if (held.count > 1) {
            const countEl = document.createElement('span');
            countEl.className = 'slot-count';
            countEl.textContent = held.count.toString();
            countEl.style.cssText = `
                position: absolute;
                bottom: 2px;
                right: 4px;
                font-size: 11px;
                font-weight: bold;
                color: #fff;
                text-shadow: 1px 1px 0px #000;
                pointer-events: none;
                z-index: 5;
            `;
            this.floatingHeldItem.appendChild(countEl);
        }
    }

    private getRecipeStatus(recipe: CraftingRecipe): RecipeStatus {
        const missingIngredients: { item: ItemType; needed: number; have: number }[] = [];
        let canCraft = true;

        // Count required ingredients from pattern
        const required = new Map<ItemType, number>();
        for (const row of recipe.pattern) {
            for (const item of row) {
                if (item !== null) {
                    required.set(item, (required.get(item) || 0) + 1);
                }
            }
        }

        // Check if player has enough
        for (const [item, needed] of required) {
            const have = this.inventory.getItemCount(item);
            if (have < needed) {
                canCraft = false;
                missingIngredients.push({ item, needed, have });
            }
        }

        return { recipe, canCraft, missingIngredients };
    }

    private updateRecipeList(): void {
        this.recipeList.innerHTML = '';

        // Filter out advanced recipes if we are not at a crafting table
        const availableRecipes = CRAFTING_RECIPES.filter(r => {
            if (!this.isAdvancedCrafting && r.requiresCraftingTable) {
                return false;
            }
            return true;
        });

        const statuses = availableRecipes.map(r => this.getRecipeStatus(r));

        // Sort: craftable first, then by name
        statuses.sort((a, b) => {
            if (a.canCraft !== b.canCraft) return a.canCraft ? -1 : 1;
            const nameA = ITEM_NAMES[a.recipe.result] ?? '';
            const nameB = ITEM_NAMES[b.recipe.result] ?? '';
            return nameA.localeCompare(nameB);
        });

        for (const status of statuses) {
            const recipe = status.recipe;
            const resultName = ITEM_NAMES[recipe.result] ?? 'Unknown';
            const count = recipe.count;

            const item = document.createElement('div');
            item.className = 'recipe-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            
            if (status.canCraft) {
                item.classList.add('craftable');
            }
            if (this.selectedRecipe === recipe) {
                item.classList.add('selected');
            }

            const icon = document.createElement('span');
            icon.className = 'recipe-icon';
            icon.textContent = status.canCraft ? '✅' : '❌';
            icon.style.marginRight = '6px';

            // Canvas for visual item icon inside the list!
            const itemCanvas = document.createElement('canvas');
            itemCanvas.width = 24;
            itemCanvas.height = 24;
            itemCanvas.style.width = '24px';
            itemCanvas.style.height = '24px';
            itemCanvas.style.marginRight = '8px';
            itemCanvas.style.flexShrink = '0';
            const itemCtx = itemCanvas.getContext('2d');
            if (itemCtx) {
                this.drawItemIcon(itemCtx, recipe.result, 24);
            }

            const name = document.createElement('span');
            name.className = 'recipe-name';
            name.textContent = count > 1 ? `${resultName} x${count}` : resultName;
            name.style.flexGrow = '1';

            const tableReq = document.createElement('span');
            tableReq.className = 'recipe-table-req';
            tableReq.textContent = recipe.requiresCraftingTable ? '🔨' : '✋';
            tableReq.style.marginLeft = 'auto';

            item.appendChild(icon);
            item.appendChild(itemCanvas);
            item.appendChild(name);
            item.appendChild(tableReq);

            item.addEventListener('click', () => {
                this.selectedRecipe = recipe;
                this.updateRecipeList();
                this.updateRecipeDetail(status);
            });

            this.recipeList.appendChild(item);
        }
    }

    private updateRecipeDetail(status: RecipeStatus): void {
        const recipe = status.recipe;
        const resultName = ITEM_NAMES[recipe.result] ?? 'Unknown';

        let html = '<div class="recipe-detail-content">';

        // Result with premium layout and canvas integration
        html += `<div class="recipe-detail-header" style="display: flex; align-items: center; margin-bottom: 12px;">
            <canvas id="recipe-result-canvas" width="40" height="40" style="width: 40px; height: 40px; margin-right: 12px; border: 2px solid #666; border-radius: 4px; background: rgba(0,0,0,0.3);"></canvas>
            <span class="recipe-result-name" style="font-size: 18px; font-weight: bold; flex-grow: 1; color: #fff;">${resultName}${recipe.count > 1 ? ` x${recipe.count}` : ''}</span>
            <span class="recipe-can-craft ${status.canCraft ? 'craftable' : 'not-craftable'}" style="font-size: 12px; font-weight: bold; padding: 4px 8px; border-radius: 4px;">${status.canCraft ? '✅ 제작 가능' : '❌ 재료 부족'}</span>
        </div>`;

        // Pattern grid using 3x3 visual canvas icons
        html += '<div class="recipe-pattern-grid" style="display: grid; grid-template-columns: repeat(3, 60px); grid-template-rows: repeat(3, 60px); gap: 4px; justify-content: center; margin-bottom: 12px;">';
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const item = recipe.pattern[row]?.[col] ?? null;
                if (item !== null) {
                    const itemName = ITEM_NAMES[item] ?? '?';
                    const have = this.inventory.getItemCount(item);
                    let needed = 0;
                    for (const r of recipe.pattern) {
                        for (const i of r) {
                            if (i === item) needed++;
                        }
                    }
                    const enough = have >= needed;
                    html += `<div class="recipe-pattern-slot ${enough ? 'has-item' : 'missing-item'}" title="${itemName}: ${have}/${needed}" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; height: 60px; border: 2px solid ${enough ? '#2ecc71' : '#e74c3c'}; border-radius: 4px; background: rgba(0,0,0,0.35);">
                        <canvas class="pattern-slot-canvas" data-item-type="${item}" width="32" height="32" style="width: 32px; height: 32px; margin-bottom: 2px;"></canvas>
                        <span class="pattern-item-count" style="font-size: 10px; font-weight: bold; color: ${enough ? '#2ecc71' : '#e74c3c'};">${have}/${needed}</span>
                    </div>`;
                } else {
                    html += '<div class="recipe-pattern-slot empty" style="width: 60px; height: 60px; border: 2px solid #333; border-radius: 4px; background: rgba(0, 0, 0, 0.15);"></div>';
                }
            }
        }
        html += '</div>';

        // Missing ingredients
        if (!status.canCraft && status.missingIngredients.length > 0) {
            html += '<div class="recipe-missing" style="margin-bottom: 12px;"><strong>필요한 재료: </strong>';
            for (const m of status.missingIngredients) {
                const itemName = ITEM_NAMES[m.item] ?? '?';
                html += `<span class="missing-tag" style="display: inline-block; background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; border-radius: 4px; padding: 2px 6px; font-size: 11px; margin-left: 4px; color: #fff;">${itemName} (${m.have}/${m.needed})</span>`;
            }
            html += '</div>';
        }

        // Craft button
        html += `<button class="craft-button ${status.canCraft ? '' : 'disabled'}" ${status.canCraft ? '' : 'disabled'} style="width: 100%; padding: 10px; font-size: 14px; font-weight: bold; border-radius: 4px; background: ${status.canCraft ? '#2ecc71' : '#555'}; color: #fff; cursor: ${status.canCraft ? 'pointer' : 'not-allowed'}; border: none;">
            ${resultName} 제작하기
        </button>`;

        html += '</div>';

        this.recipeDetail.innerHTML = html;

        // Post-render Canvas Drawings!
        const resultCanvas = this.recipeDetail.querySelector('#recipe-result-canvas') as HTMLCanvasElement | null;
        if (resultCanvas) {
            const ctx = resultCanvas.getContext('2d');
            if (ctx) {
                this.drawItemIcon(ctx, recipe.result, 40);
            }
        }

        const patternCanvases = this.recipeDetail.querySelectorAll('.pattern-slot-canvas');
        patternCanvases.forEach(canvas => {
            const htmlCanvas = canvas as HTMLCanvasElement;
            const itemType = parseInt(htmlCanvas.dataset.itemType ?? '0') as ItemType;
            if (itemType) {
                const ctx = htmlCanvas.getContext('2d');
                if (ctx) {
                    this.drawItemIcon(ctx, itemType, 32);
                }
            }
        });

        // Add craft button listener
        const craftBtn = this.recipeDetail.querySelector('.craft-button');
        if (craftBtn && status.canCraft) {
            craftBtn.addEventListener('click', () => {
                this.craftRecipe(recipe);
            });
        }
    }

    private craftRecipe(recipe: CraftingRecipe): void {
        // Consume ingredients
        const consumed = new Map<ItemType, number>();
        for (const row of recipe.pattern) {
            for (const item of row) {
                if (item !== null) {
                    consumed.set(item, (consumed.get(item) || 0) + 1);
                }
            }
        }

        // Check if we have enough
        for (const [item, count] of consumed) {
            if (!this.inventory.hasItem(item, count)) {
                return; // Not enough (shouldn't happen if button is enabled)
            }
        }

        // Consume items
        for (const [item, count] of consumed) {
            this.inventory.consumeItem(item, count);
        }

        // Add result
        this.inventory.addItem(recipe.result, recipe.count);

        // Consume EP
        this.stats.consumeEPForCraft();

        // Refresh UI
        this.updateInventory();
        this.updateHotbar();
        this.updateRecipeList();

        // Update detail if still selected
        if (this.selectedRecipe) {
            const status = this.getRecipeStatus(this.selectedRecipe);
            this.updateRecipeDetail(status);
        }
    }

    // === DEATH SCREEN ===
    showDeathScreen(): void {
        const deathOverlay = document.getElementById('death-overlay');
        if (deathOverlay) {
            deathOverlay.style.display = 'flex';
        }
    }

    hideDeathScreen(): void {
            const deathOverlay = document.getElementById('death-overlay');
        if (deathOverlay) {
            deathOverlay.style.display = 'none';
        }
    }

    private drawItemIcon(ctx: CanvasRenderingContext2D, itemType: ItemType, size: number): void {
        ctx.clearRect(0, 0, size, size);

        // Helper to draw standard 3D isometric blocks
        const drawIsometricBlock = (
            topColor: string,
            leftColor: string,
            rightColor: string,
            drawTopDetails?: (c: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number) => void,
            drawLeftDetails?: (c: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number) => void,
            drawRightDetails?: (c: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number) => void
        ) => {
            const cx = size / 2;
            const cy = size / 2 + size / 16;
            const w = size / 2.6;
            const h = w * 0.58; // approx 30 deg isometric angle

            // 1. Soft Ambient Occlusion shadow under block (Double-layered)
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy + h * 0.9, w * 0.95, h * 0.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
            ctx.fill();
            // Inner contact shadow core
            ctx.beginPath();
            ctx.ellipse(cx, cy + h * 0.9, w * 0.65, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.fill();
            ctx.restore();

            // 2. Draw Face shadows and base colors
            // Top Face (Rhombus)
            ctx.fillStyle = topColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h);
            ctx.lineTo(cx + w, cy - h / 2);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx - w, cy - h / 2);
            ctx.closePath();
            ctx.fill();

            if (drawTopDetails) {
                ctx.save();
                drawTopDetails(ctx, w, h, cx, cy);
                ctx.restore();
            }

            // Left Face
            ctx.fillStyle = leftColor;
            ctx.beginPath();
            ctx.moveTo(cx - w, cy - h / 2);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + h);
            ctx.lineTo(cx - w, cy + h / 2);
            ctx.closePath();
            ctx.fill();

            if (drawLeftDetails) {
                ctx.save();
                drawLeftDetails(ctx, w, h, cx, cy);
                ctx.restore();
            }

            // Right Face
            ctx.fillStyle = rightColor;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + w, cy - h / 2);
            ctx.lineTo(cx + w, cy + h / 2);
            ctx.lineTo(cx, cy + h);
            ctx.closePath();
            ctx.fill();

            if (drawRightDetails) {
                ctx.save();
                drawRightDetails(ctx, w, h, cx, cy);
                ctx.restore();
            }

            // 3. Render High-fidelity Bevel Highlight (glowing inner highlight on top rim)
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = size * 0.035;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy - h + size * 0.015);
            ctx.lineTo(cx + w - size * 0.02, cy - h / 2 + size * 0.008);
            ctx.lineTo(cx, cy - size * 0.01);
            ctx.lineTo(cx - w + size * 0.02, cy - h / 2 + size * 0.008);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // 4. Specular sheen overlay across the block (gorgeous Godot/Blender ambient light shine)
            ctx.save();
            const sheen = ctx.createLinearGradient(cx - w, cy - h, cx + w, cy + h);
            sheen.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
            sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.06)');
            sheen.addColorStop(0.65, 'rgba(0, 0, 0, 0.0)');
            sheen.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
            ctx.fillStyle = sheen;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h);
            ctx.lineTo(cx + w, cy - h / 2);
            ctx.lineTo(cx + w, cy + h / 2);
            ctx.lineTo(cx, cy + h);
            ctx.lineTo(cx - w, cy + h / 2);
            ctx.lineTo(cx - w, cy - h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // 5. Stylized dark outlines (Premium cell-shaded voxel borders)
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.lineWidth = size * 0.025;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy - h);
            ctx.lineTo(cx + w, cy - h / 2);
            ctx.lineTo(cx + w, cy + h / 2);
            ctx.lineTo(cx, cy + h);
            ctx.lineTo(cx - w, cy + h / 2);
            ctx.lineTo(cx - w, cy - h / 2);
            ctx.closePath();
            ctx.stroke();

            // Internal edges
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.lineWidth = size * 0.02;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - w, cy - h / 2);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + w, cy - h / 2);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, cy + h);
            ctx.stroke();
        };

        // Helper to draw pickaxes
        const drawPickaxe = (headColor: string, isMetallic: boolean, glowColor?: string) => {
            const pad = size * 0.16;
            const x1 = pad;
            const y1 = size - pad;
            const x2 = size - pad * 1.15;
            const y2 = pad * 1.15;

            const cx = size / 2;
            const cy = size / 2;

            // Soft 3D drop shadow under pickaxe
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(cx, cy + size * 0.2, size * 0.35, size * 0.12, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fill();
            ctx.restore();

            if (glowColor) {
                ctx.save();
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = size * 0.16;
                ctx.beginPath();
                ctx.arc(x2, y2, size * 0.22, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
                ctx.fill();
                ctx.restore();
            }

            // Handle (brown stick)
            ctx.save();
            ctx.strokeStyle = '#8d6e63';
            ctx.lineWidth = size * 0.07;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Leather grip
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = size * 0.075;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + (x2 - x1) * 0.35, y1 + (y2 - y1) * 0.35);
            ctx.stroke();
            ctx.restore();

            // Head rotation alignment
            ctx.save();
            ctx.translate(x2, y2);
            ctx.rotate(Math.PI / 4);

            const hw = size * 0.36;
            const hh = size * 0.12;

            ctx.fillStyle = headColor;
            ctx.beginPath();
            ctx.moveTo(-hw, -hh * 0.3);
            ctx.quadraticCurveTo(0, hh, hw, -hh * 0.3);
            ctx.lineTo(hw, -hh * 0.7);
            ctx.quadraticCurveTo(0, -hh * 0.15, -hw, -hh * 0.7);
            ctx.closePath();
            ctx.fill();

            if (isMetallic) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.moveTo(-hw * 0.8, -hh * 0.4);
                ctx.quadraticCurveTo(0, hh * 0.4, hw * 0.8, -hh * 0.4);
                ctx.lineTo(hw * 0.8, -hh * 0.55);
                ctx.quadraticCurveTo(0, hh * 0.25, -hw * 0.8, -hh * 0.55);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
                ctx.fillRect(-hw * 0.15, -hh * 0.55, hw * 0.3, hh * 0.4);
            }

            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-hw, -hh * 0.3);
            ctx.quadraticCurveTo(0, hh, hw, -hh * 0.3);
            ctx.lineTo(hw, -hh * 0.7);
            ctx.quadraticCurveTo(0, -hh * 0.15, -hw, -hh * 0.7);
            ctx.closePath();
            ctx.stroke();

            // Iron bracket coupling
            ctx.fillStyle = '#b2babb';
            ctx.fillRect(-size * 0.05, -size * 0.05, size * 0.1, size * 0.1);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(-size * 0.05, -size * 0.05, size * 0.1, size * 0.1);

            ctx.restore();
        };

        // Helper to draw swords
        const drawSword = (bladeColor: string, isMetallic: boolean, glowColor?: string) => {
            const pad = size * 0.15;
            const x1 = pad * 1.3;
            const y1 = size - pad * 1.3;
            const x2 = size - pad * 1.3;
            const y2 = pad * 1.3;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len;
            const uy = dy / len;
            const nx = -uy;
            const ny = ux;

            // Ambient shadow under sword
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(size / 2, size / 2 + size * 0.18, size * 0.35, size * 0.1, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.fill();
            ctx.restore();

            // Glow / Enchant effect
            if (glowColor) {
                ctx.save();
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = size * 0.18;
                ctx.beginPath();
                ctx.moveTo(x1 + ux * (len * 0.3), y1 + uy * (len * 0.3));
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
                ctx.lineWidth = size * 0.22;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }

            // 1. Handle grip (brown leather)
            ctx.save();
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = size * 0.06;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + ux * (len * 0.22), y1 + uy * (len * 0.22));
            ctx.stroke();

            // Pommel (end of handle)
            ctx.fillStyle = '#3e2723';
            ctx.beginPath();
            ctx.arc(x1, y1, size * 0.055, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();

            // 2. Guard (Crossguard)
            const gx = x1 + ux * (len * 0.22);
            const gy = y1 + uy * (len * 0.22);
            const gw = size * 0.14;

            ctx.save();
            const guardColor = isMetallic ? '#b2babb' : '#8d6e63';
            ctx.strokeStyle = guardColor;
            ctx.lineWidth = size * 0.07;
            ctx.lineCap = 'square';
            ctx.beginPath();
            ctx.moveTo(gx - nx * gw, gy - ny * gw);
            ctx.lineTo(gx + nx * gw, gy + ny * gw);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(gx - nx * gw, gy - ny * gw);
            ctx.lineTo(gx + nx * gw, gy + ny * gw);
            ctx.stroke();
            ctx.restore();

            // 3. Blade
            const bxStart = gx + ux * (size * 0.02);
            const byStart = gy + uy * (size * 0.02);
            const bladeWidth = size * 0.07;

            ctx.save();
            let lightColor = bladeColor;
            
            // Left side
            ctx.fillStyle = lightColor;
            ctx.beginPath();
            ctx.moveTo(bxStart, byStart);
            ctx.lineTo(x2, y2);
            ctx.lineTo(bxStart - nx * bladeWidth, byStart - ny * bladeWidth);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.moveTo(bxStart, byStart);
            ctx.lineTo(x2, y2);
            ctx.lineTo(bxStart - nx * bladeWidth, byStart - ny * bladeWidth);
            ctx.closePath();
            ctx.fill();

            // Right side
            ctx.fillStyle = lightColor;
            ctx.beginPath();
            ctx.moveTo(bxStart, byStart);
            ctx.lineTo(x2, y2);
            ctx.lineTo(bxStart + nx * bladeWidth, byStart + ny * bladeWidth);
            ctx.closePath();
            ctx.fill();

            if (isMetallic) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.beginPath();
                ctx.moveTo(bxStart, byStart);
                ctx.lineTo(x2, y2);
                ctx.lineTo(bxStart + nx * (bladeWidth * 0.4), byStart + ny * (bladeWidth * 0.4));
                ctx.closePath();
                ctx.fill();
            }

            // Outline
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(bxStart - nx * bladeWidth, byStart - ny * bladeWidth);
            ctx.lineTo(bxStart, byStart);
            ctx.lineTo(bxStart + nx * bladeWidth, byStart + ny * bladeWidth);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.stroke();

            // Center longitudinal line
            ctx.strokeStyle = 'rgba(0,0,0,0.25)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(bxStart, byStart);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.restore();
        };

        // Helper to draw a diagonal textured branch/twig
        const drawStick = (c: CanvasRenderingContext2D, s: number) => {
            const pad = s * 0.22;
            const x1 = pad;
            const y1 = s - pad;
            const x2 = s - pad;
            const y2 = pad;

            c.save();
            // Outer shadow
            c.beginPath();
            c.moveTo(x1 + 1, y1 + 1);
            c.lineTo(x2 + 1, y2 + 1);
            c.strokeStyle = 'rgba(0,0,0,0.2)';
            c.lineWidth = s * 0.08;
            c.lineCap = 'round';
            c.stroke();

            // Main Stick body
            c.strokeStyle = '#8d6e63'; // bark brown
            c.lineWidth = s * 0.07;
            c.beginPath();
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
            c.stroke();

            // Wood rings on ends
            c.fillStyle = '#d7ccc8'; // light wood inside
            c.beginPath();
            c.arc(x1, y1, s * 0.025, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(x2, y2, s * 0.025, 0, Math.PI * 2);
            c.fill();

            // Knots / texture lines
            c.strokeStyle = '#5d4037'; // dark brown
            c.lineWidth = s * 0.015;
            c.beginPath();
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            c.moveTo(cx, cy);
            c.lineTo(cx + s * 0.06, cy - s * 0.06);
            c.stroke();

            c.restore();
        };

        // Helper to draw a bumpy coal lump
        const drawCoal = (c: CanvasRenderingContext2D, s: number) => {
            const cx = s / 2;
            const cy = s / 2;
            const r = s * 0.28;

            c.save();
            // Shadow under coal
            c.beginPath();
            c.ellipse(cx, cy + r * 0.85, r * 1.0, r * 0.35, 0, 0, Math.PI * 2);
            c.fillStyle = 'rgba(0,0,0,0.25)';
            c.fill();

            // Coal lump outline / shape
            c.fillStyle = '#2c3e50';
            c.beginPath();
            c.moveTo(cx - r * 0.8, cy - r * 0.3);
            c.lineTo(cx - r * 0.5, cy - r * 0.85);
            c.lineTo(cx + r * 0.2, cy - r * 0.95);
            c.lineTo(cx + r * 0.85, cy - r * 0.4);
            c.lineTo(cx + r * 0.9, cy + r * 0.25);
            c.lineTo(cx + r * 0.4, cy + r * 0.8);
            c.lineTo(cx - r * 0.3, cy + r * 0.9);
            c.lineTo(cx - r * 0.9, cy + r * 0.3);
            c.closePath();
            c.fill();

            // Facet shading
            c.fillStyle = '#34495e';
            c.beginPath();
            c.moveTo(cx - r * 0.5, cy - r * 0.85);
            c.lineTo(cx, cy - r * 0.2);
            c.lineTo(cx - r * 0.8, cy - r * 0.3);
            c.closePath();
            c.fill();

            c.fillStyle = '#1a252f';
            c.beginPath();
            c.moveTo(cx, cy - r * 0.2);
            c.lineTo(cx + r * 0.4, cy + r * 0.8);
            c.lineTo(cx - r * 0.3, cy + r * 0.9);
            c.closePath();
            c.fill();

            // Highlight glint
            c.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            c.lineWidth = s * 0.025;
            c.beginPath();
            c.moveTo(cx - r * 0.5, cy - r * 0.85);
            c.lineTo(cx + r * 0.2, cy - r * 0.95);
            c.lineTo(cx + r * 0.85, cy - r * 0.4);
            c.stroke();

            // Fine outlines
            c.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(cx - r * 0.8, cy - r * 0.3);
            c.lineTo(cx - r * 0.5, cy - r * 0.85);
            c.lineTo(cx + r * 0.2, cy - r * 0.95);
            c.lineTo(cx + r * 0.85, cy - r * 0.4);
            c.lineTo(cx + r * 0.9, cy + r * 0.25);
            c.lineTo(cx + r * 0.4, cy + r * 0.8);
            c.lineTo(cx - r * 0.3, cy + r * 0.9);
            c.lineTo(cx - r * 0.9, cy + r * 0.3);
            c.closePath();
            c.stroke();

            c.restore();
        };

        // Helper to draw metallic ingots (iron/gold)
        const drawIngot = (c: CanvasRenderingContext2D, s: number, isGold: boolean) => {
            const cx = s / 2;
            const cy = s / 2 + s * 0.04;
            const w = s * 0.32;
            const h = s * 0.16;

            c.save();
            c.beginPath();
            c.ellipse(cx, cy + h * 0.9, w * 1.1, h * 0.65, 0, 0, Math.PI * 2);
            c.fillStyle = 'rgba(0,0,0,0.2)';
            c.fill();

            const baseColor = isGold ? '#f1c40f' : '#eaeded';
            const shadowColor = isGold ? '#d68910' : '#bdc3c7';
            const highlightColor = isGold ? '#fef9e7' : '#ffffff';

            const tw = w * 0.65;
            const th = h * 0.65;
            const dy = h * 0.45;
            const ty = cy - dy;

            c.fillStyle = shadowColor;
            c.beginPath();
            c.moveTo(cx - w, cy);
            c.lineTo(cx, cy + h);
            c.lineTo(cx, ty + th);
            c.lineTo(cx - tw, ty);
            c.closePath();
            c.fill();

            c.fillStyle = baseColor;
            c.beginPath();
            c.moveTo(cx, cy + h);
            c.lineTo(cx + w, cy);
            c.lineTo(cx + tw, ty);
            c.lineTo(cx, ty + th);
            c.closePath();
            c.fill();

            c.fillStyle = highlightColor;
            c.beginPath();
            c.moveTo(cx, ty - th);
            c.lineTo(cx + tw, ty);
            c.lineTo(cx, ty + th);
            c.lineTo(cx - tw, ty);
            c.closePath();
            c.fill();

            c.strokeStyle = 'rgba(255,255,255,0.7)';
            c.lineWidth = s * 0.02;
            c.beginPath();
            c.moveTo(cx - tw, ty);
            c.lineTo(cx, ty + th);
            c.lineTo(cx + tw, ty);
            c.stroke();

            c.strokeStyle = 'rgba(0,0,0,0.45)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(cx - w, cy);
            c.lineTo(cx, cy + h);
            c.lineTo(cx + w, cy);
            c.lineTo(cx + tw, ty);
            c.lineTo(cx, ty - th);
            c.lineTo(cx - tw, ty);
            c.closePath();
            c.stroke();

            c.beginPath();
            c.moveTo(cx, cy + h);
            c.lineTo(cx, ty + th);
            c.stroke();

            c.restore();
        };

        // Helper to draw dynamic glowing diamonds
        const drawDiamond = (c: CanvasRenderingContext2D, s: number) => {
            const cx = s / 2;
            const cy = s / 2;
            const w = s * 0.28;
            const h = s * 0.32;

            c.save();
            c.shadowColor = 'rgba(0, 240, 255, 0.65)';
            c.shadowBlur = s * 0.15;

            c.beginPath();
            c.ellipse(cx, cy + h * 0.9, w * 0.8, h * 0.25, 0, 0, Math.PI * 2);
            c.fillStyle = 'rgba(0,0,0,0.18)';
            c.fill();

            c.shadowBlur = 0;

            const yTop = cy - h * 0.7;
            const yMid = cy - h * 0.1;
            const yBot = cy + h * 0.8;

            const xLeftFar = cx - w;
            const xLeftMid = cx - w * 0.45;
            const xRightMid = cx + w * 0.45;
            const xRightFar = cx + w;

            const colBright = '#e0f7fa';
            const colMid = '#33ebff';
            const colDark = '#00acc1';
            const colDarkest = '#00838f';

            c.fillStyle = colBright;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xRightMid, yTop);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.lineTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.closePath();
            c.fill();

            c.fillStyle = colMid;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.lineTo(xLeftFar, yMid);
            c.closePath();
            c.fill();

            c.fillStyle = colMid;
            c.beginPath();
            c.moveTo(xRightMid, yTop);
            c.lineTo(xRightFar, yMid);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.closePath();
            c.fill();

            c.fillStyle = colDark;
            c.beginPath();
            c.moveTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.lineTo(cx, yBot);
            c.closePath();
            c.fill();

            c.fillStyle = colDarkest;
            c.beginPath();
            c.moveTo(xLeftFar, yMid);
            c.lineTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.lineTo(cx, yBot);
            c.closePath();
            c.fill();

            c.fillStyle = colDarkest;
            c.beginPath();
            c.moveTo(xRightFar, yMid);
            c.lineTo(cx, yBot);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.closePath();
            c.fill();

            c.strokeStyle = '#ffffff';
            c.lineWidth = s * 0.02;
            c.lineCap = 'round';
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.moveTo(xRightMid, yTop);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.stroke();

            c.strokeStyle = 'rgba(0,0,0,0.5)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xRightMid, yTop);
            c.lineTo(xRightFar, yMid);
            c.lineTo(cx, yBot);
            c.lineTo(xLeftFar, yMid);
            c.closePath();
            c.stroke();

            c.beginPath();
            c.moveTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.moveTo(xLeftFar, yMid);
            c.lineTo(xLeftMid * 0.85 + cx * 0.15, yMid);
            c.moveTo(xRightFar, yMid);
            c.lineTo(xRightMid * 0.85 + cx * 0.15, yMid);
            c.stroke();

            c.restore();
        };

        // Helper to draw dynamic glowing emeralds
        const drawEmerald = (c: CanvasRenderingContext2D, s: number) => {
            const cx = s / 2;
            const cy = s / 2;
            const w = s * 0.26;
            const h = s * 0.32;

            c.save();
            c.shadowColor = 'rgba(46, 204, 113, 0.65)';
            c.shadowBlur = s * 0.15;

            c.beginPath();
            c.ellipse(cx, cy + h * 0.9, w * 0.85, h * 0.25, 0, 0, Math.PI * 2);
            c.fillStyle = 'rgba(0,0,0,0.18)';
            c.fill();

            c.shadowBlur = 0;

            const yTop = cy - h * 0.75;
            const yUpperMid = cy - h * 0.35;
            const yLowerMid = cy + h * 0.35;
            const yBot = cy + h * 0.75;

            const xLeft = cx - w;
            const xLeftMid = cx - w * 0.5;
            const xRightMid = cx + w * 0.5;
            const xRight = cx + w;

            const colBright = '#a3e4d7';
            const colMid = '#2ecc71';
            const colDark = '#27ae60';
            const colDarkest = '#196f3d';

            c.fillStyle = colBright;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xRightMid, yTop);
            c.lineTo(xRightMid, yUpperMid);
            c.lineTo(xLeftMid, yUpperMid);
            c.closePath();
            c.fill();

            c.fillStyle = colMid;
            c.beginPath();
            c.moveTo(xLeftMid, yUpperMid);
            c.lineTo(xRightMid, yUpperMid);
            c.lineTo(xRightMid, yLowerMid);
            c.lineTo(xLeftMid, yLowerMid);
            c.closePath();
            c.fill();

            c.fillStyle = colDark;
            c.beginPath();
            c.moveTo(xLeftMid, yLowerMid);
            c.lineTo(xRightMid, yLowerMid);
            c.lineTo(cx, yBot);
            c.closePath();
            c.fill();

            c.fillStyle = colDark;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xLeftMid, yUpperMid);
            c.lineTo(xLeft, cy);
            c.closePath();
            c.fill();

            c.fillStyle = colDarkest;
            c.beginPath();
            c.moveTo(xLeft, cy);
            c.lineTo(xLeftMid, yUpperMid);
            c.lineTo(xLeftMid, yLowerMid);
            c.closePath();
            c.fill();

            c.fillStyle = colDarkest;
            c.beginPath();
            c.moveTo(xLeft, cy);
            c.lineTo(xLeftMid, yLowerMid);
            c.lineTo(cx, yBot);
            c.closePath();
            c.fill();

            c.fillStyle = colMid;
            c.beginPath();
            c.moveTo(xRightMid, yTop);
            c.lineTo(xRight, cy);
            c.lineTo(xRightMid, yUpperMid);
            c.closePath();
            c.fill();

            c.fillStyle = colDark;
            c.beginPath();
            c.moveTo(xRight, cy);
            c.lineTo(xRightMid, yUpperMid);
            c.lineTo(xRightMid, yLowerMid);
            c.closePath();
            c.fill();

            c.fillStyle = colDarkest;
            c.beginPath();
            c.moveTo(xRight, cy);
            c.lineTo(xRightMid, yLowerMid);
            c.lineTo(cx, yBot);
            c.closePath();
            c.fill();

            c.strokeStyle = 'rgba(255,255,255,0.6)';
            c.lineWidth = s * 0.02;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xLeftMid, yUpperMid);
            c.lineTo(xRightMid, yUpperMid);
            c.lineTo(xRightMid, yTop);
            c.stroke();

            c.strokeStyle = 'rgba(0,0,0,0.5)';
            c.lineWidth = 1.2;
            c.beginPath();
            c.moveTo(xLeftMid, yTop);
            c.lineTo(xRightMid, yTop);
            c.lineTo(xRight, cy);
            c.lineTo(cx, yBot);
            c.lineTo(xLeft, cy);
            c.closePath();
            c.stroke();

            c.restore();
        };

        // Draw by ItemType
        switch (itemType) {
            case ItemType.DIRT_BLOCK:
                drawIsometricBlock(
                    '#557a2b', // Grass top green
                    '#735135', // Dirt brown left
                    '#5c402a', // Dirt brown right
                    undefined,
                    (c, w, h, cx, cy) => {
                        // Grass side trim left
                        c.fillStyle = '#557a2b';
                        c.beginPath();
                        c.moveTo(cx - w, cy - h / 2);
                        c.lineTo(cx, cy);
                        c.lineTo(cx, cy + h * 0.32);
                        c.lineTo(cx - w * 0.4, cy + h * 0.12);
                        c.lineTo(cx - w * 0.7, cy + h * 0.28);
                        c.lineTo(cx - w, cy + h * 0.15);
                        c.closePath();
                        c.fill();
                    },
                    (c, w, h, cx, cy) => {
                        // Grass side trim right
                        c.fillStyle = '#4c6e26';
                        c.beginPath();
                        c.moveTo(cx, cy);
                        c.lineTo(cx + w, cy - h / 2);
                        c.lineTo(cx + w, cy + h * 0.15);
                        c.lineTo(cx + w * 0.7, cy + h * 0.28);
                        c.lineTo(cx + w * 0.4, cy + h * 0.12);
                        c.lineTo(cx, cy + h * 0.32);
                        c.closePath();
                        c.fill();
                    }
                );
                break;

            case ItemType.STONE_BLOCK:
                drawIsometricBlock(
                    '#999999',
                    '#808080',
                    '#666666',
                    (c, w, h, cx, cy) => {
                        c.fillStyle = 'rgba(0,0,0,0.12)';
                        c.fillRect(cx - w * 0.4, cy - h * 0.6, w * 0.12, w * 0.12);
                        c.fillRect(cx + w * 0.2, cy - h * 0.2, w * 0.08, w * 0.08);
                    },
                    (c, w, h, cx, cy) => {
                        c.fillStyle = 'rgba(0,0,0,0.12)';
                        c.fillRect(cx - w * 0.6, cy + h * 0.1, w * 0.1, w * 0.1);
                        c.fillRect(cx - w * 0.25, cy + h * 0.35, w * 0.08, w * 0.08);
                    },
                    (c, w, h, cx, cy) => {
                        c.fillStyle = 'rgba(0,0,0,0.12)';
                        c.fillRect(cx + w * 0.4, cy + h * 0.1, w * 0.1, w * 0.1);
                        c.fillRect(cx + w * 0.15, cy + h * 0.35, w * 0.08, w * 0.08);
                    }
                );
                break;

            case ItemType.WOOD_BLOCK:
                drawIsometricBlock(
                    '#cca47a', // concentric rings beige wood
                    '#543d2b', // bark brown left
                    '#422f21', // bark brown right
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = '#8f684a';
                        c.lineWidth = size * 0.025;
                        c.beginPath();
                        c.ellipse(cx, cy - h / 2, w * 0.6, h * 0.6, 0, 0, Math.PI * 2);
                        c.stroke();
                        c.beginPath();
                        c.ellipse(cx, cy - h / 2, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
                        c.stroke();
                    },
                    (c, w, h, cx, cy) => {
                        // Bark texture vertical lines left
                        c.strokeStyle = '#322318';
                        c.lineWidth = size * 0.025;
                        c.beginPath();
                        c.moveTo(cx - w * 0.5, cy - h * 0.15);
                        c.lineTo(cx - w * 0.5, cy + h * 0.6);
                        c.moveTo(cx - w * 0.18, cy + h * 0.1);
                        c.lineTo(cx - w * 0.18, cy + h * 0.85);
                        c.stroke();
                    },
                    (c, w, h, cx, cy) => {
                        // Bark texture right
                        c.strokeStyle = '#291d14';
                        c.lineWidth = size * 0.025;
                        c.beginPath();
                        c.moveTo(cx + w * 0.5, cy - h * 0.15);
                        c.lineTo(cx + w * 0.5, cy + h * 0.6);
                        c.moveTo(cx + w * 0.18, cy + h * 0.1);
                        c.lineTo(cx + w * 0.18, cy + h * 0.85);
                        c.stroke();
                    }
                );
                break;

            case ItemType.PLANKS_BLOCK:
                drawIsometricBlock(
                    '#c68a4c', // Oak planks golden-brown
                    '#a5703a',
                    '#875b2e',
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = '#604222';
                        c.lineWidth = 0.8;
                        // Wood grains
                        c.beginPath();
                        c.moveTo(cx - w * 0.5, cy - h * 0.75);
                        c.lineTo(cx + w * 0.5, cy - h * 0.25);
                        c.stroke();
                    },
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = '#54391c';
                        c.lineWidth = 0.8;
                        // Horizontal seam lines
                        c.beginPath();
                        c.moveTo(cx - w, cy);
                        c.lineTo(cx, cy + h / 2);
                        c.moveTo(cx - w, cy - h * 0.2);
                        c.lineTo(cx, cy + h * 0.3);
                        c.stroke();
                        // Vertical wood joint
                        c.beginPath();
                        c.moveTo(cx - w * 0.45, cy + h * 0.1);
                        c.lineTo(cx - w * 0.45, cy + h * 0.35);
                        c.stroke();
                    },
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = '#432d16';
                        c.lineWidth = 0.8;
                        c.beginPath();
                        c.moveTo(cx, cy + h / 2);
                        c.lineTo(cx + w, cy);
                        c.moveTo(cx, cy + h * 0.3);
                        c.lineTo(cx + w, cy - h * 0.2);
                        c.stroke();
                        c.beginPath();
                        c.moveTo(cx + w * 0.5, cy + h * 0.05);
                        c.lineTo(cx + w * 0.5, cy + h * 0.3);
                        c.stroke();
                    }
                );
                break;

            case ItemType.COBBLESTONE_BLOCK:
                drawIsometricBlock(
                    '#8c8c8c',
                    '#737373',
                    '#5e5e5e',
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = 'rgba(0,0,0,0.18)';
                        c.lineWidth = 0.8;
                        c.beginPath();
                        c.moveTo(cx - w * 0.5, cy - h * 0.5);
                        c.lineTo(cx, cy - h * 0.25);
                        c.lineTo(cx + w * 0.5, cy - h * 0.5);
                        c.stroke();
                    },
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = 'rgba(0,0,0,0.18)';
                        c.lineWidth = 0.8;
                        c.beginPath();
                        c.moveTo(cx - w, cy + h * 0.15);
                        c.lineTo(cx - w * 0.5, cy + h * 0.45);
                        c.lineTo(cx, cy + h * 0.2);
                        c.stroke();
                    },
                    (c, w, h, cx, cy) => {
                        c.strokeStyle = 'rgba(0,0,0,0.18)';
                        c.lineWidth = 0.8;
                        c.beginPath();
                        c.moveTo(cx, cy + h * 0.2);
                        c.lineTo(cx + w * 0.5, cy + h * 0.45);
                        c.lineTo(cx + w, cy + h * 0.15);
                        c.stroke();
                    }
                );
                break;

            case ItemType.FURNACE_BLOCK:
                {
                    const cx = size / 2;
                    const cy = size / 2 + size * 0.08;
                    const r = size * 0.3;
                    
                    // Soft bottom shadow
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + r * 0.25, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fill();

                    // High intensity radial fire glow
                    const fireGlow = ctx.createRadialGradient(cx, cy - r * 0.35, 1, cx, cy - r * 0.35, r * 1.4);
                    fireGlow.addColorStop(0, 'rgba(231, 76, 60, 0.55)');
                    fireGlow.addColorStop(0.5, 'rgba(230, 126, 34, 0.22)');
                    fireGlow.addColorStop(1, 'rgba(241, 196, 15, 0)');
                    ctx.fillStyle = fireGlow;
                    ctx.beginPath();
                    ctx.arc(cx, cy - r * 0.35, r * 1.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // Stone-built Fire Hearth (fireplace bowl)
                    ctx.save();
                    ctx.fillStyle = '#7f8c8d'; // gray stone
                    ctx.beginPath();
                    ctx.moveTo(cx - r * 1.0, cy);
                    ctx.bezierCurveTo(cx - r * 0.8, cy + r * 0.6, cx + r * 0.8, cy + r * 0.6, cx + r * 1.0, cy);
                    ctx.bezierCurveTo(cx + r * 0.9, cy + r * 0.2, cx - r * 0.9, cy + r * 0.2, cx - r * 1.0, cy);
                    ctx.closePath();
                    ctx.fill();

                    // Dark interior cavity of the hearth
                    ctx.fillStyle = '#2c3e50';
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + r * 0.1, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Shaded stone blocks/bricks border detail
                    ctx.strokeStyle = '#4d5656';
                    ctx.lineWidth = size * 0.025;
                    ctx.beginPath();
                    ctx.moveTo(cx - r * 1.0, cy);
                    ctx.bezierCurveTo(cx - r * 0.8, cy + r * 0.6, cx + r * 0.8, cy + r * 0.6, cx + r * 1.0, cy);
                    ctx.stroke();
                    ctx.restore();

                    // Glowing burning hot embers inside hearth
                    ctx.save();
                    const emberGrad = ctx.createRadialGradient(cx, cy + r * 0.05, 1, cx, cy + r * 0.05, r * 0.6);
                    emberGrad.addColorStop(0, '#f1c40f'); // bright yellow core
                    emberGrad.addColorStop(0.6, '#e67e22'); // orange
                    emberGrad.addColorStop(1, '#e74c3c'); // red
                    ctx.fillStyle = emberGrad;
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + r * 0.05, r * 0.6, r * 0.15, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // High, roaring fireplace flame (Tall, beautiful fire)
                    ctx.save();
                    const flameGrad = ctx.createLinearGradient(cx, cy + r * 0.05, cx, cy - r * 1.25);
                    flameGrad.addColorStop(0, '#e74c3c'); // dark red base
                    flameGrad.addColorStop(0.4, '#e67e22'); // glowing orange
                    flameGrad.addColorStop(0.8, '#f1c40f'); // warm yellow
                    flameGrad.addColorStop(1, 'rgba(255, 255, 255, 0)'); // transparent tip
                    ctx.fillStyle = flameGrad;

                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 1.35);
                    ctx.bezierCurveTo(cx + r * 0.55, cy - r * 0.7, cx + r * 0.5, cy + r * 0.1, cx + r * 0.2, cy + r * 0.15);
                    ctx.lineTo(cx - r * 0.2, cy + r * 0.15);
                    ctx.bezierCurveTo(cx - r * 0.5, cy + r * 0.1, cx - r * 0.55, cy - r * 0.7, cx, cy - r * 1.35);
                    ctx.closePath();
                    ctx.fill();

                    // Inner flame core (Super hot light yellow/white flame)
                    ctx.fillStyle = '#fef9e7';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 0.85);
                    ctx.bezierCurveTo(cx + r * 0.3, cy - r * 0.45, cx + r * 0.25, cy, cx + r * 0.1, cy + r * 0.05);
                    ctx.lineTo(cx - r * 0.1, cy + r * 0.05);
                    ctx.bezierCurveTo(cx - r * 0.25, cy, cx - r * 0.3, cy - r * 0.45, cx, cy - r * 0.85);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                break;

            case ItemType.CAMPFIRE_BLOCK:
                {
                    const cx = size / 2;
                    const cy = size / 2 + size * 0.08;
                    const r = size * 0.3;
                    
                    // Shadow
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + r * 0.2, r * 1.1, r * 0.4, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fill();

                    // Radial orange flame glow
                    const fireGlow = ctx.createRadialGradient(cx, cy - r * 0.4, 2, cx, cy - r * 0.4, r * 1.3);
                    fireGlow.addColorStop(0, 'rgba(230, 126, 34, 0.45)');
                    fireGlow.addColorStop(0.5, 'rgba(241, 196, 15, 0.15)');
                    fireGlow.addColorStop(1, 'rgba(230, 126, 34, 0)');
                    ctx.fillStyle = fireGlow;
                    ctx.beginPath();
                    ctx.arc(cx, cy - r * 0.4, r * 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // Stacked crossed logs
                    ctx.save();
                    ctx.strokeStyle = '#5c402a';
                    ctx.lineWidth = size * 0.09;
                    ctx.lineCap = 'round';
                    // Log 1: bottom-left to top-right
                    ctx.beginPath();
                    ctx.moveTo(cx - r * 0.8, cy + r * 0.1);
                    ctx.lineTo(cx + r * 0.8, cy - r * 0.3);
                    ctx.stroke();
                    // Log 2: bottom-right to top-left
                    ctx.strokeStyle = '#4e342e';
                    ctx.beginPath();
                    ctx.moveTo(cx + r * 0.8, cy + r * 0.1);
                    ctx.lineTo(cx - r * 0.8, cy - r * 0.3);
                    ctx.stroke();
                    ctx.restore();

                    // Beautiful burning flame overlay
                    ctx.save();
                    const flameGrad = ctx.createLinearGradient(cx, cy + r * 0.1, cx, cy - r * 1.1);
                    flameGrad.addColorStop(0, 'rgba(231, 76, 60, 0.9)'); // deep red base
                    flameGrad.addColorStop(0.5, 'rgba(230, 126, 34, 0.9)'); // bright orange middle
                    flameGrad.addColorStop(1, 'rgba(241, 196, 15, 0)'); // disappearing yellow tip
                    ctx.fillStyle = flameGrad;

                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 1.2);
                    // custom wavy flame vectors
                    ctx.bezierCurveTo(cx + r * 0.5, cy - r * 0.7, cx + r * 0.4, cy, cx, cy);
                    ctx.bezierCurveTo(cx - r * 0.4, cy, cx - r * 0.5, cy - r * 0.7, cx, cy - r * 1.2);
                    ctx.closePath();
                    ctx.fill();

                    // Inner flame core (bright hot yellow)
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 0.85);
                    ctx.bezierCurveTo(cx + r * 0.25, cy - r * 0.45, cx + r * 0.2, cy - r * 0.1, cx, cy - r * 0.1);
                    ctx.bezierCurveTo(cx - r * 0.2, cy - r * 0.1, cx - r * 0.25, cy - r * 0.45, cx, cy - r * 0.85);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                break;

            case ItemType.TORCH_BLOCK:
                {
                    const cx = size / 2;
                    const cy = size / 2 + size * 0.08;
                    const w = size * 0.25;
                    const h = size * 0.28;
                    
                    ctx.save();
                    // Slanted torch stick translation
                    ctx.translate(cx, cy);
                    ctx.rotate(-0.18);

                    // Flame glowing effect
                    const glowGrad = ctx.createRadialGradient(0, -h * 0.7, 1, 0, -h * 0.7, w * 1.6);
                    glowGrad.addColorStop(0, 'rgba(241, 196, 15, 0.35)');
                    glowGrad.addColorStop(1, 'rgba(241, 196, 15, 0)');
                    ctx.fillStyle = glowGrad;
                    ctx.beginPath();
                    ctx.arc(0, -h * 0.7, w * 1.6, 0, Math.PI * 2);
                    ctx.fill();

                    // Brown stick handle
                    ctx.fillStyle = '#8d6e63';
                    ctx.fillRect(-w * 0.16, -h * 0.3, w * 0.32, h * 1.5);
                    
                    // Dark charcoal tip
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(-w * 0.18, -h * 0.6, w * 0.36, h * 0.35);

                    // Torch flame (outer orange)
                    ctx.fillStyle = '#e67e22';
                    ctx.beginPath();
                    ctx.moveTo(0, -h * 1.5);
                    ctx.bezierCurveTo(w * 0.45, -h * 0.95, w * 0.45, -h * 0.55, 0, -h * 0.55);
                    ctx.bezierCurveTo(-w * 0.45, -h * 0.55, -w * 0.45, -h * 0.95, 0, -h * 1.5);
                    ctx.closePath();
                    ctx.fill();

                    // Inner flame (bright yellow)
                    ctx.fillStyle = '#f1c40f';
                    ctx.beginPath();
                    ctx.moveTo(0, -h * 1.15);
                    ctx.bezierCurveTo(w * 0.22, -h * 0.8, w * 0.22, -h * 0.55, 0, -h * 0.55);
                    ctx.bezierCurveTo(-w * 0.22, -h * 0.55, -w * 0.22, -h * 0.8, 0, -h * 1.15);
                    ctx.closePath();
                    ctx.fill();

                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 0.8;
                    ctx.strokeRect(-w * 0.16, -h * 0.3, w * 0.32, h * 1.5);

                    ctx.restore();
                }
                break;

            case ItemType.WOODEN_PICKAXE:
                drawPickaxe('#b8860b', false);
                break;
            case ItemType.STONE_PICKAXE:
                drawPickaxe('#7f8c8d', false);
                break;
            case ItemType.IRON_PICKAXE:
                drawPickaxe('#eaeded', true);
                break;
            case ItemType.DIAMOND_PICKAXE:
                drawPickaxe('#33ebff', true, 'rgba(0, 240, 255, 0.7)');
                break;

            case ItemType.WOODEN_SWORD:
                drawSword('#b8860b', false);
                break;
            case ItemType.STONE_SWORD:
                drawSword('#7f8c8d', false);
                break;
            case ItemType.IRON_SWORD:
                drawSword('#eaeded', true);
                break;
            case ItemType.DIAMOND_SWORD:
                drawSword('#33ebff', true, 'rgba(0, 240, 255, 0.7)');
                break;

            case ItemType.APPLE:
                {
                    const cx = size / 2;
                    const cy = size / 2 + size * 0.05;
                    const r = size * 0.28;

                    // Shadow
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + r * 0.9, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';
                    ctx.fill();
                    ctx.restore();

                    // Stem
                    ctx.save();
                    ctx.strokeStyle = '#5d4037';
                    ctx.lineWidth = size * 0.045;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 0.65);
                    ctx.quadraticCurveTo(cx + size * 0.04, cy - r * 1.05, cx + size * 0.1, cy - r * 1.15);
                    ctx.stroke();
                    ctx.restore();

                    // Leaf
                    ctx.save();
                    ctx.fillStyle = '#2ecc71';
                    ctx.beginPath();
                    ctx.moveTo(cx + size * 0.03, cy - r * 0.85);
                    ctx.quadraticCurveTo(cx - size * 0.12, cy - r * 1.1, cx - size * 0.08, cy - r * 0.75);
                    ctx.quadraticCurveTo(cx - size * 0.01, cy - r * 0.65, cx + size * 0.03, cy - r * 0.85);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    ctx.restore();

                    // Apple shapes
                    ctx.save();
                    ctx.fillStyle = '#e74c3c';
                    ctx.beginPath();
                    ctx.arc(cx - r * 0.35, cy - r * 0.08, r * 0.65, Math.PI * 0.75, Math.PI * 1.68, false);
                    ctx.quadraticCurveTo(cx, cy - r * 0.48, cx + r * 0.35, cy - r * 0.65);
                    ctx.arc(cx + r * 0.35, cy - r * 0.08, r * 0.65, Math.PI * 1.32, Math.PI * 0.25, false);
                    ctx.quadraticCurveTo(cx, cy + r * 0.75, cx - r * 0.35, cy + r * 0.55);
                    ctx.closePath();
                    ctx.fill();

                    // Inner gradient overlay
                    const appleGrad = ctx.createRadialGradient(cx + r * 0.2, cy - r * 0.2, 1, cx, cy, r);
                    appleGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
                    appleGrad.addColorStop(0.8, 'rgba(0,0,0,0.0)');
                    appleGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
                    ctx.fillStyle = appleGrad;
                    ctx.fill();

                    // Outline
                    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Gloss highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
                    ctx.beginPath();
                    ctx.ellipse(cx - r * 0.35, cy - r * 0.28, r * 0.18, r * 0.09, -Math.PI / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                break;

            case ItemType.BAKED_APPLE:
                {
                    const cx = size / 2;
                    const cy = size / 2 + size * 0.05;
                    const r = size * 0.28;

                    // Shadow
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(cx, cy + r * 0.9, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';
                    ctx.fill();
                    ctx.restore();

                    // Stem
                    ctx.save();
                    ctx.strokeStyle = '#3e2723';
                    ctx.lineWidth = size * 0.045;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(cx, cy - r * 0.65);
                    ctx.quadraticCurveTo(cx + size * 0.04, cy - r * 1.05, cx + size * 0.1, cy - r * 1.15);
                    ctx.stroke();
                    ctx.restore();

                    // Withered Leaf
                    ctx.save();
                    ctx.fillStyle = '#859b32';
                    ctx.beginPath();
                    ctx.moveTo(cx + size * 0.03, cy - r * 0.85);
                    ctx.quadraticCurveTo(cx - size * 0.12, cy - r * 1.1, cx - size * 0.08, cy - r * 0.75);
                    ctx.quadraticCurveTo(cx - size * 0.01, cy - r * 0.65, cx + size * 0.03, cy - r * 0.85);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    ctx.restore();

                    // Baked Apple shapes (Caramelized brown/golden skin)
                    ctx.save();
                    ctx.fillStyle = '#b35d2d';
                    ctx.beginPath();
                    ctx.arc(cx - r * 0.35, cy - r * 0.08, r * 0.65, Math.PI * 0.75, Math.PI * 1.68, false);
                    ctx.quadraticCurveTo(cx, cy - r * 0.48, cx + r * 0.35, cy - r * 0.65);
                    ctx.arc(cx + r * 0.35, cy - r * 0.08, r * 0.65, Math.PI * 1.32, Math.PI * 0.25, false);
                    ctx.quadraticCurveTo(cx, cy + r * 0.75, cx - r * 0.35, cy + r * 0.55);
                    ctx.closePath();
                    ctx.fill();

                    // Inner gradient overlay
                    const appleGrad = ctx.createRadialGradient(cx + r * 0.2, cy - r * 0.2, 1, cx, cy, r);
                    appleGrad.addColorStop(0, 'rgba(255, 235, 180, 0.1)'); // Golden warmth
                    appleGrad.addColorStop(0.8, 'rgba(0,0,0,0.0)');
                    appleGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = appleGrad;
                    ctx.fill();

                    // Outline
                    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Gloss highlight
                    ctx.fillStyle = 'rgba(255, 250, 220, 0.35)';
                    ctx.beginPath();
                    ctx.ellipse(cx - r * 0.35, cy - r * 0.28, r * 0.18, r * 0.09, -Math.PI / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                break;

            case ItemType.STICK:
                drawStick(ctx, size);
                break;

            case ItemType.COAL:
                drawCoal(ctx, size);
                break;

            case ItemType.IRON_INGOT:
                drawIngot(ctx, size, false);
                break;

            case ItemType.GOLD_INGOT:
                drawIngot(ctx, size, true);
                break;

            case ItemType.DIAMOND:
                drawDiamond(ctx, size);
                break;

            case ItemType.EMERALD:
                drawEmerald(ctx, size);
                break;

            default:
                // Draw a simple warning placeholder block just in case
                drawIsometricBlock('#e74c3c', '#c0392b', '#962d22');
                break;
        }
    }

    public openTradeUI(villager: VillagerEntity): void {
        this.activeVillager = villager;
        this.selectedTradeIndex = 0;
        this.uiOpen = true;
        this.tradePanel.style.display = 'flex';
        this.renderTradeUI();
    }

    private renderTradeUI(): void {
        if (!this.activeVillager) return;

        const v = this.activeVillager;
        const levelTitles = ['Apprentice (초보)', 'Journeyman (수습)', 'Expert (전문가)', 'Master (장인)'];
        const titleText = `${this.getProfessionKName(v.profession)} - ${levelTitles[v.tradeLevel - 1]}`;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(46, 204, 113, 0.15); border-bottom: 1px solid rgba(46, 204, 113, 0.25);">
                <div style="font-size: 20px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                    🟢 ${titleText}
                </div>
                <button id="trade-close-btn" style="background: none; border: none; color: #e74c3c; font-size: 28px; cursor: pointer;">&times;</button>
            </div>
            
            <div style="padding: 10px 20px; background: rgba(0,0,0,0.25); display: flex; align-items: center; gap: 15px; font-size: 14px;">
                <div style="font-weight: bold;">등급 경험치:</div>
                <div style="flex-grow: 1; height: 12px; background: #2c3e50; border-radius: 6px; overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.15);">
                    <div style="width: ${Math.min((v.tradeXp / (v.tradeLevel * 100)) * 100, 100)}%; height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); transition: width 0.3s ease;"></div>
                </div>
                <div style="font-weight: bold; width: 60px; text-align: right;">${v.tradeXp}/${v.tradeLevel * 100} XP</div>
            </div>

            <div style="display: flex; flex-grow: 1; height: calc(100% - 100px); overflow: hidden;">
                <div id="trade-list" style="width: 320px; border-right: 1px solid rgba(255, 255, 255, 0.1); overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.15);">
        `;

        v.trades.forEach((trade, idx) => {
            const isSelected = idx === this.selectedTradeIndex;
            const demandFactor = v.demandIndex.get(trade.inputItem) ?? 1.0;
            const adjustedCost = Math.ceil(trade.inputCount * demandFactor);
            const isPriceChanged = adjustedCost !== trade.inputCount;
            const priceColor = adjustedCost > trade.inputCount ? '#e74c3c' : '#2ecc71';

            html += `
                <div class="trade-item-row" data-index="${idx}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${isSelected ? 'rgba(46, 204, 113, 0.22)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isSelected ? 'rgba(46, 204, 113, 0.45)' : 'rgba(255,255,255,0.08)'}; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <canvas class="trade-canvas" data-item-type="${trade.inputItem}" width="28" height="28" style="width: 28px; height: 28px;"></canvas>
                        <span style="font-weight: bold; color: ${isPriceChanged ? priceColor : '#fff'}">${adjustedCost}</span>
                    </div>
                    <div style="font-size: 16px; color: rgba(255,255,255,0.45);">➔</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <canvas class="trade-canvas" data-item-type="${trade.outputItem}" width="28" height="28" style="width: 28px; height: 28px;"></canvas>
                        <span style="font-weight: bold; color: #fff;">${trade.outputCount}</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                
                <div id="trade-detail" style="flex-grow: 1; padding: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.08);">
        `;

        if (this.selectedTradeIndex >= 0 && this.selectedTradeIndex < v.trades.length) {
            const trade = v.trades[this.selectedTradeIndex];
            const inputName = ITEM_NAMES[trade.inputItem] ?? 'Unknown';
            const outputName = ITEM_NAMES[trade.outputItem] ?? 'Unknown';

            const demandFactor = v.demandIndex.get(trade.inputItem) ?? 1.0;
            const adjustedCost = Math.ceil(trade.inputCount * demandFactor);
            const playerStock = this.inventory.getItemCount(trade.inputItem);
            const canAfford = playerStock >= adjustedCost;

            html += `
                <div style="display: flex; align-items: center; gap: 25px; margin-bottom: 30px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <canvas class="trade-detail-canvas" data-item-type="${trade.inputItem}" width="48" height="48" style="width: 48px; height: 48px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"></canvas>
                        <div style="font-size: 14px; font-weight: bold; text-align: center;">${inputName}</div>
                        <div style="font-size: 12px; color: ${canAfford ? '#2ecc71' : '#e74c3c'}; font-weight: bold;">보유: ${playerStock}/${adjustedCost}</div>
                    </div>
                    <div style="font-size: 32px; color: #2ecc71;">➔</div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <canvas class="trade-detail-canvas" data-item-type="${trade.outputItem}" width="48" height="48" style="width: 48px; height: 48px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"></canvas>
                        <div style="font-size: 14px; font-weight: bold; text-align: center;">${outputName}</div>
                        <div style="font-size: 12px; color: rgba(255,255,255,0.6);">제공량: ${trade.outputCount}개</div>
                    </div>
                </div>

                <button id="trade-execute-btn" style="padding: 15px 45px; font-size: 18px; font-weight: bold; color: #fff; background: ${canAfford ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : '#7f8c8d'}; border: 2px solid ${canAfford ? '#27ae60' : '#95a5a6'}; border-radius: 6px; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transition: all 0.2s ease;">
                    ${canAfford ? '거래 승인 (Trade)' : '재료 부족 (Insufficient)'}
                </button>
            `;
        } else {
            html += `<div style="color: rgba(255,255,255,0.45); font-size: 16px;">💡 거래 레시피를 선택해 보세요.</div>`;
        }

        html += `
                </div>
            </div>
        `;

        this.tradePanel.innerHTML = html;

        const canvases = this.tradePanel.querySelectorAll('canvas');
        canvases.forEach((c) => {
            const canvasEl = c as HTMLCanvasElement;
            const type = parseInt(canvasEl.dataset.itemType ?? '0');
            const ctx = canvasEl.getContext('2d');
            if (ctx) {
                this.drawItemIcon(ctx, type as ItemType, canvasEl.width);
            }
        });

        const closeBtn = document.getElementById('trade-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeUI();
            });
        }

        const rows = this.tradePanel.querySelectorAll('.trade-item-row');
        rows.forEach((r) => {
            const rowEl = r as HTMLElement;
            rowEl.addEventListener('click', () => {
                const idx = parseInt(rowEl.dataset.index ?? '-1');
                if (idx >= 0) {
                    this.selectedTradeIndex = idx;
                    this.renderTradeUI();
                }
            });
        });

        const executeBtn = document.getElementById('trade-execute-btn');
        if (executeBtn && this.selectedTradeIndex >= 0) {
            executeBtn.addEventListener('click', () => {
                this.executeTrade();
            });
        }
    }

    private executeTrade(): void {
        if (!this.activeVillager || this.selectedTradeIndex < 0) return;

        const v = this.activeVillager;
        const trade = v.trades[this.selectedTradeIndex];
        
        const demandFactor = v.demandIndex.get(trade.inputItem) ?? 1.0;
        const adjustedCost = Math.ceil(trade.inputCount * demandFactor);
        const playerStock = this.inventory.getItemCount(trade.inputItem);

        if (playerStock >= adjustedCost) {
            this.inventory.removeItem(this.inventory.getItemSlotIndex(trade.inputItem), adjustedCost);
            
            const added = this.inventory.addItem(trade.outputItem, trade.outputCount);
            if (added) {
                AudioManager.getInstance().playPickup();
                v.recordTransaction(trade.inputItem);
                
                const leveledUp = v.addTradeXp(15);
                if (leveledUp) {
                    this.showNotification('🎉 주민 등급이 승급되었습니다! 상위 거래가 해금됩니다.');
                } else {
                    this.showNotification('🟢 거래 성공! 주민 호감도 및 XP가 상승합니다.');
                }

                this.updateInventory();
                this.updateHotbar();
                this.renderTradeUI();
            } else {
                this.inventory.addItem(trade.inputItem, adjustedCost);
                this.showNotification('⚠️ 인벤토리가 가득 차 거래를 진행할 수 없습니다.');
            }
        }
    }

    private getProfessionKName(prof: VillagerProfession): string {
        if (prof === VillagerProfession.FARMER) return '농부 주민';
        if (prof === VillagerProfession.WEAPONSMITH) return '무기 제작자 주민';
        return '성직자 주민';
    }

    private setupTradeUI(): void {
        this.tradePanel = document.createElement('div');
        this.tradePanel.id = 'trade-panel';
        this.tradePanel.style.cssText = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 720px; height: 460px;
            background: rgba(18, 30, 23, 0.72);
            backdrop-filter: blur(16px);
            border: 2px solid rgba(46, 204, 113, 0.28);
            border-radius: 12px;
            box-shadow: 0 12px 36px rgba(0,0,0,0.6);
            display: none;
            flex-direction: column;
            color: #ecf0f1;
            font-family: 'Segoe UI', sans-serif;
            z-index: 100;
            user-select: none;
            overflow: hidden;
        `;
        document.body.appendChild(this.tradePanel);
    }
}