import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { PakService } from '@/src/services/pakService';
import { BspMap, BspSurfacePipeline, buildBspGeometry, createBspSurfaces, Texture2D, walToRgba, resolveLightStyles, applySurfaceState, findLeafForPoint } from 'quake2ts/engine';
import { mat4 } from 'gl-matrix';
import { Ray } from '@/src/components/UniversalViewer/adapters/types';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    return {
        Camera: jest.fn(),
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn().mockReturnValue({}),
        })),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({
            surfaces: [],
            lightmaps: []
        }),
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            setParameters: jest.fn()
        })),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: jest.fn(),
        findLeafForPoint: jest.fn().mockReturnValue(0),
    };
});

// Mock DebugRenderer
jest.mock('@/src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: jest.fn().mockImplementation(() => ({
            clear: jest.fn(),
            addBox: jest.fn(),
            addLine: jest.fn(),
            render: jest.fn(),
        }))
    };
});

// Mock GizmoRenderer
jest.mock('@/src/components/UniversalViewer/adapters/GizmoRenderer', () => {
    return {
        GizmoRenderer: jest.fn().mockImplementation(() => ({
            render: jest.fn(),
            checkIntersection: jest.fn().mockReturnValue('none'),
            setHoveredAxis: jest.fn(),
            setPosition: jest.fn()
        }))
    };
});

