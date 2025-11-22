import { render, waitFor, act } from '@testing-library/react';
import { Md2Viewer } from '../../src/components/Md2Viewer';
import { computeCameraPosition } from '../../src/utils/cameraUtils';
import { vec3, Md2Model, Md2Animation } from 'quake2ts';

const mockPipelineBind = jest.fn();
const mockMeshBuffersBind = jest.fn();
const mockMeshBuffersUpdate = jest.fn();
const mockTextureUpload = jest.fn();
const mockTextureBind = jest.fn();

jest.mock('quake2ts', () => {
    const original = jest.requireActual('quake2ts');
    return {
        ...original,
        createWebGLContext: jest.fn().mockReturnValue({
            gl: {
                clearColor: jest.fn(), clear: jest.fn(), enable: jest.fn(), drawElements: jest.fn(), viewport: jest.fn(), activeTexture: jest.fn(),
                TRIANGLES: 0, COLOR_BUFFER_BIT: 0, DEPTH_BUFFER_BIT: 0, DEPTH_TEST: 0, CULL_FACE: 0, UNSIGNED_SHORT: 0, RGBA: 0,
                UNSIGNED_BYTE: 0, LINEAR_MIPMAP_LINEAR: 0, LINEAR: 0, REPEAT: 0, TEXTURE0: 0,
            },
            state: {},
        }),
        Md2Pipeline: jest.fn().mockImplementation(() => ({
            bind: mockPipelineBind,
        })),
        Md2MeshBuffers: jest.fn().mockImplementation(() => ({
            bind: mockMeshBuffersBind,
            update: mockMeshBuffersUpdate,
            indexCount: 123,
        })),
        Camera: jest.fn().mockImplementation(() => ({
            getProjectionMatrix: jest.fn().mockReturnValue(new Float32Array(16)),
            setFov: jest.fn(), setAspect: jest.fn(), setNear: jest.fn(), setFar: jest.fn(),
        })),
        createAnimationState: jest.fn((anim, time) => ({ animation: anim, time: time, isFinished: false })),
        advanceAnimation: jest.fn(state => state),
        computeFrameBlend: jest.fn().mockReturnValue({ currentFrame: 0, nextFrame: 1, lerp: 0.5 }),
        parsePcx: jest.fn().mockReturnValue({ width: 32, height: 32, palette: new Uint8Array(768), data: new Uint8Array(1024) }),
        pcxToRgba: jest.fn().mockReturnValue(new Uint8Array(32 * 32 * 4)),
        Texture2D: jest.fn().mockImplementation(() => ({
            upload: mockTextureUpload,
            bind: mockTextureBind,
        })),
        mat4: {
            ...original.mat4,
            multiply: jest.fn().mockReturnValue(new Float32Array(16)),
            lookAt: jest.fn().mockReturnValue(new Float32Array(16)),
        },
    }
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
  const animations: Md2Animation[] = [{ name: 'idle', firstFrame: 0, lastFrame: 39, fps: 9 }];
  let quake2tsMock: any;

  beforeEach(() => {
    quake2tsMock = jest.requireMock('quake2ts');
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
    expect(quake2tsMock.mat4.lookAt).toHaveBeenCalledTimes(1);
    expect(mockPipelineBind).toHaveBeenCalledTimes(1);
    expect(mockMeshBuffersBind).toHaveBeenCalledTimes(1);

    act(() => { (global as any).runAllFrames(16); });
    expect(quake2tsMock.mat4.lookAt).toHaveBeenCalledTimes(2);
    expect(mockPipelineBind).toHaveBeenCalledTimes(2);
    expect(mockMeshBuffersBind).toHaveBeenCalledTimes(2);
  });

  it('should load and apply a skin texture when available', async () => {
    const loadFile = jest.fn().mockResolvedValue(new Uint8Array());
    renderViewer({ loadFile, skinPath: 'test.pcx', hasFile: () => true });

    await waitFor(() => {
      expect(loadFile).toHaveBeenCalledWith('test.pcx');
      expect(quake2tsMock.parsePcx).toHaveBeenCalled();
      expect(quake2tsMock.pcxToRgba).toHaveBeenCalled();
      expect(quake2tsMock.Texture2D).toHaveBeenCalled();
      expect(mockTextureUpload).toHaveBeenCalled();
    });

    act(() => { (global as any).runAllFrames(0); });

    expect(mockTextureBind).toHaveBeenCalled();
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
                target: [0, 0, 0] as vec3,
                panOffset: [0, 0, 0] as vec3,
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
                target: [0, 0, 0] as vec3,
                panOffset: [0, 0, 0] as vec3,
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
                target: [0, 0, 0] as vec3,
                panOffset: [0, 0, 0] as vec3,
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
                target: [10, 20, 30] as vec3,
                panOffset: [0, 0, 0] as vec3,
            };
            const pos = computeCameraPosition(orbit);
            expect(pos[0]).toBeCloseTo(110);
            expect(pos[1]).toBeCloseTo(20);
            expect(pos[2]).toBeCloseTo(30);
        });
    });
});