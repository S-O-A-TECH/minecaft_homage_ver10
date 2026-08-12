import * as THREE from 'three';
import { ItemType } from './types';

export class CombatManager {
    private static instance: CombatManager | null = null;
    private lastAttackTime: number = 0;

    private constructor() {}

    public static getInstance(): CombatManager {
        if (!CombatManager.instance) {
            CombatManager.instance = new CombatManager();
        }
        return CombatManager.instance;
    }

    /**
     * Cooldown durations in seconds according to specification.
     */
    public getCooldownDuration(itemType: ItemType | null): number {
        if (itemType === null) return 0.250; // Bare hands: 0.25s

        switch (itemType) {
            case ItemType.WOODEN_SWORD:
            case ItemType.STONE_SWORD:
            case ItemType.IRON_SWORD:
            case ItemType.DIAMOND_SWORD:
                return 0.625; // Swords: 0.625s (1.6 attacks/sec)

            case ItemType.WOODEN_PICKAXE:
            case ItemType.STONE_PICKAXE:
            case ItemType.IRON_PICKAXE:
            case ItemType.DIAMOND_PICKAXE:
                return 0.833; // Pickaxes: 0.833s (1.2 attacks/sec)

            default:
                return 0.250; // default bare hands / block items
        }
    }

    /**
     * Base attack damage.
     */
    public getBaseDamage(itemType: ItemType | null): number {
        if (itemType === null) return 1.0;

        switch (itemType) {
            case ItemType.WOODEN_SWORD: return 4.0;
            case ItemType.STONE_SWORD: return 5.0;
            case ItemType.IRON_SWORD: return 6.0;
            case ItemType.DIAMOND_SWORD: return 7.0;

            case ItemType.WOODEN_PICKAXE: return 2.0;
            case ItemType.STONE_PICKAXE: return 3.0;
            case ItemType.IRON_PICKAXE: return 4.0;
            case ItemType.DIAMOND_PICKAXE: return 5.0;

            default: return 1.0;
        }
    }

    /**
     * Records the attack time.
     */
    public recordAttack(currentTime: number): void {
        this.lastAttackTime = currentTime;
    }

    /**
     * Calculates the attack charging ratio (0.0 to 1.0).
     */
    public getAttackStrengthRatio(currentTime: number, itemType: ItemType | null): number {
        const elapsed = currentTime - this.lastAttackTime;
        const cooldown = this.getCooldownDuration(itemType);
        return Math.min(1.0, elapsed / cooldown);
    }

    /**
     * Armor mitigation calculation formula:
     * D_final = D * ( 1.0 - min(0.8, max(A/5, A - (4 * D) / (T + 8))) )
     */
    public calculateArmorMitigation(damage: number, armor: number, toughness: number): number {
        if (armor <= 0) return damage;
        const factor = Math.max(armor / 5.0, armor - (4.0 * damage) / (toughness + 8.0));
        const finalPercent = 1.0 - Math.min(0.8, factor);
        return damage * finalPercent;
    }
}
