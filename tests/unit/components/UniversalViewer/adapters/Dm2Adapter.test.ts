import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Dm2Adapter } from '../../../../../src/components/UniversalViewer/adapters/Dm2Adapter';
import { PakService, ParsedFile } from '../../../../../src/services/pakService';
import { BspAdapter } from '../../../../../src/components/UniversalViewer/adapters/BspAdapter';
import { DemoPlaybackController } from 'quake2ts/engine';
import { mat4, vec3 } from 'gl-matrix';
import { CameraMode } from '@/src/types/cameraMode';
import { DEFAULT_CAMERA_SETTINGS } from '@/src/types/CameraSettings';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
  return {
    DemoPlaybackController: jest.fn().mockImplementation(() => ({
      loadDemo: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      update: jest.fn(),
      getState: jest.fn(),
      getDuration: jest.fn().mockReturnValue(100),
      getCurrentTime: jest.fn().mockReturnValue(10),
      getCurrentFrame: jest.fn().mockReturnValue(100),
      getFrameCount: jest.fn().mockReturnValue(1000),
      getFrameData: jest.fn().mockReturnValue({
          playerState: {
              origin: [10, 20, 30],
              viewangles: [0, 90, 0]
          }
      }),
      seekToTime: jest.fn(),
      setSpeed: jest.fn(),
    })),
  };
});

jest.mock('../../../../../src/components/UniversalViewer/adapters/BspAdapter');

