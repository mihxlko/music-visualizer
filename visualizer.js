/**
 * Visualizer Module
 * Handles Canvas rendering and animation for the music visualization
 */

class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.animationId = null;

        // Circle positions for each frequency range
        this.circlePositions = {
            bass: { x: 0, y: 0 },
            lowerMid: { x: 0, y: 0 },
            mid: { x: 0, y: 0 },
            upperMid: { x: 0, y: 0 },
            treble: { x: 0, y: 0 }
        };

        // Colors for each element
        this.colors = {
            background: '#1a1a2e',
            bass: '#e94560',
            lowerMid: '#ff6b6b',
            mid: '#feca57',
            upperMid: '#48dbfb',
            treble: '#ff9ff3'
        };

        // Visualization settings
        this.minRadius = 50;        // Minimum circle radius when silent
        this.maxRadius = 500;       // Maximum circle radius at peak
        this.minOpacity = 0.03;     // 3% opacity when inactive
        this.maxOpacity = 0.7;      // Max opacity at peak

        // Reference to audio analyzer
        this.audioAnalyzer = null;

        // Initialize canvas size
        this.resizeCanvas();
        this.generateRandomPositions();

        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to fill window
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Regenerate positions if canvas was resized significantly
        // (positions should stay within bounds)
        this.clampPositions();
    }

    /**
     * Ensure all circle positions are within canvas bounds
     */
    clampPositions() {
        const padding = 100;
        for (const range of Object.keys(this.circlePositions)) {
            const pos = this.circlePositions[range];
            pos.x = Math.max(padding, Math.min(this.canvas.width - padding, pos.x));
            pos.y = Math.max(padding, Math.min(this.canvas.height - padding, pos.y));
        }
    }

    /**
     * Generate random positions for all circles
     */
    generateRandomPositions() {
        const padding = 150;
        const ranges = ['bass', 'lowerMid', 'mid', 'upperMid', 'treble'];

        for (const range of ranges) {
            this.circlePositions[range] = {
                x: padding + Math.random() * (this.canvas.width - padding * 2),
                y: padding + Math.random() * (this.canvas.height - padding * 2)
            };
        }

        console.log('Generated new circle positions:', this.circlePositions);
    }

    /**
     * Set circle positions (for loading from localStorage)
     * @param {Array} positions - Array of {x, y} objects
     */
    setCirclePositions(positions) {
        const ranges = ['bass', 'lowerMid', 'mid', 'upperMid', 'treble'];
        positions.forEach((pos, index) => {
            if (ranges[index]) {
                this.circlePositions[ranges[index]] = { x: pos.x, y: pos.y };
            }
        });
        this.clampPositions();
    }

    /**
     * Get current circle positions (for saving to localStorage)
     * @returns {Array} - Array of {x, y} objects
     */
    getCirclePositions() {
        const ranges = ['bass', 'lowerMid', 'mid', 'upperMid', 'treble'];
        return ranges.map(range => ({
            x: this.circlePositions[range].x,
            y: this.circlePositions[range].y
        }));
    }

    /**
     * Set colors for visualization
     * @param {Object} colors - Color values for each range
     */
    setColors(colors) {
        this.colors = { ...this.colors, ...colors };
    }

    /**
     * Set a single color
     * @param {string} range - The range name (e.g., 'bass', 'background')
     * @param {string} color - Hex color value
     */
    setColor(range, color) {
        this.colors[range] = color;
    }

    /**
     * Connect to audio analyzer
     * @param {AudioAnalyzer} analyzer
     */
    connectAnalyzer(analyzer) {
        this.audioAnalyzer = analyzer;
    }

    /**
     * Convert hex color to RGB object
     * @param {string} hex - Hex color string
     * @returns {Object} - {r, g, b}
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Convert RGB to HSL
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {Object} - {h, s, l} where h is 0-360, s and l are 0-100
     */
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    /**
     * Convert HSL to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-100)
     * @param {number} l - Lightness (0-100)
     * @returns {Object} - {r, g, b}
     */
    hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
    }

    /**
     * Get the lightness of the background color (0-100)
     * @returns {number}
     */
    getBackgroundLightness() {
        const rgb = this.hexToRgb(this.colors.background);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        return hsl.l;
    }

    /**
     * Boost a color's saturation and optionally darken it for light backgrounds
     * @param {string} hexColor - Original hex color
     * @param {number} saturationMultiplier - How much to multiply saturation
     * @param {boolean} darken - Whether to darken the color
     * @returns {Object} - Boosted RGB color {r, g, b}
     */
    boostColorForLightBg(hexColor, saturationMultiplier, darken) {
        const rgb = this.hexToRgb(hexColor);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Boost saturation aggressively (cap at 100)
        hsl.s = Math.min(100, hsl.s * saturationMultiplier);

        // Darken the color to increase contrast against light backgrounds
        if (darken) {
            hsl.l = Math.min(60, hsl.l * 0.7);
        }

        return this.hslToRgb(hsl.h, hsl.s, hsl.l);
    }

    /**
     * Draw a radial gradient circle
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {string} color - Hex color
     * @param {number} opacity - Opacity (0-1)
     * @param {boolean} lightBgMode - Whether to use light background adjustments
     */
    drawGradientCircle(x, y, radius, color, opacity, lightBgMode = false) {
        let rgb;

        if (lightBgMode) {
            // Boost saturation 3x and darken for maximum visibility
            rgb = this.boostColorForLightBg(color, 3, true);
            // Force full opacity at center for light backgrounds
            opacity = Math.max(opacity, 1.0);
        } else {
            rgb = this.hexToRgb(color);
        }

        // Create radial gradient
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);

        if (lightBgMode) {
            // More aggressive gradient for light backgrounds - solid center, slower falloff
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
            gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.8})`);
            gradient.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.4})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        } else {
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
            gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        }

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Render a single frame
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Check if background is light
        const bgLightness = this.getBackgroundLightness();
        const isLightBg = bgLightness > 50;

        // Draw background color at 75% opacity to let frequency colors show through
        const bgRgb = this.hexToRgb(this.colors.background);
        this.ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.75)`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Get amplitudes from analyzer
        let amplitudes = {
            bass: 0,
            lowerMid: 0,
            mid: 0,
            upperMid: 0,
            treble: 0
        };

        if (this.audioAnalyzer) {
            amplitudes = this.audioAnalyzer.analyze() || amplitudes;
        }

        // Set composite operation for color blending
        // Use 'multiply' for light backgrounds (darkens), 'screen' for dark backgrounds (lightens)
        this.ctx.globalCompositeOperation = isLightBg ? 'multiply' : 'screen';

        // Draw circles for each frequency range
        const ranges = ['bass', 'lowerMid', 'mid', 'upperMid', 'treble'];

        // Adjust settings for light backgrounds
        const effectiveMaxRadius = isLightBg ? this.maxRadius * 1.5 : this.maxRadius;
        const effectiveMinOpacity = isLightBg ? 0.15 : this.minOpacity;
        const effectiveMaxOpacity = isLightBg ? 1.0 : this.maxOpacity;

        for (const range of ranges) {
            const amplitude = amplitudes[range] || 0;
            const pos = this.circlePositions[range];
            const color = this.colors[range];

            // Calculate radius based on amplitude (larger for light backgrounds)
            const radius = this.minRadius + (effectiveMaxRadius - this.minRadius) * amplitude;

            // Calculate opacity based on amplitude (higher for light backgrounds)
            const opacity = effectiveMinOpacity + (effectiveMaxOpacity - effectiveMinOpacity) * amplitude;

            // Draw the gradient circle
            this.drawGradientCircle(pos.x, pos.y, radius, color, opacity, isLightBg);
        }

        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * Start the animation loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        const animate = () => {
            if (!this.isRunning) return;
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };

        animate();
        console.log('Visualizer started');
    }

    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('Visualizer stopped');
    }

    /**
     * Render a static frame (when not animating)
     */
    renderStatic() {
        this.render();
    }
}

// Export as global
window.Visualizer = Visualizer;
