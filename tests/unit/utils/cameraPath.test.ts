import { vec3 } from 'gl-matrix';
import { CameraKeyframe, CinematicPath, PathInterpolator } from '@/src/utils/cameraPath';

// Mock gl-matrix
vi.mock('gl-matrix', async (importOriginal) => {
    const original = await importOriginal<typeof import('gl-matrix')>();
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
        },
        quat: {
            ...original.quat,
            create: vi.fn(() => new Float32Array([0, 0, 0, 1])),
            fromEuler: vi.fn(),
            slerp: vi.fn()
        }
    };
});

describe('PathInterpolator', () => {
    const createKeyframe = (time: number, x: number, y: number, z: number): CameraKeyframe => ({
        time,
        position: new Float32Array([x, y, z]),
        rotation: new Float32Array([0, 0, 0])
    });

    it('interpolates single point correctly', () => {
        const path: CinematicPath = {
            name: 'test',
            loop: false,
            keyframes: [createKeyframe(0, 10, 20, 30)]
        };
        const interpolator = new PathInterpolator(path);
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);

        interpolator.getStateAtTime(5, pos, rot);
        expect(pos[0]).toBe(10);
        expect(pos[1]).toBe(20);
        expect(pos[2]).toBe(30);
    });

    it('clamps time to start/end', () => {
        const path: CinematicPath = {
            name: 'test',
            loop: false,
            keyframes: [
                createKeyframe(0, 0, 0, 0),
                createKeyframe(10, 100, 0, 0)
            ]
        };
        const interpolator = new PathInterpolator(path);
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);

        // Before start
        interpolator.getStateAtTime(-5, pos, rot);
        expect(pos[0]).toBeCloseTo(0);

        // After end
        interpolator.getStateAtTime(15, pos, rot);
        expect(pos[0]).toBeCloseTo(100);
    });

    it('interpolates linearly(ish) between two points', () => {
        const path: CinematicPath = {
            name: 'test',
            loop: false,
            keyframes: [
                createKeyframe(0, 0, 0, 0),
                createKeyframe(10, 100, 0, 0)
            ]
        };
        const interpolator = new PathInterpolator(path);
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);

        interpolator.getStateAtTime(5, pos, rot);
        // Catmull-Rom with duplicate endpoints acts like linear?
        // With only 2 points, k0=k1 and k3=k2.
        // Formula: 0.5 * (2p1 + (p2-p1)t + ... )
        // Should be roughly halfway.
        expect(pos[0]).toBeCloseTo(50);
        expect(pos[1]).toBe(0);
        expect(pos[2]).toBe(0);
    });

    it('handles looping', () => {
        const path: CinematicPath = {
            name: 'test',
            loop: true,
            keyframes: [
                createKeyframe(0, 0, 0, 0),
                createKeyframe(10, 100, 0, 0)
            ]
        };
        const interpolator = new PathInterpolator(path);
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);

        // Time 15 should map to time 5
        interpolator.getStateAtTime(15, pos, rot);
        expect(pos[0]).toBeCloseTo(50);
    });

    it('handles yaw wrapping (shortest path)', () => {
        const k1 = createKeyframe(0, 0, 0, 0);
        k1.rotation = new Float32Array([0, 10, 0]); // Yaw 10

        const k2 = createKeyframe(10, 0, 0, 0);
        k2.rotation = new Float32Array([0, 350, 0]); // Yaw 350

        const path: CinematicPath = {
            name: 'test',
            loop: false,
            keyframes: [k1, k2]
        };
        const interpolator = new PathInterpolator(path);
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);

        // Halfway should be 0 (implementation relative to start)
        interpolator.getStateAtTime(5, pos, rot);
        expect(rot[1]).toBeCloseTo(0);

        // Reverse case: 350 -> 10
        const path2: CinematicPath = {
            name: 'test2',
            loop: false,
            keyframes: [
                { ...k1, rotation: new Float32Array([0, 350, 0]) },
                { ...k2, rotation: new Float32Array([0, 10, 0]) }
            ]
        };
        const interpolator2 = new PathInterpolator(path2);
        interpolator2.getStateAtTime(5, pos, rot);
        expect(rot[1]).toBeCloseTo(360);
    });
});
