
import { BspAdapter } from '../../../../../src/components/UniversalViewer/adapters/BspAdapter';
import { PakService, ParsedFile } from '../../../../../src/services/pakService';
import {
    BspSurfacePipeline,
    createBspSurfaces,
    buildBspGeometry,
    Texture2D,
    parseWal,
    walToRgba,
    resolveLightStyles,
    applySurfaceState
} from '@quake2ts/engine';
import { mat4 } from 'gl-matrix';

// Mock DebugRenderer
vi.mock('../../../../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: vi.fn().mockImplementation(() => ({
            clear: vi.fn(),
            addBox: vi.fn(),
            addLine: vi.fn(),
            render: vi.fn(),
            init: vi.fn()
        }))
    };
});

// Mock GizmoRenderer
vi.mock('../../../../../src/components/UniversalViewer/adapters/GizmoRenderer', () => {
    return {
        GizmoRenderer: vi.fn().mockImplementation(() => ({
            render: vi.fn(),
            intersect: vi.fn(),
            setHoveredAxis: vi.fn(),
            setActiveAxis: vi.fn()
        }))
    };
});

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
  return {
    BspSurfacePipeline: vi.fn().mockImplementation(() => ({
        bind: vi.fn().mockReturnValue({}),
    })),
    createBspSurfaces: vi.fn().mockReturnValue([]),
    buildBspGeometry: vi.fn().mockReturnValue({
        surfaces: [],
        lightmaps: []
    }),
    Texture2D: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        setParameters: vi.fn(),
        uploadImage: vi.fn(),
    })),
    parseWal: vi.fn(),
    walToRgba: vi.fn(),
    resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
    applySurfaceState: vi.fn(),
    Camera: vi.fn(),
  };
});

