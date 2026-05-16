import { PlayerStats } from './PlayerStats';
import { TimeSystem } from './TimeSystem';
import { Inventory } from './Inventory';
import { ItemType, CraftingRecipe } from './types';
import { ITEM_NAMES, CRAFTING_RECIPES } from './constants';

interface RecipeStatus {
    recipe: CraftingRecipe;
    canCraft: boolean;
    missingIngredients: { item: ItemType; needed: number; have: number }[];
}

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
    private recipeList: HTMLElement;
    private recipeDetail: HTMLElement;
    private isCraftingOpen: boolean = false;
    private selectedRecipe: CraftingRecipe | null = null;

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
        this.recipeList = this.getElement('recipe-list');
        this.recipeDetail = this.getElement('recipe-detail');

        this.setupHotbar();
        this.setupInventoryGrid();
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
    openCrafting(): void {
        this.isCraftingOpen = true;
        this.craftingOverlay.style.display = 'flex';
        this.selectedRecipe = null;
        this.updateRecipeList();
        this.recipeDetail.innerHTML = '<div class="recipe-detail-placeholder">Select a recipe to view details</div>';
    }

    closeCrafting(): void {
        this.isCraftingOpen = false;
        this.craftingOverlay.style.display = 'none';
        this.selectedRecipe = null;
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

        const statuses = CRAFTING_RECIPES.map(r => this.getRecipeStatus(r));

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
            if (status.canCraft) {
                item.classList.add('craftable');
            }
            if (this.selectedRecipe === recipe) {
                item.classList.add('selected');
            }

            const icon = document.createElement('span');
            icon.className = 'recipe-icon';
            icon.textContent = status.canCraft ? '✅' : '❌';

            const name = document.createElement('span');
            name.className = 'recipe-name';
            name.textContent = count > 1 ? `${resultName} x${count}` : resultName;

            const tableReq = document.createElement('span');
            tableReq.className = 'recipe-table-req';
            tableReq.textContent = recipe.requiresCraftingTable ? '🔨' : '✋';

            item.appendChild(icon);
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

        // Result
        html += `<div class="recipe-detail-header">
            <span class="recipe-result-icon">📦</span>
            <span class="recipe-result-name">${resultName}${recipe.count > 1 ? ` x${recipe.count}` : ''}</span>
            <span class="recipe-can-craft ${status.canCraft ? 'craftable' : 'not-craftable'}">${status.canCraft ? '✅ Can Craft' : '❌ Cannot Craft'}</span>
        </div>`;

        // Pattern grid
        html += '<div class="recipe-pattern-grid">';
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const item = recipe.pattern[row]?.[col] ?? null;
                if (item !== null) {
                    const itemName = ITEM_NAMES[item] ?? '?';
                    const have = this.inventory.getItemCount(item);
                    // Count how many of this item are needed in the recipe
                    let needed = 0;
                    for (const r of recipe.pattern) {
                        for (const i of r) {
                            if (i === item) needed++;
                        }
                    }
                    const enough = have >= needed;
                    html += `<div class="recipe-pattern-slot ${enough ? 'has-item' : 'missing-item'}" title="${itemName}: ${have}/${needed}">
                        <span class="pattern-item-name">${itemName.substring(0, 6)}</span>
                        <span class="pattern-item-count">${have}/${needed}</span>
                    </div>`;
                } else {
                    html += '<div class="recipe-pattern-slot empty"></div>';
                }
            }
        }
        html += '</div>';

        // Missing ingredients
        if (!status.canCraft && status.missingIngredients.length > 0) {
            html += '<div class="recipe-missing"><strong>Missing:</strong>';
            for (const m of status.missingIngredients) {
                const itemName = ITEM_NAMES[m.item] ?? '?';
                html += `<span class="missing-tag">${itemName} (${m.have}/${m.needed})</span>`;
            }
            html += '</div>';
        }

        // Craft button
        html += `<button class="craft-button ${status.canCraft ? '' : 'disabled'}" ${status.canCraft ? '' : 'disabled'}>
            Craft ${resultName}
        </button>`;

        html += '</div>';

        this.recipeDetail.innerHTML = html;

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
}