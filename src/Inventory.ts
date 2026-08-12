import { ItemType, InventorySlot } from './types';
import { ITEM_TO_BLOCK, CRAFTING_RECIPES } from './constants';

export class Inventory {
    public slots: InventorySlot[];
    public selectedSlot: number = 0;
    private maxStackSize: number = 64;

    // Virtual slot for held item in UI mode
    public heldItem: InventorySlot = { itemType: null, count: 0 };

    constructor() {
        this.slots = [];
        // indices 0-35 (hotbar and player bag)
        // indices 36-99 (reserved/padding)
        // indices 100-108 (3x3 crafting inputs)
        // index 109 (crafting output)
        for (let i = 0; i < 110; i++) {
            this.slots.push({ itemType: null, count: 0 });
        }

        // Give Starter Kit for easy testing and instant onboarding!
        this.addItem(ItemType.WOOD_BLOCK, 16);
        this.addItem(ItemType.STONE_BLOCK, 16);
        this.addItem(ItemType.STICK, 16);
        this.addItem(ItemType.COAL, 16);
        this.addItem(ItemType.APPLE, 5);
    }

    getSlot(index: number): InventorySlot {
        if (index < 0 || index >= this.slots.length) {
            return { itemType: null, count: 0 };
        }
        return this.slots[index];
    }

    // Gathers items from world drops/actions (strictly slots 0-35)
    addItem(itemType: ItemType, count: number = 1): boolean {
        // First, try to stack with existing items (only slots 0-35!)
        for (let i = 0; i < 36; i++) {
            const slot = this.slots[i];
            if (slot.itemType === itemType && slot.count < this.maxStackSize) {
                const canAdd = Math.min(count, this.maxStackSize - slot.count);
                slot.count += canAdd;
                count -= canAdd;
                if (count <= 0) return true;
            }
        }

        // Then, find empty slots (only slots 0-35!)
        for (let i = 0; i < 36; i++) {
            const slot = this.slots[i];
            if (slot.itemType === null) {
                const canAdd = Math.min(count, this.maxStackSize);
                slot.itemType = itemType;
                slot.count = canAdd;
                count -= canAdd;
                if (count <= 0) return true;
            }
        }

        // Inventory full
        return count <= 0;
    }

    removeItem(index: number, count: number = 1): boolean {
        if (index < 0 || index >= this.slots.length) return false;

        const slot = this.slots[index];
        if (slot.itemType === null || slot.count < count) return false;

        slot.count -= count;
        if (slot.count <= 0) {
            slot.itemType = null;
            slot.count = 0;
        }
        return true;
    }

    // Checks availability (strictly slots 0-35)
    hasItem(itemType: ItemType, count: number = 1): boolean {
        let found = 0;
        for (let i = 0; i < 36; i++) {
            const slot = this.slots[i];
            if (slot.itemType === itemType) {
                found += slot.count;
                if (found >= count) return true;
            }
        }
        return false;
    }

    getState(): any {
        return {
            slots: this.slots.map(s => ({ itemType: s.itemType, count: s.count })),
            selectedSlot: this.selectedSlot,
            heldItem: { itemType: this.heldItem.itemType, count: this.heldItem.count }
        };
    }

    setState(data: any): void {
        this.selectedSlot = data.selectedSlot || 0;
        if (data.slots && Array.isArray(data.slots)) {
            for (let i = 0; i < this.slots.length && i < data.slots.length; i++) {
                this.slots[i].itemType = data.slots[i].itemType;
                this.slots[i].count = data.slots[i].count;
            }
        }
        if (data.heldItem) {
            this.heldItem.itemType = data.heldItem.itemType;
            this.heldItem.count = data.heldItem.count;
        }
    }

    // Consumes items for action/building (strictly slots 0-35)
    consumeItem(itemType: ItemType, count: number = 1): boolean {
        if (!this.hasItem(itemType, count)) return false;

        let remaining = count;
        for (let i = 35; i >= 0; i--) {
            const slot = this.slots[i];
            if (slot.itemType === itemType) {
                const toRemove = Math.min(remaining, slot.count);
                slot.count -= toRemove;
                remaining -= toRemove;
                if (slot.count <= 0) {
                    slot.itemType = null;
                    slot.count = 0;
                }
                if (remaining <= 0) break;
            }
        }
        return true;
    }

