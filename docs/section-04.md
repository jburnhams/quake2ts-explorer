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

**Status**: ✅ Completed

**Already Implemented**:
- Basic render modes in `src/components/UniversalViewer/ViewerControls.tsx`
- Debug overlays (bounds, normals, PVS, collision hulls, lightmaps)
- Performance metrics display (stats overlay and graph)
- Screenshot/video capture with settings
- Lighting controls (brightness, gamma, fullbright, freeze lights)
- Post-processing effects (bloom, FXAA, color grading)

**Missing**:
- None

## Tasks and Subtasks

### Task 1: Debug Visualization Modes

**Objective**: Provide visual debugging tools for developers analyzing geometry and rendering.

#### Subtasks

- [x] **1.1**: Implement bounding box visualization
  - Modified adapters (`BspAdapter.ts`, `Md2Adapter.ts`, `Md3Adapter.ts`)
  - Added method `setDebugMode(mode: DebugMode): void`
  - For `DebugMode.BoundingBoxes`:
    - Renders AABB wireframe for each entity
    - Uses different colors for different entity types (players, items, triggers)

- [x] **1.2**: Implement normal visualization
  - For `DebugMode.Normals`:
    - Renders short lines from vertices in direction of normals
    - Useful for diagnosing lighting issues
    - Uses bright colors (cyan for face normals, yellow for vertex normals)

- [x] **1.3**: Implement PVS cluster visualization (BSP only)
  - For `DebugMode.PVSClusters`:
    - Colors each BSP leaf by cluster ID
    - Shows current cluster player is in (highlighted)
    - Displays cluster boundaries

- [x] **1.4**: Implement collision hull visualization
  - For `DebugMode.CollisionHulls`:
    - Renders collision geometry (simplified hulls)
    - Different colors for different content types (solid, water, lava, etc.)
    - Shows player bounding box interacting with world

- [x] **1.5**: Implement lightmap visualization
  - For `DebugMode.Lightmaps`:
    - Renders surfaces with only lightmap (no textures)
    - Useful for analyzing light quality
    - Shows light styles and dynamic lights

- [x] **1.6**: Add debug mode selector UI
  - Modified `ViewerControls.tsx`
  - Added dropdown: "Debug Mode"
  - Allows combining debug modes with render modes

**File References**:
- `src/components/UniversalViewer/adapters/BspAdapter.ts`
- `src/components/UniversalViewer/adapters/Md2Adapter.ts`
- `src/components/UniversalViewer/adapters/Md3Adapter.ts`
- `src/components/UniversalViewer/ViewerControls.tsx`
- `src/types/debugMode.ts`

**Test Requirements**:
- Unit: `tests/unit/adapters.debugMode.test.ts`
- Integration: `tests/integration/debugRendering.integration.test.tsx`

---

### Task 2: Performance Statistics Dashboard

**Objective**: Display real-time rendering performance metrics for optimization and profiling.

#### Subtasks

- [x] **2.1**: Create `src/components/PerformanceStats.tsx`
- [x] **2.2**: Implement FPS counter
- [x] **2.3**: Expose renderer statistics
- [x] **2.4**: Display memory usage
- [x] **2.5**: Add GPU timing queries
- [x] **2.6**: Implement performance graph
- [x] **2.7**: Add profiling markers

**File References**:
- `src/components/PerformanceStats.tsx`
- `src/components/PerformanceGraph.tsx`
- `src/services/performanceService.ts`

**Test Requirements**:
- Unit: `tests/unit/components/PerformanceStats.test.tsx`
- Unit: `tests/unit/services/performanceService.test.ts`

---

### Task 3: Screenshot Capture

**Objective**: Allow users to capture high-quality screenshots from the 3D view.

#### Subtasks

- [x] **3.1**: Create `src/services/screenshotService.ts`
- [x] **3.2**: Implement screenshot capture
- [x] **3.3**: Add screenshot button to UI
- [x] **3.4**: Implement screenshot download
- [x] **3.5**: Add screenshot settings
- [x] **3.6**: Implement burst mode (optional)

**File References**:
- `src/services/screenshotService.ts`
- `src/components/UniversalViewer/ViewerControls.tsx`
- `src/components/ScreenshotSettings.tsx`

**Test Requirements**:
- Unit: `tests/unit/services/screenshotService.test.ts`
- Integration: `tests/integration/screenshot.integration.test.tsx`

---

### Task 4: Video Recording

**Objective**: Record gameplay or demo playback as video file.

#### Subtasks

- [x] **4.1**: Create `src/services/videoRecorder.ts`
- [x] **4.2**: Implement video recording
- [x] **4.3**: Add recording UI
- [x] **4.4**: Implement video settings
- [x] **4.5**: Handle download
- [x] **4.6**: Add recording limits

**File References**:
- `src/services/videoRecorder.ts`
- `src/components/UniversalViewer/ViewerControls.tsx`
- `src/components/VideoSettings.tsx`

**Test Requirements**:
- Unit: `tests/unit/services/videoRecorder.test.ts`
- Integration: `tests/integration/videoRecording.integration.test.tsx`

---

### Task 5: Lighting Controls

**Objective**: Expose lighting parameters for artistic and debugging purposes.

#### Subtasks

- [x] **5.1**: Create `src/components/LightingControls.tsx`
- [x] **5.2**: Implement brightness control
- [x] **5.3**: Implement gamma correction
- [x] **5.4**: Implement light style overrides
- [x] **5.5**: Add fullbright mode
- [x] **5.6**: Implement ambient light adjustment

**File References**:
- `src/components/LightingControls.tsx`
- `src/components/UniversalViewer/UniversalViewer.tsx`
- `src/components/UniversalViewer/adapters/BspAdapter.ts`

**Test Requirements**:
- Unit: `tests/unit/components/LightingControls.test.tsx`
- Integration: `tests/integration/lightingAdjustment.integration.test.tsx`

---

### Task 6: Post-Processing Effects

**Objective**: Add optional post-processing for visual enhancement.

#### Subtasks

- [x] **6.1**: Create post-processing framework
- [x] **6.2**: Implement bloom effect
- [x] **6.3**: Implement FXAA (anti-aliasing)
- [x] **6.4**: Implement color grading
- [x] **6.5**: Add post-process settings panel

**File References**:
- `src/shaders/postProcess.frag`
- `src/utils/postProcessing.ts`
- `src/components/PostProcessSettings.tsx`

**Test Requirements**:
- Unit: `tests/unit/utils/postProcessing.test.ts`
- Integration: `tests/integration/postProcess.integration.test.tsx`

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
