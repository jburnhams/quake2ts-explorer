# Library Enhancements & Fixes

## Resolved Issues

### Incorrect `BspMap` Mock Structure in `@quake2ts/test-utils`
- **Resolution**: The `createMockBspMap` factory in version `0.0.813` now returns a structure matching the `BspMap` interface, including the `header` property. Tests have been updated to use this helper.

### Missing Exports in `@quake2ts/test-utils`
- **Resolution**: The `package.json` `exports` map for `@quake2ts/test-utils` in version `0.0.813` now exposes granular paths like `./src/engine/mocks/assets`, allowing direct imports of mock factories.

## Remaining/New Bug Reports

### Missing Dependency in `@quake2ts/client`
- **Issue**: The `@quake2ts/client` package imports from `@quake2ts/cgame` in its ESM distribution (`dist/esm/index.js`), but `@quake2ts/cgame` is not present in the installed `node_modules` structure, causing runtime and test failures when importing `@quake2ts/client`.
- **Location**: `node_modules/@quake2ts/client/dist/esm/index.js`
- **Error**: `Error: Cannot find package '@quake2ts/cgame' imported from ...`
- **Recommendation**: Ensure `@quake2ts/cgame` is listed as a regular `dependency` (not dev) in `@quake2ts/client`'s `package.json`, or ensure it is published and installed correctly.

### `createWebGLContext` Return Type Mismatch in `@quake2ts/test-utils`
- **Issue**: The `createMockWebGL2Context` factory returns a `MockWebGL2RenderingContext` instance directly. However, the engine's `createWebGLContext` function returns a `WebGLContextState` wrapper object (containing `gl`, `extensions`, `isLost`, etc.).
- **Impact**: Mocking `createWebGLContext` with `createMockWebGL2Context` directly causes failures in code expecting the wrapper (e.g., accessing `context.gl`).
- **Recommendation**: Add a `createMockWebGLContextState` helper or update `createMockWebGL2Context` documentation/usage to reflect this structure.
  ```typescript
  export function createMockWebGLContextState(canvas?: HTMLCanvasElement) {
      return {
          gl: createMockWebGL2Context(canvas),
          extensions: new Map(),
          isLost: vi.fn().mockReturnValue(false),
          onLost: vi.fn(() => vi.fn()),
          onRestored: vi.fn(() => vi.fn()),
          dispose: vi.fn()
      };
  }
  ```

## Feature Requests

### Robust `PakService` Mocking
- **Context**: `PakService` is often instantiated directly (e.g., `new PakService()`) inside components or hooks.
- **Request**: Provide a `createMockPakService` factory in `test-utils` that returns a fully mocked instance matching the class interface, making it easier to spy on or inject.