    getSelectedBlockType(): ItemType | null {
        const slot = this.slots[this.selectedSlot];
        if (slot.itemType === null) return null;

        // Check if it's a placeable block
        if (ITEM_TO_BLOCK[slot.itemType] !== undefined) {
            return slot.itemType;
        }
        return null;
    }

    getItemCount(itemType: ItemType): number {
        let count = 0;
        for (let i = 0; i < 36; i++) {
            const slot = this.slots[i];
            if (slot.itemType === itemType) {
                count += slot.count;
            }
        }
        return count;
    }

    swapSlots(index1: number, index2: number): void {
        if (index1 < 0 || index1 >= this.slots.length || index2 < 0 || index2 >= this.slots.length) return;
        if (index1 === index2) return;

        const slot1 = this.slots[index1];
        const slot2 = this.slots[index2];

        const tempType = slot1.itemType;
        const tempCount = slot1.count;

        slot1.itemType = slot2.itemType;
        slot1.count = slot2.count;

        slot2.itemType = tempType;
        slot2.count = tempCount;
    }

    clear(): void {
        for (const slot of this.slots) {
            slot.itemType = null;
            slot.count = 0;
        }
        this.heldItem.itemType = null;
        this.heldItem.count = 0;
    }

    // === 3x3 CRAFTING ENGINE LOGIC ===

