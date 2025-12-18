# Section 09: Performance Optimization

## Overview

Optimize application performance to ensure smooth experience even with large PAK files, complex maps, and resource-intensive features. Focus on load times, runtime performance, memory management, and perceived performance.

**Complexity**: Medium
**Dependencies**: None (but benefits all sections)
**Estimated Scope**: Web Workers, IndexedDB caching, lazy loading, memory optimization, asset streaming, code splitting

## Objectives

- Offload heavy computation to Web Workers (PAK parsing, asset processing)
- Implement persistent caching with IndexedDB (PAK indexes, thumbnails, metadata)
- Add lazy loading and virtualization for large lists
- Optimize memory usage (cache eviction, resource pooling, texture compression)
- Implement asset streaming for progressive loading
- Add code splitting for faster initial load
- Monitor and alert on performance issues
- Profile and optimize critical paths

## Current State

**Already Implemented**:
- Basic asset caching in `pakService.ts`
- React.lazy for some code splitting
- Performance metrics in Section 04 (display only)
- Web Worker for PAK parsing
- Web Worker for asset processing (textures, models)

**Missing**:
- Persistent caching (IndexedDB)
- Lazy loading for lists
- Memory management strategies
- Asset streaming
- Performance monitoring
- Advanced code splitting

## Tasks and Subtasks

### Task 1: Web Worker Integration

**Objective**: Move CPU-intensive tasks off main thread to prevent UI blocking.

#### Subtasks

- [x] **1.1**: Create PAK parsing worker
  - Create `src/workers/pakParser.worker.ts`
  - Accepts: ArrayBuffer (PAK file data)
  - Returns: PakArchive structure (directory entries)
  - Use `comlink` library for easier worker communication

- [x] **1.2**: Implement worker communication
  - Create `src/services/workerService.ts`
  - Spawn worker pool (4 workers, configurable)
  - Queue tasks if all workers busy
  - Return promises for async results

- [x] **1.3**: Migrate PAK parsing to worker
  - Modify `pakService.ts`
  - Send PAK ArrayBuffer to worker
  - Receive parsed directory
  - Show progress during parsing

- [x] **1.4**: Create asset processing worker
  - `src/workers/assetProcessor.worker.ts`
  - Process textures (palette application, mipmap generation)
  - Thumbnail generation for demo timeline (Section 03)
  - Model geometry processing

- [x] **1.5**: Create search/indexing worker
  - `src/workers/indexer.worker.ts`
  - Build search index for file tree
  - Cross-reference assets (Section 05)
  - Return queryable index

- [x] **1.6**: Handle worker errors
  - Timeout detection (kill worker if unresponsive)
  - Fallback to main thread if worker fails
  - Error reporting to user

**File References**:
- Create: `src/workers/pakParser.worker.ts`
- Create: `src/workers/assetProcessor.worker.ts`
- Create: `src/workers/indexer.worker.ts`
- Create: `src/services/workerService.ts`
- Modify: `src/services/pakService.ts` (use worker)

**Test Requirements**:
- Unit: `tests/unit/workerService.test.ts`
  - Mock workers
  - Test task queuing
  - Test error handling
- Integration: `tests/integration/pakWorker.integration.test.ts`
  - Parse real PAK in worker
  - Verify results match main-thread parsing

---

### Task 2: IndexedDB Persistent Caching

**Objective**: Cache processed assets locally to speed up subsequent loads.

#### Subtasks

- [x] **2.1**: Design cache schema
  - Database: `quake2ts-explorer`
  - Object stores:
    - `pak-index`: PAK file metadata and directory (keyed by file hash)
    - `thumbnails`: Generated thumbnails (keyed by asset path)
    - `asset-metadata`: Parsed asset metadata (keyed by asset path)
    - `demo-index`: Demo frame indexes (keyed by demo file hash)

