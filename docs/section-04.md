# Section 04: Advanced Rendering Features

## Overview

Expose and extend rendering capabilities from the quake2ts library to provide debugging tools, custom visualization modes, performance monitoring, and media capture. This section makes the application an invaluable tool for developers and content creators.

**Complexity**: Medium
**Dependencies**: None (enhances existing rendering)
**Estimated Scope**: Debug visualization, render modes, performance dashboard, screenshots, video recording, lighting controls

## Objectives

- Implement debug visualization modes (wireframe, bounding boxes, PVS clusters, normals)
- Extend render mode selection beyond existing options
- Build real-time performance statistics dashboard
- Add screenshot capture (PNG export)
- Implement video recording (WebM via MediaRecorder API)
- Expose lighting controls (brightness, gamma, light styles)
- Support post-processing effects (if library permits)

## Current State

**Already Implemented**:
- Basic render modes in `src/components/UniversalViewer/ViewerControls.tsx`:
  - Textured (default)
  - Wireframe
  - Solid
  - Solid Faceted
  - Random Colors
- Color picker for solid rendering
- WebGL rendering via `UniversalViewer` and adapters

**Missing**:
- Debug overlays (bounds, normals, PVS)
- Performance metrics display
- Screenshot/video capture
- Lighting controls
- Advanced render options

## Tasks and Subtasks

### Task 1: Debug Visualization Modes

**Objective**: Provide visual debugging tools for developers analyzing geometry and rendering.

#### Subtasks

- [x] **1.1**: Implement bounding box visualization
  - Modify adapters (`BspAdapter.ts`, `Md2Adapter.ts`, `Md3Adapter.ts`)
  - Add method `setDebugMode(mode: DebugMode): void`
  - For `DebugMode.BoundingBoxes`:
    - Render AABB wireframe for each entity
    - Use different colors for different entity types (players, items, triggers)
    - **Library Enhancement Needed**: Expose entity bounds from library
  - Draw in separate render pass after main rendering

- [x] **1.2**: Implement normal visualization
  - For `DebugMode.Normals`:
    - Render short lines from vertices in direction of normals
    - Useful for diagnosing lighting issues
    - **Library Enhancement Needed**: Access to vertex normals from library
  - Use bright colors (cyan for face normals, yellow for vertex normals)

- [x] **1.3**: Implement PVS cluster visualization (BSP only)
  - For `DebugMode.PVSClusters`:
    - Color each BSP leaf by cluster ID
    - Show current cluster player is in (highlighted)
    - Display cluster boundaries
    - **Library Enhancement Needed**: Expose PVS cluster data
  - Useful for understanding visibility culling

- [x] **1.4**: Implement collision hull visualization
  - For `DebugMode.CollisionHulls`:
    - Render collision geometry (simplified hulls)
    - Different colors for different content types (solid, water, lava, etc.)
    - Show player bounding box interacting with world

- [x] **1.5**: Implement lightmap visualization
  - For `DebugMode.Lightmaps`:
    - Render surfaces with only lightmap (no textures)
    - Useful for analyzing light quality
    - Show light styles and dynamic lights

- [x] **1.6**: Add debug mode selector UI
  - Modify `ViewerControls.tsx`
  - Add dropdown: "Debug Mode"
    - None (default)
    - Bounding Boxes
    - Normals
    - PVS Clusters (BSP only)
    - Collision Hulls
    - Lightmaps
  - Allow combining debug modes with render modes

**File References**:
- Modify: `src/components/UniversalViewer/adapters/BspAdapter.ts`
- Modify: `src/components/UniversalViewer/adapters/Md2Adapter.ts`
- Modify: `src/components/UniversalViewer/adapters/Md3Adapter.ts`
- Modify: `src/components/UniversalViewer/ViewerControls.tsx`
- Create: `src/types/debugMode.ts` (enum definition)

**Test Requirements**:
- Unit: `tests/unit/adapters.debugMode.test.ts`
  - Test debug mode setting on adapters
  - Verify render calls for debug geometry
- Integration: `tests/integration/debugRendering.integration.test.tsx`
  - Enable each debug mode
  - Verify canvas output differs from normal mode

---

### Task 2: Performance Statistics Dashboard

**Objective**: Display real-time rendering performance metrics for optimization and profiling.

#### Subtasks

- [x] **2.1**: Create `src/components/PerformanceStats.tsx`
  - Toggleable overlay (F key or button)
  - Display in top-right corner
  - Semi-transparent dark background

- [x] **2.2**: Implement FPS counter
  - Track frame times over rolling window (last 100 frames)
  - Calculate average, minimum, maximum FPS
  - Display prominently
  - Color-code: green (>55 FPS), yellow (30-55), red (<30)

- [x] **2.3**: Expose renderer statistics
  - **Library Enhancement Needed**: `Renderer.getStatistics(): RenderStatistics`
    - Draw calls per frame
    - Triangles rendered
    - Vertices processed
    - Texture binds
    - Visible surfaces
    - Culled surfaces
  - Poll statistics each frame and display

