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

        // Offscreen canvas for circles (used for grain effect)
        this.circleCanvas = document.createElement('canvas');
        this.circleCtx = this.circleCanvas.getContext('2d');

        // Drift offsets for organic movement (applied on top of X/Y positions)
        this.driftOffsets = {
            low: { x: 0, y: 0 },
            mid: { x: 0, y: 0 },
            high: { x: 0, y: 0 }
        };

        // Drift velocities for brownian motion
        this.driftVelocities = {
            low: { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 },
            mid: { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 },
            high: { x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 }
        };

        // Load grain texture image
        this.grainImage = new Image();
        this.grainImage.src = 'assets/grain.jpg';
        this.grainImageLoaded = false;
        this.grainImage.onload = () => {
            this.grainImageLoaded = true;
        };

        // Smoothed amplitudes for each emphasis band
        this.smoothedAmplitudes = {
            low: 0,
            mid: 0,
            high: 0
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

        // Atmospheric Motion Fields control parameters (0-100)
        this.controlParams = {
            // Motion
            attack: 0,
            decay: 0,
            inertia: 0,
            drift: 0,
            // Form
            fieldScale: 0,
            overlap: 0,
            anchor: 0,
            // Energy
            lowEmphasis: 50,
            midEmphasis: 50,
            highEmphasis: 50,
            compression: 0,
            // Grain
            grain: 0
        };

        // Control colors (used for rendering frequency emphasis tints)
        this.controlColors = {
            lowEmphasis: '#e94560',
            midEmphasis: '#feca57',
            highEmphasis: '#ff9ff3'
        };

        // Emphasis positions (X = distance from center, Y = vertical position)
        // X: 0 = circles at center, 100 = circles at screen edges
        // Y: left circle uses Y directly, right circle uses 100-Y
        this.emphasisPositions = {
            low: { x: 50, y: 50 },
            mid: { x: 50, y: 50 },
            high: { x: 50, y: 50 }
        };

        // Visualization settings
        this.minRadius = 10;        // Minimum circle radius when silent
        this.maxRadius = 1000;      // Maximum circle radius at peak
        this.minOpacity = 0.03;     // 3% opacity when inactive
        this.maxOpacity = 0.85;     // Max opacity at peak

        // Reference to audio analyzer
        this.audioAnalyzer = null;

        // Time tracking for drift animation
        this.lastFrameTime = performance.now();

        // Initialize canvas size
        this.resizeCanvas();


        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Set control parameters from app
     * @param {Object} params - Control parameter values (0-100)
     */
    setControlParams(params) {
        this.controlParams = { ...this.controlParams, ...params };
    }

    /**
     * Set control colors from app
     * @param {Object} colors - Control color values (hex)
     */
    setControlColors(colors) {
        this.controlColors = { ...this.controlColors, ...colors };
    }

    /**
     * Set emphasis positions from app
     * @param {Object} positions - Position values for each band {low: {x, y}, mid: {x, y}, high: {x, y}}
     */
    setEmphasisPositions(positions) {
        this.emphasisPositions = { ...this.emphasisPositions, ...positions };
    }

    /**
     * Calculate circle positions from emphasis X/Y parameters
     * X = distance from center (0 = at center, 100 = at edges)
     * Y = vertical position (left uses Y, right uses 100-Y)
     * @param {string} band - 'low', 'mid', or 'high'
     * @returns {Object} - {left: {x, y}, right: {x, y}} in canvas pixels
     */
    calculateCirclePositions(band) {
        const pos = this.emphasisPositions[band];
        const xParam = pos.x; // 0-100: distance from center
        const yParam = pos.y; // 0-100: vertical position for left circle

        // Calculate X positions: left at 50-(X/2), right at 50+(X/2) in 0-100 space
        const leftXNorm = 50 - (xParam / 2);  // 0-50 range
        const rightXNorm = 50 + (xParam / 2); // 50-100 range

        // Y positions: left uses Y directly, right uses 100-Y
        const leftYNorm = yParam;
        const rightYNorm = 100 - yParam;

        // Convert from 0-100 coordinate space to canvas pixels
        return {
            left: {
                x: (leftXNorm / 100) * this.canvas.width,
                y: (leftYNorm / 100) * this.canvas.height
            },
            right: {
                x: (rightXNorm / 100) * this.canvas.width,
                y: (rightYNorm / 100) * this.canvas.height
            }
        };
    }

    /**
     * Resize canvas to fill window
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Also resize offscreen circle canvas
        this.circleCanvas.width = window.innerWidth;
        this.circleCanvas.height = window.innerHeight;
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
     * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} radius - Circle radius
     * @param {string} color - Hex color
     * @param {number} opacity - Opacity (0-1)
     * @param {boolean} lightBgMode - Whether to use light background adjustments
     */
    drawGradientCircle(ctx, x, y, radius, color, opacity, lightBgMode = false) {
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
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

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

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw grain texture for a single circle
     * @param {CanvasRenderingContext2D} ctx - The context to draw grain on
     * @param {number} x - Circle center X
     * @param {number} y - Circle center Y
     * @param {number} radius - Circle radius
     * @param {string} color - Circle color (hex)
     * @param {number} intensity - Grain intensity (0-100)
     * @param {number} amplitude - Current amplitude (0-1) for grain movement
     */
    drawCircleGrain(ctx, x, y, radius, color, intensity, amplitude) {
        if (!this.grainImageLoaded || intensity <= 0) return;

        // Max opacity is 50%
        const opacity = (intensity / 100) * 0.5;
        const rgb = this.hexToRgb(color);

        ctx.save();

        // Create circular clipping path matching the circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.clip();

        // Offset grain based on amplitude (expansion/contraction movement)
        // Amplitude 0-1 maps to 0-100 pixel offset
        const grainOffset = amplitude * 100;

        ctx.translate(x, y);

        // Draw grain with soft-light blend to add texture without changing opacity
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = opacity;

        // Create pattern with amplitude-based transform for movement
        const pattern = ctx.createPattern(this.grainImage, 'repeat');
        pattern.setTransform(new DOMMatrix().translate(grainOffset, grainOffset));
        ctx.fillStyle = pattern;

        // Fill the entire circle area (grain always fills within circle)
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

        // Apply subtle color tint with soft-light (doesn't affect opacity)
        ctx.globalAlpha = opacity * 0.4;
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

        ctx.restore();
    }

    /**
     * Apply energy emphasis to amplitude
     * @param {number} amplitude - Raw amplitude (0-1)
     * @param {number} emphasis - Emphasis value (0-100, 50 = neutral)
     * @returns {number} - Modified amplitude
     */
    applyEmphasis(amplitude, emphasis) {
        // 0 = muted (multiply by 0), 50 = neutral (multiply by 1), 100 = emphasized (multiply by 2)
        const multiplier = emphasis / 50;
        return Math.min(1, amplitude * multiplier);
    }

    /**
     * Apply compression to amplitude
     * @param {number} amplitude - Input amplitude (0-1)
     * @param {number} compression - Compression amount (0-100)
     * @returns {number} - Compressed amplitude
     */
    applyCompression(amplitude, compression) {
        // 0 = full dynamics, 100 = fully compressed (everything pushed toward 0.5)
        const compressionFactor = compression / 100;
        // Soft knee compression: lerp toward 0.5 based on compression amount
        const compressed = amplitude + (0.5 - amplitude) * compressionFactor * 0.8;
        return compressed;
    }

    /**
     * Update drift offsets using brownian motion / random walk for organic hovering
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateDriftOffsets(deltaTime) {
        const bands = ['low', 'mid', 'high'];
        const driftAmount = this.controlParams.drift / 100; // 0-1
        const anchorStability = this.controlParams.anchor / 100; // 0-1

        // When drift is 0, snap back to anchor
        if (driftAmount === 0) {
            for (const band of bands) {
                this.driftOffsets[band].x *= 0.85;
                this.driftOffsets[band].y *= 0.85;
                if (Math.abs(this.driftOffsets[band].x) < 1) this.driftOffsets[band].x = 0;
                if (Math.abs(this.driftOffsets[band].y) < 1) this.driftOffsets[band].y = 0;
            }
            return;
        }

        // Container size: 800-1000px at drift=100
        const maxDriftRadius = 900 * driftAmount;

        // Anchor stability reduces container size
        const effectiveRadius = maxDriftRadius * (1 - anchorStability * 0.6);

        // Drift speed: pixels per second (very aggressive)
        // At drift=100: ~150-200 pixels per second
        const baseSpeed = 200 * driftAmount;

        for (const band of bands) {
            const offset = this.driftOffsets[band];
            const velocity = this.driftVelocities[band];

            // Brownian motion: add random acceleration each frame
            // More aggressive random impulses
            const randomStrength = 800 * driftAmount * deltaTime;
            velocity.x += (Math.random() - 0.5) * randomStrength;
            velocity.y += (Math.random() - 0.5) * randomStrength;

            // Apply friction/damping for smooth movement
            const friction = 0.97;
            velocity.x *= friction;
            velocity.y *= friction;

            // Clamp velocity to max speed
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            if (speed > baseSpeed) {
                velocity.x = (velocity.x / speed) * baseSpeed;
                velocity.y = (velocity.y / speed) * baseSpeed;
            }

            // Update position
            offset.x += velocity.x * deltaTime;
            offset.y += velocity.y * deltaTime;

            // Soft boundary: push back when near edge of container
            const distFromCenter = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
            if (distFromCenter > effectiveRadius * 0.7) {
                // Calculate how far past the soft boundary we are
                const overshoot = (distFromCenter - effectiveRadius * 0.7) / (effectiveRadius * 0.3);
                const pushStrength = Math.min(overshoot * 2, 1) * 300 * deltaTime;

                // Push back toward center
                const angle = Math.atan2(offset.y, offset.x);
                velocity.x -= Math.cos(angle) * pushStrength;
                velocity.y -= Math.sin(angle) * pushStrength;
            }

            // Hard boundary: clamp to container
            if (distFromCenter > effectiveRadius) {
                const scale = effectiveRadius / distFromCenter;
                offset.x *= scale;
                offset.y *= scale;

                // Bounce velocity inward
                const angle = Math.atan2(offset.y, offset.x);
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                const dot = velocity.x * normalX + velocity.y * normalY;
                if (dot > 0) {
                    velocity.x -= normalX * dot * 1.5;
                    velocity.y -= normalY * dot * 1.5;
                }
            }
        }
    }

    /**
     * Smooth amplitude values based on attack, decay, and inertia
     * @param {Object} rawAmplitudes - Raw amplitude values from analyzer (bass, lowerMid, mid, upperMid, treble)
     * @param {number} deltaTime - Time since last frame in seconds
     * @returns {Object} - Smoothed amplitude values for 3 bands (low, mid, high)
     */
    smoothAmplitudes(rawAmplitudes, deltaTime) {
        // Combine raw frequency bands into 3 emphasis bands
        const bandTargets = {
            low: Math.max(rawAmplitudes.bass || 0, rawAmplitudes.lowerMid || 0),
            mid: rawAmplitudes.mid || 0,
            high: Math.max(rawAmplitudes.upperMid || 0, rawAmplitudes.treble || 0)
        };

        // Convert parameters to useful values
        // Attack: 0 = instant (high smoothing factor), 100 = very slow (low factor)
        const attackSpeed = 1 - (this.controlParams.attack / 100) * 0.95; // 1.0 to 0.05
        // Decay: 0 = instant fade, 100 = long tail
        const decaySpeed = 1 - (this.controlParams.decay / 100) * 0.98; // 1.0 to 0.02
        // Inertia: additional smoothing on top of attack/decay
        const inertiaFactor = this.controlParams.inertia / 100;

        for (const band of ['low', 'mid', 'high']) {
            const current = this.smoothedAmplitudes[band];
            const target = bandTargets[band];

            // Determine if we're attacking (going up) or decaying (going down)
            const isAttacking = target > current;
            const baseSpeed = isAttacking ? attackSpeed : decaySpeed;

            // Apply inertia as additional smoothing
            const effectiveSpeed = baseSpeed * (1 - inertiaFactor * 0.9);

            // Exponential smoothing
            const smoothingFactor = 1 - Math.exp(-effectiveSpeed * deltaTime * 60);
            this.smoothedAmplitudes[band] = current + (target - current) * smoothingFactor;
        }

        return this.smoothedAmplitudes;
    }

    /**
     * Render a single frame
     */
    render() {
        // Calculate delta time
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
        this.lastFrameTime = now;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Check if background is light
        const bgLightness = this.getBackgroundLightness();
        const isLightBg = bgLightness > 50;

        // Draw background color at 75% opacity to let frequency colors show through
        const bgRgb = this.hexToRgb(this.colors.background);
        this.ctx.fillStyle = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.75)`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Get raw amplitudes from analyzer
        let rawAmplitudes = {
            bass: 0,
            lowerMid: 0,
            mid: 0,
            upperMid: 0,
            treble: 0
        };

        if (this.audioAnalyzer) {
            rawAmplitudes = this.audioAnalyzer.analyze() || rawAmplitudes;
        }

        // Apply energy emphasis to raw amplitudes and combine into 3 bands
        const emphasizedAmplitudes = {
            bass: this.applyEmphasis(rawAmplitudes.bass, this.controlParams.lowEmphasis),
            lowerMid: this.applyEmphasis(rawAmplitudes.lowerMid, this.controlParams.lowEmphasis),
            mid: this.applyEmphasis(rawAmplitudes.mid, this.controlParams.midEmphasis),
            upperMid: this.applyEmphasis(rawAmplitudes.upperMid, this.controlParams.highEmphasis),
            treble: this.applyEmphasis(rawAmplitudes.treble, this.controlParams.highEmphasis)
        };

        // Apply smoothing (attack, decay, inertia) BEFORE compression
        // This ensures motion controls work on full dynamic range
        const smoothedAmplitudes = this.smoothAmplitudes(emphasizedAmplitudes, deltaTime);

        // Apply compression AFTER smoothing (affects final visual output only)
        const finalAmplitudes = {};
        for (const band of Object.keys(smoothedAmplitudes)) {
            finalAmplitudes[band] = this.applyCompression(
                smoothedAmplitudes[band],
                this.controlParams.compression
            );
        }

        // Update drift offsets for organic movement
        this.updateDriftOffsets(deltaTime);

        // Clear offscreen circle canvas
        this.circleCtx.clearRect(0, 0, this.circleCanvas.width, this.circleCanvas.height);

        // Set composite operation for color blending on offscreen canvas
        this.circleCtx.globalCompositeOperation = isLightBg ? 'multiply' : 'screen';

        // Calculate field scale modifier (0 = 0.3x, 50 = 1x, 100 = 2x)
        const fieldScaleMultiplier = 0.3 + (this.controlParams.fieldScale / 100) * 1.7;

        // Calculate overlap modifier - affects opacity and blending
        const overlapFactor = this.controlParams.overlap / 100;

        // Adjust settings for light backgrounds
        const effectiveMaxRadius = (isLightBg ? this.maxRadius * 1.5 : this.maxRadius) * fieldScaleMultiplier;
        const effectiveMinRadius = this.minRadius * fieldScaleMultiplier;
        const effectiveMinOpacity = isLightBg ? 0.15 : this.minOpacity;
        const effectiveMaxOpacity = isLightBg ? 1.0 : this.maxOpacity;

        // Overlap increases base opacity for more blending
        const baseOpacityBoost = overlapFactor * 0.3;

        // Define the 3 bands with their colors and amplitude keys
        const bands = [
            { name: 'low', amplitudeKey: 'low', color: this.controlColors.lowEmphasis },
            { name: 'mid', amplitudeKey: 'mid', color: this.controlColors.midEmphasis },
            { name: 'high', amplitudeKey: 'high', color: this.controlColors.highEmphasis }
        ];

        // Draw circles for each band to offscreen canvas
        for (const band of bands) {
            const amplitude = finalAmplitudes[band.amplitudeKey] || 0;
            const color = band.color;

            // Calculate base positions from X/Y parameters
            const positions = this.calculateCirclePositions(band.name);

            const leftX = positions.left.x;
            const leftY = positions.left.y;
            const rightX = positions.right.x;
            const rightY = positions.right.y;

            // Apply power curve for more dramatic expansion/contraction
            const expandedAmplitude = Math.pow(amplitude, 0.6);

            // Calculate radius based on expanded amplitude
            const radius = effectiveMinRadius + (effectiveMaxRadius - effectiveMinRadius) * expandedAmplitude;

            // Calculate opacity based on amplitude with overlap boost
            let opacity = effectiveMinOpacity + (effectiveMaxOpacity - effectiveMinOpacity) * expandedAmplitude;
            opacity = Math.min(effectiveMaxOpacity, opacity + baseOpacityBoost);

            // Draw the left circle to offscreen canvas
            this.drawGradientCircle(this.circleCtx, leftX, leftY, radius, color, opacity, isLightBg);
            // Apply grain to left circle (movement based on amplitude, not drift)
            this.drawCircleGrain(this.circleCtx, leftX, leftY, radius, color, this.controlParams.grain, expandedAmplitude);

            // Draw the right circle (tethered through center, mirrored Y and drift)
            this.drawGradientCircle(this.circleCtx, rightX, rightY, radius, color, opacity, isLightBg);
            // Apply grain to right circle (movement based on amplitude, not drift)
            this.drawCircleGrain(this.circleCtx, rightX, rightY, radius, color, this.controlParams.grain, expandedAmplitude);
        }

        // Reset composite operation on offscreen canvas
        this.circleCtx.globalCompositeOperation = 'source-over';

        // Composite circles (with grain) onto main canvas
        this.ctx.globalCompositeOperation = isLightBg ? 'multiply' : 'screen';
        this.ctx.drawImage(this.circleCanvas, 0, 0);
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