    public updateCraftingOutput(): void {
        const grid: (ItemType | null)[][] = [
            [this.slots[100].itemType, this.slots[101].itemType, this.slots[102].itemType],
            [this.slots[103].itemType, this.slots[104].itemType, this.slots[105].itemType],
            [this.slots[106].itemType, this.slots[107].itemType, this.slots[108].itemType]
        ];

        // Trim bounding box to allow shifting inside 3x3 grid
        const getBoundingBox = (pattern: (ItemType | null)[][]) => {
            let minRow = 3, maxRow = -1, minCol = 3, maxCol = -1;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (pattern[r][c] !== null) {
                        if (r < minRow) minRow = r;
                        if (r > maxRow) maxRow = r;
                        if (c < minCol) minCol = c;
                        if (c > maxCol) maxCol = c;
                    }
                }
            }
            if (maxRow === -1) return null;
            return { minRow, maxRow, minCol, maxCol };
        };

        const matchPattern = (g: (ItemType | null)[][], p: (ItemType | null)[][]) => {
            const gBox = getBoundingBox(g);
            const pBox = getBoundingBox(p);
            if (!gBox && !pBox) return true;
            if (!gBox || !pBox) return false;
            const gH = gBox.maxRow - gBox.minRow;
            const gW = gBox.maxCol - gBox.minCol;
            const pH = pBox.maxRow - pBox.minRow;
            const pW = pBox.maxCol - pBox.minCol;
            if (gH !== pH || gW !== pW) return false;
            for (let r = 0; r <= gH; r++) {
                for (let c = 0; c <= gW; c++) {
                    const cellG = g[gBox.minRow + r][gBox.minCol + c];
                    const cellP = p[pBox.minRow + r][pBox.minCol + c];
                    if (cellG !== cellP) return false;
                }
            }
            return true;
        };

        let matched = false;
        for (const recipe of CRAFTING_RECIPES) {
            if (matchPattern(grid, recipe.pattern)) {
                this.slots[109].itemType = recipe.result;
                this.slots[109].count = recipe.count;
                matched = true;
                break;
            }
        }

        if (!matched) {
            this.slots[109].itemType = null;
            this.slots[109].count = 0;
        }
    }

    public consumeCraftingIngredients(): void {
        for (let i = 100; i <= 108; i++) {
            if (this.slots[i].itemType !== null) {
                this.slots[i].count--;
                if (this.slots[i].count <= 0) {
                    this.slots[i].itemType = null;
                    this.slots[i].count = 0;
                }
            }
        }
        this.updateCraftingOutput();
    }

    public shiftClickTransfer(index: number): void {
        const slot = this.slots[index];
        if (slot.itemType === null || slot.count <= 0) return;

        if (index === 109) {
            // Disabled shift click on output to force using the "생성" button!
            return;
        }

        if (index >= 100 && index <= 108) {
            // From crafting input back to bag/hotbar (0-35)
            const itemType = slot.itemType;
            let countToTransfer = slot.count;
            if (this.addItem(itemType, countToTransfer)) {
                slot.itemType = null;
                slot.count = 0;
            } else {
                // If only partially added, calculate how much was added
                const remaining = countToTransfer;
                // Since this is rare, we assume full transfer or no transfer.
                // We'll leave the remainder in the slot:
                const bagCountBefore = this.getItemCount(itemType);
                // Stack items
                let left = countToTransfer;
                for (let i = 0; i < 36; i++) {
                    const target = this.slots[i];
                    if (target.itemType === itemType && target.count < this.maxStackSize) {
                        const canAdd = Math.min(left, this.maxStackSize - target.count);
                        target.count += canAdd;
                        left -= canAdd;
                        if (left <= 0) break;
                    }
                }
                if (left > 0) {
                    for (let i = 0; i < 36; i++) {
                        const target = this.slots[i];
                        if (target.itemType === null) {
                            target.itemType = itemType;
                            target.count = left;
                            left = 0;
                            break;
                        }
                    }
                }
                slot.count = left;
                if (slot.count <= 0) {
                    slot.itemType = null;
                }
            }
            this.updateCraftingOutput();
            return;
        }

        if (index >= 0 && index <= 35) {
            // From bag/hotbar (0-35) to 3x3 crafting inputs (100-108)
            const itemType = slot.itemType;
            let countToTransfer = slot.count;

            // 1. Try to stack with matching items in 100-108
            for (let i = 100; i <= 108; i++) {
                const craftSlot = this.slots[i];
                if (craftSlot.itemType === itemType && craftSlot.count < this.maxStackSize) {
                    const canAdd = Math.min(countToTransfer, this.maxStackSize - craftSlot.count);
                    craftSlot.count += canAdd;
                    countToTransfer -= canAdd;
                    if (countToTransfer <= 0) break;
                }
            }

            // 2. Try empty slots in 100-108
            if (countToTransfer > 0) {
                for (let i = 100; i <= 108; i++) {
                    const craftSlot = this.slots[i];
                    if (craftSlot.itemType === null) {
                        const canAdd = Math.min(countToTransfer, this.maxStackSize);
                        craftSlot.itemType = itemType;
                        craftSlot.count = canAdd;
                        countToTransfer -= canAdd;
                        if (countToTransfer <= 0) break;
                    }
                }
            }

            // Update original slot
            if (countToTransfer <= 0) {
                slot.itemType = null;
                slot.count = 0;
            } else {
                slot.count = countToTransfer;
            }

            // If 3x3 grid was full/ignored, transfer between hotbar (0-8) and storage (9-35)
            if (countToTransfer === slot.count) {
                const isHotbar = index >= 0 && index <= 8;
                const start = isHotbar ? 9 : 0;
                const end = isHotbar ? 36 : 9;

                let left = slot.count;
                // Stack
                for (let i = start; i < end; i++) {
                    const targetSlot = this.slots[i];
                    if (targetSlot.itemType === itemType && targetSlot.count < this.maxStackSize) {
                        const canAdd = Math.min(left, this.maxStackSize - targetSlot.count);
                        targetSlot.count += canAdd;
                        left -= canAdd;
                        if (left <= 0) break;
                    }
                }
                // Empty
                if (left > 0) {
                    for (let i = start; i < end; i++) {
                        const targetSlot = this.slots[i];
                        if (targetSlot.itemType === null) {
                            targetSlot.itemType = itemType;
                            targetSlot.count = left;
                            left = 0;
                            break;
                        }
                    }
                }

                if (left <= 0) {
                    slot.itemType = null;
                    slot.count = 0;
                } else {
                    slot.count = left;
                }
            }

            this.updateCraftingOutput();
        }
    }

    public getItemSlotIndex(itemType: ItemType): number {
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].itemType === itemType && this.slots[i].count > 0) {
                return i;
            }
        }
        return -1;
    }
}