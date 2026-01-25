# Music Visualizer - Technical Specification

## Project Overview
Build a web-based music visualizer that maps audio frequency ranges to user-selected colors, creating dynamic visual representations that blend smoothly as music plays.

## Core Features

### 1. Audio Upload & Playback
- Single MP3 file upload via file picker button (filled square icon from sketch)
- Standard audio controls:
  - Play button (triangle icon)
  - Pause functionality
  - Stop functionality
- Seekable progress bar with time scrubbing capability
- Time display showing: current time | total duration (format: MM:SS | MM:SS)
- Volume slider control on the right side (0-100%)
- Mute/unmute toggle button (for silent visualization viewing)

### 2. Frequency Analysis
Analyze 5 frequency ranges in real-time using Web Audio API:

1. **Treble** (high frequencies, ~4kHz-20kHz) - leftmost
2. **Upper-Mid** (~1kHz-4kHz)
3. **Mid** (~500Hz-1kHz)
4. **Lower-Mid** (~150Hz-500Hz)
5. **Bass** (low frequencies, ~20Hz-150Hz) - rightmost

**Technical Requirements:**
- Use Web Audio API AnalyserNode for FFT analysis
- Map frequency bins to the 5 ranges above
- Calculate amplitude for each range to drive visual size
- Update analysis in real-time during playback

### 3. Color Mapping System

**6 Color Pickers (left to right):**
1. Base Background (leftmost)
2. Bass
3. Lower-Mid
4. Mid
5. Upper-Mid
6. Treble (rightmost)

**Color Picker Behavior:**
- Labels displayed below each picker showing the frequency range name
- Default colors auto-generated using good color theory principles when song uploads
- New set of random harmonious colors generated for each new song upload
- Colors persist on page refresh if song is already loaded (use localStorage)

### 4. Visualization Engine

**Full-Screen Background Visualization:**
- Each of the 5 frequency ranges creates a radial gradient circle
- Circles emanate from randomized positions on the screen
- Circle size directly correlates to frequency amplitude (visual volume)
  - Higher amplitude = larger circle radius
  - Think: expanding circles that pulse with the music
- Circles expand radially (like ripples) when frequencies are prominent
- Smooth blending between overlapping colors
- When frequency is inactive/silent: show at 3% opacity minimum
- Base background color visible when no/low audio activity
- All circles overlap and blend to create gradient effects

**Visual Behavior:**
- Smooth color transitions (no harsh jumps)
- Real-time response to audio
- Circles blend into each other creating linear gradient effects

### 5. UI Layout & Styling

**Glassmorphism Control Panel:**
- **Position:** Floating, centered on screen
- **Style:** 
  - Translucent glass effect (backdrop-filter: blur)
  - Border-radius: 20px
  - Semi-transparent background
  - Subtle border or shadow for depth
- **Layout:** Horizontal arrangement containing:
  - **Left section:** Upload button, Play/Pause button, Stop button
  - **Center section:** Progress bar with time display (current | total)
  - **Right section:** Volume slider, Mute/unmute toggle

**Color Picker Row:**
- Positioned below the glass control panel
- 6 color pickers in horizontal row
- Each picker is a square (as shown in sketch)
- Label text below each picker

**Typography (Global):**
- Font family: Geist
- Color: #FFFFFF (white) for ALL text elements
- Applies to: labels, time displays, button text, all UI text

**Z-Index Layers:**
1. Bottom layer: Full-screen visualization canvas
2. Top layer: Glass control panel + color picker row

## Technical Stack

### Core Technologies
- **HTML5** - Structure
- **CSS3** - Styling (glassmorphism, gradients, layout)
- **Vanilla JavaScript** - Application logic
- **Web Audio API** - Audio analysis and frequency detection
- **Canvas API** - Visualization rendering

### Recommended File Structure
```
music-visualizer/
├── index.html          # Main HTML structure
├── styles.css          # All styling including glassmorphism
├── app.js             # Main application logic & state management
├── audio-analyzer.js  # Web Audio API frequency analysis
└── visualizer.js      # Canvas rendering & animation logic
```

## Technical Implementation Details

### Audio Analysis Pipeline
1. Load MP3 file via File API when user selects file
2. Create AudioContext
3. Create audio graph: source → AnalyserNode → destination
4. Set FFT size to 2048 or 4096 for good frequency resolution
5. Use `getByteFrequencyData()` in animation loop (60fps via requestAnimationFrame)
6. Map frequency bins to 5 defined ranges
7. Calculate average amplitude per range
8. Normalize amplitude to 0-1 scale for visual mapping

### Visualization Rendering (Canvas)
- Use `requestAnimationFrame` loop for smooth 60fps animation
- Clear canvas each frame
- For each of the 5 frequency ranges:
  - Calculate circle radius based on normalized amplitude
  - Draw radial gradient from randomized origin point (x, y)
  - Use user-selected color at center, fade to transparent at edges
  - Minimum radius when inactive (3% opacity)
  - Maximum radius when at peak amplitude