- [x] **2.2**: Create IndexedDB service
  - `src/services/cacheService.ts`
  - `init(): Promise<IDBDatabase>`
  - `set(store: string, key: string, value: any): Promise<void>`
  - `get(store: string, key: string): Promise<any>`
  - `delete(store: string, key: string): Promise<void>`
  - `clear(store: string): Promise<void>`

- [x] **2.3**: Implement PAK index caching
  - On PAK load, compute hash (e.g., SHA-256 of first 64KB + file size)
  - Check cache for existing index
  - If hit: Load index from cache (instant)
  - If miss: Parse PAK, store index in cache

- [x] **2.4**: Implement thumbnail caching
  - When generating thumbnails (demo timeline, texture atlas)
  - Store as base64 or Blob in IndexedDB
  - Load from cache on subsequent views
  - Expire old thumbnails (LRU, max 100MB)

- [x] **2.5**: Implement asset metadata caching
  - Cache parsed MD2/MD3 animation data
  - Cache BSP statistics (from Section 05)
  - Cache entity lists
  - Invalidate on PAK change

- [x] **2.6**: Add cache management UI
  - Settings panel: Show cache size per store
  - "Clear Cache" button per store
  - "Clear All" button
  - Export cache (for backup)

**File References**:
- Create: `src/services/cacheService.ts`
- Modify: `src/services/pakService.ts` (use cache)
- Modify: `src/components/SettingsPanel.tsx` (cache management)

**Test Requirements**:
- Unit: `tests/unit/cacheService.test.ts`
  - Mock IndexedDB
  - Test CRUD operations
  - Test quota errors
- Integration: `tests/integration/caching.integration.test.tsx`
  - Cache PAK index, reload, verify faster
  - Test cache invalidation

---

### Task 3: Lazy Loading and Virtualization

**Objective**: Render only visible items in large lists to improve performance.

#### Subtasks

- [x] **3.1**: Implement virtual file tree
  - Modify `src/components/FileTree.tsx`
  - Use `react-window`
  - Render only visible tree nodes
  - Calculate heights dynamically (tree nodes have varying heights)

- [x] **3.2**: Implement virtual entity list
  - For entity database (Section 05)
  - Render only visible rows in table
  - Support variable row heights (for expanded details)

- [x] **3.3**: Implement virtual timeline
  - For demo timeline (Section 03)
  - Render only visible thumbnails
  - Load thumbnails on-demand as user scrolls

- [ ] **3.4**: Implement lazy asset loading
  - Don't load all textures on PAK mount
  - Load textures on first use
  - Unload textures not used recently (LRU)

- [ ] **3.5**: Implement progressive rendering
  - Load map BSP in stages:
    1. Coarse geometry (low LOD)
    2. Full geometry
    3. Textures
    4. Lightmaps
  - Show low-quality preview while loading

**File References**:
- Modify: `src/components/FileTree.tsx` (virtualize)
- Modify: `src/components/EntityDatabase.tsx` (virtualize)
- Modify: `src/components/DemoTimeline.tsx` (virtualize)
- Install: `react-window` or `react-virtualized`

**Test Requirements**:
- Unit: `tests/unit/FileTree.virtualization.test.tsx`
  - Render large tree (10,000 nodes)
  - Verify only visible nodes rendered
- Integration: `tests/integration/largeFileTree.integration.test.tsx`
  - Load huge PAK, verify smooth scrolling

---

### Task 4: Memory Optimization

**Objective**: Minimize memory footprint and prevent leaks.

#### Subtasks

- [ ] **4.1**: Implement LRU texture cache
  - Modify `pakService.ts` or create `textureCache.ts`
  - Track texture usage (last access time)
  - Evict least recently used when cache full
  - Configurable max textures (default: 256)
  - Configurable max memory (default: 512MB)

- [ ] **4.2**: Implement geometry pooling
  - Reuse vertex/index buffers for similar models
  - Instance rendering for duplicate entities
  - **Library Enhancement Needed**: Instancing API

