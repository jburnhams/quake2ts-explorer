
import { Md3Adapter } from '../../../../../src/components/UniversalViewer/adapters/Md3Adapter';
import { PakService, ParsedFile } from '../../../../../src/services/pakService';
import { Md3SurfaceMesh, Md3Pipeline, Texture2D, parsePcx, pcxToRgba } from 'quake2ts/engine';
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

// Mock dependencies
vi.mock('quake2ts/engine', () => {
  return {
    Md3Pipeline: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        drawSurface: vi.fn(),
    })),
    Md3SurfaceMesh: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        indexCount: 100,
    })),
    Texture2D: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        setParameters: vi.fn(),
        uploadImage: vi.fn(),
    })),
    parsePcx: vi.fn(),
    pcxToRgba: vi.fn(),
  };
});

describe('Md3Adapter', () => {
  let adapter: Md3Adapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: vi.Mocked<PakService>;

  beforeEach(() => {
    adapter = new Md3Adapter();
    mockGl = {
        TRIANGLES: 9,
        LINES: 1,
        UNSIGNED_SHORT: 10,
        TEXTURE0: 7,
        drawElements: vi.fn(),
        activeTexture: vi.fn(),
        generateMipmap: vi.fn(),
    } as unknown as WebGL2RenderingContext;
    mockPakService = {
        hasFile: vi.fn(),
        readFile: vi.fn(),
    } as unknown as vi.Mocked<PakService>;

    // Clear mocks
    vi.clearAllMocks();
  });

  it('throws error if file type is not md3', async () => {
    const file: ParsedFile = { type: 'bsp' } as any;
    await expect(adapter.load(mockGl, file, mockPakService, 'models/test.bsp')).rejects.toThrow('Invalid file type');
  });

  it('loads md3 model', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { surfaces: [{ name: 'surface1', shaders: [] }], header: { numFrames: 10 } }
    } as any;

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    expect(Md3Pipeline).toHaveBeenCalledWith(mockGl);
    expect(Md3SurfaceMesh).toHaveBeenCalledWith(mockGl, file.model.surfaces[0], { frame0: 0, frame1: 0, lerp: 0 });
  });

  it('updates (no-op)', () => {
      adapter.update(16);
      // No observable effect to test currently
  });

  it('renders if loaded', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { surfaces: [], header: { numFrames: 10 } }
    } as any;
    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    const camera = {
        projectionMatrix: mat4.create()
    } as any;
    const viewMatrix = mat4.create();

    // We expect it not to throw and cover the lines
    adapter.render(mockGl, camera, viewMatrix);
  });

  it('does not render if not loaded', () => {
      const camera = {
        projectionMatrix: mat4.create()
    } as any;
    const viewMatrix = mat4.create();

    // Should return early
    adapter.render(mockGl, camera, viewMatrix);
  });

  it('cleans up (no-op)', () => {
      adapter.cleanup();
  });

  it('loads md3 model with skin', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: {
            surfaces: [{ name: 'surface1', shaders: [{ name: 'models/players/model/skin.pcx' }] }],
            header: { numFrames: 10 }
        }
    } as any;

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(100));
    (parsePcx as vi.Mock).mockReturnValue({});
    (pcxToRgba as vi.Mock).mockReturnValue({});

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    expect(mockPakService.hasFile).toHaveBeenCalledWith('models/players/model/skin.pcx');
    expect(mockPakService.readFile).toHaveBeenCalledWith('models/players/model/skin.pcx');
    expect(Texture2D).toHaveBeenCalled();
  });

  it('sets render options and uses them during render', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { surfaces: [{ name: 'surface1', shaders: [] }], header: { numFrames: 10 } }
    } as any;

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    // Test wireframe
    adapter.setRenderOptions({ mode: 'wireframe', color: [0.1, 0.2, 0.3] });
    adapter.render(mockGl, camera, viewMatrix);

    const pipeline = (Md3Pipeline as vi.Mock).mock.results[0].value;
    expect(pipeline.drawSurface).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        renderMode: {
            mode: 'wireframe',
            color: [0.1, 0.2, 0.3, 1.0],
            applyToAll: true
        }
    }));

    // Test solid color
    adapter.setRenderOptions({ mode: 'solid', color: [0.4, 0.5, 0.6] });
    adapter.render(mockGl, camera, viewMatrix);

    expect(pipeline.drawSurface).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        renderMode: {
            mode: 'solid',
            color: [0.4, 0.5, 0.6, 1.0],
            applyToAll: true
        }
    }));
  });

  it('binds skin texture during render', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { surfaces: [{ name: 'surface1', shaders: [{ name: 'someskin.pcx' }] }], header: { numFrames: 10 } }
    } as any;

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(1));
    (parsePcx as vi.Mock).mockReturnValue({});
    (pcxToRgba as vi.Mock).mockReturnValue({});

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    adapter.render(mockGl, camera, viewMatrix);

    expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE0);
    const textureInstance = (Texture2D as vi.Mock).mock.results[0].value;
    expect(textureInstance.bind).toHaveBeenCalled();
  });

  it('supports animation controls', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { surfaces: [], header: { numFrames: 10 } }
    } as any;
    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    // Get animations
    expect(adapter.getAnimations()).toEqual([{
      name: 'All Frames',
      firstFrame: 0,
      lastFrame: 9,
      fps: 30
    }]);

    // Seek
    if (adapter.seekFrame) adapter.seekFrame(5.5);
    const info = adapter.getFrameInfo ? adapter.getFrameInfo() : { interpolatedFrame: 0, currentFrame: 0 };
    expect(info.interpolatedFrame).toBe(5.5);
    expect(info.currentFrame).toBe(5);

    // Play/Pause
    if (adapter.pause) adapter.pause();
    expect(adapter.isPlaying ? adapter.isPlaying() : true).toBe(false);

    // Set animation (resets to 0)
    if (adapter.seekFrame) adapter.seekFrame(5);
    if (adapter.setAnimation) adapter.setAnimation('Any');

    const info2 = adapter.getFrameInfo ? adapter.getFrameInfo() : { interpolatedFrame: -1 };
    expect(info2.interpolatedFrame).toBe(0);
    expect(adapter.isPlaying ? adapter.isPlaying() : false).toBe(true);
  });
});