describe('Dm2Adapter', () => {
  let adapter: Dm2Adapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: jest.Mocked<PakService>;
  let mockBspAdapter: jest.Mocked<BspAdapter>;

  beforeEach(() => {
    adapter = new Dm2Adapter();
    mockGl = {} as WebGL2RenderingContext;
    mockPakService = {
      hasFile: jest.fn(),
      parseFile: jest.fn(),
    } as unknown as jest.Mocked<PakService>;

    // Clear mocks
    (DemoPlaybackController as jest.Mock).mockClear();
    (BspAdapter as jest.Mock).mockClear();

    // Setup BspAdapter mock instance
    mockBspAdapter = new BspAdapter() as jest.Mocked<BspAdapter>;
    (BspAdapter as jest.Mock).mockReturnValue(mockBspAdapter);
  });

  it('throws error if file type is not dm2', async () => {
    const file: ParsedFile = { type: 'bsp' } as any;
    await expect(adapter.load(mockGl, file, mockPakService, 'demos/test.bsp')).rejects.toThrow('Invalid file type');
  });

  it('loads demo and attempts to load map based on filename', async () => {
    const file: ParsedFile = {
        type: 'dm2',
        data: new Uint8Array(100)
    } as any;

    // Map exists
    mockPakService.hasFile.mockImplementation((path) => path === 'maps/demo1.bsp');
    mockPakService.parseFile.mockResolvedValue({ type: 'bsp', map: {} } as any);

    await adapter.load(mockGl, file, mockPakService, 'demos/demo1.dm2');

    const controllerInstance = (DemoPlaybackController as jest.Mock).mock.results[0].value;
    expect(controllerInstance.loadDemo).toHaveBeenCalled();
    expect(controllerInstance.play).toHaveBeenCalled();

    expect(mockPakService.hasFile).toHaveBeenCalledWith('maps/demo1.bsp');
    expect(mockPakService.parseFile).toHaveBeenCalledWith('maps/demo1.bsp');
    expect(BspAdapter).toHaveBeenCalled();
    expect(mockBspAdapter.loadMap).toHaveBeenCalled();
  });

  it('warns if map is not found', async () => {
    const file: ParsedFile = {
        type: 'dm2',
        data: new Uint8Array(100)
    } as any;

    // Map does not exist
    mockPakService.hasFile.mockReturnValue(false);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await adapter.load(mockGl, file, mockPakService, 'demos/demo1.dm2');

    expect(consoleSpy).toHaveBeenCalledWith('Map file not found:', 'maps/demo1.bsp');
    consoleSpy.mockRestore();
  });

  it('warns if map file is not a valid BSP', async () => {
    const file: ParsedFile = {
        type: 'dm2',
        data: new Uint8Array(100)
    } as any;

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.parseFile.mockResolvedValue({ type: 'txt', content: 'hello' } as any);

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await adapter.load(mockGl, file, mockPakService, 'demos/demo1.dm2');

    expect(consoleSpy).toHaveBeenCalledWith('Map file is not a valid BSP:', 'maps/demo1.bsp');
    consoleSpy.mockRestore();
  });

  it('handles exception during map loading', async () => {
    const file: ParsedFile = {
        type: 'dm2',
        data: new Uint8Array(100)
    } as any;

    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.parseFile.mockRejectedValue(new Error('Load failed'));

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await adapter.load(mockGl, file, mockPakService, 'demos/demo1.dm2');

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load map for demo', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('updates controller and extracts camera state (FirstPerson)', async () => {
    const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
    mockPakService.hasFile.mockReturnValue(false);
    await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');

    const controllerInstance = (DemoPlaybackController as jest.Mock).mock.results[0].value;
    // Mock frame data
    controllerInstance.getFrameData.mockReturnValue({
        playerState: { origin: [10, 20, 30], viewangles: [0, 90, 0] }
    });

    adapter.update(16);

    expect(controllerInstance.update).toHaveBeenCalledWith(16);
    const cameraUpdate = adapter.getCameraUpdate();
    // Default mode is FirstPerson, which adds 22 units to Z
    expect(cameraUpdate.position).toEqual(vec3.fromValues(10, 20, 52));
    expect(cameraUpdate.angles).toEqual(vec3.fromValues(0, 90, 0));
  });

  it('updates camera in ThirdPerson mode', async () => {
    const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
    mockPakService.hasFile.mockReturnValue(false);
    await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');

    adapter.setCameraMode(CameraMode.ThirdPerson);
    adapter.setCameraSettings({ ...DEFAULT_CAMERA_SETTINGS, thirdPersonDistance: 100 });

    const controller = (DemoPlaybackController as jest.Mock).mock.results[0].value;
    controller.getFrameData.mockReturnValue({
        playerState: { origin: [0, 0, 0], viewangles: [0, 0, 0] }
    });

    adapter.update(16);
    const cam = adapter.getCameraUpdate();

    // Yaw 0, Pitch 0 -> Forward = (1, 0, 0)
    // ThirdPerson moves back by distance: position - 100 * forward
    // Origin (0,0,0) - (100,0,0) = (-100, 0, 0)
    // Plus eye height 22 -> (-100, 0, 22)

    expect(cam.position[0]).toBeCloseTo(-100);
    expect(cam.position[1]).toBeCloseTo(0);
    expect(cam.position[2]).toBeCloseTo(22);
  });

  it('updates camera in Orbital mode', async () => {
    const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
    mockPakService.hasFile.mockReturnValue(false);
    await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');

    adapter.setCameraMode(CameraMode.Orbital);
    const controller = (DemoPlaybackController as jest.Mock).mock.results[0].value;
    controller.getFrameData.mockReturnValue({
        playerState: { origin: [0, 0, 0], viewangles: [0, 0, 0] }
    });

    adapter.update(16);
    const cam = adapter.getCameraUpdate();
    // Verify radius (default 200) is maintained from origin
    const dist = vec3.length(cam.position);
    expect(dist).toBeCloseTo(200);
  });

  it('delegates update and render to bspAdapter if present', async () => {
    const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.parseFile.mockResolvedValue({ type: 'bsp', map: {} } as any);
    await adapter.load(mockGl, file, mockPakService, 'demos/demo1.dm2');

    adapter.update(16);
    expect(mockBspAdapter.update).toHaveBeenCalledWith(16);

    adapter.render(mockGl, {} as any, mat4.create());
    expect(mockBspAdapter.render).toHaveBeenCalled();
  });

  it('controls playback', async () => {
    const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
    mockPakService.hasFile.mockReturnValue(false);
    await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');

    const controllerInstance = (DemoPlaybackController as jest.Mock).mock.results[0].value;

    adapter.pause();
    expect(controllerInstance.pause).toHaveBeenCalled();
    expect(adapter.isPlaying()).toBe(false);

    adapter.play();
    expect(controllerInstance.play).toHaveBeenCalledTimes(2); // Once on load, once here
    expect(adapter.isPlaying()).toBe(true);
  });

  it('cleans up resources', async () => {
    const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
    mockPakService.hasFile.mockReturnValue(true);
    mockPakService.parseFile.mockResolvedValue({ type: 'bsp', map: {} } as any);

    await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');
    const controllerInstance = (DemoPlaybackController as jest.Mock).mock.results[0].value;

    adapter.cleanup();
    expect(mockBspAdapter.cleanup).toHaveBeenCalled();
    expect(controllerInstance.stop).toHaveBeenCalled();
  });

  it('returns true for hasCameraControl and useZUp', () => {
      expect(adapter.hasCameraControl()).toBe(true);
      expect(adapter.useZUp()).toBe(true);
  });

  it('implements smooth stepping logic', async () => {
      const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
      mockPakService.hasFile.mockReturnValue(false);
      await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');
      const controller = (DemoPlaybackController as jest.Mock).mock.results[0].value;

      controller.getCurrentTime.mockReturnValue(10);
      controller.getDuration.mockReturnValue(100);
      controller.getFrameCount.mockReturnValue(1000);

      adapter.stepForward(1);
      expect(controller.pause).toHaveBeenCalled();

      adapter.update(0.1);
      expect(controller.seekToTime).toHaveBeenCalled();

      adapter.stepBackward(1);
      // Logic same but backward
  });

  it('exposes demo controller', async () => {
      const file: ParsedFile = { type: 'dm2', data: new Uint8Array(100) } as any;
      mockPakService.hasFile.mockReturnValue(false);
      await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');
      const controller = (DemoPlaybackController as jest.Mock).mock.results[0].value;

      expect(adapter.getDemoController()).toBe(controller);
  });
});