- [ ] **4.3**: Implement texture compression
  - Use DXT/BC compression if WebGL supports
    - Check for `WEBGL_compressed_texture_s3tc` extension
  - Compress textures on load
  - Reduce memory usage by ~4x

- [ ] **4.4**: Implement resource cleanup
  - Track all WebGL resources (buffers, textures, shaders)
  - Dispose on component unmount
  - Detect leaks (resources not freed after unmount)
  - Log warnings if leak detected

- [ ] **4.5**: Add memory profiling
  - Track total memory usage
  - Show memory breakdown:
    - Textures: X MB
    - Geometry: Y MB
    - Other: Z MB
  - Display in performance dashboard (Section 04)
  - Alert if memory usage exceeds threshold

- [ ] **4.6**: Implement unload strategies
  - Unload unused assets after timeout (e.g., 5 minutes)
  - Unload when switching maps
  - User can manually trigger "Free Memory" action

**File References**:
- Create: `src/services/textureCache.ts`
- Create: `src/services/memoryService.ts`
- Modify: `src/components/UniversalViewer/UniversalViewer.tsx` (cleanup)

**Test Requirements**:
- Unit: `tests/unit/textureCache.test.ts`
  - Test LRU eviction
  - Test memory limit enforcement
- Unit: `tests/unit/memoryService.test.ts`
  - Test resource tracking
  - Test leak detection
- Integration: `tests/integration/memoryManagement.integration.test.tsx`
  - Load many textures, verify cache eviction
  - Test cleanup on unmount

---

### Task 5: Asset Streaming

**Objective**: Load large assets progressively to reduce initial load time.

#### Subtasks

- [ ] **5.1**: Implement chunked PAK reading
  - For very large PAKs (>500MB)
  - Read directory first (at end of file)
  - Stream file contents on-demand
  - **Library Enhancement Needed**: Streaming PAK reader

- [ ] **5.2**: Implement texture streaming
  - Load low-resolution mipmap first
  - Stream higher-resolution mipmaps as needed
  - Use progressive JPEG for PCX/TGA

- [ ] **5.3**: Implement model streaming
  - Load low-poly LOD (level of detail) first
  - Stream high-poly version when close to camera
  - **Library Enhancement Needed**: LOD support

- [ ] **5.4**: Implement audio streaming
  - Don't load entire WAV/OGG into memory
  - Stream from File/Blob as needed
  - Use Web Audio API streaming

- [ ] **5.5**: Show loading progress
  - Display loading bar for large assets
  - Show estimated time remaining
  - Allow canceling load

**File References**:
- Create: `src/services/streamingService.ts`
- Modify: `src/services/pakService.ts` (streaming reader)

**Test Requirements**:
- Unit: `tests/unit/streamingService.test.ts`
  - Test chunked reading
  - Test progress tracking
- Integration: `tests/integration/streaming.integration.test.tsx`
  - Load large asset with streaming
  - Verify progressive rendering

---

### Task 6: Code Splitting and Bundle Optimization

**Objective**: Reduce initial JavaScript bundle size for faster load.

#### Subtasks

- [ ] **6.1**: Implement route-based code splitting
  - Split by mode:
    - `browser.chunk.js` - File browser UI
    - `game.chunk.js` - Game mode (Section 01)
    - `multiplayer.chunk.js` - Multiplayer (Section 02)
    - `editor.chunk.js` - Map editor (Section 06)
  - Load chunks on-demand

- [ ] **6.2**: Implement component-level splitting
  - Split heavy components:
    - Settings panel
    - Mod browser
    - Demo timeline
  - Use `React.lazy()` and `Suspense`

- [ ] **6.3**: Optimize vendor bundles
  - Separate vendor code (react, three.js, etc.)
  - Use long-term caching (content hash filenames)
  - Tree-shake unused code