- [x] **2.4**: Display memory usage
  - Track WebGL buffer memory usage
    - **Library Enhancement Needed**: Memory tracking API
  - Track texture memory
  - Track total heap size (if available via `performance.memory`)
  - Display in MB

- [x] **2.5**: Add GPU timing queries
  - Use WebGL `EXT_disjoint_timer_query` extension
  - Measure GPU frame time
  - Display GPU vs CPU time breakdown
  - Identify bottlenecks

- [x] **2.6**: Implement performance graph
  - Plot FPS over time (line graph)
  - Plot frame time (ms)
  - Highlight dropped frames
  - Scrolling window (last 5 seconds)

- [ ] **2.7**: Add profiling markers
  - Track time spent in:
    - Simulation
    - Rendering
    - Asset loading
  - Display as percentage of frame time
  - Use `performance.mark()` and `performance.measure()`

**File References**:
- Create: `src/components/PerformanceStats.tsx`
- Create: `src/components/PerformanceStats.css`
- Create: `src/components/PerformanceGraph.tsx`
- Create: `src/services/performanceService.ts`
- Modify: `src/components/UniversalViewer/UniversalViewer.tsx` (collect stats)

**Test Requirements**:
- Unit: `tests/unit/PerformanceStats.test.tsx`
  - Render with mock statistics
  - Verify FPS calculation
  - Test color coding
- Unit: `tests/unit/performanceService.test.ts`
  - Test FPS tracking
  - Test rolling average calculation

---

### Task 3: Screenshot Capture

**Objective**: Allow users to capture high-quality screenshots from the 3D view.

#### Subtasks

- [x] **3.1**: Create `src/services/screenshotService.ts`
  - Export `captureScreenshot(canvas: HTMLCanvasElement, format: 'png' | 'jpg'): Promise<Blob>`
  - Export `downloadScreenshot(blob: Blob, filename: string): void`

- [x] **3.2**: Implement screenshot capture
  - Call `canvas.toBlob(callback, mimeType, quality)`
  - Support PNG (lossless) and JPEG (lossy, smaller)
  - Default quality: 0.95 for JPEG

- [x] **3.3**: Add screenshot button to UI
  - Modify `ViewerControls.tsx`
  - Add camera icon button
  - Keyboard shortcut: F12 or PrintScreen
  - Flash white overlay briefly when screenshot taken

- [x] **3.4**: Implement screenshot download
  - Create temporary `<a>` element with `download` attribute
  - Set `href` to blob URL
  - Trigger click
  - Generate filename: `quake2ts_screenshot_YYYY-MM-DD_HH-MM-SS.png`

- [x] **3.5**: Add screenshot settings
  - [x] Format selection (PNG/JPEG)
  - [x] JPEG quality slider
  - [x] Resolution multiplier (1x, 2x, 4x for high-res captures)
  - [x] Include HUD toggle (capture with or without UI overlays)

- [ ] **3.6**: Implement burst mode (optional)
  - Capture multiple screenshots rapidly
  - Useful for creating animations
  - Save all as ZIP file

**File References**:
- Create: `src/services/screenshotService.ts`
- Modify: `src/components/UniversalViewer/ViewerControls.tsx` (button)
- Create: `src/components/ScreenshotSettings.tsx`

**Test Requirements**:
- Unit: `tests/unit/screenshotService.test.ts`
  - Mock canvas.toBlob
  - Test blob generation
  - Test download trigger
- Integration: `tests/integration/screenshot.integration.test.tsx`
  - Render scene, capture screenshot
  - Verify blob is valid image

---

### Task 4: Video Recording

**Objective**: Record gameplay or demo playback as video file.

#### Subtasks

- [x] **4.1**: Create `src/services/videoRecorder.ts`
  - Import `MediaRecorder` API
  - Export `startRecording(canvas: HTMLCanvasElement, options: RecordOptions): void`
  - Export `stopRecording(): Promise<Blob>`
  - Export `isRecording(): boolean`

- [x] **4.2**: Implement video recording
  - Use `canvas.captureStream(fps)` to get MediaStream
  - Create `MediaRecorder` with WebM codec
  - Collect data chunks in array
  - On stop, create Blob from chunks

- [x] **4.3**: Add recording UI
  - Add record button to ViewerControls (red circle icon)
  - Show recording indicator (flashing red dot + elapsed time)
  - Stop button saves video

- [x] **4.4**: Implement video settings
  - Frame rate (30, 60 FPS)
  - Video bitrate (quality)
  - Resolution (match canvas or custom)
  - Audio recording toggle (if audio context available)

- [x] **4.5**: Handle download
  - Same pattern as screenshot
  - Filename: `quake2ts_recording_YYYY-MM-DD_HH-MM-SS.webm`
  - Show file size before download

- [x] **4.6**: Add recording limits
  - Warn if recording > 60 seconds (large file)
  - Auto-stop at configurable limit (e.g., 5 minutes)
  - Display estimated file size during recording

**File References**:
- Create: `src/services/videoRecorder.ts`
- Modify: `src/components/UniversalViewer/ViewerControls.tsx` (button)
- Create: `src/components/VideoSettings.tsx`

**Test Requirements**:
- Unit: `tests/unit/videoRecorder.test.ts`
  - Mock MediaRecorder
  - Test start/stop flow
  - Test chunk collection
