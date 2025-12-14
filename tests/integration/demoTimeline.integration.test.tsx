import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalViewer } from '../../src/components/UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '../../src/services/pakService';
import { Dm2Adapter } from '../../src/components/UniversalViewer/adapters/Dm2Adapter';
import { MapEditorProvider } from '@/src/context/MapEditorContext';
import { DemoPlaybackController } from 'quake2ts/engine';

// Mock gl-matrix
jest.mock('gl-matrix', () => ({
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
  }
}));

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: jest.fn(() => ({
            gl: {
                clearColor: jest.fn(),
                clear: jest.fn(),
                enable: jest.fn(),
                viewport: jest.fn(),
                COLOR_BUFFER_BIT: 16384,
                DEPTH_BUFFER_BIT: 256,
                DEPTH_TEST: 2929,
                CULL_FACE: 2884,
                createShader: jest.fn(),
                shaderSource: jest.fn(),
                compileShader: jest.fn(),
                createProgram: jest.fn(),
                attachShader: jest.fn(),
                linkProgram: jest.fn(),
                useProgram: jest.fn(),
                getAttribLocation: jest.fn(),
                getUniformLocation: jest.fn(),
                createBuffer: jest.fn(),
                bindBuffer: jest.fn(),
                bufferData: jest.fn(),
                enableVertexAttribArray: jest.fn(),
                vertexAttribPointer: jest.fn(),
                createVertexArray: jest.fn(),
                bindVertexArray: jest.fn(),
            }
        })),
        Camera: jest.fn(() => ({
            position: new Float32Array([0,0,0]),
            angles: new Float32Array([0,0,0]),
            viewMatrix: new Float32Array(16)
        })),
        DemoPlaybackController: jest.fn().mockImplementation(() => ({
            loadDemo: jest.fn(),
            play: jest.fn(),
            pause: jest.fn(),
            stop: jest.fn(),
            update: jest.fn(),
            getState: jest.fn().mockReturnValue({ origin: [0,0,0], angles: [0,0,0] }),
            getDuration: jest.fn().mockReturnValue(60),
            getCurrentTime: jest.fn().mockReturnValue(0),
            getCurrentFrame: jest.fn().mockReturnValue(0),
            getFrameCount: jest.fn().mockReturnValue(600),
            seekToTime: jest.fn(),
            getDemoEvents: jest.fn().mockReturnValue([]),
            getDemoHeader: jest.fn().mockReturnValue({ tickRate: 40 })
        })),
        DemoEventType: {
            Death: 1
        }
    };
});

// Mock Dm2Adapter
jest.mock('../../src/components/UniversalViewer/adapters/Dm2Adapter');

describe('UniversalViewer - Demo Integration', () => {
  let mockPakService: PakService;

  beforeEach(() => {
      jest.clearAllMocks();
      (Dm2Adapter as unknown as jest.Mock).mockImplementation(() => {
          const controller = new (require('quake2ts/engine').DemoPlaybackController)();
          return {
              load: jest.fn().mockResolvedValue(undefined),
              update: jest.fn(),
              render: jest.fn(),
              cleanup: jest.fn(),
              play: jest.fn(),
              pause: jest.fn(),
              isPlaying: jest.fn().mockReturnValue(true),
              getDemoController: jest.fn().mockReturnValue(controller),
              hasCameraControl: jest.fn().mockReturnValue(true),
              getCameraUpdate: jest.fn().mockReturnValue({ position: [0,0,0], angles: [0,0,0] })
          };
      });

      mockPakService = {
          hasFile: jest.fn().mockReturnValue(false),
          parseFile: jest.fn()
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
              <MapEditorProvider>
              <UniversalViewer
                  parsedFile={dm2File}
                  pakService={mockPakService}
                  filePath="demos/test.dm2"
              />
              </MapEditorProvider>
          );
      });

      // Wait for adapter load
      await new Promise(resolve => setTimeout(resolve, 100));

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
              <MapEditorProvider>
              <UniversalViewer
                  parsedFile={dm2File}
                  pakService={mockPakService}
                  filePath="demos/test.dm2"
              />
              </MapEditorProvider>
          );
      });

      await new Promise(resolve => setTimeout(resolve, 100));

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
