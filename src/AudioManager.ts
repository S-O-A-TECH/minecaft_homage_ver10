import { CONFIG } from './constants';

export class AudioManager {
    private static instance: AudioManager | null = null;
    private ctx: AudioContext | null = null;
    private noiseBuffer: AudioBuffer | null = null;

    private masterVolume: number = 0.8;
    private soundEnabled: boolean = true;

    private constructor() {
        // Load initial sound settings from localStorage
        const savedEnabled = localStorage.getItem('minecaft_homage_setting_sound_enabled');
        if (savedEnabled !== null) {
            this.soundEnabled = savedEnabled === 'true';
        }
        
        const savedVolume = localStorage.getItem('minecaft_homage_setting_volume_level');
        if (savedVolume !== null) {
            this.masterVolume = parseInt(savedVolume) / 100;
        }
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    private init(): void {
        if (this.ctx) return;
        
        try {
            // @ts-ignore
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.createNoiseBuffer();
        } catch (e) {
            console.error('Failed to initialize AudioContext:', e);
        }
    }

    private ensureContext(): boolean {
        this.init();
        if (!this.ctx) return false;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return true;
    }

    public setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    public getMasterVolume(): number {
        return this.masterVolume;
    }

    public setSoundEnabled(enabled: boolean): void {
        this.soundEnabled = enabled;
    }

    public getSoundEnabled(): boolean {
        return this.soundEnabled;
    }

    private createNoiseBuffer(): void {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    /**
     * Helper to play a clean bandpass noise transient with strict garbage collection.
     */
    private playNoiseBurst(
        frequency: number,
        Q: number,
        attack: number,
        decay: number,
        volume: number
    ): void {
        if (!this.soundEnabled || !this.ensureContext() || !this.ctx || !this.noiseBuffer) return;

        const effectiveVol = volume * this.masterVolume;
        if (effectiveVol <= 0.0001) return;

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        filter.Q.setValueAtTime(Q, this.ctx.currentTime);

        const gainNode = this.ctx.createGain();
        const now = this.ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(effectiveVol, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        // Strict disconnection garbage collection on ended
        noiseNode.onended = () => {
            try {
                noiseNode.disconnect();
                filter.disconnect();
                gainNode.disconnect();
            } catch (err) {}
        };

        noiseNode.start(now);
        noiseNode.stop(now + attack + decay + 0.1);
    }

    public playFootstep(material: string, volumeScale: number = 1.0): void {
        if (!this.soundEnabled || !this.ensureContext() || !this.ctx) return;

        const now = this.ctx.currentTime;
        const vol = 0.28 * volumeScale * this.masterVolume;
        if (vol <= 0.0001) return;

        if (material === 'grass' || material === 'dirt') {
            // Layer 1: Triangle thump (75Hz) representing foot impact
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(75, now);
            
            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(vol * 0.9, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);

            osc.onended = () => {
                try {
                    osc.disconnect();
                    oscGain.disconnect();
                } catch (err) {}
            };

            osc.start(now);
            osc.stop(now + 0.1);

            // Layer 2: Softer bandpassed noise (260Hz) for rustle
            this.playNoiseBurst(260, 1.5, 0.005, 0.07, volumeScale * 0.18);

        } else if (material === 'stone' || material === 'ore') {
            // Layer 1: Quick dual-sine clack
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(180, now);

            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(650, now);

            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(vol * 0.7, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

            osc1.connect(oscGain);
            osc2.connect(oscGain);
            oscGain.connect(this.ctx.destination);

            const cleanup = () => {
                try {
                    osc1.disconnect();
                    osc2.disconnect();
                    oscGain.disconnect();
                } catch (err) {}
            };
            osc1.onended = cleanup;

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.05);
            osc2.stop(now + 0.05);

            // Layer 2: Fast noise high-frequency click
            this.playNoiseBurst(2000, 3.0, 0.002, 0.015, volumeScale * 0.15);

        } else if (material === 'wood' || material === 'planks') {
            // Layer 1: Wood hollow thump (Triangle 90Hz)
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(90, now);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(220, now);

            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(vol * 1.1, now);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

            osc.connect(filter);
            filter.connect(oscGain);
            oscGain.connect(this.ctx.destination);

            osc.onended = () => {
                try {
                    osc.disconnect();
                    filter.disconnect();
                    oscGain.disconnect();
                } catch (err) {}
            };

            osc.start(now);
            osc.stop(now + 0.15);

            // Layer 2: Low-frequency noise tap
            this.playNoiseBurst(180, 2.0, 0.01, 0.04, volumeScale * 0.12);

        } else if (material === 'sand' || material === 'gravel') {
            // High-frequency crunch sweeps
            this.playNoiseBurst(1200, 0.7, 0.01, 0.12, volumeScale * 0.28);
            this.playNoiseBurst(380, 1.2, 0.02, 0.08, volumeScale * 0.15);
        }
    }

    public playBlockBreak(material: string): void {
        if (!this.soundEnabled || !this.ensureContext() || !this.ctx) return;

        const now = this.ctx.currentTime;
        const vol = 0.49 * this.masterVolume; // Reduced by 10% (0.55 -> 0.49)
        if (vol <= 0.0001) return;

        // Layer 1: Structural cracking rumble (sweeping down)
        const rumble = this.ctx.createOscillator();
        rumble.type = 'triangle';
        rumble.frequency.setValueAtTime(170, now);
        rumble.frequency.exponentialRampToValueAtTime(35, now + 0.16);

        const rumbleGain = this.ctx.createGain();
        rumbleGain.gain.setValueAtTime(vol * 0.8, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        rumble.connect(rumbleGain);
        rumbleGain.connect(this.ctx.destination);

        rumble.onended = () => {
            try {
                rumble.disconnect();
                rumbleGain.disconnect();
            } catch (err) {}
        };

        rumble.start(now);
        rumble.stop(now + 0.18);

        // Layer 2: Material cracking noise bursts (All volume scales reduced by 10%)
        if (material === 'grass' || material === 'dirt') {
            this.playNoiseBurst(280, 1.0, 0.005, 0.15, 0.40);
        } else if (material === 'stone' || material === 'ore') {
            this.playNoiseBurst(750, 2.2, 0.002, 0.13, 0.58);
        } else if (material === 'wood' || material === 'planks') {
            this.playNoiseBurst(160, 1.2, 0.008, 0.20, 0.49);
        } else if (material === 'sand' || material === 'gravel') {
            this.playNoiseBurst(1100, 0.5, 0.015, 0.22, 0.36);
        } else {
            this.playNoiseBurst(450, 1.0, 0.005, 0.15, 0.40);
        }
    }

    public playBlockPlace(material: string): void {
        if (!this.soundEnabled || !this.ensureContext() || !this.ctx) return;

        const now = this.ctx.currentTime;
        const vol = 0.45 * this.masterVolume;
        if (vol <= 0.0001) return;

        // Layer 1: Bassy thump (130Hz -> 55Hz)
        const thump = this.ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(130, now);
        thump.frequency.exponentialRampToValueAtTime(55, now + 0.09);

        const thumpGain = this.ctx.createGain();
        thumpGain.gain.setValueAtTime(vol * 0.9, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        thump.connect(thumpGain);
        thumpGain.connect(this.ctx.destination);

        thump.onended = () => {
            try {
                thump.disconnect();
                thumpGain.disconnect();
            } catch (err) {}
        };

        thump.start(now);
        thump.stop(now + 0.10);

        // Layer 2: Micro tactile click (triangle at 900Hz)
        const click = this.ctx.createOscillator();
        click.type = 'triangle';
        click.frequency.setValueAtTime(900, now);
        
        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(vol * 0.25, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

        click.connect(clickGain);
        clickGain.connect(this.ctx.destination);

        click.onended = () => {
            try {
                click.disconnect();
                clickGain.disconnect();
            } catch (err) {}
        };

        click.start(now);
        click.stop(now + 0.02);

        // Layer 3: Material landing noise
        if (material === 'grass' || material === 'dirt') {
            this.playNoiseBurst(160, 1.8, 0.01, 0.08, 0.25);
        } else if (material === 'stone' || material === 'ore') {
            this.playNoiseBurst(380, 2.5, 0.005, 0.06, 0.30);
        } else if (material === 'wood' || material === 'planks') {
            this.playNoiseBurst(120, 1.5, 0.012, 0.10, 0.28);
        } else if (material === 'sand' || material === 'gravel') {
            this.playNoiseBurst(800, 0.8, 0.02, 0.12, 0.22);
        } else {
            this.playNoiseBurst(240, 1.5, 0.01, 0.08, 0.25);
        }
    }

    public playPickup(): void {
        if (!this.soundEnabled || !this.ensureContext() || !this.ctx) return;

        const now = this.ctx.currentTime;
        const vol = 0.26 * this.masterVolume;
        if (vol <= 0.0001) return;

        // Ultra-clear double bubble pop!
        // Sweep 1
        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(650, now);
        osc1.frequency.exponentialRampToValueAtTime(1550, now + 0.07);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(vol, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);

        osc1.onended = () => {
            try {
                osc1.disconnect();
                gain1.disconnect();
            } catch (err) {}
        };

        osc1.start(now);
        osc1.stop(now + 0.08);

        // Sweep 2 (harmonic delay)
        const delay = 0.035;
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1100, now + delay);
        osc2.frequency.exponentialRampToValueAtTime(2500, now + delay + 0.05);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(vol * 0.7, now + delay);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.05);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc2.onended = () => {
            try {
                osc2.disconnect();
                gain2.disconnect();
            } catch (err) {}
        };

        osc2.start(now + delay);
        osc2.stop(now + delay + 0.06);
    }
}