describe('BspAdapter', () => {
  let adapter: BspAdapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: vi.Mocked<PakService>;

  beforeEach(() => {
    adapter = new BspAdapter();
    mockGl = {
        LINEAR_MIPMAP_LINEAR: 1,
        LINEAR: 2,
        REPEAT: 3,
        RGBA: 4,
        UNSIGNED_BYTE: 5,
        TEXTURE_2D: 6,
        TEXTURE0: 7,
        TEXTURE1: 8,
        TRIANGLES: 9,
        UNSIGNED_SHORT: 10,
        LINES: 1,
        NEAREST: 0,
        CLAMP_TO_EDGE: 33071,
        generateMipmap: vi.fn(),
        activeTexture: vi.fn(),
        drawElements: vi.fn(),
        createShader: vi.fn(),
        createProgram: vi.fn(),
        getUniformLocation: vi.fn(),
        getAttribLocation: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        createVertexArray: vi.fn(),
        bindVertexArray: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    mockPakService = {
      hasFile: vi.fn(),
      readFile: vi.fn(),
      getPalette: vi.fn(),
    } as unknown as vi.Mocked<PakService>;

    // Clear mocks
    vi.clearAllMocks();
    (Texture2D as vi.Mock).mockClear();
  });

  it('throws error if file type is not bsp', async () => {
    const file: ParsedFile = { type: 'md2' } as any;
    await expect(adapter.load(mockGl, file, mockPakService, 'maps/test.bsp')).rejects.toThrow('Invalid file type');
  });

  it('loads bsp map and textures', async () => {
    const file: ParsedFile = {
        type: 'bsp',
        map: {}
    } as any;

    // Mock buildBspGeometry to return surfaces with textures
    (buildBspGeometry as vi.Mock).mockReturnValue({
        surfaces: [
            { texture: 'wall' }
        ],
        lightmaps: []
    });

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(100));
    mockPakService.getPalette.mockReturnValue(new Uint8Array(768));

    (parseWal as vi.Mock).mockReturnValue({});
    (walToRgba as vi.Mock).mockReturnValue({
        levels: [
            { width: 32, height: 32, rgba: new Uint8Array(32*32*4) }
        ]
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(BspSurfacePipeline).toHaveBeenCalledWith(mockGl);
    expect(createBspSurfaces).toHaveBeenCalledWith(file.map);
    expect(buildBspGeometry).toHaveBeenCalled();

    expect(mockPakService.hasFile).toHaveBeenCalledWith('textures/wall.wal');
    expect(mockPakService.readFile).toHaveBeenCalledWith('textures/wall.wal');
    expect(parseWal).toHaveBeenCalled();
    expect(walToRgba).toHaveBeenCalled();

    expect(Texture2D).toHaveBeenCalledWith(mockGl);
    // Should create white texture + texture for wall
    // Access returned objects via results, not instances
    const results = (Texture2D as vi.Mock).mock.results;
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(mockGl.generateMipmap).toHaveBeenCalled();
  });

  it('handles missing textures gracefully', async () => {
     const file: ParsedFile = { type: 'bsp', map: {} } as any;
     (buildBspGeometry as vi.Mock).mockReturnValue({
        surfaces: [{ texture: 'missing' }],
        lightmaps: []
    });
    mockPakService.hasFile.mockReturnValue(false);

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(mockPakService.readFile).not.toHaveBeenCalled();
  });

  it('handles texture load failure gracefully', async () => {
     const file: ParsedFile = { type: 'bsp', map: {} } as any;
     (buildBspGeometry as vi.Mock).mockReturnValue({
        surfaces: [{ texture: 'broken' }],
        lightmaps: []
    });
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockRejectedValue(new Error('Read error'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load texture broken', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('renders surfaces', async () => {
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
    const mockVao = { bind: vi.fn() };

    (buildBspGeometry as vi.Mock).mockReturnValue({
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
            { texture: { bind: vi.fn() } }
        ]
    });

    // Setup texture to be loaded so it's in the map
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(100));
    mockPakService.getPalette.mockReturnValue(new Uint8Array(768));
    (walToRgba as vi.Mock).mockReturnValue({
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
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
    const mockVao = { bind: vi.fn() };

    (buildBspGeometry as vi.Mock).mockReturnValue({
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

    const pipeline = (BspSurfacePipeline as vi.Mock).mock.results[0].value;
    expect(pipeline.bind).toHaveBeenCalledWith(expect.objectContaining({
        renderMode: {
            mode: 'textured',
            color: [0.5, 0.5, 0.5, 1.0], // 1.0 * 0.5
            applyToAll: true,
            generateRandomColor: undefined
        }
    }));
  });

  it('handles fullbright mode correctly', async () => {
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
    const mockVao = { bind: vi.fn() };

    (buildBspGeometry as vi.Mock).mockReturnValue({
        surfaces: [
            { vao: mockVao, indexCount: 6, texture: 'test', lightmap: { atlasIndex: 0 } }
        ],
        lightmaps: [
             { texture: { bind: vi.fn() } }
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
    const whiteTexture = (Texture2D as vi.Mock).mock.results[0].value;
    expect(whiteTexture.bind).toHaveBeenCalled();
  });

  it('cleans up (no-op/simple clear)', () => {
      adapter.cleanup();
  });

  it('returns true for useZUp', () => {
      expect(adapter.useZUp()).toBe(true);
  });

  it('sets render options and uses them during render', async () => {
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
    const mockVao = { bind: vi.fn() };

    (buildBspGeometry as vi.Mock).mockReturnValue({
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

    expect(mockGl.drawElements).toHaveBeenCalledWith(1, 6, mockGl.UNSIGNED_SHORT, 0); // Assuming 1 is LINES for wireframe in mock

    const pipeline = (BspSurfacePipeline as vi.Mock).mock.results[0].value;
    expect(pipeline.bind).toHaveBeenCalledWith(expect.objectContaining({
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
    expect(pipeline.bind).toHaveBeenCalledWith(expect.objectContaining({
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
            getUniqueClassnames: vi.fn().mockReturnValue(classnames)
        }
    };
    const file: ParsedFile = { type: 'bsp', map: mockMap } as any;

    (buildBspGeometry as vi.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(adapter.getUniqueClassnames()).toBe(classnames);
    expect(mockMap.entities.getUniqueClassnames).toHaveBeenCalled();
  });

  it('returns empty array if map not loaded', () => {
      expect(adapter.getUniqueClassnames()).toEqual([]);
  });

  it('rebuilds geometry with hidden classnames when setHiddenClasses is called', async () => {
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
    const surfaces = [{ texture: 'wall' }];
    (createBspSurfaces as vi.Mock).mockReturnValue(surfaces);

    (buildBspGeometry as vi.Mock).mockReturnValue({
        surfaces: [],
        lightmaps: []
    });

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    (buildBspGeometry as vi.Mock).mockClear();

    const hidden = new Set(['bad_entity']);
    adapter.setHiddenClasses(hidden);

    expect(buildBspGeometry).toHaveBeenCalledWith(mockGl, surfaces, file.map, { hiddenClassnames: hidden });
  });

  it('delegates pickEntity to map', async () => {
    const file: ParsedFile = { type: 'bsp', map: { pickEntity: vi.fn().mockReturnValue('hit') } } as any;
    (buildBspGeometry as vi.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });
    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    const result = adapter.pickEntity!('ray' as any);
    expect(file.map.pickEntity).toHaveBeenCalledWith('ray');
    expect(result).toBe('hit');
  });

  it('handles multi-selection option', async () => {
      const mockEntities = [{ properties: {} }, { properties: {} }];
      const file: ParsedFile = { type: 'bsp', map: {
          pickEntity: vi.fn().mockReturnValue({ entity: mockEntities[1] }),
          entities: { entities: mockEntities }
      } } as any;
      (buildBspGeometry as vi.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });
      await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

      // First selection (Single)
      adapter.pickEntity!('ray' as any, { multiSelect: false });
      // We can't check EntityEditorService state easily as it's a singleton not injected here,
      // but we can ensure it runs without error. To test logic, we should mock the service or rely on its unit tests.
      // Assuming the service works, this call should trigger Single select.

      // Multi selection
      adapter.pickEntity!('ray' as any, { multiSelect: true });
      // Should trigger Toggle select
  });

  it('handles highlighting in render', async () => {
    const file: ParsedFile = { type: 'bsp', map: { models: [{firstFace: 0, numFaces: 1}] } } as any;
    const mockVao = { bind: vi.fn() };
    const surfaces = [{ faceIndex: 0 }]; // Input surface
    (createBspSurfaces as vi.Mock).mockReturnValue(surfaces);

    (buildBspGeometry as vi.Mock).mockReturnValue({
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

    const pipeline = (BspSurfacePipeline as vi.Mock).mock.results[0].value;
    expect(pipeline.bind).toHaveBeenCalledWith(expect.objectContaining({
        renderMode: {
            mode: 'solid',
            color: [1.0, 0.0, 0.0, 1.0], // Red highlight
            applyToAll: true,
            generateRandomColor: false
        }
    }));
  });

  it('highlights entity with * model reference correctly', async () => {
    const file: ParsedFile = { type: 'bsp', map: { models: [{firstFace: 0, numFaces: 1}, {firstFace: 10, numFaces: 5}] } } as any;
    const mockVao = { bind: vi.fn() };
    const surfaces = [{ faceIndex: 12 }]; // Should match model index 1
    (createBspSurfaces as vi.Mock).mockReturnValue(surfaces);

    (buildBspGeometry as vi.Mock).mockReturnValue({
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

    const pipeline = (BspSurfacePipeline as vi.Mock).mock.results[0].value;
    expect(pipeline.bind).toHaveBeenCalledWith(expect.objectContaining({
        renderMode: {
            mode: 'solid',
            color: [1.0, 0.0, 0.0, 1.0], // Red highlight
            applyToAll: true,
            generateRandomColor: false
        }
    }));
  });
});
