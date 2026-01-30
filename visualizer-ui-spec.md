# Visualizer UI Spec - Atmospheric Motion Fields Grammar

## Goal
Update the bottom control panel UI to support the Atmospheric Motion Fields grammar controls using a clean sectioned layout. Keep the top transport panel (upload/play/stop/progress/volume/mute) unchanged.

## Non-goals
* Do not implement other grammars yet (Structured Rhythm Systems, Experimental Signal Deconstruction).
* Do not redesign the overall visual aesthetic (keep current glassmorphism style language).
* Do not hide/accordion sections yet (everything visible for now).

## Visual Grammar Context

### Atmospheric Motion Fields
(Ambient → expressive, ~1 → 6 on the spectrum)

Atmospheric Motion Fields treat sound as continuous energy moving through space. Visuals are field-based rather than object-based: gradients, soft forms, and organic motion expand, drift, and blend in response to audio over time. Rather than reacting sharply to individual beats, this grammar emphasizes smoothing, decay, and inertia, producing visuals that feel immersive, breathable, and emotionally aligned with the music. It excels at long listening sessions, projection environments, and situations where visuals should support rather than dominate the sound.

**Design intent:**
* Always beautiful
* Forgiving defaults
* Emotion-first, not information-first

This is your foundation grammar.

---

## UI Layout Overview

### A) Top Panel (unchanged)
Keep existing layout and behavior for:
* Upload MP3
* Play/Pause
* Stop
* Seek bar + time display
* Volume slider
* Mute toggle

### B) Bottom Panel (replaces current color picker row)

Replace the existing bottom row (which currently shows 6 color pickers: Background + 5 frequency colors) with a new wider glass panel.

**New bottom panel contains:**
* **Background color picker** (leftmost, preserved from current design)
* **3 horizontal sections:** Motion | Form | Energy

**Layout details:**
* Panel width: Wide enough to comfortably fit all content using the same horizontal padding as the top transport panel
* Sections arranged **horizontally** (side-by-side)
* Same glassmorphism styling (blur, translucent fill, rounded corners, subtle border/shadow)
* All controls visible (no collapsing/accordions)

**Visual hierarchy:**
```
[Background Color] | [Motion Section] | [Form Section] | [Energy Section]
```

---

## Section Structure & Controls

### Section 1: Motion

**Subsection: Response**
* Attack (slider + color swatch)
* Decay (slider + color swatch)
* Inertia (slider + color swatch)

**Subsection: Drift**
* Drift Amount (slider + color swatch)

### Section 2: Form

**Subsection: Scale**
* Field Scale (slider + color swatch)

**Subsection: Blend**
* Overlap (slider + color swatch)

**Subsection: Anchor**
* Anchor Stability (slider + color swatch)

### Section 3: Energy

**Subsection: Emphasis**
* Low Emphasis (slider + color swatch)
* Mid Emphasis (slider + color swatch)
* High Emphasis (slider + color swatch)

**Subsection: Dynamics**
* Compression (slider + color swatch)

---

## Control Row Pattern

Each slider row follows this structure:

```
[Label] [Long horizontal slider] [Color swatch button]
```

**Details:**
* Label: Left-aligned text showing the control name
* Slider: Long horizontal slider spanning most of the row width
* Color swatch: Small square button to the right of the slider
* Numeric value displayed **below** the slider (centered under slider)
* No "0" or "100" labels at slider endpoints

**Slider behavior:**
* All sliders default to 50% on initial load
* Range: 0-100
* Display current value below slider as user adjusts

**Color swatch behavior:**
* Clicking swatch opens a color picker (native HTML5 color input is fine)
* Color only affects visuals when that specific parameter is active/being used
* Colors are stored per-control and used by the visualization engine

---

## Color System

### What's changing:
* **REMOVE:** The current 5 frequency color pickers (Bass, Lower-Mid, Mid, Upper-Mid, Treble)
* **KEEP:** The Background color picker (moves to leftmost position in new bottom panel)
* **ADD:** Individual color swatches for each of the 11 new control parameters

### Initial color mapping:

Use the previous frequency colors as starting points for the new controls:

**Motion colors:**
* Attack → uses previous "Upper-Mid" color
* Decay → uses previous "Mid" color
* Inertia → uses previous "Lower-Mid" color
* Drift Amount → uses previous "Treble" color

**Form colors:**
* Field Scale → uses previous "Bass" color
* Overlap → uses previous "Mid" color
* Anchor Stability → uses previous "Lower-Mid" color

**Energy colors:**
* Low Emphasis → uses previous "Bass" color
* Mid Emphasis → uses previous "Mid" color
* High Emphasis → uses previous "Treble" color
* Compression → uses previous "Upper-Mid" color

