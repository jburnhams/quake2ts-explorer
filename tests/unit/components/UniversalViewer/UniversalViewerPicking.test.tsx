import { render, waitFor, act, fireEvent } from '@testing-library/react';
import { UniversalViewer } from '../../../../src/components/UniversalViewer/UniversalViewer';
import { ParsedFile } from '../../../../src/services/pakService';
import { BspAdapter } from '../../../../src/components/UniversalViewer/adapters/BspAdapter';
import React from 'react';

// Mock gl-matrix (use actual for math logic in picking)
jest.mock('gl-matrix', () => jest.requireActual('gl-matrix'));

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
        Camera: jest.fn().mockImplementation(() => {
            const { mat4 } = require('gl-matrix');
            const proj = mat4.create();
            mat4.perspective(proj, Math.PI/2, 1, 1, 100);
            return {
                projectionMatrix: proj,
                viewMatrix: mat4.create(),
                fov: 60, aspect: 1,
                position: new Float32Array(3),
                angles: new Float32Array(3),
                updateMatrices: jest.fn(),
            };
        }),
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
        createBspSurfaces: jest.fn().mockReturnValue([{ faceIndex: 0, texture: 't1' }]),
        buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [{ indexCount: 6, vao: { bind: jest.fn() }, surfaceFlags: 0, texture: 't1' }], lightmaps: [] }),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: jest.fn(),
        parseWal: jest.fn().mockReturnValue({ width: 64, height: 64 }),
        walToRgba: jest.fn().mockReturnValue({ levels: [{ width: 64, height: 64, rgba: new Uint8Array() }] }),
        Texture2D: jest.fn().mockImplementation(() => ({
            uploadImage: jest.fn(), setParameters: jest.fn(), bind: jest.fn(),
        })),
        Md2Adapter: jest.fn(), Md3Adapter: jest.fn(), Dm2Adapter: jest.fn(),
    };
});

jest.mock('../../../../src/components/UniversalViewer/ViewerControls', () => ({
  ViewerControls: () => <div data-testid="viewer-controls" />,
}));

describe('UniversalViewer Picking', () => {
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

  it('calls onEntitySelected when entity is clicked', async () => {
      const pickedEntity = { classname: 'info_player_start', properties: {} };
      const mockMap = {
          entities: {
              getUniqueClassnames: jest.fn().mockReturnValue([])
          },
          models: [],
          pickEntity: jest.fn().mockReturnValue({ entity: pickedEntity, model: {}, distance: 10 })
      };

      const parsedFile: ParsedFile = {
          type: 'bsp',
          map: mockMap as any,
      };

      const onEntitySelected = jest.fn();

      const { container } = render(<UniversalViewer parsedFile={parsedFile} pakService={pakServiceMock} onEntitySelected={onEntitySelected} />);

      await waitFor(() => expect(quake2tsMock.BspSurfacePipeline).toHaveBeenCalled());

      await act(async () => {
         await new Promise(resolve => setTimeout(resolve, 0));
      });

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      if(canvas) {
          canvas.getBoundingClientRect = jest.fn().mockReturnValue({
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
      const setHoveredSpy = jest.spyOn(BspAdapter.prototype, 'setHoveredEntity');
      const hoveredEntity = { classname: 'func_door', properties: {} };
      const mockMap = {
          entities: {
              getUniqueClassnames: jest.fn().mockReturnValue([])
          },
          models: [],
          pickEntity: jest.fn().mockReturnValue({ entity: hoveredEntity, model: {}, distance: 10 })
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
          canvas.getBoundingClientRect = jest.fn().mockReturnValue({
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
