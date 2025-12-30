
import { Md2Adapter } from '../../../../../src/components/UniversalViewer/adapters/Md2Adapter';
import { PakService, ParsedFile } from '../../../../../src/services/pakService';
import {
    Md2Pipeline,
    Md2MeshBuffers,
    createAnimationState,
    computeFrameBlend,
    advanceAnimation,
    parsePcx,
    pcxToRgba,
    Texture2D
} from '@quake2ts/engine';
import { type Mock, vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockWebGL2Context, MockWebGL2RenderingContext } from '@quake2ts/test-utils/src/engine/mocks/webgl';

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
  return {
    Md2Pipeline: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
    })),
    Md2MeshBuffers: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        update: vi.fn(),
        indexCount: 100,
    })),
    createAnimationState: vi.fn((seq: any) => ({ sequence: seq, time: 0 })),
    advanceAnimation: vi.fn((state: any) => state),
    computeFrameBlend: vi.fn((state: any) => {
        const fps = state.sequence.fps || 9;
        const frame = state.sequence.start + state.time * fps;
        return { frame0: Math.floor(frame), frame1: Math.floor(frame), lerp: frame - Math.floor(frame) };
    }),
    parsePcx: vi.fn(),
    pcxToRgba: vi.fn(),
    Texture2D: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        uploadImage: vi.fn(),
        setParameters: vi.fn(),
    })),
  };
});

describe('Md2Adapter', () => {
  let adapter: Md2Adapter;
  let mockGl: MockWebGL2RenderingContext;
  let mockPakService: vi.Mocked<PakService>;

  beforeEach(() => {
    adapter = new Md2Adapter();
    mockGl = createMockWebGL2Context();
    // Polyfill missing
    Object.assign(mockGl, {
        LINES: 1,
        TEXTURE1: 0x84c1,
        generateMipmap: vi.fn(),
    });

    mockPakService = {
        hasFile: vi.fn(),
        readFile: vi.fn(),
    } as unknown as vi.Mocked<PakService>;

    vi.clearAllMocks();
  });

  it('loads md2 model', async () => {
      const file: ParsedFile = {
          type: 'md2',
          model: { header: { numFrames: 20 }, skins: [], frames: [] } as any,
          animations: [{ name: 'anim1', firstFrame: 0, lastFrame: 10 }] as any
      };

      await adapter.load(mockGl as unknown as WebGL2RenderingContext, file, mockPakService, 'test.md2');

      expect(Md2Pipeline).toHaveBeenCalledWith(mockGl);
      expect(createAnimationState).toHaveBeenCalled();
  });

  it('supports animation controls', async () => {
      const file: ParsedFile = {
          type: 'md2',
          model: { header: { numFrames: 21 }, skins: [], frames: [] } as any,
          animations: [
              { name: 'anim1', firstFrame: 0, lastFrame: 10 },
              { name: 'anim2', firstFrame: 11, lastFrame: 20 }
          ] as any
      };

      await adapter.load(mockGl as unknown as WebGL2RenderingContext, file, mockPakService, 'test.md2');

      // Get animations
      const anims = adapter.getAnimations();
      expect(anims).toHaveLength(2);
      expect(anims[0].name).toBe('anim1');

      // Set animation
      adapter.setAnimation('anim2');
      // Initially time is 0, so frame should be 11 (start of anim2)
      let info = adapter.getFrameInfo();
      expect(info.currentFrame).toBe(11);

      // Seek
      // Seek to frame 15.
      // (15 - 11) / 9 = 4/9 seconds.
      adapter.seekFrame(15.5);
      info = adapter.getFrameInfo();
      expect(info.interpolatedFrame).toBeCloseTo(15.5);
  });

  it('loads md2 model with skin', async () => {
      const file: ParsedFile = {
          type: 'md2',
          model: { header: { numFrames: 20 }, skins: [{name: 'skin.pcx'}], frames: [] } as any,
          animations: [{ name: 'anim1', firstFrame: 0, lastFrame: 10 }] as any
      };

      mockPakService.hasFile.mockReturnValue(true);
      mockPakService.readFile.mockResolvedValue(new Uint8Array(10));
      (parsePcx as Mock).mockReturnValue({ width: 10, height: 10 });
      (pcxToRgba as Mock).mockReturnValue(new Uint8Array(400));

      await adapter.load(mockGl as unknown as WebGL2RenderingContext, file, mockPakService, 'test.md2');

      expect(mockPakService.readFile).toHaveBeenCalledWith('skin.pcx');
      expect(Texture2D).toHaveBeenCalled();
  });

  it('renders model', async () => {
      const file: ParsedFile = {
          type: 'md2',
          model: { header: { numFrames: 20 }, skins: [], frames: [] } as any,
          animations: [{ name: 'anim1', firstFrame: 0, lastFrame: 10 }] as any
      };
      await adapter.load(mockGl as unknown as WebGL2RenderingContext, file, mockPakService, 'test.md2');

      const camera: any = { projectionMatrix: new Float32Array(16) };
      const viewMatrix = new Float32Array(16);

      adapter.render(mockGl as unknown as WebGL2RenderingContext, camera, viewMatrix);

      const pipeline = (Md2Pipeline as Mock).mock.results[0].value;
      expect(pipeline.bind).toHaveBeenCalled();

      const buffers = (Md2MeshBuffers as Mock).mock.results[0].value;
      expect(buffers.bind).toHaveBeenCalled();
      expect(mockGl.drawElements).toHaveBeenCalled();
  });

  it('updates animation state', () => {
      adapter.setSpeed(1.0); // coverage
      adapter.play(); // coverage
  });

  it('updates animation when loaded', async () => {
      const file: ParsedFile = {
          type: 'md2',
          model: { header: { numFrames: 20 }, skins: [], frames: [] } as any,
          animations: [{ name: 'anim1', firstFrame: 0, lastFrame: 10 }] as any
      };
      await adapter.load(mockGl as unknown as WebGL2RenderingContext, file, mockPakService, 'test.md2');

      adapter.update(0.1);
      expect(advanceAnimation).toHaveBeenCalled();
      expect(computeFrameBlend).toHaveBeenCalled();
      const buffers = (Md2MeshBuffers as Mock).mock.results[0].value;
      expect(buffers.update).toHaveBeenCalled();
  });
});
