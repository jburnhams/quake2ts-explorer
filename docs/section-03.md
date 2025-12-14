# Section 03: Enhanced Demo System

## Overview

Extend the existing demo playback implementation (Pattern 3, already partially implemented) with professional-grade analysis and control features. This transforms the basic demo player into a comprehensive replay analysis tool.

**Complexity**: Medium
**Dependencies**: None (enhances existing functionality)
**Estimated Scope**: Timeline UI, frame navigation, recording, statistics, camera modes, bookmarks

## Objectives

- Add visual timeline scrubber with frame thumbnails
- Implement frame-by-frame navigation (step forward/backward)
- Enable demo recording from live gameplay (single-player and multiplayer)
- Display real-time statistics overlay (speed, position, angles)
- Support multiple camera modes (free cam, follow player, cinematic paths)
- Allow bookmarking and extracting clips from demos
- Provide demo metadata editing

## Current State

**Already Implemented**:
- Basic demo playback via `DemoPlaybackController` from `@quake2ts/client`
- Play/pause controls in `src/components/UniversalViewer/ViewerControls.tsx`
- Speed adjustment (playback rate slider)
- Demo rendering via `Dm2Adapter` in `src/components/UniversalViewer/adapters/Dm2Adapter.ts`
- **Partial**: Timeline UI (scrubber, markers, placeholders for thumbnails)
- **Partial**: Frame-by-frame navigation (buttons, shortcuts, overlay)

**Missing**:
- Recording from gameplay
- Statistics overlay
- Advanced camera controls
- Bookmarking system
- Metadata editor

## Tasks and Subtasks

### Task 1: Enhanced Timeline UI

**Objective**: Create visual timeline with scrubber, thumbnails, and event markers.

#### Subtasks

- [x] **1.1**: Create `src/components/DemoTimeline.tsx`
  - Render as horizontal bar at bottom of screen when demo active
  - Display playback position indicator (draggable)
  - Show total duration and current time
  - Mark current frame number and total frames

- [x] **1.2**: Implement scrubber interaction
  - Click anywhere on timeline to seek
  - Drag playhead to scrub through demo
  - Display time tooltip while hovering/dragging
  - Call `controller.seekToTime(seconds)` on release

- [x] **1.3**: Add frame thumbnails
  - Generate thumbnails at regular intervals (every 100 frames or 10 seconds)
  - Display mini thumbnails along timeline
  - Show larger preview on hover
  - Cache thumbnails for performance
  - *Note: Implemented as metadata preview placeholder due to performance constraints of headless generation.*

- [x] **1.4**: Implement event markers
  - Parse demo events (kills, deaths, pickups, objectives)
  - **Library Enhancement Needed**: `DemoPlaybackController.getEvents(): DemoEvent[]`
  - Display markers on timeline (colored dots/icons)
  - Click marker to jump to event
  - Show event details on hover

- [ ] **1.5**: Add zoom controls
  - Zoom in/out on timeline to show more detail
  - Pan when zoomed (drag timeline)
  - Reset zoom button

- [ ] **1.6**: Style timeline
  - Match dark theme from `src/App.css`
  - Semi-transparent background
  - Smooth animations
  - Responsive width

**File References**:
- Create: `src/components/DemoTimeline.tsx`
- Create: `src/components/DemoTimeline.css`
- Modify: `src/components/UniversalViewer/adapters/Dm2Adapter.ts` (integrate timeline)
- Reference: `@quake2ts/client` (`/packages/client/src/demo/playback.ts`)

**Test Requirements**:
- Unit: `tests/unit/DemoTimeline.test.tsx`
  - Render with mock demo controller
  - Test scrubber drag interaction
  - Test seek on click
  - Test thumbnail display
- Integration: `tests/integration/demoTimeline.integration.test.tsx`
  - Load real demo file
  - Verify timeline matches demo duration
  - Test seeking to various positions

---

### Task 2: Frame-by-Frame Navigation

**Objective**: Allow precise control over demo playback frame by frame.

#### Subtasks

