import { Md3Adapter } from '../../../../../src/components/UniversalViewer/adapters/Md3Adapter';
import { Md3Pipeline, Md3SurfaceMesh, Texture2D, parsePcx, pcxToRgba } from 'quake2ts/engine';
import { DebugRenderer } from '../../../../../src/components/UniversalViewer/adapters/DebugRenderer';
import { PakService } from '../../../../../src/services/pakService';
import { DebugMode } from '@/src/types/debugMode';

// Mocks
jest.mock('quake2ts/engine');
jest.mock('../../../../../src/components/UniversalViewer/adapters/DebugRenderer');

describe('Md3Adapter Coverage', () => {
  let adapter: Md3Adapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: any;
  let mockFile: any;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new Md3Adapter();
    mockGl = {
      LINEAR_MIPMAP_LINEAR: 1,
      LINEAR: 2,
      REPEAT: 3,
      RGBA: 4,
      UNSIGNED_BYTE: 5,
      TEXTURE_2D: 6,
      TEXTURE0: 7,
      generateMipmap: jest.fn(),
      activeTexture: jest.fn(),
    } as unknown as WebGL2RenderingContext;

    mockPakService = {
      hasFile: jest.fn(),
      readFile: jest.fn(),
    };

    mockFile = {
      type: 'md3',
      model: {
        header: { numFrames: 10 },
        surfaces: [
          { name: 'head', shaders: [{ name: 'head_skin.pcx' }] },
          { name: 'body', shaders: [] } // No shader case
        ],
        frames: [
          { minBounds: [-10, -10, -10], maxBounds: [10, 10, 10] }, // Frame 0
          { minBounds: [-10, -10, -10], maxBounds: [10, 10, 10] }  // Frame 1
        ],
        tags: [ // Tags for frame 0
          [
            { origin: [0, 10, 0], axis: [[1,0,0], [0,1,0], [0,0,1]] }
          ]
        ]
      }
    };
    // Mock the tags structure to be an array of arrays of tags (frames -> tags)
    mockFile.model.tags = Array(10).fill([
         { origin: [0, 10, 0], axis: [[1,0,0], [0,1,0], [0,0,1]] }
    ]);
  });

  test('loads valid MD3 file', async () => {
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockResolvedValue(new Uint8Array(10));
    (parsePcx as jest.Mock).mockReturnValue({ width: 32, height: 32 });
    (pcxToRgba as jest.Mock).mockReturnValue(new Uint8Array(1024));

    await adapter.load(mockGl, mockFile, mockPakService, 'models/test.md3');

    expect(Md3Pipeline).toHaveBeenCalled();
    expect(Md3SurfaceMesh).toHaveBeenCalledTimes(2);
    expect(Texture2D).toHaveBeenCalled();
  });

  test('throws on invalid file type', async () => {
    const invalidFile = { type: 'md2' } as any;
    await expect(adapter.load(mockGl, invalidFile, mockPakService, 'test')).rejects.toThrow('Invalid file type');
  });

  test('handles texture load failure', async () => {
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.readFile.mockRejectedValue(new Error('Load failed'));

    // Should not throw
    await adapter.load(mockGl, mockFile, mockPakService, 'test');

    // Texture2D should not have been called for the failed texture
    expect(Texture2D).not.toHaveBeenCalled();
  });

  test('updates animation', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'test');

    adapter.play();
    adapter.setSpeed(1.0);

    adapter.update(0.1); // Advance time

    const info = adapter.getFrameInfo();
    expect(info.currentFrame).toBeGreaterThanOrEqual(0);
  });

  test('renders', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'test');

    const mockCamera = { projectionMatrix: [] } as any;
    const mockViewMatrix = [] as any;

    // Basic render
    adapter.render(mockGl, mockCamera, mockViewMatrix);
    const mockPipelineInstance = (Md3Pipeline as jest.Mock).mock.instances[0];
    expect(mockPipelineInstance.bind).toHaveBeenCalled();
    expect(mockPipelineInstance.drawSurface).toHaveBeenCalledTimes(2);
  });

  test('renders debug bounding boxes', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'test');
    adapter.setDebugMode(DebugMode.BoundingBoxes);

    const mockCamera = { projectionMatrix: [] } as any;
    const mockViewMatrix = [] as any;

    adapter.render(mockGl, mockCamera, mockViewMatrix);

    const debugInstance = (DebugRenderer as jest.Mock).mock.instances[0];
    expect(debugInstance.clear).toHaveBeenCalled();
    expect(debugInstance.addBox).toHaveBeenCalled();
    expect(debugInstance.render).toHaveBeenCalled();
  });

  test('renders debug bounding boxes fallback', async () => {
      // Setup model with no frames
      const fileNoFrames = { ...mockFile, model: { ...mockFile.model, frames: [] } };
      await adapter.load(mockGl, fileNoFrames, mockPakService, 'test');
      adapter.setDebugMode(DebugMode.BoundingBoxes);

      const mockCamera = { projectionMatrix: [] } as any;
      const mockViewMatrix = [] as any;

      adapter.render(mockGl, mockCamera, mockViewMatrix);

      const debugInstance = (DebugRenderer as jest.Mock).mock.instances[0];
      // Should call addBox with fallback values
      expect(debugInstance.addBox).toHaveBeenCalled();
  });

  test('renders debug skeleton', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'test');
    adapter.setDebugMode(DebugMode.Skeleton);

    const mockCamera = { projectionMatrix: [] } as any;
    const mockViewMatrix = [] as any;

    adapter.render(mockGl, mockCamera, mockViewMatrix);

    const debugInstance = (DebugRenderer as jest.Mock).mock.instances[0];
    expect(debugInstance.addLine).toHaveBeenCalled(); // Axes
    expect(debugInstance.addBox).toHaveBeenCalled(); // Origin
  });

  test('controls: seek, pause, animations', async () => {
      await adapter.load(mockGl, mockFile, mockPakService, 'test');

      adapter.pause();
      expect(adapter.isPlaying()).toBe(false);

      adapter.seekFrame(5);
      expect(adapter.getFrameInfo().currentFrame).toBe(5);

      adapter.seekFrame(-1); // Clamp min
      expect(adapter.getFrameInfo().currentFrame).toBe(0);

      adapter.seekFrame(100); // Clamp max
      expect(adapter.getFrameInfo().currentFrame).toBeLessThan(10);

      const anims = adapter.getAnimations();
      expect(anims.length).toBe(1);
      expect(anims[0].name).toBe('All Frames');

      adapter.setAnimation('any');
      expect(adapter.getFrameInfo().currentFrame).toBe(0);
      expect(adapter.isPlaying()).toBe(true);
  });
});
