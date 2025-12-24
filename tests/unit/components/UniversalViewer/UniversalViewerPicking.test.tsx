import { render, waitFor, act, fireEvent } from '@testing-library/react';
import { UniversalViewer } from '../../../../src/components/UniversalViewer/UniversalViewer';
import { ParsedFile } from '../../../../src/services/pakService';
import { BspAdapter } from '../../../../src/components/UniversalViewer/adapters/BspAdapter';
import React from 'react';

// Mock gl-matrix (use actual for math logic in picking)
vi.mock('gl-matrix', () => vi.requireActual('gl-matrix'));

// Mock DebugRenderer
vi.mock('../../../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
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
vi.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: vi.fn().mockReturnValue({
            gl: {
                clearColor: vi.fn(), clear: vi.fn(), enable: vi.fn(), drawElements: vi.fn(), viewport: vi.fn(), activeTexture: vi.fn(),
                generateMipmap: vi.fn(),
                TRIANGLES: 0, COLOR_BUFFER_BIT: 0, DEPTH_BUFFER_BIT: 0, DEPTH_TEST: 0, CULL_FACE: 0, UNSIGNED_SHORT: 0, RGBA: 0,
                UNSIGNED_BYTE: 0, LINEAR_MIPMAP_LINEAR: 0, LINEAR: 0, REPEAT: 0, TEXTURE0: 0, TEXTURE_2D: 0
            },
        }),
        Camera: vi.fn().mockImplementation(() => {
            const { mat4 } = require('gl-matrix');
            const proj = mat4.create();
            mat4.perspective(proj, Math.PI/2, 1, 1, 100);
            return {
                projectionMatrix: proj,
                viewMatrix: mat4.create(),
                fov: 60, aspect: 1,
                position: new Float32Array(3),
                angles: new Float32Array(3),
                updateMatrices: vi.fn(),
            };
        }),
        BspSurfacePipeline: vi.fn().mockImplementation(() => ({ bind: vi.fn() })),
        createBspSurfaces: vi.fn().mockReturnValue([{ faceIndex: 0, texture: 't1' }]),
        buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [{ indexCount: 6, vao: { bind: vi.fn() }, surfaceFlags: 0, texture: 't1' }], lightmaps: [] }),
        resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: vi.fn(),
        parseWal: vi.fn().mockReturnValue({ width: 64, height: 64 }),
        walToRgba: vi.fn().mockReturnValue({ levels: [{ width: 64, height: 64, rgba: new Uint8Array() }] }),
        Texture2D: vi.fn().mockImplementation(() => ({
            uploadImage: vi.fn(), setParameters: vi.fn(), bind: vi.fn(),
        })),
        Md2Adapter: vi.fn(), Md3Adapter: vi.fn(), Dm2Adapter: vi.fn(),
    };
});

// Mock GizmoRenderer
vi.mock('../../../../src/components/UniversalViewer/adapters/GizmoRenderer', () => {
    return {
        GizmoRenderer: vi.fn().mockImplementation(() => ({
            render: vi.fn(),
            intersect: vi.fn(),
            setHoveredAxis: vi.fn(),
            setActiveAxis: vi.fn()
        }))
    };
});

vi.mock('../../../../src/components/UniversalViewer/ViewerControls', () => ({
  ViewerControls: () => <div data-testid="viewer-controls" />,
}));

describe('UniversalViewer Picking', () => {
  let pakServiceMock: any;
  let quake2tsMock: any;

  beforeEach(() => {
      pakServiceMock = {
          hasFile: vi.fn().mockReturnValue(false),
          readFile: vi.fn().mockResolvedValue(new Uint8Array(100)),
          parseFile: vi.fn(),
          getPalette: vi.fn(),
      };
      quake2tsMock = require('quake2ts/engine');
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
  });

  it('calls onEntitySelected when entity is clicked', async () => {
      const pickedEntity = { classname: 'info_player_start', properties: {} };
      const mockMap = {
          entities: {
              getUniqueClassnames: vi.fn().mockReturnValue([])
          },
          models: [],
          pickEntity: vi.fn().mockReturnValue({ entity: pickedEntity, model: {}, distance: 10 })
      };

      const parsedFile: ParsedFile = {
          type: 'bsp',
          map: mockMap as any,
      };

      const onEntitySelected = vi.fn();

      const { container } = render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} onEntitySelected={onEntitySelected} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());

      await act(async () => {
         await new Promise(resolve => setTimeout(resolve, 0));
      });

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      if(canvas) {
          canvas.getBoundingClientRect = vi.fn().mockReturnValue({
              left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600
          });
          Object.defineProperty(canvas, 'width', { value: 800 });
          Object.defineProperty(canvas, 'height', { value: 600 });
      }

      fireEvent.click(canvas!, { clientX: 400, clientY: 300, button: 0 });

      expect(mockMap.pickEntity).toHaveBeenCalled();
      expect(onEntitySelected).toHaveBeenCalledWith(pickedEntity);
  });

  it('updates hovered entity on mousemove', async () => {
      const setHoveredSpy = vi.spyOn(BspAdapter.prototype, 'setHoveredEntity');
      const hoveredEntity = { classname: 'func_door', properties: {} };
      const mockMap = {
          entities: {
              getUniqueClassnames: vi.fn().mockReturnValue([])
          },
          models: [],
          pickEntity: vi.fn().mockReturnValue({ entity: hoveredEntity, model: {}, distance: 10 })
      };

      const parsedFile: ParsedFile = {
          type: 'bsp',
          map: mockMap as any,
      };

      const { container } = render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());

      await act(async () => {
         await new Promise(resolve => setTimeout(resolve, 0));
      });

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      if(canvas) {
          canvas.getBoundingClientRect = vi.fn().mockReturnValue({
              left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600
          });
          Object.defineProperty(canvas, 'width', { value: 800 });
          Object.defineProperty(canvas, 'height', { value: 600 });
      }

      fireEvent.mouseMove(canvas!, { clientX: 400, clientY: 300 });

      expect(mockMap.pickEntity).toHaveBeenCalled();
      expect(setHoveredSpy).toHaveBeenCalledWith(hoveredEntity);

      setHoveredSpy.mockRestore();
  });
});