- [x] **2.1**: Modify `src/components/UniversalViewer/ViewerControls.tsx`
  - Add "Step Backward" button (◄◄ icon)
  - Add "Step Forward" button (►►  icon)
  - Disable when demo not paused
  - Call `controller.stepForward(1)` and `controller.stepBackward(1)`

- [x] **2.2**: Implement keyboard shortcuts
  - Left arrow: Step backward 1 frame
  - Right arrow: Step forward 1 frame
  - Shift+Left: Step backward 10 frames
  - Shift+Right: Step forward 10 frames
  - Home: Jump to beginning
  - End: Jump to end

- [x] **2.3**: Display frame info overlay
  - Show current frame number prominently
  - Show frame time (milliseconds into demo)
  - Show server tick count (if available)
  - Toggle with F key or button

- [ ] **2.4**: Implement smooth frame interpolation
  - When stepping, smoothly interpolate to next frame
  - Avoid jarring camera jumps
  - Render intermediate positions if possible

**File References**:
- Modify: `src/components/UniversalViewer/ViewerControls.tsx`
- Modify: `src/components/UniversalViewer/adapters/Dm2Adapter.ts`
- Create: `src/components/FrameInfo.tsx` (frame overlay)

**Test Requirements**:
- Unit: `tests/unit/ViewerControls.demoStepping.test.tsx`
  - Test step forward/backward buttons
  - Verify controller methods called
- Integration: `tests/integration/demoStepping.integration.test.tsx`
  - Load demo, step through frames
  - Verify frame numbers increment correctly

---

### Task 3: Demo Recording

**Objective**: Record demos from live gameplay (single-player and multiplayer).

#### Subtasks

- [x] **3.1**: Create `src/services/demoRecorder.ts`
  - Import `DemoRecorder` from `@quake2ts/client` (if available)
  - Export `startRecording(name: string): void`
  - Export `stopRecording(): Uint8Array`
  - Export `isRecording(): boolean`

- [x] **3.2**: Integrate recording with game loop
  - Modify `src/utils/gameLoop.ts`
  - On each simulation tick, record frame data
    - Snapshot entities
    - Record UserCommands
    - Record events (sounds, effects, chat)
  - Pass to recorder

- [x] **3.3**: Implement recording UI
  - Add "Record Demo" button to pause menu (Section 01)
  - Show recording indicator (red dot) when active
  - Show elapsed recording time
  - "Stop Recording" button
    - Prompts for filename
    - Saves demo to browser storage or downloads as file

- [ ] **3.4**: Support auto-recording
  - Add setting: "Auto-record multiplayer matches"
  - Automatically start recording on match start
  - Stop on match end
  - Save with auto-generated name (e.g., `match_2025-01-15_14-30.dm2`)

- [ ] **3.5**: Handle demo storage
  - Store demos in IndexedDB (large files)
  - List recorded demos in demo browser
  - Allow playback of recorded demos
  - Export/download demo files
  - Delete old demos to manage storage

**File References**:
- Create: `src/services/demoRecorder.ts`
- Modify: `src/utils/gameLoop.ts` (integrate recorder)
- Create: `src/components/DemoBrowser.tsx` (list recorded demos)
- Modify: `src/components/GameMenu.tsx` (add record button)
- Reference: `@quake2ts/client` (`/packages/client/src/demo/recorder.ts`)

**Test Requirements**:
- Unit: `tests/unit/demoRecorder.test.ts`
  - Test start/stop recording
  - Test frame data capture
  - Mock DemoRecorder from library
- Integration: `tests/integration/demoRecording.integration.test.tsx`
  - Record short gameplay session
  - Stop recording, verify output
  - Play back recorded demo, verify matches

---

### Task 4: Statistics Overlay

**Objective**: Display real-time statistics during demo playback for analysis.

#### Subtasks

- [x] **4.1**: Create `src/components/DemoStats.tsx`
  - Render as overlay (toggleable with S key or button)
  - Semi-transparent panel in top-right corner

- [x] **4.2**: Display player statistics
  - Current speed (units per second)
  - Position (x, y, z coordinates)
  - View angles (pitch, yaw, roll)
  - Velocity (vx, vy, vz)
  - Health, armor, ammo (from PlayerState)
  - Current weapon

