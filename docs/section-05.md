# Section 05: Asset Analysis Tools

## Overview

Transform the application into a comprehensive asset analysis toolkit for Quake II developers, mod creators, and researchers. Provide detailed inspection tools for textures, models, maps, audio, and entities beyond basic preview.

**Complexity**: Medium
**Dependencies**: None (extends existing asset preview)
**Estimated Scope**: Texture atlas viewer, model animation inspector, BSP analyzer, entity database, lightmap inspector, sound visualizer

## Objectives

- Build texture atlas viewer with UV mapping visualization
- Create model animation inspector with skeleton and keyframe analysis
- Develop BSP geometry analyzer with surface statistics and optimization insights
- Implement searchable entity database with property inspection
- Add lightmap inspector for individual lightmap viewing
- Provide sound waveform visualizer with detailed audio analysis
- Display material/surface flag information

## Current State

**Already Implemented**:
- Basic asset preview in `src/components/PreviewPanel.tsx`:
  - Images (PCX, WAL, TGA) via `ImagePreview.tsx`
  - Models (MD2, MD3) via `UniversalViewer`
  - Audio (WAV) via `AudioPreview.tsx`
  - BSP maps via `BspAdapter`
- File metadata display in `src/components/MetadataPanel.tsx`

**Missing**:
- Deep analysis tools for each asset type
- Statistics and optimization insights
- Cross-referencing assets (e.g., which models use which textures)
- Batch analysis and reporting

## Tasks and Subtasks

### Task 1: Texture Atlas Viewer

**Objective**: Advanced texture inspection with UV mapping, format details, and usage tracking.

#### Subtasks

- [x] **1.1**: Create `src/components/TextureAtlas.tsx`
  - Replace/extend `ImagePreview` for selected textures
  - Display texture at multiple zoom levels (25%, 50%, 100%, 200%, 400%)
  - Pixel grid overlay at high zoom
  - Pan and zoom controls

- [x] **1.2**: Display texture metadata
  - Dimensions (width x height)
  - Format (PCX, WAL, TGA)
  - Color depth (8-bit indexed, 24-bit RGB, 32-bit RGBA)
  - File size (compressed and uncompressed)
  - Mipmap levels (if applicable)
  - Palette information (for 8-bit textures)

- [x] **1.3**: Implement palette viewer
  - For 8-bit textures, show palette as color swatches
  - Display 256 colors in grid
  - Click color to see index and RGB values
  - Highlight transparent color (index 255 typically)

- [ ] **1.4**: Show texture usage
  - **Library Enhancement Needed**: Cross-reference API
  - List models that use this texture
  - List BSP surfaces that use this texture
  - Count total usage instances
  - "Find in Files" functionality

- [ ] **1.5**: Implement UV mapping visualization (for models)
  - Overlay UV coordinates on texture
  - Show which parts of texture are used
  - Highlight unused areas
  - Detect UV seams and overlaps

- [x] **1.6**: Add texture export
  - Export as PNG (with palette applied for 8-bit)
  - Export palette separately (GPL, ACT formats)
  - Export all mipmaps

**File References**:
- Create: `src/components/TextureAtlas.tsx`
- Create: `src/components/TextureAtlas.css`
- Create: `src/components/PaletteViewer.tsx`
- Create: `src/services/assetCrossRefService.ts`
- Modify: `src/components/PreviewPanel.tsx` (use TextureAtlas)

**Test Requirements**:
- Unit: `tests/unit/TextureAtlas.test.tsx`
  - Render with mock texture data
  - Test zoom and pan
  - Test palette display
- Integration: `tests/integration/textureAtlas.integration.test.tsx`
  - Load real PAK, display textures
  - Verify metadata accuracy
  - Test export functionality

---

### Task 2: Model Animation Inspector

**Objective**: Detailed model analysis with frame-by-frame animation scrubbing and skeletal visualization.

#### Subtasks

- [ ] **2.1**: Create `src/components/ModelInspector.tsx`
  - Replace/extend UniversalViewer for selected models
  - Left panel: Animation list
  - Center: 3D model view
  - Right panel: Frame details and skeleton
  - Bottom: Animation timeline

- [ ] **2.2**: Implement animation list
  - Parse MD2/MD3 animations using `groupMd2Animations()` from library
  - Display animation names (walk, run, attack, etc.)
  - Show frame range for each animation
  - Select animation to play or scrub

- [ ] **2.3**: Add animation timeline
  - Horizontal scrubber showing all frames
  - Current frame indicator
  - Playback controls (play, pause, loop)
  - Frame rate adjustment
  - Step forward/backward frame buttons

