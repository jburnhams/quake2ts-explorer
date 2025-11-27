import { describe, it, expect, jest, beforeEach } from '@jest/globals';
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
} from 'quake2ts/engine';
import { mat4 } from 'gl-matrix';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
  return {
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
        setParameters: jest.fn(),
        uploadImage: jest.fn(),
    })),
    parseWal: jest.fn(),
    walToRgba: jest.fn(),
    resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
    applySurfaceState: jest.fn(),
    Camera: jest.fn(),
  };
});

describe('BspAdapter', () => {
  let adapter: BspAdapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: jest.Mocked<PakService>;

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
        generateMipmap: jest.fn(),
        activeTexture: jest.fn(),
        drawElements: jest.fn(),
    } as unknown as WebGL2RenderingContext;

    mockPakService = {
      hasFile: jest.fn(),
      readFile: jest.fn(),
      getPalette: jest.fn(),
    } as unknown as jest.Mocked<PakService>;

    // Clear mocks
    jest.clearAllMocks();
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
    (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [
            { texture: 'wall' }
        ],
        lightmaps: []
    });

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(100));
    mockPakService.getPalette.mockReturnValue(new Uint8Array(768));

    (parseWal as jest.Mock).mockReturnValue({});
    (walToRgba as jest.Mock).mockReturnValue({
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
    const textureInstance = (Texture2D as jest.Mock).mock.results[0].value;
    expect(textureInstance.uploadImage).toHaveBeenCalled();
    expect(mockGl.generateMipmap).toHaveBeenCalled();
  });

  it('handles missing textures gracefully', async () => {
     const file: ParsedFile = { type: 'bsp', map: {} } as any;
     (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [{ texture: 'missing' }],
        lightmaps: []
    });
    mockPakService.hasFile.mockReturnValue(false);

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(mockPakService.readFile).not.toHaveBeenCalled();
  });

  it('handles texture load failure gracefully', async () => {
     const file: ParsedFile = { type: 'bsp', map: {} } as any;
     (buildBspGeometry as jest.Mock).mockReturnValue({
        surfaces: [{ texture: 'broken' }],
        lightmaps: []
    });
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockRejectedValue(new Error('Read error'));

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load texture broken', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('renders surfaces', async () => {
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
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
    const textureInstance = (Texture2D as jest.Mock).mock.results[0].value;
    expect(textureInstance.bind).toHaveBeenCalled();

    expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE1); // Lightmap

    expect(applySurfaceState).toHaveBeenCalled();
    expect(mockVao.bind).toHaveBeenCalled();
    expect(mockGl.drawElements).toHaveBeenCalledWith(mockGl.TRIANGLES, 6, mockGl.UNSIGNED_SHORT, 0);
  });

  it('cleans up (no-op/simple clear)', () => {
      adapter.cleanup();
  });

  it('returns true for useZUp', () => {
      expect(adapter.useZUp()).toBe(true);
  });

  it('sets render options and uses them during render', async () => {
    const file: ParsedFile = { type: 'bsp', map: {} } as any;
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

    expect(mockGl.drawElements).toHaveBeenCalledWith(1, 6, mockGl.UNSIGNED_SHORT, 0); // Assuming 1 is LINES for wireframe in mock

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.results[0].value;
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
            getUniqueClassnames: jest.fn().mockReturnValue(classnames)
        }
    };
    const file: ParsedFile = { type: 'bsp', map: mockMap } as any;

    (buildBspGeometry as jest.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });

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
    const file: ParsedFile = { type: 'bsp', map: { pickEntity: jest.fn().mockReturnValue('hit') } } as any;
    (buildBspGeometry as jest.Mock).mockReturnValue({ surfaces: [], lightmaps: [] });
    await adapter.load(mockGl, file, mockPakService, 'maps/test.bsp');

    const result = adapter.pickEntity!('ray' as any);
    expect(file.map.pickEntity).toHaveBeenCalledWith('ray');
    expect(result).toBe('hit');
  });

  it('handles highlighting in render', async () => {
    const file: ParsedFile = { type: 'bsp', map: { models: [{firstFace: 0, numFaces: 1}] } } as any;
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

    const pipeline = (BspSurfacePipeline as jest.Mock).mock.results[0].value;
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
