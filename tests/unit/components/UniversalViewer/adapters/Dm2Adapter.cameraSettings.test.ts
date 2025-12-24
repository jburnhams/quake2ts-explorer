import { Dm2Adapter } from '@/src/components/UniversalViewer/adapters/Dm2Adapter';
import { CameraMode } from '@/src/types/cameraMode';
import { DEFAULT_CAMERA_SETTINGS } from '@/src/types/CameraSettings';
import { vec3 } from 'gl-matrix';

// Mock gl-matrix
vi.mock('gl-matrix', () => {
    const original = vi.requireActual('gl-matrix');
    return {
        ...original,
        vec3: {
            ...original.vec3,
            create: vi.fn(() => new Float32Array([0, 0, 0])),
            copy: vi.fn((out, a) => {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                return out;
            }),
            fromValues: vi.fn((x, y, z) => new Float32Array([x, y, z])),
            scale: vi.fn((out, a, b) => {
                 out[0] = a[0] * b;
                 out[1] = a[1] * b;
                 out[2] = a[2] * b;
                 return out;
            }),
            add: vi.fn((out, a, b) => {
                 out[0] = a[0] + b[0];
                 out[1] = a[1] + b[1];
                 out[2] = a[2] + b[2];
                 return out;
            }),
            normalize: vi.fn((out, a) => {
                 // Simplified normalize for predictable testing
                 return out;
            })
        }
    };
});

describe('Dm2Adapter Camera Settings', () => {
    let adapter: Dm2Adapter;
    let mockController: any;

    beforeEach(async () => {
        adapter = new Dm2Adapter();
        mockController = {
            loadDemo: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            update: vi.fn(),
            getCurrentFrame: vi.fn(() => 0),
            getFrameData: vi.fn(() => ({
                playerState: {
                    origin: [0, 0, 0],
                    viewangles: [0, 0, 0] // Pitch, Yaw, Roll
                }
            })),
            setSpeed: vi.fn(),
            getDuration: vi.fn(() => 100),
            getCurrentTime: vi.fn(() => 0),
            getFrameCount: vi.fn(() => 1000)
        };

        // Inject mock controller (using any cast to access private property or via load)
        (adapter as any).controller = mockController;
    });

    it('respects third person distance setting', () => {
        adapter.setCameraMode(CameraMode.ThirdPerson);

        // Update with default distance (100)
        adapter.setCameraSettings(DEFAULT_CAMERA_SETTINGS);
        adapter.update(0.016);
        let update = adapter.getCameraUpdate();

        // At [0,0,0] facing [0,0,0], moving back 100 units should result in roughly [-100, 0, 0]
        // IF yaw=0 faces +X?
        // Let's trace the math in Dm2Adapter:
        // pitch = 0, yaw = 0
        // forward x = cos(0)*cos(0) = 1
        // forward y = sin(0)*cos(0) = 0
        // forward z = sin(0) = 0
        // forward = [1, 0, 0]
        // viewOffset = forward * -distance = [-100, 0, 0]
        // position = origin + viewOffset + [0,0,22] = [-100, 0, 22]

        expect(update.position[0]).toBeCloseTo(-100);

        // Change distance setting
        const newSettings = { ...DEFAULT_CAMERA_SETTINGS, thirdPersonDistance: 200 };
        adapter.setCameraSettings(newSettings);
        adapter.update(0.016);
        update = adapter.getCameraUpdate();

        expect(update.position[0]).toBeCloseTo(-200);
    });

    it('applies cinematic speed when in cinematic mode', () => {
        adapter.setCameraMode(CameraMode.Cinematic);

        const newSettings = { ...DEFAULT_CAMERA_SETTINGS, cinematicSpeed: 0.5 };
        adapter.setCameraSettings(newSettings);

        expect(mockController.setSpeed).toHaveBeenCalledWith(0.5);
    });
});
