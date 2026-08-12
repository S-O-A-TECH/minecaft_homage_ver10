import * as THREE from 'three';
import {
    DAY_DURATION,
    NIGHT_DURATION,
    SUNRISE_DURATION,
    SUNSET_DURATION,
    FULL_DAY,
} from './constants';

export enum TimeOfDay {
    DAY = 'day',
    NIGHT = 'night',
    SUNRISE = 'sunrise',
    SUNSET = 'sunset',
}

export class TimeSystem {
    public time: number = 0; // 0 to FULL_DAY
    public dayCount: number = 1;
    public timeOfDay: TimeOfDay = TimeOfDay.SUNRISE;

    private ambientLight: THREE.AmbientLight;
    private sunLight: THREE.DirectionalLight;
    private skyColor: THREE.Color;
    private fog: THREE.Fog;

    constructor(
        ambientLight: THREE.AmbientLight,
        sunLight: THREE.DirectionalLight,
        skyColor: THREE.Color,
        fog: THREE.Fog
    ) {
        this.ambientLight = ambientLight;
        this.sunLight = sunLight;
        this.skyColor = skyColor;
        this.fog = fog;
        // Start at sunrise
        this.time = 0;
    }

    update(deltaTime: number): void {
        const dt = Math.min(deltaTime, 0.1);
        this.time += dt;

        if (this.time >= FULL_DAY) {
            this.time -= FULL_DAY;
            this.dayCount++;
        }

        // Determine time of day
        if (this.time < SUNRISE_DURATION) {
            this.timeOfDay = TimeOfDay.SUNRISE;
        } else if (this.time < SUNRISE_DURATION + DAY_DURATION) {
            this.timeOfDay = TimeOfDay.DAY;
        } else if (this.time < SUNRISE_DURATION + DAY_DURATION + SUNSET_DURATION) {
            this.timeOfDay = TimeOfDay.SUNSET;
        } else {
            this.timeOfDay = TimeOfDay.NIGHT;
        }

        this.updateLighting();
    }

    private updateLighting(): void {
        const dayProgress = this.getDayProgress(); // 0 to 1 (0=midnight, 0.5=noon)

        // Sun angle: goes from east to west, highest at noon
        const sunAngle = dayProgress * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);

        // Ambient light: bright during day, dim at night
        const ambientIntensity = this.lerp(0.15, 0.7, Math.max(0, sunHeight));
        this.ambientLight.intensity = ambientIntensity;

        // Directional light (sun)
        const sunIntensity = this.lerp(0.0, 0.9, Math.max(0, sunHeight));
        this.sunLight.intensity = sunIntensity;

        // Sun position
        const radius = 200;
        this.sunLight.position.set(
            Math.cos(sunAngle) * radius,
            sunHeight * radius,
            50
        );

        // Sky color
        const skyR = this.lerp(0.05, 0.53, Math.max(0, sunHeight));
        const skyG = this.lerp(0.05, 0.81, Math.max(0, sunHeight));
        const skyB = this.lerp(0.15, 0.92, Math.max(0, sunHeight));
        this.skyColor.setRGB(skyR, skyG, skyB);

        // Fog
        this.fog.color.copy(this.skyColor);
    }

    getDayProgress(): number {
        // Returns 0 at midnight, 0.5 at noon, 1 at next midnight
        return this.time / FULL_DAY;
    }

    isDaytime(): boolean {
        return this.timeOfDay === TimeOfDay.DAY || this.timeOfDay === TimeOfDay.SUNRISE || this.timeOfDay === TimeOfDay.SUNSET;
    }

    isNighttime(): boolean {
        return this.timeOfDay === TimeOfDay.NIGHT;
    }

    getFormattedTime(): string {
        const totalMinutes = Math.floor((this.time / FULL_DAY) * 24 * 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    getState(): any {
        return {
            time: this.time,
            dayCount: this.dayCount
        };
    }

    setState(data: any): void {
        this.time = data.time || 0;
        this.dayCount = data.dayCount || 1;
        this.updateLighting();
    }
}