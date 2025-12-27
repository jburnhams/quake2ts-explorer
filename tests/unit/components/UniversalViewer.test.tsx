import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '../../../src/components/UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '../../../src/services/pakService';
import { vec3 } from 'gl-matrix';
import React from 'react';

// Mock DebugRenderer
vi.mock('../../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
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

// Mock quake2ts/engine
vi.mock('@quake2ts/engine', async () => {
    const {
        createMockWebGL2Context,
        createMockMd2Pipeline,
        createMockBspPipeline,
        createMockMd3Pipeline
    } = await import('@quake2ts/test-utils');

    return {
        createWebGLContext: vi.fn().mockImplementation(() => ({
            gl: createMockWebGL2Context()
        })),
        Camera: vi.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            fov: 60, aspect: 1,
            position: { set: vi.fn() },
            angles: { set: vi.fn() },
            updateMatrices: vi.fn(),
        })),
        // Add DLight export
        DLight: vi.fn().mockImplementation(() => ({
             origin: new Float32Array(3),
             color: new Float32Array(3),
             intensity: 1.0
        })),
        // MD2
        Md2Pipeline: vi.fn().mockImplementation(() => createMockMd2Pipeline()),
        Md2MeshBuffers: vi.fn().mockImplementation(() => ({ bind: vi.fn(), update: vi.fn(), indexCount: 123 })),
        createAnimationState: vi.fn((seq) => ({ sequence: seq })),
        advanceAnimation: vi.fn(state => state),
        computeFrameBlend: vi.fn().mockReturnValue({ frame0: 0, frame1: 0, lerp: 0 }),
        parsePcx: vi.fn().mockReturnValue({ width: 32, height: 32 }),
        pcxToRgba: vi.fn().mockReturnValue(new Uint8Array(10)),
        // BSP
        BspSurfacePipeline: vi.fn().mockImplementation(() => createMockBspPipeline()),
        createBspSurfaces: vi.fn().mockReturnValue([]),
        buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [{ texture: 't1', indexCount: 6, vao: { bind: vi.fn() }, surfaceFlags: 0 }], lightmaps: [] }),
        resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: vi.fn(),
        parseWal: vi.fn().mockReturnValue({ width: 64, height: 64 }),
        walToRgba: vi.fn().mockReturnValue({ levels: [{ width: 64, height: 64, rgba: new Uint8Array() }] }),
        // MD3
        Md3Pipeline: vi.fn().mockImplementation(() => createMockMd3Pipeline()),
        Md3ModelMesh: vi.fn().mockImplementation(() => ({})),
        // DM2
        DemoPlaybackController: vi.fn().mockImplementation(() => ({
            loadDemo: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            stop: vi.fn(),
            update: vi.fn(),
            getState: vi.fn().mockReturnValue({ origin: [0,0,0], angles: [0,0,0] }),
            getDuration: vi.fn().mockReturnValue(0),
            getFrameCount: vi.fn().mockReturnValue(0),
            getCurrentTime: vi.fn().mockReturnValue(0),
            getCurrentFrame: vi.fn().mockReturnValue(0),
            seekToTime: vi.fn(),
        })),
        Texture2D: vi.fn().mockImplementation(() => ({
            uploadImage: vi.fn(), setParameters: vi.fn(), bind: vi.fn(),
        })),
    };
});

vi.mock('gl-matrix', () => {
    return {
        mat4: {
            create: vi.fn().mockReturnValue(new Float32Array(16)),
            lookAt: vi.fn(),
            multiply: vi.fn(),
            copy: vi.fn(),
        },
        vec3: {
            create: vi.fn().mockReturnValue(new Float32Array(3)),
            fromValues: vi.fn().mockReturnValue(new Float32Array(3)),
            normalize: vi.fn(),
            cross: vi.fn(),
            scale: vi.fn(),
            add: vi.fn(),
            sub: vi.fn(),
            dot: vi.fn(),
            length: vi.fn(),
            scaleAndAdd: vi.fn(),
            copy: vi.fn(),
            clone: vi.fn().mockImplementation(v => new Float32Array(v)),
            set: vi.fn(),
        },
        vec4: {
            create: vi.fn().mockReturnValue(new Float32Array(4)),
            fromValues: vi.fn().mockReturnValue(new Float32Array(4)),
            transformMat4: vi.fn(),
        }
    };
});

vi.mock('../../../src/components/UniversalViewer/ViewerControls', () => ({
  ViewerControls: () => <div data-testid="viewer-controls" />,
}));

describe('UniversalViewer', () => {
  let pakServiceMock: any;
  let quake2tsMock: any;

  beforeEach(() => {
      pakServiceMock = {
          hasFile: vi.fn().mockReturnValue(false),
          readFile: vi.fn().mockResolvedValue(new Uint8Array(100)),
          parseFile: vi.fn(),
          getPalette: vi.fn(),
      };
      quake2tsMock = require('@quake2ts/engine');
      vi.clearAllMocks();

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
      (global as any).getFrameCallbacksSize = () => frameCallbacks.size;
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
          map: { models: [], entities: { getUniqueClassnames: () => [] } } as any,
      };

      const onAdapterReady = vi.fn();
      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} onAdapterReady={onAdapterReady} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());
      await waitFor(() => expect(onAdapterReady).toHaveBeenCalled());

      const adapter = onAdapterReady.mock.calls[0][0];
      const renderSpy = vi.spyOn(adapter, 'render');

      // Get the last created pipeline instance
      const results = quake2tsMock.BspSurfacePipeline.mock.results;
      const pipeline = results[results.length - 1].value;

      await waitFor(() => {
          expect((global as any).getFrameCallbacksSize()).toBeGreaterThan(0);
      });

      await waitFor(() => {
        act(() => {
            (global as any).runAllFrames(0);
        });
        expect(renderSpy).toHaveBeenCalled();
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
          model: { header: {}, surfaces: [] } as any,
      };

      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} />);

      await waitFor(() => expect(quake2tsMock.Md3Pipeline).toHaveBeenCalled());
      // MD3 render is placeholder but should not crash
      await waitFor(() => {
          (global as any).runAllFrames(0);
      });
  });

  it('calls onClassnamesLoaded when BSP is loaded', async () => {
      const classnames = ['worldspawn', 'light'];
      const mockMap = {
          entities: {
              getUniqueClassnames: vi.fn().mockReturnValue(classnames)
          },
          models: []
      };
      const parsedFile: ParsedFile = {
          type: 'bsp',
          map: mockMap as any,
      };

      const onClassnamesLoaded = vi.fn();

      render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} onClassnamesLoaded={onClassnamesLoaded} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onClassnamesLoaded).toHaveBeenCalledWith(classnames);
  });

  it('updates hidden classes on adapter when prop changes', async () => {
      const parsedFile: ParsedFile = {
          type: 'bsp',
          map: { models: [], entities: { getUniqueClassnames: () => [] } } as any,
      };

      // Ensure surfaces are returned so setHiddenClasses doesn't bail out
      quake2tsMock.createBspSurfaces.mockReturnValue([{}]);

      const onAdapterReady = vi.fn();
      const { rerender } = render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} onAdapterReady={onAdapterReady} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());
      await waitFor(() => expect(onAdapterReady).toHaveBeenCalled());

      quake2tsMock.buildBspGeometry.mockClear();

      const hidden = new Set(['hidden_entity']);
      rerender(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} hiddenClassnames={hidden} onAdapterReady={onAdapterReady} />);

      expect(quake2tsMock.buildBspGeometry).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          parsedFile.map,
          { hiddenClassnames: hidden }
      );
  });
});
