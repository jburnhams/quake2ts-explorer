import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Md3Adapter } from '../../../../../src/components/UniversalViewer/adapters/Md3Adapter';
import { PakService, ParsedFile } from '../../../../../src/services/pakService';
import { Md3ModelMesh, Md3Pipeline, Texture2D, parsePcx, pcxToRgba } from 'quake2ts/engine';
import { mat4 } from 'gl-matrix';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
  return {
    Md3Pipeline: jest.fn().mockImplementation(() => ({
        bind: jest.fn(),
    })),
    Md3ModelMesh: jest.fn().mockImplementation(() => ({
        bind: jest.fn(),
        indexCount: 100,
    })),
    Texture2D: jest.fn().mockImplementation(() => ({
        bind: jest.fn(),
        setParameters: jest.fn(),
        uploadImage: jest.fn(),
    })),
    parsePcx: jest.fn(),
    pcxToRgba: jest.fn(),
  };
});

describe('Md3Adapter', () => {
  let adapter: Md3Adapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: jest.Mocked<PakService>;

  beforeEach(() => {
    adapter = new Md3Adapter();
    mockGl = {
        TRIANGLES: 9,
        LINES: 1,
        UNSIGNED_SHORT: 10,
        TEXTURE0: 7,
        drawElements: jest.fn(),
        activeTexture: jest.fn(),
        generateMipmap: jest.fn(),
    } as unknown as WebGL2RenderingContext;
    mockPakService = {
        hasFile: jest.fn(),
        readFile: jest.fn(),
    } as unknown as jest.Mocked<PakService>;

    // Clear mocks
    jest.clearAllMocks();
  });

  it('throws error if file type is not md3', async () => {
    const file: ParsedFile = { type: 'bsp' } as any;
    await expect(adapter.load(mockGl, file, mockPakService, 'models/test.bsp')).rejects.toThrow('Invalid file type');
  });

  it('loads md3 model', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { skins: [] }
    } as any;

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    expect(Md3Pipeline).toHaveBeenCalledWith(mockGl);
    expect(Md3ModelMesh).toHaveBeenCalledWith(mockGl, file.model, 0, 0);
  });

  it('updates (no-op)', () => {
      adapter.update(16);
      // No observable effect to test currently
  });

  it('renders if loaded', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { skins: [] }
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
            skins: [{ name: 'models/players/model/skin.pcx' }]
        }
    } as any;

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(100));
    (parsePcx as jest.Mock).mockReturnValue({});
    (pcxToRgba as jest.Mock).mockReturnValue({});

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    expect(mockPakService.hasFile).toHaveBeenCalledWith('models/players/model/skin.pcx');
    expect(mockPakService.readFile).toHaveBeenCalledWith('models/players/model/skin.pcx');
    expect(Texture2D).toHaveBeenCalled();
  });

  it('sets render options and uses them during render', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: { skins: [] }
    } as any;

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    // Test wireframe
    adapter.setRenderOptions({ mode: 'wireframe', color: [0.1, 0.2, 0.3] });
    adapter.render(mockGl, camera, viewMatrix);

    expect(mockGl.drawElements).toHaveBeenCalledWith(mockGl.LINES, 100, mockGl.UNSIGNED_SHORT, 0);

    const pipeline = (Md3Pipeline as jest.Mock).mock.results[0].value;
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

    expect(mockGl.drawElements).toHaveBeenCalledWith(mockGl.TRIANGLES, 100, mockGl.UNSIGNED_SHORT, 0);
    expect(pipeline.bind).toHaveBeenCalledWith(expect.objectContaining({
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
        model: { skins: [{ name: 'someskin.pcx' }] }
    } as any;

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(1));
    (parsePcx as jest.Mock).mockReturnValue({});
    (pcxToRgba as jest.Mock).mockReturnValue({});

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    const camera = { projectionMatrix: mat4.create() } as any;
    const viewMatrix = mat4.create();

    adapter.render(mockGl, camera, viewMatrix);

    expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE0);
    const textureInstance = (Texture2D as jest.Mock).mock.results[0].value;
    expect(textureInstance.bind).toHaveBeenCalled();
  });
});
