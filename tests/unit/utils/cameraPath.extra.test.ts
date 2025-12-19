import { vec3 } from 'gl-matrix';
import { CameraKeyframe, CinematicPath, PathInterpolator } from '../../../src/utils/cameraPath';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('gl-matrix', () => {
    const { jest } = require('@jest/globals');
    const original = jest.requireActual('gl-matrix') as any;
    return {
        ...original,
        vec3: {
            ...original.vec3,
            create: jest.fn(() => new Float32Array([0, 0, 0])),
            copy: jest.fn((out: any, a: any) => {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                return out;
            }),
        },
        quat: {
            ...original.quat,
            create: jest.fn(() => new Float32Array([0, 0, 0, 1])),
            fromEuler: jest.fn(),
            slerp: jest.fn()
        }
    };
});

describe('PathInterpolator extra coverage', () => {
    const createKeyframe = (time: number, x: number): CameraKeyframe => ({
        time,
        position: new Float32Array([x, 0, 0]),
        rotation: new Float32Array([0, 0, 0])
    });

    it('sorts keyframes by time', () => {
        const k1 = createKeyframe(10, 100);
        const k2 = createKeyframe(0, 0);
        const k3 = createKeyframe(5, 50);

        const path: CinematicPath = {
            name: 'sorted',
            loop: false,
            keyframes: [k1, k2, k3] // 10, 0, 5 -> 0, 5, 10
        };

        const interpolator = new PathInterpolator(path);

        // getStateAtTime(5) should give 50.
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);
        interpolator.getStateAtTime(5, pos, rot);

        expect(pos[0]).toBeCloseTo(50);
    });

    it('handles empty keyframes', () => {
        const path: CinematicPath = { name: 'empty', loop: false, keyframes: [] };
        const interpolator = new PathInterpolator(path);
        const pos = new Float32Array(3);
        const rot = new Float32Array(3);

        // Should not crash
        interpolator.getStateAtTime(0, pos, rot);
        expect(pos[0]).toBe(0);
    });
});
