import { AudioData } from '../types';

class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isListening: boolean = false;
  
  // UI Sound Settings
  private uiMuted: boolean = false;

  // Sound FX context
  private sfxGain: GainNode | null = null;

  public async initialize(): Promise<void> {
    if (this.audioContext) {
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (e) {
                console.warn("Could not resume AudioContext:", e);
            }
        }
        return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.connect(this.audioContext.destination);
      } else {
        console.warn("AudioContext is not supported in this browser.");
      }
    } catch (e) {
      console.error("Failed to initialize AudioContext:", e);
    }
  }

  public async startMicrophone(): Promise<void> {
    await this.initialize();
    if (this.isListening) return;

    try {
      if (!this.audioContext) {
          throw new Error("AudioContext not available");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      this.analyser = this.audioContext.createAnalyser();
      // Balanced smoothing: Fast enough for "instant stop", smooth enough to prevent jitter
      this.analyser.smoothingTimeConstant = 0.6; 
      this.analyser.fftSize = 2048; // Higher res for better isolation
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.isListening = true;
    } catch (e) {
      console.error("Microphone access denied or failed", e);
      this.stopMicrophone();
      throw e;
    }
  }

  public stopMicrophone(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) { /* ignore */ }
      this.source = null;
    }
    this.isListening = false;
  }

  public getAudioData(): AudioData {
    if (!this.isListening || !this.analyser || !this.dataArray) {
      return { bass: 0, mid: 0, high: 0, vol: 0 };
    }

    try {
        this.analyser.getByteFrequencyData(this.dataArray);

        // Sub-bass heavy focus
        const bassRange = this.dataArray.slice(1, 8); 
        const midRange = this.dataArray.slice(12, 60);
        const highRange = this.dataArray.slice(61, 255);

        const getAvg = (arr: Uint8Array) => {
            if (arr.length === 0) return 0;
            let sum = 0;
            for(let i=0; i<arr.length; i++) sum += arr[i];
            return sum / arr.length;
        };

        let rawBass = getAvg(bassRange) / 255;
        let rawMid = getAvg(midRange) / 255;
        let rawHigh = getAvg(highRange) / 255;
        let rawVol = getAvg(this.dataArray) / 255;

        // --- NEW GAIN STAGING ---
        // Soft Noise Gate:
        // Input < 0.1: Squashed to near zero (Background hiss removal)
        // Input > 0.1: Boosted linearly
        
        const gate = (val: number, threshold: number, boost: number) => {
            if (val < threshold) return val * 0.1; // Suppress noise
            return Math.min(1.0, (val - threshold) * boost + threshold);
        };

        // Tuning - Lowered threshold to 0.08 to easily hit the '30' visual floor
        const bass = gate(rawBass, 0.08, 2.5); 
        const mid = gate(rawMid, 0.08, 2.0);    
        const high = gate(rawHigh, 0.2, 1.5); 

        return { bass, mid, high, vol: rawVol };

    } catch (e) {
        return { bass: 0, mid: 0, high: 0, vol: 0 };
    }
  }

  public toggleMute(): boolean {
      this.uiMuted = !this.uiMuted;
      return this.uiMuted;
  }
  
  public isMuted(): boolean {
      return this.uiMuted;
  }

  public playClick(type: 'thock' | 'tick' | 'snap' = 'tick'): void {
    if (this.uiMuted) return;

    this.initialize().then(() => {
        if (!this.audioContext) return;

        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            const now = this.audioContext.currentTime;

            if (type === 'thock') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'snap') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else {
                // tick
                osc.type = 'sine';
                osc.frequency.setValueAtTime(2000, now);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
            }
        } catch (e) {
            console.warn("Audio play failed", e);
        }
    });
  }
}

export const audioService = new AudioService();