import { render, waitFor, act } from '@testing-library/react';
import { Md2Viewer } from '../../src/components/Md2Viewer';
import { computeCameraPosition } from '../../src/utils/cameraUtils';
import { Md2Model, Md2Animation } from 'quake2ts/engine';
import { vec3 } from 'gl-matrix';

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
        Md2Pipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
        })),
        Md2MeshBuffers: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            update: jest.fn(),
            indexCount: 123,
        })),
        Camera: jest.fn().mockImplementation(() => {
            return {
                projectionMatrix: new Float32Array(16),
                fov: 60,
                aspect: 1,
            };
        }),
        createAnimationState: jest.fn((seq) => ({ sequence: seq, time: 0, isFinished: false })),
        advanceAnimation: jest.fn(state => state),
        computeFrameBlend: jest.fn().mockReturnValue({ frame: 0, nextFrame: 1, lerp: 0.5 }),
        parsePcx: jest.fn().mockReturnValue({ width: 32, height: 32, palette: new Uint8Array(768), pixels: new Uint8Array(1024) }),
        pcxToRgba: jest.fn().mockReturnValue(new Uint8Array(32 * 32 * 4)),
        Texture2D: jest.fn().mockImplementation(() => ({
            uploadImage: jest.fn(),
            setParameters: jest.fn(),
            bind: jest.fn(),
        })),
    };
});

jest.mock('gl-matrix', () => {
    return {
        mat4: {
            create: jest.fn().mockReturnValue(new Float32Array(16)),
            lookAt: jest.fn(),
            multiply: jest.fn(),
        },
        vec3: {
            create: jest.fn().mockReturnValue(new Float32Array(3)),
        }
    };
});

// Mock child components
jest.mock('../../src/components/Md2AnimationControls', () => ({
  Md2AnimationControls: () => <div data-testid="md2-animation-controls" />,
}));
jest.mock('../../src/components/Md2CameraControls', () => ({
  Md2CameraControls: () => <div data-testid="md2-camera-controls" />,
}));

