import { render, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '../../../src/components/UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '../../../src/services/pakService';
import { vec3 } from 'gl-matrix';
import React from 'react';

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: jest.fn().mockReturnValue({
            gl: {
                clearColor: jest.fn(), clear: jest.fn(), enable: jest.fn(), drawElements: jest.fn(), viewport: jest.fn(), activeTexture: jest.fn(),
                generateMipmap: jest.fn(),
                TRIANGLES: 0, COLOR_BUFFER_BIT: 0, DEPTH_BUFFER_BIT: 0, DEPTH_TEST: 0, CULL_FACE: 0, UNSIGNED_SHORT: 0, RGBA: 0,
                UNSIGNED_BYTE: 0, LINEAR_MIPMAP_LINEAR: 0, LINEAR: 0, REPEAT: 0, TEXTURE0: 0, TEXTURE_2D: 0
            },
        }),
        Camera: jest.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            fov: 60, aspect: 1,
            position: { set: jest.fn() },
            angles: { set: jest.fn() },
            updateMatrices: jest.fn(),
        })),
        // MD2
        Md2Pipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
        Md2MeshBuffers: jest.fn().mockImplementation(() => ({ bind: jest.fn(), update: jest.fn(), indexCount: 123 })),
        createAnimationState: jest.fn((seq) => ({ sequence: seq })),
        advanceAnimation: jest.fn(state => state),
        computeFrameBlend: jest.fn().mockReturnValue({ frame0: 0, frame1: 0, lerp: 0 }),
        parsePcx: jest.fn().mockReturnValue({ width: 32, height: 32 }),
        pcxToRgba: jest.fn().mockReturnValue(new Uint8Array(10)),
        // BSP
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn(), draw: jest.fn() })),
        createBspSurfaces: jest.fn().mockReturnValue([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]),
        buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [{ texture: 't1', indexCount: 6, vao: { bind: jest.fn() }, surfaceFlags: 0 }], lightmaps: [] }),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: jest.fn(),
        parseWal: jest.fn().mockReturnValue({ width: 64, height: 64 }),
        walToRgba: jest.fn().mockReturnValue({ levels: [{ width: 64, height: 64, rgba: new Uint8Array() }] }),
        // MD3
        Md3Pipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
        Md3ModelMesh: jest.fn().mockImplementation(() => ({})),
        // DM2
        DemoPlaybackController: jest.fn().mockImplementation(() => ({
            loadDemo: jest.fn(),
            play: jest.fn(),
            pause: jest.fn(),
            stop: jest.fn(),
            update: jest.fn(),
            getState: jest.fn().mockReturnValue({ origin: [0,0,0], angles: [0,0,0] }),
        })),
        Texture2D: jest.fn().mockImplementation(() => ({
            uploadImage: jest.fn(), setParameters: jest.fn(), bind: jest.fn(),
        })),
    };
});

jest.mock('gl-matrix', () => {
    return {
        mat4: {
            create: jest.fn().mockReturnValue(new Float32Array(16)),
            lookAt: jest.fn(),
            multiply: jest.fn(),
            copy: jest.fn(),
        },
        vec3: {
            create: jest.fn().mockReturnValue(new Float32Array(3)),
            fromValues: jest.fn().mockReturnValue(new Float32Array(3)),
            normalize: jest.fn(),
            cross: jest.fn(),
            scale: jest.fn(),
            add: jest.fn(),
            copy: jest.fn(),
        }
    };
});

jest.mock('../../../src/components/UniversalViewer/ViewerControls', () => ({
  ViewerControls: () => <div data-testid="viewer-controls" />,
}));

describe('UniversalViewer', () => {
  let pakServiceMock: any;
  let quake2tsMock: any;

  beforeEach(() => {
      pakServiceMock = {
          hasFile: jest.fn().mockReturnValue(false),
          readFile: jest.fn().mockResolvedValue(new Uint8Array(100)),
          parseFile: jest.fn(),
          getPalette: jest.fn(),
      };
      quake2tsMock = require('quake2ts/engine');
      jest.clearAllMocks();

      let frameId = 0;
      const frameCallbacks = new Map<number, FrameRequestCallback>();
      (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
          const id = ++frameId;
          frameCallbacks.set(id, cb);
          return id;
      };
      (global as any).cancelAnimationFrame = (id: number) => frameCallbacks.delete(id);
      (global as any).runAllFrames = (time: number) => {
          const callbacks = Array.from(frameCallbacks.values());
          frameCallbacks.clear();
          callbacks.forEach(cb => cb(time));
      };
  });

  it('renders MD2 adapter', async () => {
      const parsedFile: ParsedFile = {
          type: 'md2',
          model: { header: {}, skins: [], frames: [{name:'f1'}] } as any,
          animations: [{ name: 'anim', firstFrame: 0, lastFrame: 10 }] as any,
      };

      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} />);

      await waitFor(() => expect(quake2tsMock.Md2Pipeline).toHaveBeenCalled());
      const pipeline = quake2tsMock.Md2Pipeline.mock.results[0].value;

      await waitFor(() => {
           (global as any).runAllFrames(0);
           expect(pipeline.bind).toHaveBeenCalled();
      });
  });

  it('renders BSP adapter', async () => {
      const parsedFile: ParsedFile = {
          type: 'bsp',
          map: { models: [] } as any,
      };

      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());
      const pipeline = quake2tsMock.BspSurfacePipeline.mock.results[0].value;

      await waitFor(() => {
           (global as any).runAllFrames(0);
           expect(pipeline.bind).toHaveBeenCalled();
      });
  });

  it('renders DM2 adapter and attempts to load map from filename', async () => {
      const parsedFile: ParsedFile = {
          type: 'dm2',
          data: new Uint8Array(100),
      };

      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} filePath="demos/test.dm2" />);

      await waitFor(() => expect(quake2tsMock.DemoPlaybackController).toHaveBeenCalled());
      const controller = quake2tsMock.DemoPlaybackController.mock.results[0].value;
      expect(controller.loadDemo).toHaveBeenCalled();
      expect(controller.play).toHaveBeenCalled();

      // Check if it tried to check for the map
      expect(pakServiceMock.hasFile).toHaveBeenCalledWith('maps/test.bsp');
  });

  it('renders MD3 adapter', async () => {
      const parsedFile: ParsedFile = {
          type: 'md3',
          model: { header: {} } as any,
      };

      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} />);

      await waitFor(() => expect(quake2tsMock.Md3Pipeline).toHaveBeenCalled());
      // MD3 render is placeholder but should not crash
      await waitFor(() => {
          (global as any).runAllFrames(0);
      });
  });
});