- [ ] **2.4**: Display frame metadata
  - For current frame:
    - Frame number
    - Bounding box (mins, maxs)
    - Vertex count
    - Normal count
    - Frame name (if available)

- [ ] **2.5**: Implement skeleton visualization (MD3 only)
  - MD3 models use tag system for skeletal animation
  - Draw lines between tags (bones)
  - Show tag names and positions
  - Highlight tag transformations during animation

- [ ] **2.6**: Add vertex/triangle statistics
  - Total vertex count
  - Total triangle count
  - Per-surface breakdown (MD3)
  - Detect degenerate triangles
  - Display polygon density heatmap

- [ ] **2.7**: Implement model export
  - Export individual frame as OBJ
  - Export entire animation as FBX or GLTF (if library supports)
  - Export skeleton/tags for rigging in Blender

**File References**:
- Create: `src/components/ModelInspector.tsx`
- Create: `src/components/ModelInspector.css`
- Create: `src/components/AnimationTimeline.tsx`
- Create: `src/components/SkeletonViewer.tsx`
- Modify: `src/components/PreviewPanel.tsx` (use ModelInspector)
- Reference: `@quake2ts/engine` (`parseMd2`, `parseMd3`, `groupMd2Animations`)

**Test Requirements**:
- Unit: `tests/unit/ModelInspector.test.tsx`
  - Render with mock MD2 data
  - Test animation selection
  - Test timeline scrubbing
- Integration: `tests/integration/modelInspector.integration.test.tsx`
  - Load real model, verify frame count
  - Test animation playback

---

### Task 3: BSP Geometry Analyzer

**Objective**: Provide detailed analysis of BSP maps for optimization and understanding.

#### Subtasks

- [ ] **3.1**: Create `src/components/BspAnalyzer.tsx`
  - Tabbed interface:
    - Overview
    - Geometry
    - Lightmaps
    - Visibility (PVS)
    - Entities

- [ ] **3.2**: Implement Overview tab
  - Map name and filename
  - Total file size
  - Bounding box (world mins/maxs)
  - Number of models (submodels for doors, platforms)
  - Number of entities
  - Number of textures referenced

- [ ] **3.3**: Implement Geometry tab
  - Number of vertices
  - Number of faces (surfaces)
  - Number of brushes (solid geometry)
  - Number of nodes, leaves
  - Average triangles per surface
  - Largest surfaces (by triangle count)
  - Texture usage breakdown (which textures used most)

- [ ] **3.4**: Implement Lightmaps tab
  - Number of lightmap atlases
  - Total lightmap memory usage
  - Lightmap resolution (pixels per world unit)
  - List of light entities and their properties
  - Light style usage (animated lights)

- [ ] **3.5**: Implement Visibility (PVS) tab
  - Number of PVS clusters
  - Average cluster size (surfaces per cluster)
  - Potentially visible set statistics
  - Visualize cluster connectivity (graph)

- [ ] **3.6**: Implement Entities tab
  - Total entity count
  - Entity type breakdown (classname distribution)
  - Entity properties spreadsheet view
  - Filter and search entities
  - Export entity data as JSON or ENT file

- [ ] **3.7**: Add optimization suggestions
  - Detect oversized surfaces (recommend subdivision)
  - Detect high-poly areas (performance hotspots)
  - Identify unused textures
  - Suggest lightmap optimizations

**File References**:
- Create: `src/components/BspAnalyzer.tsx`
- Create: `src/components/BspAnalyzer.css`
- Create: `src/components/BspGeometryTab.tsx`
- Create: `src/components/BspLightmapsTab.tsx`
- Create: `src/components/BspPvsTab.tsx`
- Create: `src/components/BspEntitiesTab.tsx`
- Create: `src/services/bspAnalysisService.ts`
- Reference: `@quake2ts/engine` (`parseBsp`, `BspMap`)

**Test Requirements**:
- Unit: `tests/unit/BspAnalyzer.test.tsx`
  - Render with mock BSP data
  - Test tab switching
  - Test statistics calculations
- Integration: `tests/integration/bspAnalyzer.integration.test.tsx`
  - Load real map, verify statistics
  - Test entity export

---

### Task 4: Entity Database Browser

**Objective**: Searchable database of all entities across all loaded maps.

#### Subtasks

- [ ] **4.1**: Create `src/components/EntityDatabase.tsx`
  - Table view with columns:
    - Classname
    - Targetname
    - Origin (position)
    - Map (if multiple maps loaded)
    - Properties (collapsed JSON)
  - Sortable columns
  - Pagination (if many entities)

