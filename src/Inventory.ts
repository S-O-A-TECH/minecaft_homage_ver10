import { ItemType, InventorySlot } from './types';
import { ITEM_TO_BLOCK } from './constants';

export class Inventory {
    public slots: InventorySlot[];
    public selectedSlot: number = 0;
    private maxStackSize: number = 64;

    constructor() {
        this.slots = [];
        for (let i = 0; i < 36; i++) {
            this.slots.push({ itemType: null, count: 0 });
        }
    }

    getSlot(index: number): InventorySlot {
        if (index < 0 || index >= this.slots.length) {
            return { itemType: null, count: 0 };
        }
        return this.slots[index];
    }

    addItem(itemType: ItemType, count: number = 1): boolean {
        // First, try to stack with existing items
        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            if (slot.itemType === itemType && slot.count < this.maxStackSize) {
                const canAdd = Math.min(count, this.maxStackSize - slot.count);
                slot.count += canAdd;
                count -= canAdd;
                if (count <= 0) return true;
            }
        }

        // Then, find empty slots
        for (let i = 0; i < this.slots.length; i++) {
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

    hasItem(itemType: ItemType, count: number = 1): boolean {
        let found = 0;
        for (const slot of this.slots) {
            if (slot.itemType === itemType) {
                found += slot.count;
                if (found >= count) return true;
            }
        }
        return false;
    }

    consumeItem(itemType: ItemType, count: number = 1): boolean {
        if (!this.hasItem(itemType, count)) return false;

        let remaining = count;
        for (let i = this.slots.length - 1; i >= 0; i--) {
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
        for (const slot of this.slots) {
            if (slot.itemType === itemType) {
                count += slot.count;
            }
        }
        return count;
    }

    clear(): void {
        for (const slot of this.slots) {
            slot.itemType = null;
            slot.count = 0;
        }
    }
}