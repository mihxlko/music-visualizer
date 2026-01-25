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
     * Draw a radial gradient circle
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {string} color - Hex color
     * @param {number} opacity - Opacity (0-1)
     */
    drawGradientCircle(x, y, radius, color, opacity) {
        const rgb = this.hexToRgb(color);

        // Create radial gradient
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

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

        // Draw background color
        this.ctx.fillStyle = this.colors.background;
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
        this.ctx.globalCompositeOperation = 'screen';

        // Draw circles for each frequency range
        const ranges = ['bass', 'lowerMid', 'mid', 'upperMid', 'treble'];

        for (const range of ranges) {
            const amplitude = amplitudes[range] || 0;
            const pos = this.circlePositions[range];
            const color = this.colors[range];

            // Calculate radius based on amplitude
            const radius = this.minRadius + (this.maxRadius - this.minRadius) * amplitude;

            // Calculate opacity based on amplitude
            const opacity = this.minOpacity + (this.maxOpacity - this.minOpacity) * amplitude;

            // Draw the gradient circle
            this.drawGradientCircle(pos.x, pos.y, radius, color, opacity);
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