- [x] **4.3**: Display performance statistics
  - Frames per second (client rendering)
  - Server tick rate (from demo metadata)
  - Frame time (ms per frame)

- [x] **4.4**: Display match statistics (if multiplayer demo)
  - **Library Enhancement Needed**: Extract player scores, kills, deaths
  - Scoreboard overlay
  - Kill feed (recent kills)
  - Team scores (if team game)

- [ ] **4.5**: Add speed graph
  - Plot speed over time
  - Useful for speedrun analysis
  - Highlight jumps, acceleration events

- [ ] **4.6**: Make stats configurable
  - Toggle individual stat displays
  - Adjust overlay position and size
  - Save preferences to localStorage

**File References**:
- Create: `src/components/DemoStats.tsx`
- Create: `src/components/DemoStats.css`
- Create: `src/components/SpeedGraph.tsx`
- Modify: `src/components/UniversalViewer/adapters/Dm2Adapter.ts` (expose demo state)

**Test Requirements**:
- Unit: `tests/unit/DemoStats.test.tsx`
  - Render with mock PlayerState
  - Verify all stats displayed correctly
  - Test toggle visibility
- Unit: `tests/unit/SpeedGraph.test.tsx`
  - Render with mock speed data
  - Verify graph accuracy

---

### Task 5: Advanced Camera Modes

**Objective**: Provide multiple camera modes for cinematic replay viewing.

#### Subtasks

- [ ] **5.1**: Implement camera mode enum
  - `FirstPerson` - Player's view (default)
  - `ThirdPerson` - Follow behind player
  - `FreeCam` - User-controlled free camera
  - `Cinematic` - Scripted camera path
  - `Orbital` - Orbit around player

- [ ] **5.2**: Modify `Dm2Adapter` for camera override
  - Already supports `hasCameraControl()` and `getCameraUpdate()`
  - Implement each camera mode:
    - **FirstPerson**: Use player's viewangles from PlayerState
    - **ThirdPerson**: Offset camera behind player (configurable distance)
    - **FreeCam**: WASD + mouse control (reuse existing camera utils)
    - **Orbital**: Rotate around player at fixed distance
    - **Cinematic**: Interpolate along predefined path

- [ ] **5.3**: Add camera mode selector UI
  - Dropdown or button group in ViewerControls
  - Keyboard shortcuts:
    - C: Cycle camera modes
    - 1: First-person
    - 2: Third-person
    - 3: Free cam

- [ ] **5.4**: Implement third-person camera
  - Position camera behind player at configurable distance (default: 100 units)
  - Collision detection: Don't place camera inside walls
  - Smooth camera following (lag slightly for cinematic feel)

- [ ] **5.5**: Implement cinematic camera paths
  - Define camera path as array of keyframes (position, target, time)
  - Interpolate between keyframes using splines
  - Editor for creating camera paths (optional, advanced feature)

- [ ] **5.6**: Add camera settings
  - Third-person distance slider
  - Third-person FOV
  - Free cam movement speed
  - Cinematic path playback speed

**File References**:
- Modify: `src/components/UniversalViewer/adapters/Dm2Adapter.ts` (camera modes)
- Modify: `src/components/UniversalViewer/ViewerControls.tsx` (mode selector)
- Create: `src/utils/cameraPath.ts` (cinematic paths)
- Create: `src/components/CameraSettings.tsx`

**Test Requirements**:
- Unit: `tests/unit/Dm2Adapter.cameraMode.test.ts`
  - Test each camera mode
  - Verify camera position calculations
  - Test mode switching
- Integration: `tests/integration/demoCameras.integration.test.tsx`
  - Load demo, switch camera modes
  - Verify rendering from different perspectives

---

### Task 6: Bookmarking and Clip Extraction

**Objective**: Allow users to mark interesting moments and extract clips.

#### Subtasks

- [ ] **6.1**: Create `src/services/bookmarkService.ts`
  - Export `addBookmark(name: string, frame: number): void`
  - Export `getBookmarks(): Bookmark[]`
  - Export `deleteBookmark(id: string): void`
  - Export `exportClip(startFrame: number, endFrame: number): Uint8Array`
  - Store bookmarks in localStorage per demo file

