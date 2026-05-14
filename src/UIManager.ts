import { PlayerStats } from './PlayerStats';
import { TimeSystem } from './TimeSystem';
import { Inventory } from './Inventory';
import { ItemType } from './types';
import { ITEM_NAMES } from './constants';

export class UIManager {
    private stats: PlayerStats;
    private timeSystem: TimeSystem;
    private inventory: Inventory;

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

    // Inventory UI
    private inventoryOverlay: HTMLElement;
    private inventoryGrid: HTMLElement;
    private hotbarContainer: HTMLElement;
    private isInventoryOpen: boolean = false;

    // Crafting UI
    private craftingOverlay: HTMLElement;
    private craftingGrid: HTMLElement;
    private craftingResult: HTMLElement;
    private isCraftingOpen: boolean = false;

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

        this.inventoryOverlay = this.getElement('inventory-overlay');
        this.inventoryGrid = this.getElement('inventory-grid');
        this.hotbarContainer = this.getElement('hotbar-container');

        this.craftingOverlay = this.getElement('crafting-overlay');
        this.craftingGrid = this.getElement('crafting-grid');
        this.craftingResult = this.getElement('crafting-result');

        this.setupHotbar();
        this.setupInventoryGrid();
        this.setupCraftingGrid();
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
        const data = this.stats.getData();

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

        // Time
        this.timeDisplay.textContent = this.timeSystem.getFormattedTime();
        this.dayDisplay.textContent = `Day ${this.timeSystem.dayCount}`;
    }

    updateInfo(fps: number, x: number, y: number, z: number, chunks: number): void {
        this.infoDisplay.textContent =
            `FPS: ${fps} | Pos: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)} | Chunks: ${chunks}`;
    }

    // === HOTBAR ===
    private setupHotbar(): void {
        this.hotbarContainer.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.dataset.slotIndex = i.toString();
            slot.addEventListener('click', () => {
                this.inventory.selectedSlot = i;
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
            if (itemType !== null) {
                const name = ITEM_NAMES[itemType as ItemType] ?? 'Unknown';
                htmlSlot.textContent = name.substring(0, 4);
                if (invSlot.count > 1) {
                    htmlSlot.textContent += ` x${invSlot.count}`;
                }
            } else {
                htmlSlot.textContent = '';
            }
            if (index === this.inventory.selectedSlot) {
                htmlSlot.classList.add('selected');
            } else {
                htmlSlot.classList.remove('selected');
            }
        });
    }

    getSelectedItem(): ItemType | null {
        const slot = this.inventory.getSlot(this.inventory.selectedSlot);
        return slot.itemType;
    }

    // === INVENTORY ===
    private setupInventoryGrid(): void {
        this.inventoryGrid.innerHTML = '';
        for (let i = 0; i < 36; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.slotIndex = i.toString();
            slot.addEventListener('click', () => this.handleInventoryClick(i));
            this.inventoryGrid.appendChild(slot);
        }
    }

    private handleInventoryClick(index: number): void {
        const slot = this.inventory.getSlot(index);
        if (slot.itemType !== null && this.isFood(slot.itemType)) {
            // Eat food on right-click or shift+click
            this.stats.eatFood(slot.itemType);
            this.inventory.removeItem(index, 1);
            this.updateInventory();
            this.updateHotbar();
        }
    }

    private isFood(itemType: ItemType): boolean {
        return itemType >= 300 && itemType < 400;
    }

    updateInventory(): void {
        const slots = this.inventoryGrid.querySelectorAll('.inventory-slot');
        slots.forEach((slot, index) => {
            const htmlSlot = slot as HTMLElement;
            const invSlot = this.inventory.getSlot(index);
            const itemType = invSlot.itemType as ItemType | null;
            if (itemType !== null) {
                const name = ITEM_NAMES[itemType as ItemType] ?? 'Unknown';
                htmlSlot.textContent = name.substring(0, 6);
                if (invSlot.count > 1) {
                    htmlSlot.textContent += ` x${invSlot.count}`;
                }
                htmlSlot.title = name;
            } else {
                htmlSlot.textContent = '';
                htmlSlot.title = '';
            }
        });
    }

    toggleInventory(): void {
        this.isInventoryOpen = !this.isInventoryOpen;
        if (this.isInventoryOpen) {
            this.inventoryOverlay.style.display = 'flex';
            this.updateInventory();
        } else {
            this.inventoryOverlay.style.display = 'none';
            this.isCraftingOpen = false;
            this.craftingOverlay.style.display = 'none';
        }
    }

    isUIOpen(): boolean {
        return this.isInventoryOpen || this.isCraftingOpen;
    }

    // === CRAFTING ===
    private setupCraftingGrid(): void {
        this.craftingGrid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'crafting-slot';
            slot.dataset.craftIndex = i.toString();
            this.craftingGrid.appendChild(slot);
        }
    }

    openCrafting(): void {
        this.isCraftingOpen = true;
        this.craftingOverlay.style.display = 'flex';
    }

    closeCrafting(): void {
        this.isCraftingOpen = false;
        this.craftingOverlay.style.display = 'none';
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
}