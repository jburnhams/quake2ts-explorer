import { Dm2Adapter } from '@/src/components/UniversalViewer/adapters/Dm2Adapter';
import { CameraMode } from '@/src/types/cameraMode';
import { vec3 } from 'gl-matrix';
import { PakService } from '@/src/services/pakService';
import { DemoPlaybackController } from 'quake2ts/engine';

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
  DemoPlaybackController: jest.fn().mockImplementation(() => ({
    loadDemo: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    update: jest.fn(),
    getCurrentFrame: jest.fn().mockReturnValue(0),
    getFrameData: jest.fn().mockReturnValue({
        playerState: {
            origin: [100, 200, 30],
            viewangles: [10, 90, 0] // pitch, yaw, roll
        }
    }),
    getDuration: jest.fn().mockReturnValue(100),
    getCurrentTime: jest.fn().mockReturnValue(0),
    getFrameCount: jest.fn().mockReturnValue(1000),
    seekToTime: jest.fn()
  })),
  Camera: jest.fn()
}));

jest.mock('@/src/components/UniversalViewer/adapters/BspAdapter');

describe('Dm2Adapter Camera Modes', () => {
    let adapter: Dm2Adapter;
    let mockGl: WebGL2RenderingContext;
    let mockPakService: PakService;

    beforeEach(async () => {
        adapter = new Dm2Adapter();
        mockGl = {} as WebGL2RenderingContext;
        mockPakService = {
            hasFile: jest.fn().mockReturnValue(false)
        } as unknown as PakService;

        const file = {
            type: 'dm2',
            name: 'test.dm2',
            data: new Uint8Array(100)
        } as any;

        await adapter.load(mockGl, file, mockPakService, 'demos/test.dm2');
    });

    afterEach(() => {
        adapter.cleanup();
        jest.clearAllMocks();
    });

    test('default camera mode is FirstPerson', () => {
        adapter.update(0.016);
        const update = adapter.getCameraUpdate!();

        // Origin [100, 200, 30] + Eye Height [0, 0, 22] = [100, 200, 52]
        expect(update.position[0]).toBeCloseTo(100);
        expect(update.position[1]).toBeCloseTo(200);
        expect(update.position[2]).toBeCloseTo(52);

        // Angles should match player viewangles
        expect(update.angles[0]).toBeCloseTo(10);
        expect(update.angles[1]).toBeCloseTo(90);
        expect(update.angles[2]).toBeCloseTo(0);
    });

    test('switching to ThirdPerson mode', () => {
        adapter.setCameraMode!(CameraMode.ThirdPerson);
        adapter.update(0.016);
        const update = adapter.getCameraUpdate!();

        // Player at [100, 200, 30]
        // Facing Yaw 90 (along Y axis), Pitch 10 (slightly up/down)
        // Third person moves camera BACKWARDS by 100 units.

        // Calculate expected position manually
        const pitch = 10 * (Math.PI / 180);
        const yaw = 90 * (Math.PI / 180);

        const forwardX = Math.cos(yaw) * Math.cos(pitch);
        const forwardY = Math.sin(yaw) * Math.cos(pitch);
        const forwardZ = Math.sin(pitch);

        // forwardX should be ~0 (cos(90)=0)
        // forwardY should be ~0.98 (sin(90)=1 * cos(10))
        // forwardZ should be ~0.17 (sin(10))

        // Camera pos = PlayerPos - Forward * 100 + EyeHeight
        const expectedX = 100 - (forwardX * 100);
        const expectedY = 200 - (forwardY * 100);
        const expectedZ = 30 + 22 - (forwardZ * 100); // 52 - 17 = 35ish

        expect(update.position[0]).toBeCloseTo(expectedX);
        expect(update.position[1]).toBeCloseTo(expectedY);
        expect(update.position[2]).toBeCloseTo(expectedZ);

        // Angles should still match player
        expect(update.angles[0]).toBeCloseTo(10);
        expect(update.angles[1]).toBeCloseTo(90);
    });

    test('switching to Free camera mode relinquishes control', () => {
        // Initial update
        adapter.update(0.016);

        // Switch to free cam
        adapter.setCameraMode!(CameraMode.Free);

        // Adapter should report it does NOT have camera control anymore
        // This signals UniversalViewer to take over input handling
        expect(adapter.hasCameraControl!()).toBe(false);
    });

    test('switching to Orbital camera mode relinquishes control', () => {
        adapter.setCameraMode!(CameraMode.Orbital);
        expect(adapter.hasCameraControl!()).toBe(false);
    });

    test('switching back to FirstPerson regains control', () => {
        adapter.setCameraMode!(CameraMode.Free);
        expect(adapter.hasCameraControl!()).toBe(false);

        adapter.setCameraMode!(CameraMode.FirstPerson);
        expect(adapter.hasCameraControl!()).toBe(true);
    });
});