**Note:** This mapping will be revised later; implement as described for now to provide reasonable defaults.

---

## Styling Requirements

### Typography
* Font family: Geist (existing)
* Text color: #FFFFFF white (existing)

### Section titles (Motion, Form, Energy)
* Visually prominent but not huge
* Left-aligned within each section block
* Higher visual weight than subsection titles

### Subsection titles (Response, Drift, Scale, Blend, Anchor, Emphasis, Dynamics)
* Smaller and quieter than section titles
* Act as grouping labels above their slider rows
* Subtle visual treatment (perhaps 70-80% opacity)

### Sliders
* Easy to grab and visually consistent
* Smooth dragging interaction
* Show numeric value below slider (centered, small font size)

### Color swatches
* Small square buttons (recommend 24-32px)
* Show current color as fill
* Subtle border or shadow for definition
* Clickable to open color picker

### Responsive behavior
* Desktop-first design
* Should not break on smaller widths (can adapt later if needed)

---

## Implementation Approach

### Phase 1: Build UI Structure (Do this first)
1. Create new bottom panel component/section
2. Implement 3-section horizontal layout (Motion | Form | Energy)
3. Add all subsections and control rows with labels
4. Add sliders with default 50% values
5. Add color swatches (using initial color mapping)
6. Display numeric values below sliders
7. Preserve Background color picker in leftmost position
8. Remove old 5-frequency color picker row
9. Ensure no regressions to top transport panel

**Deliverable:** Updated UI that matches this spec visually and functionally (sliders work, color pickers open, values update).

### Phase 2: Wire Controls to Visualization (Do this second)
1. Connect slider values to visualization parameters:
   * **Motion:** Attack, Decay, Inertia, Drift Amount
   * **Form:** Field Scale, Overlap, Anchor Stability
   * **Energy:** Low Emphasis, Mid Emphasis, High Emphasis, Compression
2. Connect color swatches to their respective visual elements
3. Ensure colors only affect visuals when their parameter is active
4. Test that visualization responds correctly to all controls

**Deliverable:** Fully functional Atmospheric Motion Fields grammar with all controls wired.

---

## Parameter Definitions (for implementation reference)

When wiring controls in Phase 2, here's what each parameter should control:

### Motion Parameters
* **Attack:** How quickly visuals respond to audio changes (0 = instant, 100 = very slow)
* **Decay:** How long visuals persist after audio stops (0 = immediate fade, 100 = long tail)
* **Inertia:** Resistance to sudden changes, smoothing factor (0 = reactive, 100 = heavily smoothed)
* **Drift Amount:** How much visuals slowly move/shift over time independent of audio

### Form Parameters
* **Field Scale:** Overall size/scale of visual fields (0 = small, 100 = large)
* **Overlap:** How much visual elements blend/overlap (0 = separate, 100 = highly blended)
* **Anchor Stability:** How locked visual positions are vs. free-floating (0 = floating, 100 = anchored)

### Energy Parameters
* **Low Emphasis:** Boost/reduce low frequency visual impact (0 = muted, 50 = neutral, 100 = emphasized)
* **Mid Emphasis:** Boost/reduce mid frequency visual impact (0 = muted, 50 = neutral, 100 = emphasized)
* **High Emphasis:** Boost/reduce high frequency visual impact (0 = muted, 50 = neutral, 100 = emphasized)
* **Compression:** Dynamic range compression on visual response (0 = full dynamics, 100 = compressed/limited)

---

## Code Organization

* Prefer modular approach: create a dedicated component for the bottom panel
* Keep state management clean (store all slider values and colors in state)
* Comment code where parameter mappings occur
* Maintain existing code style and patterns

---

## Testing Checklist

After implementation:
- [ ] Top transport panel unchanged and functional
- [ ] Bottom panel displays with correct layout (Background + 3 sections horizontal)
- [ ] All 11 control rows display correctly (label, slider, color swatch)
- [ ] Sliders are draggable and show numeric values below
- [ ] Color swatches open color pickers and update colors
- [ ] Background color picker still works
- [ ] Old 5-frequency color pickers are removed
- [ ] No visual regressions (glassmorphism, spacing, typography)
- [ ] Audio playback still works correctly
- [ ] (Phase 2) All controls affect visualization as intended
- [ ] (Phase 2) Colors apply correctly to their parameters

---

## Future Considerations (not in scope)

* Add preset system for saving/loading control configurations
* Implement localStorage persistence for control values
* Add collapsible/expandable sections for cleaner UI
* Implement other visual grammars (Structured Rhythm Systems, Experimental Signal Deconstruction)
* Add grammar switcher to toggle between visual modes
* Advanced color harmony suggestions
* MIDI/OSC control mapping

---

**End of Specification**