- [ ] **4.2**: Implement entity search
  - Search by classname (e.g., "weapon_", "item_", "monster_")
  - Search by property key or value
  - Filter by map
  - Regex support for advanced queries

- [ ] **4.3**: Implement entity inspector
  - Click entity row to open details panel
  - Display all properties as key-value pairs
  - Editable (for map editor integration, Section 06)
  - Show 3D position in map preview (if map loaded)

- [ ] **4.4**: Add entity type reference
  - Built-in documentation for common entity types
  - Show expected properties and their meanings
  - Link to Quake II modding wiki or docs

- [ ] **4.5**: Implement entity statistics
  - Count entities by type
  - Show distribution chart (bar graph)
  - Identify most common entity types

- [ ] **4.6**: Add entity export
  - Export selected entities as JSON
  - Export entire entity lump as ENT file
  - Import ENT file (for map editor)

**File References**:
- Create: `src/components/EntityDatabase.tsx`
- Create: `src/components/EntityDatabase.css`
- Create: `src/components/EntityInspector.tsx`
- Create: `src/data/entityReference.json` (entity type documentation)
- Create: `src/services/entityService.ts`

**Test Requirements**:
- Unit: `tests/unit/EntityDatabase.test.tsx`
  - Render with mock entities
  - Test search and filtering
  - Test sorting
- Unit: `tests/unit/entityService.test.ts`
  - Test entity parsing
  - Test export/import

---

### Task 5: Lightmap Inspector

**Objective**: View individual lightmaps and analyze lighting quality.

#### Subtasks

- [ ] **5.1**: Create `src/components/LightmapInspector.tsx`
  - Grid view of all lightmaps in current BSP
  - Click lightmap to view full-size
  - Show lightmap index and dimensions

- [ ] **5.2**: Display lightmap metadata
  - For selected lightmap:
    - Width x height
    - Format (RGB or grayscale)
    - Number of surfaces using this lightmap
    - Memory usage

- [ ] **5.3**: Implement lightmap visualization modes
  - Normal (RGB)
  - Grayscale (luminance only)
  - Heatmap (show brightness distribution)
  - Isolate light styles (show each animated light separately)

- [ ] **5.4**: Show surface-to-lightmap mapping
  - Highlight surfaces in 3D view that use selected lightmap
  - Show UV mapping on lightmap texture
  - Detect lightmap seams

- [ ] **5.5**: Analyze lightmap quality
  - Detect over/underexposure (histogram)
  - Identify shadow artifacts
  - Suggest higher/lower resolution where needed

- [ ] **5.6**: Add lightmap export
  - Export individual lightmaps as PNG
  - Export all lightmaps as atlas
  - Export lightmap UVs for external editing

**File References**:
- Create: `src/components/LightmapInspector.tsx`
- Create: `src/components/LightmapInspector.css`
- Create: `src/services/lightmapService.ts`
- Reference: `@quake2ts/engine` (BSP lightmap data)

**Test Requirements**:
- Unit: `tests/unit/LightmapInspector.test.tsx`
  - Render with mock lightmap data
  - Test visualization modes
- Integration: `tests/integration/lightmapInspector.integration.test.tsx`
  - Load map, verify lightmap count
  - Test export

---

### Task 6: Sound Waveform Visualizer

**Objective**: Detailed audio analysis beyond basic playback.

#### Subtasks

- [ ] **6.1**: Create `src/components/SoundAnalyzer.tsx`
  - Replace/extend `AudioPreview` for selected sounds
  - Top: Waveform display
  - Middle: Playback controls
  - Bottom: Frequency spectrum

- [ ] **6.2**: Implement waveform rendering
  - Use Web Audio API `getChannelData()` to get samples
  - Render waveform on canvas
  - Zoom and scroll controls
  - Current playback position indicator

- [ ] **6.3**: Add frequency spectrum analyzer
  - Use Web Audio API `AnalyserNode`
  - Real-time FFT during playback
  - Display as bar graph or spectrogram
  - Identify dominant frequencies

- [ ] **6.4**: Display audio metadata
  - File format (WAV, OGG)
  - Sample rate (Hz)
  - Bit depth (8-bit, 16-bit)
  - Channels (mono, stereo)
  - Duration (seconds)
  - File size

- [ ] **6.5**: Implement audio export
  - Export as WAV (if original is OGG)
  - Normalize volume
  - Trim silence from start/end
  - Resample to different rate

