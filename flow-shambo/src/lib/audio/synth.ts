/**
 * Simple synthesizer for game sound effects using Web Audio API
 */

class SoundSynthesizer {
    private context: AudioContext | null = null;
    private isMuted: boolean = false;

    constructor() {
        if (typeof window !== 'undefined') {
            // Initialize AudioContext only on user interaction if needed, 
            // but simpler to just create it lazily
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    this.context = new AudioContextClass();
                }
            } catch (e) {
                console.error('Web Audio API not supported', e);
            }
        }
    }

    /**
     * Resume AudioContext (browsers require user interaction first)
     */
    public async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * Play a high-pitched "clink" sound for collisions
     */
    public playClink(volume: number = 0.1) {
        if (this.isMuted || !this.context) return;

        // Check if context is suspended (browsers auto-suspend)
        if (this.context.state === 'suspended') {
            this.context.resume().catch(() => { });
            return;
        }

        const t = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // High pitched sine wave for "glass/metal" clink
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

        // Envelope: Sharp attack, quick decay
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.context.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
    }
}

// Singleton instance
export const audioSynth = new SoundSynthesizer();