- Integration: `tests/integration/videoRecording.integration.test.tsx`
  - Record short video, verify blob
  - Test with mock canvas stream

---

### Task 5: Lighting Controls

**Objective**: Expose lighting parameters for artistic and debugging purposes.

#### Subtasks

- [x] **5.1**: Create `src/components/LightingControls.tsx`
  - Panel or section in ViewerControls
  - Collapsible/expandable

- [x] **5.2**: Implement brightness control
  - Slider: 0.0 (black) to 2.0 (overexposed)
  - Default: 1.0 (normal)
  - Pass to renderer as uniform or post-process multiplier
  - **Library Enhancement Needed**: Brightness adjustment API (Partially implemented via light style scaling)

- [ ] **5.3**: Implement gamma correction
  - Slider: 0.5 to 3.0
  - Default: 1.0 (linear)
  - Gamma curve affects midtones
  - Apply in fragment shader or post-process (Blocked by shader support)

- [ ] **5.4**: Implement light style overrides
  - Quake II uses light styles for flickering/pulsing lights
  - Allow overriding light style patterns
  - Freeze animated lights for static screenshots
  - **Library Enhancement Needed**: Light style API (Light style array resolved but API to freeze/override needed)

- [x] **5.5**: Add fullbright mode
  - Disable lighting, render all surfaces at full brightness
  - Useful for seeing geometry without shadows
  - Toggle button

- [x] **5.6**: Implement ambient light adjustment
  - Increase minimum light level
  - Prevents pure black areas
  - Useful for visibility in dark maps (Partially covered by brightness/fullbright)

**File References**:
- Create: `src/components/LightingControls.tsx`
- Modify: `src/components/UniversalViewer/UniversalViewer.tsx` (apply lighting params)
- Modify: `src/components/UniversalViewer/adapters/BspAdapter.ts` (pass to renderer)

**Test Requirements**:
- Unit: `tests/unit/LightingControls.test.tsx`
  - Render controls
  - Test slider interactions
  - Verify state updates
- Integration: `tests/integration/lightingAdjustment.integration.test.tsx`
  - Adjust brightness, verify visual change
  - Test gamma correction

---

### Task 6: Post-Processing Effects (Optional)

**Objective**: Add optional post-processing for visual enhancement.

#### Subtasks

- [ ] **6.1**: Create post-processing framework
  - Render scene to framebuffer texture
  - Apply fragment shader to full-screen quad
  - Display final result

- [ ] **6.2**: Implement bloom effect
  - Extract bright pixels (threshold)
  - Gaussian blur
  - Composite back over scene
  - Intensity slider

- [ ] **6.3**: Implement FXAA (anti-aliasing)
  - Apply FXAA shader as post-process
  - Smooth jagged edges
  - Toggle on/off

- [ ] **6.4**: Implement color grading
  - Adjust hue, saturation, contrast
  - Use LUT (lookup table) textures for advanced grading
  - Presets: Neutral, Warm, Cool, Desaturated

- [ ] **6.5**: Add post-process settings panel
  - Enable/disable each effect
  - Adjust parameters
  - Save presets

**File References**:
- Create: `src/shaders/postProcess.frag`
- Create: `src/utils/postProcessing.ts`
- Create: `src/components/PostProcessSettings.tsx`
- Modify: `src/components/UniversalViewer/UniversalViewer.tsx` (framebuffer rendering)

**Test Requirements**:
- Unit: `tests/unit/postProcessing.test.ts`
  - Test shader compilation
  - Test framebuffer creation
- Integration: `tests/integration/postProcess.integration.test.tsx`
  - Apply bloom, verify visual difference
  - Test performance impact

---

## Acceptance Criteria

Section 04 is complete when:

- ✅ User can enable debug modes (bounds, normals, PVS, collision hulls, lightmaps)
- ✅ Performance dashboard displays FPS, draw calls, triangle count, memory usage
- ✅ Performance graph visualizes FPS over time
- ✅ User can capture screenshots in PNG or JPEG format
- ✅ User can record videos in WebM format with configurable settings
- ✅ Lighting controls allow adjusting brightness, gamma, fullbright mode
- ✅ Post-processing effects (bloom, FXAA, color grading) are available
- ✅ All features work across BSP, MD2, MD3, and demo rendering
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify screenshot/video output integrity

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/engine`: `Renderer` class

**Enhancements Needed** (see `library-enhancements.md`):
- `Renderer.getStatistics(): RenderStatistics` - Expose render metrics
- `Renderer.setDebugMode(mode)` - Enable debug visualizations
- Entity bounds access for bounding box rendering
- PVS cluster data access for cluster visualization
- Light style API for dynamic light control
- Brightness/gamma adjustment hooks
- Memory tracking API

## Notes

- Debug modes are invaluable for developers learning Quake II engine architecture
- Performance dashboard useful for optimization work (Section 09)
- Screenshot/video capture essential for content creators
- Lighting controls help artists create better screenshots
- Post-processing is optional (performance cost) but adds polish
- Some features may require library enhancements - prioritize based on library availability
