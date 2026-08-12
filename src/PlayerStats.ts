import { PlayerStatsData, ItemType } from './types';
import {
    FOOD_MAP,
    EP_REGEN_BASE,
    EP_REGEN_CAMPFIRE,
    EP_REGEN_TENT,
    EP_REGEN_SUNLIGHT,
    EP_REGEN_SITTING,
    HP_REGEN_NATURAL,
    HP_REGEN_FURNACE,
    HUNGER_DECAY_BASE,
    HUNGER_DECAY_SPRINT,
    HUNGER_DECAY_JUMP,
    HUNGER_DECAY_SWIM,
    HUNGER_DECAY_HEALING,
    HP_DAMAGE_STARVATION,
    EP_COST_SPRINT,
    EP_COST_JUMP,
    EP_COST_SWIM,
    EP_COST_CRAFT,
    EP_COST_BREAK_BARE_HAND,
    EP_COST_BREAK_TOOL,
    EP_COST_MINE,
    HYPOTHERMIA_THRESHOLD,
    HEATSTROKE_THRESHOLD,
    EP_DAMAGE_HYPOTHERMIA,
    EP_DAMAGE_HEATSTROKE,
    HP_DAMAGE_HEATSTROKE,
} from './constants';

export class PlayerStats {
    public hp: number;
    public maxHp: number;
    public ep: number;
    public maxEp: number;
    public hunger: number;
    public maxHunger: number;
    public saturation: number = 20.0;
    private rapidRegenTimer: number = 0;

    private isSprinting: boolean = false;
    private isSwimming: boolean = false;
    private isSitting: boolean = false;
    private isNearCampfire: boolean = false;
    private isInTent: boolean = false;
    private isNearFurnace: boolean = false;
    private isOutdoors: boolean = true;
    private isDaytime: boolean = true;
    private temperature: number = 20;
    private justJumped: boolean = false;

    constructor() {
        this.hp = 100;
        this.maxHp = 100;
        this.ep = 100;
        this.maxEp = 100;
        this.hunger = 100;
        this.maxHunger = 100;
        this.saturation = 50.0;
    }

    clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    update(deltaTime: number): void {
        // Clamp deltaTime to prevent huge jumps
        const dt = Math.min(deltaTime, 0.1);

        // === HUNGER DECAY ===
        let hungerDecay = HUNGER_DECAY_BASE * dt;
        if (this.isSprinting) hungerDecay += HUNGER_DECAY_SPRINT * dt;
        if (this.isSwimming) hungerDecay += HUNGER_DECAY_SWIM * dt;
        if (this.justJumped) {
            hungerDecay += HUNGER_DECAY_JUMP;
            this.justJumped = false;
        }

        // Intercept hunger decay using saturation first
        if (this.saturation > 0) {
            this.saturation = Math.max(0, this.saturation - hungerDecay);
        } else {
            this.hunger = this.clamp(this.hunger - hungerDecay, 0, this.maxHunger);
        }

        // === STARVATION DAMAGE ===
        if (this.hunger <= 0) {
            this.hp = this.clamp(this.hp - HP_DAMAGE_STARVATION * dt, 0, this.maxHp);
        }

        // === EP REGENERATION ===
        let epRegen = 0;
        if (!this.isSprinting && !this.isSwimming) {
            epRegen += EP_REGEN_BASE * dt;
        }
        if (this.isNearCampfire) epRegen += EP_REGEN_CAMPFIRE * dt;
        if (this.isInTent) epRegen += EP_REGEN_TENT * dt;
        if (this.isOutdoors && this.isDaytime) epRegen += EP_REGEN_SUNLIGHT * dt;
        if (this.isSitting) epRegen += EP_REGEN_SITTING * dt;

        this.ep = this.clamp(this.ep + epRegen, 0, this.maxEp);

        // === TEMPERATURE EFFECTS ===
        if (this.temperature < HYPOTHERMIA_THRESHOLD) {
            this.ep = this.clamp(this.ep - EP_DAMAGE_HYPOTHERMIA * dt, 0, this.maxEp);
        }
        if (this.temperature > HEATSTROKE_THRESHOLD) {
            this.ep = this.clamp(this.ep - EP_DAMAGE_HEATSTROKE * dt, 0, this.maxEp);
            this.hp = this.clamp(this.hp - HP_DAMAGE_HEATSTROKE * dt, 0, this.maxHp);
        }

        // === NATURAL HP REGENERATION ===
        if (this.hunger > 80 && this.ep > 30) {
            let hpRegen = HP_REGEN_NATURAL * dt;
            if (this.isNearFurnace) hpRegen += HP_REGEN_FURNACE * dt;
            this.hp = this.clamp(this.hp + hpRegen, 0, this.maxHp);
            // Extra hunger decay while healing
            const extraDecay = HUNGER_DECAY_HEALING * dt;
            if (this.saturation > 0) {
                this.saturation = Math.max(0, this.saturation - extraDecay);
            } else {
                this.hunger = this.clamp(this.hunger - extraDecay, 0, this.maxHunger);
            }
        }

        // === RAPID REGENERATION (Phase 3 Spec) ===
        if (this.hunger >= 90 && this.saturation > 0) {
            this.rapidRegenTimer += dt;
            if (this.rapidRegenTimer >= 1.0) {
                this.hp = this.clamp(this.hp + 10.0, 0, this.maxHp);
                this.saturation = Math.max(0, this.saturation - 20.0);
                this.rapidRegenTimer = 0;
            }
        } else {
            this.rapidRegenTimer = 0;
        }
    }

