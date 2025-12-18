# Quake2TS Library Requests

This document outlines suggested improvements for the `quake2ts` library to facilitate testing and development of the explorer application.

## Test Utilities

### 1. Export `test-utils` in Package Configuration
**Problem:** The `test-utils` package is present in `node_modules` but not exported via the main `package.json` `exports` field, requiring fragile path aliases to access.
**Request:** Add `./test-utils` to the `exports` map in `quake2ts/package.json`.

```json
"exports": {
  ...
  "./test-utils": {
    "types": "./packages/test-utils/dist/index.d.ts",
    "import": "./packages/test-utils/dist/esm/index.js",
    "require": "./packages/test-utils/dist/cjs/index.cjs"
  }
}
```

### 2. Rendering Mocks
**Problem:** Tests for `UniversalViewer` and adapters require extensive manual mocking of `quake2ts/engine` internals (WebGL context, Pipelines, Camera).
**Request:** Provide a `createMockRenderingContext` or similar in `test-utils` that returns a Jest/Vitest compatible mock of the engine's rendering layer.

**Proposed Signature:**
```typescript
interface MockRenderingContext {
  gl: WebGL2RenderingContext; // Mocked
  camera: Mock<Camera>;
  pipelines: {
    md2: Mock<Md2Pipeline>;
    bsp: Mock<BspSurfacePipeline>;
    // ...
  }
}
export function createMockRenderingContext(): MockRenderingContext;
```

### 3. Game Exports vs Internal MockGame
**Problem:** `createMockGame` returns an internal `MockGame` interface which doesn't match the `GameExports` interface returned by `createGame`. This makes it difficult to mock the return value of `createGame` when testing the service layer.
**Request:** Update `createMockGame` or add `createMockGameExports` to provide a mock that satisfies `GameExports` (init, frame, shutdown, snapshot, etc.).

**Proposed Signature:**
```typescript
export function createMockGameExports(overrides?: Partial<GameExports>): GameExports;
```

## API Improvements

### 4. Game Loop & Recording Integration
**Problem:** Recording frame data usually requires serializing the `GameStateSnapshot` to network protocol messages, which is complex to duplicate in the application layer.
**Request:** Expose a `serializeSnapshot(snapshot: GameStateSnapshot): Uint8Array` method in `quake2ts/game` or `quake2ts/shared`, or allow `DemoRecorder` to accept snapshots directly.

### 5. ConfigString Constants
**Problem:** `ConfigString` constants (e.g. `CS_NAME`, `CS_MAXCLIENTS`) are not exported, requiring re-definition in the app.
**Request:** Export `ConfigString` enum/constants from `quake2ts/shared`.

### 6. File System Interfaces
**Problem:** `PakArchive` does not expose `list()` in the interface, only `listEntries()`. `VirtualFileSystem` methods sometimes return different structures than expected in mocks.
**Request:** Standardize `PakArchive` interface to include `list(): string[]` for convenience.