- [ ] **6.4**: Implement critical CSS extraction
  - Extract above-the-fold CSS
  - Inline in HTML
  - Defer non-critical CSS

- [ ] **6.5**: Add bundle analysis
  - Use `webpack-bundle-analyzer` or similar
  - Identify large dependencies
  - Find optimization opportunities

- [ ] **6.6**: Optimize images and assets
  - Compress UI images (icons, logos)
  - Use WebP where supported
  - Lazy-load images

**File References**:
- Modify: `vite.config.ts` or webpack config
- Modify: `src/App.tsx` (route-based splitting)
- Modify: Various components (lazy loading)

**Test Requirements**:
- Build: Verify bundle sizes
  - Initial bundle < 200KB (gzipped)
  - Total bundle < 1MB (before PAK loading)
- Integration: `tests/integration/codeSplitting.integration.test.tsx`
  - Test lazy-loaded routes
  - Verify chunks load correctly

---

### Task 7: Performance Monitoring

**Objective**: Detect and alert on performance issues in production.

#### Subtasks

- [ ] **7.1**: Implement performance metrics collection
  - Track key metrics:
    - Time to Interactive (TTI)
    - First Contentful Paint (FCP)
    - Largest Contentful Paint (LCP)
    - Frame rate (FPS)
    - Frame time (ms)
    - Memory usage
  - Use `performance.mark()` and `performance.measure()`

- [ ] **7.2**: Create performance budget
  - Define acceptable thresholds:
    - Initial load < 3 seconds
    - FPS > 30 (preferably 60)
    - Memory < 1GB
  - Alert if budget exceeded

- [ ] **7.3**: Implement performance regression detection
  - Compare metrics across versions
  - CI/CD integration (fail build if regression)
  - Use Lighthouse CI

- [ ] **7.4**: Add performance logging
  - Log slow operations (> 100ms)
  - Log cache misses
  - Log memory warnings
  - Send to analytics (Section 12, if implemented)

- [ ] **7.5**: Create performance dashboard
  - Real-time metrics display
  - Historical trends (if logged)
  - Identify bottlenecks

**File References**:
- Create: `src/services/performanceMonitorService.ts`
- Modify: `src/components/PerformanceStats.tsx` (show metrics)

**Test Requirements**:
- Unit: `tests/unit/performanceMonitorService.test.ts`
  - Test metric collection
  - Test threshold alerts
- E2E: Lighthouse performance tests

---

## Acceptance Criteria

Section 09 is complete when:

- ✅ PAK parsing runs in Web Worker without blocking UI
- ✅ IndexedDB caches PAK indexes, thumbnails, and metadata
- ✅ File tree, entity list, and timeline are virtualized (handle 10,000+ items smoothly)
- ✅ Memory usage stays below 1GB with LRU cache eviction
- ✅ Large assets stream progressively (loading bar shown)
- ✅ Initial JavaScript bundle < 200KB gzipped
- ✅ Application loads in < 3 seconds on fast connection
- ✅ Performance monitoring alerts on budget violations
- ✅ All code has 90%+ unit test coverage
- ✅ Performance benchmarks show measurable improvements

## Library Dependencies

**Required from quake2ts**:
- None (optimizations are application-layer)

**Enhancements Needed** (see `library-enhancements.md`):
- Streaming PAK reader API (for large PAKs)
- Instancing API (for duplicate entities)
- LOD (Level of Detail) support (for progressive model loading)
- Memory tracking hooks (to monitor library memory usage)

## Notes

- Performance optimization is ongoing - revisit after each section
- Profile before optimizing (measure, don't guess)
- Balance optimization effort with user impact (optimize critical paths first)
- Web Workers significantly improve perceived performance (non-blocking UI)
- IndexedDB caching can reduce load times by 10x+
- Virtualization is essential for large datasets
- Memory management prevents crashes on low-end devices
- Code splitting improves initial load time dramatically
- Monitor performance in production to catch regressions