- Apply canvas composite operation for smooth color blending
- Render base background color at lowest layer

### Random Circle Positioning
- On song load, generate 5 random (x, y) coordinates for circle origins
- Store these coordinates for the duration of the song
- Coordinates should be within canvas bounds
- Each frequency range maintains its own origin point

### Color Generation Algorithm
- Use HSL color space for harmonious color generation
- Generate complementary, analogous, or triadic color schemes
- Ensure sufficient contrast and visual appeal
- Provide distinct but harmonious colors for all 5 ranges + background
- Store color selections in localStorage keyed by song reference

### State Management
- Track current song file reference/name
- Store color selections per song in localStorage
- Track playback state (playing/paused/stopped)
- Track current time, duration, volume level, mute state
- Persist state across page refresh when possible

### localStorage Schema
```javascript
{
  "currentSong": "song-filename.mp3",
  "songs": {
    "song-filename.mp3": {
      "baseBackground": "#hexcode",
      "bass": "#hexcode",
      "lowerMid": "#hexcode",
      "mid": "#hexcode",
      "upperMid": "#hexcode",
      "treble": "#hexcode",
      "circlePositions": [
        {x: number, y: number}, // bass
        {x: number, y: number}, // lowerMid
        {x: number, y: number}, // mid
        {x: number, y: number}, // upperMid
        {x: number, y: number}  // treble
      ]
    }
  }
}
```

## Development Phases

### Phase 1: Core Audio & Basic UI (Priority 1)
- Set up HTML structure
- Create basic CSS layout
- Implement audio upload functionality
- Add playback controls (play, pause, stop)
- Display time and duration
- Test that audio loads and plays correctly

### Phase 2: Frequency Analysis (Priority 1)
- Implement Web Audio API setup
- Create AnalyserNode and configure FFT
- Map frequency bins to 5 ranges
- Calculate amplitude per range
- Console.log frequency data to verify analysis is working
- Ensure real-time updates (60fps)

### Phase 3: Visualization Engine (Priority 1)
- Set up full-screen canvas
- Implement requestAnimationFrame loop
- Draw circles with radial gradients
- Connect frequency amplitude data to circle size
- Implement color blending
- Test that visualization responds to audio in real-time

### Phase 4: Color System (Priority 2)
- Add 6 color picker inputs
- Implement color picker change handlers
- Generate default harmonious colors on song upload
- Apply selected colors to visualization
- Test color changes reflect immediately

### Phase 5: State Persistence (Priority 2)
- Implement localStorage for color persistence
- Save/load colors per song
- Handle page refresh gracefully
- Store circle positions per song

### Phase 6: UI Polish (Priority 2)
- Apply glassmorphism styling to control panel
- Import and apply Geist font
- Set all text to white (#FFFFFF)
- Add smooth transitions and animations
- Ensure responsive layout
- Fine-tune visual aesthetics

### Phase 7: Final Testing & Refinement (Priority 3)
- Test with various MP3 files
- Test all controls (play, pause, stop, seek, volume, mute)
- Verify color persistence works correctly
- Check browser compatibility
- Optimize performance if needed
- Smooth out any visual glitches

## Future Enhancements (Not v1)
- MP4 video export of visualization
- Additional visualization modes/patterns
- Preset color scheme gallery
- More granular frequency controls (10+ ranges)
- Drag-and-drop file upload
- Playlist support
- Beat detection for extra visual effects

## Success Criteria for v1
- [ ] User can upload MP3 file and hear it play
- [ ] All 5 frequency ranges are correctly analyzed
- [ ] Colors map to frequencies and blend smoothly on canvas
- [ ] Visualization responds in real-time to audio (no lag)
- [ ] All playback controls are functional (play, pause, stop, seek, volume, mute)
- [ ] Glass UI panel renders with proper glassmorphism effect
- [ ] Color pickers work and update visualization immediately
- [ ] Colors and positions persist on page refresh
- [ ] All text is white (#FFFFFF) using Geist font
- [ ] Works smoothly in local development server
- [ ] No console errors
- [ ] Smooth 60fps animation

## Browser Compatibility
- **Target:** Modern browsers with Web Audio API support
- **Tested on:** Chrome, Firefox, Safari, Edge (latest versions)
- **Required APIs:** Web Audio API, Canvas 2D, File API, localStorage

## Notes for Implementation
1. Start simple - get audio playing first before adding complexity
2. Test frequency analysis independently before connecting to visualization
3. Use placeholder colors initially, add color picker functionality later
4. Canvas size should match window size (handle resize events)
5. Consider performance - 5 radial gradients per frame at 60fps
6. Ensure audio context is created after user interaction (browser requirement)
7. Handle edge cases: no file selected, unsupported file format, etc.

## Getting Started
Once files are created:
1. Navigate to project directory in terminal
2. Run local server: `python -m http.server 8000`
3. Open browser to: `http://localhost:8000`
4. Upload an MP3 file and test functionality
5. Iterate and refine based on results

---

**End of Specification**