- [ ] **6.2**: Implement bookmark UI
  - Add "Bookmark" button to demo controls
  - Shows bookmark creation dialog (name, optional notes)
  - Display bookmarks on timeline as icons
  - Click bookmark to jump to frame

- [ ] **6.3**: Create bookmark list panel
  - Show all bookmarks for current demo
  - Click to jump
  - Edit name/notes
  - Delete bookmark

- [ ] **6.4**: Implement clip extraction
  - Select start and end frames on timeline (drag to select range)
  - "Extract Clip" button
  - Creates new demo file from frame range
    - **Library Enhancement Needed**: `extractDemoRange(demo: Uint8Array, start: number, end: number): Uint8Array`
  - Download or save to browser storage

- [ ] **6.5**: Add bookmark export/import
  - Export bookmarks as JSON file
  - Import bookmarks from JSON
  - Share bookmarks with others for same demo file

**File References**:
- Create: `src/services/bookmarkService.ts`
- Create: `src/components/BookmarkDialog.tsx`
- Create: `src/components/BookmarkList.tsx`
- Modify: `src/components/DemoTimeline.tsx` (bookmark markers)

**Test Requirements**:
- Unit: `tests/unit/bookmarkService.test.ts`
  - Test bookmark CRUD operations
  - Test export/import
  - Mock localStorage
- Unit: `tests/unit/BookmarkList.test.tsx`
  - Render bookmark list
  - Test interactions

---

### Task 7: Demo Metadata Editor

**Objective**: View and edit demo file metadata.

#### Subtasks

- [ ] **7.1**: Create `src/components/DemoMetadata.tsx`
  - Show demo properties:
    - File name
    - File size
    - Duration (time, frames)
    - Map name
    - Player name(s)
    - Server name (if multiplayer)
    - Recording date (if available)
  - Editable fields: Custom name, description, tags

- [ ] **7.2**: Implement metadata storage
  - Store metadata separate from demo file (IndexedDB or localStorage)
  - Key by demo file hash or filename
  - Associate metadata with demo

- [ ] **7.3**: Add tagging system
  - Allow adding custom tags (e.g., "speedrun", "frag movie", "tournament")
  - Filter demos by tags in demo browser

- [ ] **7.4**: Implement demo search
  - Search demos by name, tags, map
  - Sort by date, duration, size
  - Display in demo browser

**File References**:
- Create: `src/components/DemoMetadata.tsx`
- Create: `src/services/demoMetadataService.ts`
- Modify: `src/components/DemoBrowser.tsx` (search and filter)

**Test Requirements**:
- Unit: `tests/unit/demoMetadataService.test.ts`
  - Test metadata CRUD
  - Test search and filtering
- Unit: `tests/unit/DemoMetadata.test.tsx`
  - Render metadata editor
  - Test editing and saving

---

## Acceptance Criteria

Section 03 is complete when:

- ✅ User can scrub demo timeline with visual feedback and thumbnails
- ✅ User can step frame-by-frame forward and backward
- ✅ User can record demos from single-player and multiplayer gameplay
- ✅ Statistics overlay displays player speed, position, health, and performance metrics
- ✅ User can switch between camera modes (first-person, third-person, free cam)
- ✅ User can create bookmarks and extract clips from demos
- ✅ User can edit demo metadata (name, description, tags)
- ✅ Demo browser supports search and filtering
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify demo recording and playback fidelity

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/client`: `DemoPlaybackController`, `DemoRecorder`
- Demo file format specification (for clip extraction)

**Enhancements Needed** (see `library-enhancements.md`):
- `DemoPlaybackController.getEvents(): DemoEvent[]` - Extract events from demo
- `DemoRecorder` enhancements for game loop integration
- `extractDemoRange(demo, start, end): Uint8Array` - Clip extraction utility
- Match statistics extraction from demo files

## Notes

- Enhanced demo system is standalone (no dependencies on Sections 01-02)
- Can be implemented and tested independently
- Useful for speedrunners, competitive players, content creators
- Frame thumbnails may impact performance - use Web Workers for generation (Section 09)
- Cinematic camera paths could be editor feature (Section 06)