describe('Md2Viewer', () => {
  const model: Md2Model = {
    header: { skinWidth: 64, skinHeight: 64, numSkins: 1 } as any,
    skins: [{ name: 'test.pcx' }],
    frames: [ { name: 'frame1' } ] as any,
  } as any;
  const animations: Md2Animation[] = [{ name: 'idle', firstFrame: 0, lastFrame: 39 }];

  let quake2tsMock: any;
  let glMatrixMock: any;

  beforeEach(() => {
    quake2tsMock = require('quake2ts/engine');
    glMatrixMock = require('gl-matrix');
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

  const renderViewer = (props = {}) => {
    const defaultProps = {
      model,
      animations,
      skinPath: 'models/tris.pcx',
      hasFile: () => true,
      loadFile: () => Promise.resolve(new Uint8Array([1, 2, 3])),
    };
    return render(<Md2Viewer {...defaultProps} {...props} />);
  };

  it('should initialize WebGL context and rendering pipeline on mount', () => {
    renderViewer();
    act(() => { (global as any).runAllFrames(0); });

    expect(quake2tsMock.createWebGLContext).toHaveBeenCalledTimes(1);
    expect(quake2tsMock.Md2Pipeline).toHaveBeenCalledTimes(1);
    expect(quake2tsMock.Md2MeshBuffers).toHaveBeenCalledTimes(1);
    expect(quake2tsMock.Camera).toHaveBeenCalledTimes(1);
  });

  it('should call render loop on each animation frame', () => {
    renderViewer();
    act(() => { (global as any).runAllFrames(0); });

    const pipelineInstance = quake2tsMock.Md2Pipeline.mock.results[0].value;
    const meshBuffersInstance = quake2tsMock.Md2MeshBuffers.mock.results[0].value;

    expect(glMatrixMock.mat4.lookAt).toHaveBeenCalledTimes(1);
    expect(pipelineInstance.bind).toHaveBeenCalledTimes(1);
    expect(meshBuffersInstance.bind).toHaveBeenCalledTimes(1);

    act(() => { (global as any).runAllFrames(16); });
    expect(glMatrixMock.mat4.lookAt).toHaveBeenCalledTimes(2);
    expect(pipelineInstance.bind).toHaveBeenCalledTimes(2);
    expect(meshBuffersInstance.bind).toHaveBeenCalledTimes(2);
  });

  it('should load and apply a skin texture when available', async () => {
    const loadFile = jest.fn().mockResolvedValue(new Uint8Array());
    renderViewer({ loadFile, skinPath: 'test.pcx', hasFile: () => true });

    await waitFor(() => {
      expect(loadFile).toHaveBeenCalledWith('test.pcx');
      expect(quake2tsMock.parsePcx).toHaveBeenCalled();
      expect(quake2tsMock.pcxToRgba).toHaveBeenCalled();
      expect(quake2tsMock.Texture2D).toHaveBeenCalled();

      const textureInstance = quake2tsMock.Texture2D.mock.results[0].value;
      expect(textureInstance.setParameters).toHaveBeenCalled();
      expect(textureInstance.uploadImage).toHaveBeenCalled();
    });

    const textureInstance = quake2tsMock.Texture2D.mock.results[0].value;
    act(() => { (global as any).runAllFrames(0); });

    expect(textureInstance.bind).toHaveBeenCalled();
  });

  it('should not attempt to load a skin if hasFile is false', () => {
    const loadFile = jest.fn();
    renderViewer({ loadFile, hasFile: () => false });
    expect(loadFile).not.toHaveBeenCalled();
  });

  it('should not attempt to load a skin if skinPath is undefined', () => {
    const loadFile = jest.fn();
    renderViewer({ loadFile, skinPath: undefined });
    expect(loadFile).not.toHaveBeenCalled();
  });

  it('should advance animation when isPlaying is true', () => {
    renderViewer();
    expect(quake2tsMock.advanceAnimation).not.toHaveBeenCalled();

    act(() => { (global as any).runAllFrames(100); });

    expect(quake2tsMock.advanceAnimation).toHaveBeenCalled();
  });
});

describe('cameraUtils', () => {
    describe('computeCameraPosition', () => {
        it('should calculate the correct camera position at (r, 0, 0)', () => {
            const orbit = {
                radius: 100,
                theta: 0,
                phi: Math.PI / 2,
                target: [0, 0, 0] as unknown as vec3,
            };
            const pos = computeCameraPosition(orbit);
            expect(pos[0]).toBeCloseTo(100);
            expect(pos[1]).toBeCloseTo(0);
            expect(pos[2]).toBeCloseTo(0);
        });

        it('should calculate the correct camera position at (0, 0, r)', () => {
            const orbit = {
                radius: 100,
                theta: Math.PI / 2,
                phi: Math.PI / 2,
                target: [0, 0, 0] as unknown as vec3,
            };
            const pos = computeCameraPosition(orbit);
            expect(pos[0]).toBeCloseTo(0);
            expect(pos[1]).toBeCloseTo(0);
            expect(pos[2]).toBeCloseTo(100);
        });

        it('should calculate the correct camera position at (0, r, 0)', () => {
            const orbit = {
                radius: 100,
                theta: 0,
                phi: 0,
                target: [0, 0, 0] as unknown as vec3,
            };
            const pos = computeCameraPosition(orbit);
            expect(pos[0]).toBeCloseTo(0);
            expect(pos[1]).toBeCloseTo(100);
            expect(pos[2]).toBeCloseTo(0);
        });

        it('should handle a non-zero target', () => {
            const orbit = {
                radius: 100,
                theta: 0,
                phi: Math.PI / 2,
                target: [10, 20, 30] as unknown as vec3,
            };
            const pos = computeCameraPosition(orbit);
            expect(pos[0]).toBeCloseTo(110);
            expect(pos[1]).toBeCloseTo(20);
            expect(pos[2]).toBeCloseTo(30);
        });
    });
});
