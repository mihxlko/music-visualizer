/**
 * Audio Analyzer Module
 * Handles Web Audio API setup and frequency analysis
 */

class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioElement = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.isInitialized = false;

        // Frequency range definitions (in Hz)
        // Maps to FFT bin indices based on sample rate and FFT size
        this.frequencyRanges = {
            bass: { min: 20, max: 150 },
            lowerMid: { min: 150, max: 500 },
            mid: { min: 500, max: 1000 },
            upperMid: { min: 1000, max: 4000 },
            treble: { min: 4000, max: 20000 }
        };

        // Current amplitude values (0-1 normalized)
        this.amplitudes = {
            bass: 0,
            lowerMid: 0,
            mid: 0,
            upperMid: 0,
            treble: 0
        };
    }

    /**
     * Initialize the audio context (must be called after user interaction)
     */
    async init() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            this.isInitialized = true;
            console.log('Audio Analyzer initialized');
            console.log(`FFT Size: ${this.analyser.fftSize}, Buffer Length: ${this.bufferLength}`);
            console.log(`Sample Rate: ${this.audioContext.sampleRate}Hz`);
        } catch (error) {
            console.error('Failed to initialize AudioContext:', error);
            throw error;
        }
    }

    /**
     * Connect an audio element to the analyzer
     * @param {HTMLAudioElement} audioElement
     */
    connectAudio(audioElement) {
        if (!this.isInitialized) {
            console.error('AudioAnalyzer not initialized. Call init() first.');
            return;
        }

        // Disconnect previous source if exists
        if (this.source) {
            this.source.disconnect();
        }

        this.audioElement = audioElement;

        // Create media element source
        this.source = this.audioContext.createMediaElementSource(audioElement);

        // Connect: source -> analyser -> destination (speakers)
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        console.log('Audio connected to analyzer');
    }

    /**
     * Resume audio context (required after user interaction in some browsers)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Convert frequency (Hz) to FFT bin index
     * @param {number} frequency - Frequency in Hz
     * @returns {number} - Bin index
     */
    frequencyToBin(frequency) {
        const nyquist = this.audioContext.sampleRate / 2;
        const binWidth = nyquist / this.bufferLength;
        return Math.floor(frequency / binWidth);
    }

    /**
     * Get the average amplitude for a frequency range
     * @param {number} minFreq - Minimum frequency in Hz
     * @param {number} maxFreq - Maximum frequency in Hz
     * @returns {number} - Normalized amplitude (0-1)
     */
    getAverageAmplitude(minFreq, maxFreq) {
        const minBin = this.frequencyToBin(minFreq);
        const maxBin = Math.min(this.frequencyToBin(maxFreq), this.bufferLength - 1);

        if (minBin >= maxBin) return 0;

        let sum = 0;
        let count = 0;

        for (let i = minBin; i <= maxBin; i++) {
            sum += this.dataArray[i];
            count++;
        }

        // Normalize to 0-1 (dataArray values are 0-255)
        return count > 0 ? (sum / count) / 255 : 0;
    }

    /**
     * Analyze current audio and update amplitude values
     * Call this in the animation loop
     */
    analyze() {
        if (!this.analyser || !this.dataArray) return;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calculate amplitude for each frequency range
        for (const [range, freqs] of Object.entries(this.frequencyRanges)) {
            this.amplitudes[range] = this.getAverageAmplitude(freqs.min, freqs.max);
        }

        return this.amplitudes;
    }

    /**
     * Get current amplitude values
     * @returns {Object} - Amplitude values for each frequency range
     */
    getAmplitudes() {
        return { ...this.amplitudes };
    }

    /**
     * Get raw frequency data array
     * @returns {Uint8Array} - Raw frequency data
     */
    getRawData() {
        return this.dataArray;
    }

    /**
     * Cleanup and disconnect
     */
    destroy() {
        if (this.source) {
            this.source.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isInitialized = false;
    }
}

// Export as global
window.AudioAnalyzer = AudioAnalyzer;