    // === SETTERS for environmental states ===
    setSprinting(value: boolean): void { this.isSprinting = value; }
    setSwimming(value: boolean): void { this.isSwimming = value; }
    setSitting(value: boolean): void { this.isSitting = value; }
    setNearCampfire(value: boolean): void { this.isNearCampfire = value; }
    setInTent(value: boolean): void { this.isInTent = value; }
    setNearFurnace(value: boolean): void { this.isNearFurnace = value; }
    setOutdoors(value: boolean): void { this.isOutdoors = value; }
    setDaytime(value: boolean): void { this.isDaytime = value; }
    setTemperature(value: number): void { this.temperature = value; }
    onJump(): void { this.justJumped = true; }

    // === ACTIONS ===
    consumeEPForCraft(): boolean {
        if (this.ep >= EP_COST_CRAFT) {
            this.ep = this.clamp(this.ep - EP_COST_CRAFT, 0, this.maxEp);
            return true;
        }
        return false;
    }

    consumeEPForBreak(toolUsed: boolean): boolean {
        const cost = toolUsed ? EP_COST_BREAK_TOOL : EP_COST_BREAK_BARE_HAND;
        if (this.ep >= cost) {
            this.ep = this.clamp(this.ep - cost, 0, this.maxEp);
            return true;
        }
        return false;
    }

    consumeEPForMine(): boolean {
        if (this.ep >= EP_COST_MINE) {
            this.ep = this.clamp(this.ep - EP_COST_MINE, 0, this.maxEp);
            return true;
        }
        return false;
    }

    consumeEPSprint(dt: number): void {
        this.ep = this.clamp(this.ep - EP_COST_SPRINT * dt, 0, this.maxEp);
    }

    consumeEPJump(): void {
        this.ep = this.clamp(this.ep - EP_COST_JUMP, 0, this.maxEp);
    }

    consumeEPSwim(dt: number): void {
        this.ep = this.clamp(this.ep - EP_COST_SWIM * dt, 0, this.maxEp);
    }

    // === FOOD ===
    eatFood(itemType: ItemType): boolean {
        const food = FOOD_MAP.get(itemType);
        if (!food) return false;

        this.hunger = this.clamp(this.hunger + food.hungerRestore, 0, this.maxHunger);
        this.hp = this.clamp(this.hp + food.hpRestore, 0, this.maxHp);
        this.ep = this.clamp(this.ep + food.epRestore, 0, this.maxEp);

        // Calculate saturation restore: hungerRestore * modifier * 2
        let modifier = 0.6; // default for apple
        if (itemType === ItemType.BAKED_APPLE) {
            modifier = 1.2;
        }
        const satGain = food.hungerRestore * modifier * 2.0;
        this.saturation = this.clamp(this.saturation + satGain, 0, this.hunger); // Clamped by current hunger

        return true;
    }

    // === DAMAGE ===
    takeDamage(amount: number): void {
        this.hp = this.clamp(this.hp - amount, 0, this.maxHp);
    }

    takeFallDamage(fallDistance: number): void {
        if (fallDistance > 3) {
            const damage = (fallDistance - 3) * 5;
            this.takeDamage(damage);
        }
    }

    // === HEAL ===
    heal(amount: number): void {
        this.hp = this.clamp(this.hp + amount, 0, this.maxHp);
    }

    fullHeal(): void {
        this.hp = this.maxHp;
        this.ep = this.maxEp;
        this.hunger = this.maxHunger;
    }

    isDead(): boolean {
        return this.hp <= 0;
    }

    getState(): PlayerStatsData {
        return {
            hp: this.hp,
            maxHp: this.maxHp,
            ep: this.ep,
            maxEp: this.maxEp,
            hunger: this.hunger,
            maxHunger: this.maxHunger,
            saturation: this.saturation
        };
    }

    setState(data: PlayerStatsData): void {
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.ep = data.ep;
        this.maxEp = data.maxEp;
        this.hunger = data.hunger;
        this.maxHunger = data.maxHunger;
        this.saturation = data.saturation !== undefined ? data.saturation : 50.0;
    }
}