- [ ] **6.6**: Add sound usage tracking
  - **Library Enhancement Needed**: Cross-reference API
  - Show which entities use this sound
  - List maps where sound is used

**File References**:
- Create: `src/components/SoundAnalyzer.tsx`
- Create: `src/components/SoundAnalyzer.css`
- Create: `src/components/WaveformCanvas.tsx`
- Create: `src/components/FrequencySpectrum.tsx`
- Modify: `src/components/PreviewPanel.tsx` (use SoundAnalyzer)

**Test Requirements**:
- Unit: `tests/unit/SoundAnalyzer.test.tsx`
  - Render with mock audio buffer
  - Test playback controls
- Unit: `tests/unit/WaveformCanvas.test.tsx`
  - Test waveform rendering
  - Mock canvas context
- Integration: `tests/integration/soundAnalyzer.integration.test.tsx`
  - Load real sound, verify metadata
  - Test FFT spectrum

---

### Task 7: Material/Surface Flag Inspector

**Objective**: Display surface properties and material flags for debugging.

#### Subtasks

- [ ] **7.1**: Create `src/components/SurfaceFlags.tsx`
  - Display when hovering over surfaces in BSP view
  - Show tooltip or side panel with flags

- [ ] **7.2**: Parse surface flags
  - Quake II surfaces have flags like:
    - `SURF_LIGHT` - Emits light
    - `SURF_SLICK` - Slippery (ice)
    - `SURF_SKY` - Skybox surface
    - `SURF_WARP` - Animated water/lava
    - `SURF_TRANS33`, `SURF_TRANS66` - Transparency
    - `SURF_FLOWING` - Scrolling texture
    - `SURF_NODRAW` - Not rendered
  - Display human-readable flag names

- [ ] **7.3**: Display surface properties
  - Texture name
  - Light value (if emissive)
  - Contents (solid, water, lava, etc.)
  - Surface area (square units)

- [ ] **7.4**: Highlight surfaces by flag
  - Filter view to show only surfaces with specific flags
  - E.g., "Show only SKY surfaces" or "Show all TRANS surfaces"
  - Useful for debugging texture issues

**File References**:
- Create: `src/components/SurfaceFlags.tsx`
- Create: `src/utils/surfaceFlagParser.ts`
- Modify: `src/components/UniversalViewer/adapters/BspAdapter.ts` (surface picking)
- Reference: `@quake2ts/engine` (BSP surface data)

**Test Requirements**:
- Unit: `tests/unit/surfaceFlagParser.test.ts`
  - Test flag bitfield parsing
  - Verify flag names
- Unit: `tests/unit/SurfaceFlags.test.tsx`
  - Render with mock surface data

---

## Acceptance Criteria

Section 05 is complete when:

- ✅ Texture atlas viewer displays textures with zoom, palette, and UV mapping
- ✅ Model inspector shows animations, frame details, and skeleton (MD3)
- ✅ BSP analyzer provides geometry, lightmap, PVS, and entity statistics
- ✅ Entity database is searchable and exportable
- ✅ Lightmap inspector visualizes individual lightmaps with quality analysis
- ✅ Sound analyzer displays waveform and frequency spectrum
- ✅ Surface flag inspector shows material properties
- ✅ All tools support export functionality (textures, models, entities, audio)
- ✅ All code has 90%+ unit test coverage
- ✅ Integration tests verify analysis accuracy with real assets

## Library Dependencies

**Required from quake2ts**:
- `@quake2ts/engine`: Asset parsing (`parsePcx`, `parseWal`, `parseTga`, `parseMd2`, `parseMd3`, `parseBsp`, `parseWav`)
- `@quake2ts/engine`: Asset types (`PreparedTexture`, `Md2Model`, `Md3Model`, `BspMap`)

**Enhancements Needed** (see `library-enhancements.md`):
- Cross-reference API (which models use which textures, etc.)
- Detailed BSP statistics API (beyond what's in `BspMap`)
- Lightmap access API (individual lightmap textures)
- Surface flag definitions and parsing utilities
- Model export utilities (OBJ, FBX, GLTF)
- Audio export utilities

## Notes

- Analysis tools are valuable for mod creators, level designers, and researchers
- No dependencies on other sections (can be implemented independently)
- Export functionality enables using assets in external tools (Blender, Photoshop, etc.)
- Cross-referencing requires scanning all assets (may be slow - optimize with caching)
- Some features may overlap with Section 06 (Map Editor) - coordinate to avoid duplication
