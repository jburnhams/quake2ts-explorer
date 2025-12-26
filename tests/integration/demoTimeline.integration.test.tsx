import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalViewer } from '../../src/components/UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '../../src/services/pakService';
import { Dm2Adapter } from '../../src/components/UniversalViewer/adapters/Dm2Adapter';
import { DemoPlaybackController } from '@quake2ts/engine';

// Mock gl-matrix
vi.mock('gl-matrix', () => ({
  vec3: {
    create: () => new Float32Array([0, 0, 0]),
    fromValues: (x: number, y: number, z: number) => new Float32Array([x, y, z]),
    copy: (out: any, a: any) => out,
    set: (out: any, x: any, y: any, z: any) => {},
    normalize: () => {},
    cross: () => {},
    scale: () => {},
    add: () => {},
    scaleAndAdd: () => {},
    clone: (a: any) => new Float32Array([0,0,0])
  },
  mat4: {
    create: () => new Float32Array(16),
    lookAt: () => {},
    copy: () => {}
  },
  vec4: {
    create: () => new Float32Array([0, 0, 0, 0]),
    fromValues: (x: number, y: number, z: number, w: number) => new Float32Array([x, y, z, w]),
    transformMat4: () => {}
  }
}));

// Mock quake2ts/engine
vi.mock('@quake2ts/engine', () => {
    return {
        createWebGLContext: vi.fn(() => ({
            gl: {
                clearColor: vi.fn(),
                clear: vi.fn(),
                enable: vi.fn(),
                viewport: vi.fn(),
                COLOR_BUFFER_BIT: 16384,
                DEPTH_BUFFER_BIT: 256,
                DEPTH_TEST: 2929,
                CULL_FACE: 2884,
                createShader: vi.fn(),
                shaderSource: vi.fn(),
                compileShader: vi.fn(),
                createProgram: vi.fn(),
                attachShader: vi.fn(),
                linkProgram: vi.fn(),
                useProgram: vi.fn(),
                getAttribLocation: vi.fn(),
                getUniformLocation: vi.fn(),
                createBuffer: vi.fn(),
                bindBuffer: vi.fn(),
                bufferData: vi.fn(),
                enableVertexAttribArray: vi.fn(),
                vertexAttribPointer: vi.fn(),
                createVertexArray: vi.fn(),
                bindVertexArray: vi.fn(),
            }
        })),
        Camera: vi.fn(() => ({
            position: new Float32Array([0,0,0]),
            angles: new Float32Array([0,0,0]),
            viewMatrix: new Float32Array(16)
        })),
        DemoPlaybackController: vi.fn().mockImplementation(() => ({
            loadDemo: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            stop: vi.fn(),
            update: vi.fn(),
            getState: vi.fn().mockReturnValue({ origin: [0,0,0], angles: [0,0,0] }),
            getDuration: vi.fn().mockReturnValue(60),
            getCurrentTime: vi.fn().mockReturnValue(0),
            getCurrentFrame: vi.fn().mockReturnValue(0),
            getFrameCount: vi.fn().mockReturnValue(600),
            seekToTime: vi.fn(),
            getDemoEvents: vi.fn().mockReturnValue([]),
            getDemoHeader: vi.fn().mockReturnValue({ tickRate: 40 })
        })),
        DemoEventType: {
            Death: 1
        }
    };
});

// Mock Dm2Adapter
vi.mock('../../src/components/UniversalViewer/adapters/Dm2Adapter');

describe('UniversalViewer - Demo Integration', () => {
  let mockPakService: PakService;

  beforeEach(() => {
      vi.clearAllMocks();
      (Dm2Adapter as unknown as vi.Mock).mockImplementation(() => {
          const controller = new (require('@quake2ts/engine').DemoPlaybackController)();
          return {
              load: vi.fn().mockResolvedValue(undefined),
              update: vi.fn(),
              render: vi.fn(),
              cleanup: vi.fn(),
              play: vi.fn(),
              pause: vi.fn(),
              isPlaying: vi.fn().mockReturnValue(true),
              getDemoController: vi.fn().mockReturnValue(controller),
              hasCameraControl: vi.fn().mockReturnValue(true),
              getCameraUpdate: vi.fn().mockReturnValue({ position: [0,0,0], angles: [0,0,0] })
          };
      });

      mockPakService = {
          hasFile: vi.fn().mockReturnValue(false),
          parseFile: vi.fn()
      } as unknown as PakService;
  });

  it('renders DemoTimeline when loading a DM2 file', async () => {
      const dm2File: ParsedFile = {
          type: 'dm2',
          data: new Uint8Array(100),
          name: 'test.dm2'
      };

      await act(async () => {
          render(
              <UniversalViewer
                  parsedFile={dm2File}
                  pakService={mockPakService}
                  filePath="demos/test.dm2"
              />
          );
      });

      // Wait for adapter load
      await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(screen.getByText('0:00.00')).toBeInTheDocument(); // Timeline start time
      expect(screen.getByText('1:00.00')).toBeInTheDocument(); // Timeline duration (mocked 60s)
  });

  it('toggles FrameInfo when F is pressed', async () => {
      const dm2File: ParsedFile = {
          type: 'dm2',
          data: new Uint8Array(100),
          name: 'test.dm2'
      };

      await act(async () => {
          render(
              <UniversalViewer
                  parsedFile={dm2File}
                  pakService={mockPakService}
                  filePath="demos/test.dm2"
              />
          );
      });

      await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should not be visible initially
      expect(screen.queryByText(/Tick Rate:/)).not.toBeInTheDocument();

      // Press F
      act(() => {
          const event = new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true });
          window.dispatchEvent(event);
      });

      // Should be visible
      expect(screen.getByText(/Tick Rate: 40 Hz/)).toBeInTheDocument();
  });
});
