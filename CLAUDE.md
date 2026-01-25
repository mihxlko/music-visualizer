# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based music visualizer that maps audio frequency ranges to user-selected colors, creating dynamic radial gradient visualizations that respond to music in real-time.

## Running the Application

```bash
cd "/Users/a7mih/Desktop/cool memes 5/1. design/1. projects/5. ai/music visualizer 1"
python -m http.server 8000
# Open http://localhost:8000 in browser
```

## Architecture

### File Structure
- `index.html` - Main HTML structure with glassmorphism UI
- `styles.css` - All styling including glassmorphism effects
- `app.js` - Main application logic, state management, UI event handling
- `audio-analyzer.js` - Web Audio API frequency analysis (5 frequency bands)
- `visualizer.js` - Canvas rendering and animation loop

### Data Flow
1. User uploads MP3 → `app.js` creates audio element and object URL
2. `AudioAnalyzer` creates Web Audio graph: source → AnalyserNode → destination
3. `Visualizer` runs requestAnimationFrame loop at 60fps
4. Each frame: `AudioAnalyzer.analyze()` → frequency amplitudes → circle radii/opacity

### Frequency Ranges
| Range | Hz | Color Picker ID |
|-------|-----|-----------------|
| Bass | 20-150 | color-bass |
| Lower-Mid | 150-500 | color-lower-mid |
| Mid | 500-1000 | color-mid |
| Upper-Mid | 1000-4000 | color-upper-mid |
| Treble | 4000-20000 | color-treble |

### localStorage Schema
Colors and circle positions are persisted per song under key `musicVisualizerData`.

## Key Implementation Notes

- AudioContext must be created after user interaction (browser requirement)
- FFT size is 2048 for good frequency resolution
- Canvas uses `globalCompositeOperation: 'screen'` for color blending
- Circles have minimum 3% opacity when inactive
- New songs trigger random harmonious color generation via HSL color space