describe('BspAdapter', () => {
  let adapter: BspAdapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: any;

  beforeEach(() => {
    adapter = new BspAdapter();
    mockGl = {
        NEAREST: 0,
        CLAMP_TO_EDGE: 0,
        RGBA: 0,
        UNSIGNED_BYTE: 0,
        TEXTURE_2D: 0,
        TRIANGLES: 0,
        LINES: 0,
        TEXTURE0: 0,
        TEXTURE1: 0,
        activeTexture: jest.fn(),
        generateMipmap: jest.fn(),
        drawElements: jest.fn(),
    } as unknown as WebGL2RenderingContext;

    mockPakService = {
        hasFile: jest.fn(),
        readFile: jest.fn(),
        getPalette: jest.fn()
    };
  });

  it('loads map and initializes resources', async () => {
    const file: any = { type: 'bsp', map: {} };
    const mockVao = { bind: jest.fn() };

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            {
                texture: 'wall',
                lightmap: { atlasIndex: 0 },
                vao: mockVao,
                indexCount: 6,
                surfaceFlags: 0
            }
        ],
        lightmaps: [
            { texture: { bind: jest.fn() } }
        ]
    });

    // Setup texture to be loaded so it's in the map
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(100));
    mockPakService.getPalette.mockReturnValue(new Uint8Array(768));
    (walToRgba as jest.Mock).mockReturnValue({
        levels: [{ width: 32, height: 32, rgba: new Uint8Array() }]
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    adapter.render(mockGl, camera, viewMatrix);

    expect(resolveLightStyles).toHaveBeenCalled();
    // Verify texture binding
    expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE0); // Diffuse

    expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE1); // Lightmap

    expect(applySurfaceState).toHaveBeenCalled();
    expect(mockVao.bind).toHaveBeenCalled();
    expect(mockGl.drawElements).toHaveBeenCalledWith(mockGl.TRIANGLES, 6, mockGl.UNSIGNED_SHORT, 0);
  });

  it('applies brightness scaling', async () => {
    const file: any = { type: 'bsp', map: {} };
    const mockVao = { bind: jest.fn() };

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            { vao: mockVao, indexCount: 6, texture: 'test' }
        ],
        lightmaps: []
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');
    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    adapter.setRenderOptions({ mode: 'textured', color: [1, 1, 1], brightness: 0.5 });
    adapter.render(mockGl, camera, viewMatrix);

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.results[0].value;
    // We access the LAST call because render loop makes multiple calls
    const calls = pipeline.bind.mock.calls;
    const lastCall = calls[calls.length - 1][0];

    // We expect colors to be float32 arrays often, but here we passed an array.
    // The received calls show color: [1, 1, 1, 1], which means something reset it or it wasn't applied.
    // Looking at the code:
    // const scaledColor = ...
    // const renderColor = isSelected ? ... : (isHighlighted ? ... : scaledColor);
    //
    // Wait, the failure says Expected: [0.5, 0.5, 0.5, 1], Received: [1, 1, 1, 1]
    // And Expected mode: 'textured', Received: 'textured'.
    //
    // In `applies brightness scaling`, we call `setRenderOptions`.
    // BspAdapter implementation:
    // const brightness = this.renderOptions.brightness !== undefined ? this.renderOptions.brightness : 1.0;
    // ...
    // const scaledColor = [baseColor[0]*brightness, ...]
    //
    // Why is it receiving [1,1,1,1]?
    // Maybe renderOptions.brightness is undefined in the test execution context?
    //
    // Ah, `BspAdapter` stores `renderOptions`.
    // In the test: `adapter.setRenderOptions({ ... brightness: 0.5 })`.
    // This should work.
    //
    // Wait, the failure in 'handles highlighting' also shows `color: [1, 1, 1, 1]` instead of red.
    // This suggests that `isSelected` and `isHighlighted` are false, and `scaledColor` is default white.
    //
    // For `handles highlighting`:
    // We set `hoveredEntity`.
    // `this.hoveredEntity` is used to find `hoveredModel`.
    // `getModelFromEntity` uses `this.map.models`.
    // In the test `handles highlighting in render`:
    // map: { models: [{firstFace: 0, numFaces: 1}] }
    // surfaces: [{ faceIndex: 0 }]
    // hoveredEntity: { classname: 'worldspawn' }
    //
    // `getModelFromEntity`: if classname 'worldspawn', returns map.models[0].
    // So hoveredModel should be the first model.
    // Check: `if (inputSurface.faceIndex >= hoveredModel.firstFace ...)`
    // 0 >= 0 && 0 < 0+1 -> true.
    // So `isHighlighted` should be true.
    //
    // Why is it failing?
    // Maybe `inputSurface` is not what we think it is?
    // `this.surfaces = createBspSurfaces(map)`
    // In the test: `(createBspSurfaces as jest.Mock).mockReturnValue(surfaces);` where surfaces=[{faceIndex:0}]
    //
    // However, `buildBspGeometry` returns `this.geometry`.
    // The render loop iterates `this.geometry.surfaces`.
    // `const surface = this.geometry.surfaces[i];`
    // `const inputSurface = this.surfaces[i];`
    //
    // In the test:
    // `buildBspGeometry` returns surfaces: [{ vao..., indexCount..., texture..., surfaceFlags... }]
    // `createBspSurfaces` returns surfaces: [{ faceIndex: 0 }]
    //
    // These arrays must align by index.
    // The loop uses `i` for both.
    // If they have length 1, it should work.
    //
    // Wait, the Received object has `renderMode.mode: "textured"`.
    // But we expected `solid` (for highlighting) or `wireframe` (for options test).
    //
    // The issue might be that `render` iterates ALL surfaces.
    // If `geometry.surfaces` has more items than `surfaces`? No.
    //
    // Wait, look at the test `handles highlighting in render`.
    // `expect(lastCall).toEqual(...)`
    // Since `render` is a loop, `pipeline.bind` is called for EACH surface.
    // If there is only 1 surface, `lastCall` is THE call.
    //
    // If `isHighlighted` was true, mode would be 'solid'.
    // Received is 'textured'.
    // So `isHighlighted` is false.
    //
    // Why?
    // `getModelFromEntity` might be returning null?
    // `if (entity.classname === 'worldspawn') return this.map.models[0];`
    // The mock map has models array.
    // The entity has classname 'worldspawn'.
    //
    // Maybe `this.map` is not correctly set on the adapter instance in the test?
    // `await adapter.load(...)` sets `this.map = file.map`.
    // The file object passed has `map`.
    //
    // In `applies brightness scaling`:
    // `color` is [1,1,1,1] instead of [0.5, 0.5, 0.5, 1].
    // This implies `brightness` calculation is 1.0.
    // `adapter.setRenderOptions` sets `this.renderOptions`.
    // `const brightness = this.renderOptions.brightness ...`
    //
    // Is it possible `setRenderOptions` is not working?
    // It is a simple assignment.
    //
    // Wait, I see the issue in the test setup.
    // `const file: any = { type: 'bsp', map: {} };`
    // In `applies brightness scaling`, `map` is empty object.
    // `load` sets `this.map`.
    //
    // But wait, `BspAdapter` uses `map.models` and `map.entities` etc.
    // If they are missing, it might crash or behave weirdly?
    // But `loadMap` calls `createBspSurfaces` and `buildBspGeometry` which are mocked.
    //
    // The `render` method:
    // `const styleValues: number[] = new Array(lightStyles.length);`
    // ...
    // `const state = this.pipeline.bind({...})`
    //
    // Why are my tests failing?
    //
    // Maybe `BspAdapter.ts` was not correctly compiled/updated in the test environment?
    // No, I am running `ts-jest`.
    //
    // Let's look at `handles highlighting` again.
    // `hoveredModel` logic.
    // `getModelFromEntity` uses `this.map`.
    // `load` sets `this.map`.
    // `file.map` has `models`.
    //
    // Wait! `adapter.load` takes `file`.
    // In `handles highlighting`:
    // `const file = ... map: { models: ... }`
    // `adapter.load` is called.
    // `adapter.setHoveredEntity` is called.
    // `adapter.render` is called.
    //
    // Is `this.surfaces` correct?
    // `this.surfaces = createBspSurfaces(map)`
    // Mock returns `[{ faceIndex: 0 }]`.
    //
    // Is `this.geometry` correct?
    // Mock returns `surfaces: [{ ... }]`.
    //
    // Loop `i=0`.
    // `inputSurface = this.surfaces[0]` -> `{ faceIndex: 0 }`
    // `hoveredModel` -> `map.models[0]` -> `{ firstFace: 0, numFaces: 1 }`
    // `0 >= 0 && 0 < 1` -> true.
    //
    // I suspect the issue is unrelated to logic, but maybe to `jest` mock state or something?
    // Or maybe `map` property access?
    //
    // Actually, look at the failures again.
    // `Received` object in `applies brightness scaling` failure:
    // `renderMode`: { mode: "textured", color: [1,1,1,1] ... }
    //
    // This means `renderOptions` passed to `render` (via `this.renderOptions`) seems to be default?
    // But we called `adapter.setRenderOptions`.
    //
    // Is it possible that `adapter.renderOptions` is being reset?
    // `load` sets `this.renderOptions`? No, it's initialized in class property.
    //
    // Wait, `BspAdapter.ts`:
    // `private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };`
    //
    // Maybe the test instance `adapter` is being reused and polluted?
    // `beforeEach` creates `new BspAdapter()`.
    //
    // Let's debug by adding console logs in `BspAdapter.ts` if needed, but I can't easily see them.
    //
    // Wait, I see `tests/unit/components/UniversalViewer/adapters/BspAdapter.test.ts` content.
    // The previous diff I applied:
    // `expect(lastCall).toEqual(...)`
    //
    // The failure shows `Received` values that match the DEFAULT options.
    // This implies `setRenderOptions` didn't update the state used by `render`, OR `render` is using a different state.
    //
    // In `BspAdapter.ts`:
    // `setRenderOptions(options: RenderOptions) { this.renderOptions = options; }`
    // `render(...) { ... const brightness = this.renderOptions.brightness ... }`
    //
    // It looks correct.
    //
    // Could it be that `adapter` variable in the test is somehow not the same instance? No.
    //
    // Maybe `load` is resetting something? No.
    //
    // Wait, I mocked `BspSurfacePipeline`.
    // `bind: jest.fn().mockReturnValue({})`
    // In the test: `const pipeline = (BspSurfacePipeline as jest.Mock).mock.results[0].value;`
    //
    // In `beforeEach`, `adapter = new BspAdapter()`.
    // `load` creates `new BspSurfacePipeline(gl)`.
    // So `BspSurfacePipeline` constructor is called.
    //
    // If I run multiple tests, `BspSurfacePipeline` mock might accumulate calls?
    // `jest.mock` factories are hoisted.
    // But `mock.results[0]` refers to the FIRST instance created.
    //
    // Use `mock.instances`?
    //
    // `beforeEach` runs for every test.
    // So `adapter` is new.
    // `load` is called in each test.
    // So `new BspSurfacePipeline` is called in each test.
    //
    // `(BspSurfacePipeline as jest.Mock).mock.results[0].value`
    // `results` array grows with every call to the constructor (or factory?).
    // No, `BspSurfacePipeline` is the class constructor mock.
    // `mock.instances` contains instances.
    //
    // If I use `mock.results[0]`, I am always getting the return value of the FIRST call to the constructor ever made in this test file execution?
    // Jest runs tests in the same process/context if `runInBand` (which I used).
    // So `results` accumulates.
    //
    // FIX: I should clear mocks in `beforeEach`.
    // `jest.clearAllMocks()`
    //
    // Or access the LAST instance.
    // `const pipeline = (BspSurfacePipeline as jest.Mock).mock.instances.slice(-1)[0];`
    // Or better: `const pipeline = (adapter as any).pipeline;`
    //
    // The previous tests (which I overwrote) were using `mock.results[0]`.
    // Maybe they relied on `jest.resetModules()`? No.
    //
    // I will modify the test to use `(adapter as any).pipeline.bind` to inspect calls.

    // Also, `BspAdapter` uses `this.pipeline` which is created in `load`.

    // I will try to fix the test by accessing the pipeline from the adapter instance, ensuring I'm asserting on the correct object.

    // We expect the pipeline to be called with the correct parameters.
    // However, since we are mocking the pipeline and asserting on the LAST call,
    // we need to be sure that the render loop actually reached the point where it uses the updated options.
    //
    // The previous failures show Received: { renderMode: { mode: 'textured', color: [1,1,1,1] ... } }
    // This is the DEFAULT.
    //
    // Hypothesis: `adapter.render` iterates surfaces. If the surface list is empty or mocked such that the loop
    // executes differently, or if `pipeline.bind` is called with defaults somewhere.
    //
    // In `applies brightness scaling`:
    // Surfaces: [{ vao: ..., indexCount: 6, texture: 'test' }]
    // Lightmaps: []
    //
    // Loop logic in BspAdapter:
    // for (let i = 0; i < this.geometry.surfaces.length; i++) {
    //    ...
    //    pipeline.bind({...})
    // }
    //
    // The geometry mock returns the surfaces.
    // So it should run once.
    //
    // Why is `this.renderOptions` not being applied?
    // `const brightness = this.renderOptions.brightness ...`
    //
    // If `this.renderOptions` was updated by `setRenderOptions`, it should work.
    //
    // Let's verify if `setRenderOptions` is actually called correctly on the instance.
    // `adapter.setRenderOptions(...)`
    //
    // Is it possible `this.renderOptions` is shadowed or reset?
    // No.
    //
    // Wait, check the `BspAdapter.ts` logic again.
    // `const baseColor = this.renderOptions.color;`
    // `const scaledColor = [baseColor[0]*brightness, ...]`
    //
    // If `baseColor` is `[1,1,1]` and `brightness` is `0.5`, result is `[0.5, 0.5, 0.5, 1]`.
    //
    // Why did the test fail with `Received: [1,1,1,1]`?
    //
    // Maybe `renderOptions` passed to `setRenderOptions` was incomplete/default?
    // `adapter.setRenderOptions({ mode: 'textured', color: [1, 1, 1], brightness: 0.5 });`
    // This looks correct.
    //
    // Is there any async issue? `render` is sync.
    //
    // Wait! `adapter.load` is async.
    // The test calls `await adapter.load(...)`.
    //
    // Maybe `BspAdapter` logic uses `this.geometry` which is set in `load`.
    //
    // What if `adapter` in the test is a different instance? No.
    //
    // What if `pipeline` in the test is from a previous test run?
    // `const pipeline = (BspSurfacePipeline as jest.Mock).mock.results[0].value;`
    // If `BspSurfacePipeline` mock returns the SAME object every time?
    // `jest.fn().mockImplementation(() => ({ bind: ... }))`
    // It returns a NEW object every time.
    //
    // But `mock.results[0]` is the result of the FIRST call ever.
    //
    // In `applies brightness scaling`, it is the 2nd test case (or later).
    // `load` calls `new BspSurfacePipeline`.
    // So there is a 2nd instance.
    // But we are accessing `mock.results[0]`.
    // THIS IS THE BUG.
    // We are inspecting the pipeline from the FIRST test, which is likely not being called in the SECOND test.
    // Or if it is shared (it's not), it's stale.
    //
    // We should access the LAST instance created.
    // `mock.instances` gives instances.
    // `const pipeline = (BspSurfacePipeline as jest.Mock).mock.instances.slice(-1)[0];`

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.instances.slice(-1)[0];
    const calls = pipeline.bind.mock.calls;
    const lastCall = calls[calls.length - 1][0];

    expect(lastCall).toEqual(expect.objectContaining({
        renderMode: {
            mode: 'textured',
            color: [0.5, 0.5, 0.5, 1.0], // 1.0 * 0.5
            applyToAll: true,
            generateRandomColor: undefined
        }
    }));
  });

  it('handles fullbright mode correctly', async () => {
    const file: any = { type: 'bsp', map: {} };
    const mockVao = { bind: jest.fn() };

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            { vao: mockVao, indexCount: 6, texture: 'test', lightmap: { atlasIndex: 0 } }
        ],
        lightmaps: [
             { texture: { bind: jest.fn() } }
        ]
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');
    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    // Enable fullbright
    adapter.setRenderOptions({ mode: 'textured', color: [1, 1, 1], fullbright: true });
    adapter.render(mockGl, camera, viewMatrix);

    // Should bind white texture to unit 1 (lightmap)
    expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE1);

    // The white texture is created first in load()
    // Use mock.results to access returned object
    const whiteTexture = (Texture2D as jest.Mock).mock.results[0].value;
    expect(whiteTexture.bind).toHaveBeenCalled();
  });

  it('cleans up (no-op/simple clear)', () => {
      adapter.cleanup();
  });

  it('returns true for useZUp', () => {
      expect(adapter.useZUp()).toBe(true);
  });

  it('sets render options and uses them during render', async () => {
    const file: any = { type: 'bsp', map: {} };
    const mockVao = { bind: jest.fn() };

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            { vao: mockVao, indexCount: 6, texture: 'test' }
        ],
        lightmaps: []
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    // Test wireframe
    adapter.setRenderOptions({ mode: 'wireframe', color: [0.1, 0.2, 0.3] });
    adapter.render(mockGl, camera, viewMatrix);

    expect(mockGl.drawElements).toHaveBeenCalledWith(mockGl.LINES, 6, mockGl.UNSIGNED_SHORT, 0);

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.instances.slice(-1)[0];
    let calls = pipeline.bind.mock.calls;
    let lastCall = calls[calls.length - 1][0];

    expect(lastCall).toEqual(expect.objectContaining({
        renderMode: {
            mode: 'wireframe',
            color: [0.1, 0.2, 0.3, 1.0],
            applyToAll: true
        }
    }));

    // Test solid color
    adapter.setRenderOptions({ mode: 'solid', color: [0.4, 0.5, 0.6] });
    adapter.render(mockGl, camera, viewMatrix);

    expect(mockGl.drawElements).toHaveBeenCalledWith(mockGl.TRIANGLES, 6, mockGl.UNSIGNED_SHORT, 0);

    calls = pipeline.bind.mock.calls;
    lastCall = calls[calls.length - 1][0];

    expect(lastCall).toEqual(expect.objectContaining({
        renderMode: {
            mode: 'solid',
            color: [0.4, 0.5, 0.6, 1.0],
            applyToAll: true
        }
    }));
  });

  it('returns unique classnames from map', async () => {
    const classnames = ['worldspawn', 'info_player_start'];
    const mockMap = {
        entities: {
            getUniqueClassnames: jest.fn().mockReturnValue(classnames)
        }
    };
    const file: any = { type: 'bsp', map: mockMap };

    (buildBspGeometry as jest.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(adapter.getUniqueClassnames()).toBe(classnames);
    expect(mockMap.entities.getUniqueClassnames).toHaveBeenCalled();
  });

  it('returns empty array if map not loaded', () => {
      expect(adapter.getUniqueClassnames()).toEqual([]);
  });

  it('rebuilds geometry with hidden classnames when setHiddenClasses is called', async () => {
    const file: any = { type: 'bsp', map: {} };
    const surfaces = [{ texture: 'wall' }];
    (createBspSurfaces as jest.Mock).mockReturnValue(surfaces);

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [],
        lightmaps: []
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    (buildBspGeometry as jest.Mock).mockClear();

    const hidden = new Set(['bad_entity']);
    adapter.setHiddenClasses(hidden);

    expect(buildBspGeometry).toHaveBeenCalledWith(mockGl, surfaces, file.map, { hiddenClassnames: hidden });
  });

  it('delegates pickEntity to map', async () => {
    const file: any = { type: 'bsp', map: { pickEntity: jest.fn().mockReturnValue('hit') } };
    (buildBspGeometry as jest.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });
    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    const result = adapter.pickEntity!('ray' as any);
    expect(file.map.pickEntity).toHaveBeenCalledWith('ray');
    expect(result).toBe('hit');
  });

  it('handles highlighting in render', async () => {
    const file: any = { type: 'bsp', map: { models: [{firstFace: 0, numFaces: 1}] } };
    const mockVao = { bind: jest.fn() };
    const surfaces = [{ faceIndex: 0 }]; // Input surface
    (createBspSurfaces as jest.Mock).mockReturnValue(surfaces);

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            { vao: mockVao, indexCount: 6, texture: 'test', surfaceFlags: 0 }
        ],
        lightmaps: []
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    const hoveredEntity = { classname: 'worldspawn', properties: {} };
    adapter.setHoveredEntity!(hoveredEntity as any);

    const camera = { projectionMatrix: mat4.create() } as any;
    adapter.render(mockGl, camera, mat4.create());

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.instances.slice(-1)[0];
    const calls = pipeline.bind.mock.calls;
    const lastCall = calls[calls.length - 1][0];

    expect(lastCall).toEqual(expect.objectContaining({
        renderMode: {
            mode: 'solid',
            color: [1.0, 0.0, 0.0, 1.0], // Red highlight
            applyToAll: true,
            generateRandomColor: false
        }
    }));
  });

  it('highlights entity with * model reference correctly', async () => {
    const file: any = { type: 'bsp', map: { models: [{firstFace: 0, numFaces: 1}, {firstFace: 10, numFaces: 5}] } };
    const mockVao = { bind: jest.fn() };
    const surfaces = [{ faceIndex: 12 }]; // Should match model index 1
    (createBspSurfaces as jest.Mock).mockReturnValue(surfaces);

    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            { vao: mockVao, indexCount: 6, texture: 'test', surfaceFlags: 0 }
        ],
        lightmaps: []
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    // Entity pointing to model *1
    const hoveredEntity = { classname: 'func_door', properties: { model: '*1' } };
    adapter.setHoveredEntity!(hoveredEntity as any);

    const camera = { projectionMatrix: mat4.create() } as any;
    adapter.render(mockGl, camera, mat4.create());

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.instances.slice(-1)[0];
    const calls = pipeline.bind.mock.calls;
    const lastCall = calls[calls.length - 1][0];

    expect(lastCall).toEqual(expect.objectContaining({
        renderMode: {
            mode: 'solid',
            color: [1.0, 0.0, 0.0, 1.0], // Red highlight
            applyToAll: true,
            generateRandomColor: false
        }
    }));
  });

  it('should allow setting hovered entity', () => {
        const entity = { classname: 'test' } as any;
        adapter.setHoveredEntity!(entity);
        expect((adapter as any).hoveredEntity).toBe(entity);

        adapter.setHoveredEntity!(null);
        expect((adapter as any).hoveredEntity).toBeNull();
  });

  test('should allow setting selected entities', () => {
      const entity = { classname: 'test' } as any;
      const selection = new Set([entity]);
      adapter.setSelectedEntities!(selection);
      expect((adapter as any).selectedEntities).toBe(selection);
  });
});
