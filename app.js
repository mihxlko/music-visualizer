/**
 * Main Application Module
 * Handles state management, UI interactions, and coordinates all components
 */

class MusicVisualizerApp {
    constructor() {
        // Core components
        this.audioAnalyzer = null;
        this.visualizer = null;
        this.audio = null;

        // State
        this.state = {
            isPlaying: false,
            isMuted: false,
            volume: 100,
            currentSong: null,
            duration: 0,
            currentTime: 0
        };

        // DOM Elements
        this.elements = {
            audioUpload: document.getElementById('audio-upload'),
            playBtn: document.getElementById('play-btn'),
            stopBtn: document.getElementById('stop-btn'),
            progressBar: document.getElementById('progress-bar'),
            currentTime: document.getElementById('current-time'),
            totalTime: document.getElementById('total-time'),
            volumeSlider: document.getElementById('volume-slider'),
            muteBtn: document.getElementById('mute-btn'),
            volumeIcon: document.getElementById('volume-icon'),
            muteIcon: document.getElementById('mute-icon'),
            colorPickers: {
                background: document.getElementById('color-background')
            }
        };

        // Atmospheric Motion Fields controls
        this.controls = {
            // Motion controls
            attack: { slider: document.getElementById('slider-attack'), value: document.getElementById('value-attack'), color: document.getElementById('color-attack') },
            decay: { slider: document.getElementById('slider-decay'), value: document.getElementById('value-decay'), color: document.getElementById('color-decay') },
            inertia: { slider: document.getElementById('slider-inertia'), value: document.getElementById('value-inertia'), color: document.getElementById('color-inertia') },
            drift: { slider: document.getElementById('slider-drift'), value: document.getElementById('value-drift'), color: document.getElementById('color-drift') },
            // Form controls
            fieldScale: { slider: document.getElementById('slider-field-scale'), value: document.getElementById('value-field-scale'), color: document.getElementById('color-field-scale') },
            overlap: { slider: document.getElementById('slider-overlap'), value: document.getElementById('value-overlap'), color: document.getElementById('color-overlap') },
            anchor: { slider: document.getElementById('slider-anchor'), value: document.getElementById('value-anchor'), color: document.getElementById('color-anchor') },
            // Energy controls
            lowEmphasis: { slider: document.getElementById('slider-low-emphasis'), value: document.getElementById('value-low-emphasis'), color: document.getElementById('color-low-emphasis') },
            midEmphasis: { slider: document.getElementById('slider-mid-emphasis'), value: document.getElementById('value-mid-emphasis'), color: document.getElementById('color-mid-emphasis') },
            highEmphasis: { slider: document.getElementById('slider-high-emphasis'), value: document.getElementById('value-high-emphasis'), color: document.getElementById('color-high-emphasis') },
            compression: { slider: document.getElementById('slider-compression'), value: document.getElementById('value-compression'), color: document.getElementById('color-compression') }
        };

        // Store control values
        this.controlValues = {
            attack: 50,
            decay: 50,
            inertia: 50,
            drift: 50,
            fieldScale: 50,
            overlap: 50,
            anchor: 50,
            lowEmphasis: 50,
            midEmphasis: 50,
            highEmphasis: 50,
            compression: 50
        };

        // Store control colors
        this.controlColors = {
            attack: '#48dbfb',
            decay: '#feca57',
            inertia: '#ff6b6b',
            drift: '#ff9ff3',
            fieldScale: '#e94560',
            overlap: '#feca57',
            anchor: '#ff6b6b',
            lowEmphasis: '#e94560',
            midEmphasis: '#feca57',
            highEmphasis: '#ff9ff3',
            compression: '#48dbfb'
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Create audio element
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';

        // Initialize visualizer
        this.visualizer = new Visualizer('visualizer-canvas');

        // Set up event listeners
        this.setupEventListeners();

        // Load saved state from localStorage
        this.loadState();

        // Initialize visualizer with control parameters and colors
        this.updateVisualizerParams();
        this.updateVisualizerColors();

        // Start visualizer with static render
        this.visualizer.renderStatic();

        console.log('Music Visualizer App initialized');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Audio upload
        this.elements.audioUpload.addEventListener('change', (e) => this.handleFileUpload(e));

        // Playback controls
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        this.elements.stopBtn.addEventListener('click', () => this.stop());

        // Progress bar
        this.elements.progressBar.addEventListener('input', (e) => this.seek(e));

        // Volume controls
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.elements.muteBtn.addEventListener('click', () => this.toggleMute());

        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.onAudioLoaded());
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onAudioEnded());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());

        // Background color picker
        this.elements.colorPickers.background.addEventListener('input', (e) => this.setColor('background', e.target.value));

        // Atmospheric Motion Fields control event listeners
        for (const [name, control] of Object.entries(this.controls)) {
            // Slider input events
            control.slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.controlValues[name] = value;
                control.value.textContent = value;
                // Update visualizer in real-time
                this.updateVisualizerParams();
            });

            // Save state on slider change end
            control.slider.addEventListener('change', () => {
                this.saveState();
            });

            // Color swatch events
            control.color.addEventListener('input', (e) => {
                this.controlColors[name] = e.target.value;
                // Update visualizer colors in real-time
                this.updateVisualizerColors();
                this.saveState();
            });
        }
    }

    /**
     * Update visualizer with current control parameter values
     */
    updateVisualizerParams() {
        if (!this.visualizer) return;
        this.visualizer.setControlParams(this.controlValues);
    }

    /**
     * Update visualizer with current control colors
     */
    updateVisualizerColors() {
        if (!this.visualizer) return;
        this.visualizer.setControlColors(this.controlColors);
    }

    /**
     * Handle file upload
     * @param {Event} e
     */
    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.type.match('audio.*')) {
            alert('Please upload an audio file (MP3 or M4A)');
            return;
        }

        console.log('Loading file:', file.name);

        // Stop current playback
        this.stop();

        // Create object URL for the file
        const url = URL.createObjectURL(file);
        this.audio.src = url;

        // Update state
        this.state.currentSong = file.name;

        // Initialize audio analyzer if not already done
        if (!this.audioAnalyzer) {
            this.audioAnalyzer = new AudioAnalyzer();
            await this.audioAnalyzer.init();
            this.audioAnalyzer.connectAudio(this.audio);
            this.visualizer.connectAnalyzer(this.audioAnalyzer);
        }

        // Check for saved colors/positions for this song
        const savedData = this.getSongData(file.name);
        if (savedData) {
            // Load saved colors
            this.loadColors(savedData);
            // Load saved positions
            if (savedData.circlePositions) {
                this.visualizer.setCirclePositions(savedData.circlePositions);
            }
        } else {
            // Generate new harmonious colors
            this.generateHarmoniousColors();
            // Generate new random positions
            this.visualizer.generateRandomPositions();
        }

        // Enable controls
        this.elements.playBtn.disabled = false;
        this.elements.stopBtn.disabled = false;
        this.elements.progressBar.disabled = false;

        // Save state
        this.saveState();

        console.log('Audio file loaded:', file.name);
    }

    /**
     * Generate harmonious colors using HSL
     */
    generateHarmoniousColors() {
        // Generate a random base hue
        const baseHue = Math.random() * 360;

        // Generate background color
        const backgroundColor = this.hslToHex((baseHue + 180) % 360, 30, 15);
        this.elements.colorPickers.background.value = backgroundColor;
        this.visualizer.setColor('background', backgroundColor);

        // Generate harmonious colors for controls
        const controlColorMap = {
            attack: this.hslToHex((baseHue + 180) % 360, 70, 60),      // Upper-Mid equivalent
            decay: this.hslToHex((baseHue + 60) % 360, 85, 60),        // Mid equivalent
            inertia: this.hslToHex((baseHue + 30) % 360, 75, 55),      // Lower-Mid equivalent
            drift: this.hslToHex((baseHue + 270) % 360, 75, 65),       // Treble equivalent
            fieldScale: this.hslToHex(baseHue, 80, 50),                // Bass equivalent
            overlap: this.hslToHex((baseHue + 60) % 360, 85, 60),      // Mid equivalent
            anchor: this.hslToHex((baseHue + 30) % 360, 75, 55),       // Lower-Mid equivalent
            lowEmphasis: this.hslToHex(baseHue, 80, 50),               // Bass equivalent
            midEmphasis: this.hslToHex((baseHue + 60) % 360, 85, 60),  // Mid equivalent
            highEmphasis: this.hslToHex((baseHue + 270) % 360, 75, 65),// Treble equivalent
            compression: this.hslToHex((baseHue + 180) % 360, 70, 60)  // Upper-Mid equivalent
        };

        // Apply colors to control swatches
        for (const [name, color] of Object.entries(controlColorMap)) {
            this.controlColors[name] = color;
            this.controls[name].color.value = color;
        }

        // Sync visualizer with new colors
        this.updateVisualizerColors();

        console.log('Generated harmonious colors');
    }

    /**
     * Convert HSL to Hex color
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {string} - Hex color
     */
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0, g = 0, b = 0;

        if (0 <= h && h < 60) {
            r = c; g = x; b = 0;
        } else if (60 <= h && h < 120) {
            r = x; g = c; b = 0;
        } else if (120 <= h && h < 180) {
            r = 0; g = c; b = x;
        } else if (180 <= h && h < 240) {
            r = 0; g = x; b = c;
        } else if (240 <= h && h < 300) {
            r = x; g = 0; b = c;
        } else if (300 <= h && h < 360) {
            r = c; g = 0; b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Toggle play/pause
     */
    async togglePlay() {
        if (!this.audio.src) return;

        // Resume audio context if suspended
        if (this.audioAnalyzer) {
            await this.audioAnalyzer.resume();
        }

        if (this.state.isPlaying) {
            this.audio.pause();
        } else {
            await this.audio.play();
        }
    }

    /**
     * Stop playback
     */
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.state.isPlaying = false;
        this.updatePlayButton();
        this.visualizer.stop();
        this.visualizer.renderStatic();
    }

    /**
     * Seek to position
     * @param {Event} e
     */
    seek(e) {
        if (!this.audio.duration) return;
        const time = (e.target.value / 100) * this.audio.duration;
        this.audio.currentTime = time;
    }

    /**
     * Set volume
     * @param {number} value - Volume 0-100
     */
    setVolume(value) {
        this.state.volume = value;
        this.audio.volume = value / 100;

        // Update mute state if volume is changed
        if (value > 0 && this.state.isMuted) {
            this.state.isMuted = false;
            this.updateMuteButton();
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.state.isMuted = !this.state.isMuted;
        this.audio.muted = this.state.isMuted;
        this.updateMuteButton();
    }

    /**
     * Set color for a frequency range
     * @param {string} range
     * @param {string} color
     */
    setColor(range, color) {
        this.visualizer.setColor(range, color);
        this.saveState();
    }

    /**
     * Load colors from saved data
     * @param {Object} data
     */
    loadColors(data) {
        // Load background color
        if (data.baseBackground) {
            this.elements.colorPickers.background.value = data.baseBackground;
            this.visualizer.setColor('background', data.baseBackground);
        }

        // Load control values if saved
        if (data.controlValues) {
            for (const [name, value] of Object.entries(data.controlValues)) {
                if (this.controls[name]) {
                    this.controlValues[name] = value;
                    this.controls[name].slider.value = value;
                    this.controls[name].value.textContent = value;
                }
            }
        }

        // Load control colors if saved
        if (data.controlColors) {
            for (const [name, color] of Object.entries(data.controlColors)) {
                if (this.controls[name]) {
                    this.controlColors[name] = color;
                    this.controls[name].color.value = color;
                }
            }
        }

        // Sync visualizer with loaded values
        this.updateVisualizerParams();
        this.updateVisualizerColors();
    }

    /**
     * Update play button appearance
     */
    updatePlayButton() {
        if (this.state.isPlaying) {
            this.elements.playBtn.classList.add('playing');
            this.elements.playBtn.title = 'Pause';
        } else {
            this.elements.playBtn.classList.remove('playing');
            this.elements.playBtn.title = 'Play';
        }
    }

    /**
     * Update mute button appearance
     */
    updateMuteButton() {
        if (this.state.isMuted) {
            this.elements.volumeIcon.classList.add('hidden');
            this.elements.muteIcon.classList.remove('hidden');
        } else {
            this.elements.volumeIcon.classList.remove('hidden');
            this.elements.muteIcon.classList.add('hidden');
        }
    }

    /**
     * Format time in MM:SS
     * @param {number} seconds
     * @returns {string}
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Audio event handlers
    onAudioLoaded() {
        this.state.duration = this.audio.duration;
        this.elements.totalTime.textContent = this.formatTime(this.audio.duration);
        console.log('Audio loaded, duration:', this.formatTime(this.audio.duration));
    }

    onTimeUpdate() {
        this.state.currentTime = this.audio.currentTime;
        this.elements.currentTime.textContent = this.formatTime(this.audio.currentTime);

        // Update progress bar
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.elements.progressBar.value = progress;
        }
    }

    onPlay() {
        this.state.isPlaying = true;
        this.updatePlayButton();
        this.visualizer.start();
    }

    onPause() {
        this.state.isPlaying = false;
        this.updatePlayButton();
    }

    onAudioEnded() {
        this.state.isPlaying = false;
        this.updatePlayButton();
        this.visualizer.stop();
        this.visualizer.renderStatic();
    }

    // State persistence
    getSongData(songName) {
        try {
            const data = localStorage.getItem('musicVisualizerData');
            if (!data) return null;
            const parsed = JSON.parse(data);
            return parsed.songs?.[songName] || null;
        } catch (e) {
            console.error('Error loading song data:', e);
            return null;
        }
    }

    saveState() {
        if (!this.state.currentSong) return;

        try {
            const existingData = JSON.parse(localStorage.getItem('musicVisualizerData') || '{}');

            const songData = {
                baseBackground: this.elements.colorPickers.background.value,
                controlValues: { ...this.controlValues },
                controlColors: { ...this.controlColors },
                circlePositions: this.visualizer.getCirclePositions()
            };

            const data = {
                currentSong: this.state.currentSong,
                songs: {
                    ...existingData.songs,
                    [this.state.currentSong]: songData
                }
            };

            localStorage.setItem('musicVisualizerData', JSON.stringify(data));
            console.log('State saved to localStorage');
        } catch (e) {
            console.error('Error saving state:', e);
        }
    }

    loadState() {
        try {
            const data = JSON.parse(localStorage.getItem('musicVisualizerData') || '{}');

            // Apply background color to visualizer
            this.visualizer.setColor('background', this.elements.colorPickers.background.value);

            console.log('State loaded from localStorage');
        } catch (e) {
            console.error('Error loading state:', e);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicVisualizerApp();
});
