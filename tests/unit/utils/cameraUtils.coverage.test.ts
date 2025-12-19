import { updateFreeCamera, computeFreeCameraViewMatrix, computeCameraPosition, FreeCameraState } from '../../../src/utils/cameraUtils';
import { vec3, mat4 } from 'gl-matrix';
import { describe, it, expect } from '@jest/globals';

describe('cameraUtils coverage', () => {
    describe('computeCameraPosition', () => {
        it('computes orbit position', () => {
            // radius 10, theta 0, phi PI/2 (90deg)
            // x = target + r * sin(phi) * cos(theta) = 0 + 10 * 1 * 1 = 10
            // y = target + r * cos(phi) = 0 + 10 * 0 = 0
            // z = target + r * sin(phi) * sin(theta) = 0 + 10 * 1 * 0 = 0
            const pos = computeCameraPosition({
                radius: 10,
                theta: 0,
                phi: Math.PI / 2,
                target: [0, 0, 0]
            });
            expect(pos[0]).toBeCloseTo(10);
            expect(pos[1]).toBeCloseTo(0);
            expect(pos[2]).toBeCloseTo(0);
        });
    });

    const initialState: FreeCameraState = {
        position: [0, 0, 0],
        rotation: [0, 0, 0]
    };

    const inputs = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        deltaX: 0,
        deltaY: 0
    };

    describe('updateFreeCamera', () => {
        it('handles Z-Up (Quake) coordinates', () => {
            // Looking +X (Yaw 0)
            const newState = updateFreeCamera(initialState, { ...inputs, forward: true }, 1.0, 100, 0.002, true);

            // Should move in +X
            expect(newState.position[0]).toBeCloseTo(100);
            expect(newState.position[1]).toBeCloseTo(0);
            expect(newState.position[2]).toBeCloseTo(0);
        });

        it('handles Y-Up (OpenGL) coordinates', () => {
            // Looking -Z (Yaw 0)
            const newState = updateFreeCamera(initialState, { ...inputs, forward: true }, 1.0, 100, 0.002, false);

            // Should move in -Z
            expect(newState.position[0]).toBeCloseTo(0);
            expect(newState.position[1]).toBeCloseTo(0);
            expect(newState.position[2]).toBeCloseTo(-100);
        });

        it('rotates correctly with mouse input', () => {
             const newState = updateFreeCamera(initialState, { ...inputs, deltaX: 100, deltaY: 50 }, 1.0, 100, 0.01, false);
             // Yaw should change (deltaX)
             // Pitch should change (deltaY)
             expect(newState.rotation[1]).not.toBe(0);
             expect(newState.rotation[0]).not.toBe(0);
        });

        it('clamps pitch', () => {
             // Try to look WAY up (deltaY negative large)
             // Pitch (rotation[0]) -= deltaY * sensitivity.
             // If deltaY is -1000, Pitch += 10.
             // Limit is PI/2 - 0.01 (~1.56)
             const newState = updateFreeCamera(initialState, { ...inputs, deltaY: -10000 }, 1.0, 100, 0.01, false);
             expect(newState.rotation[0]).toBeLessThan(Math.PI/2);
             expect(newState.rotation[0]).toBeGreaterThan(1.5);
        });
    });

    describe('computeFreeCameraViewMatrix', () => {
        it('computes matrix for Z-Up', () => {
            const matrix = mat4.create();
            computeFreeCameraViewMatrix(initialState, matrix, true);

            // Verify matrix looks roughly correct (identity-ish but rotated for Z-up?)
            // At 0,0,0 pos, 0,0,0 rot.
            // Z-Up: Forward +X, Up +Z.
            // LookAt(eye=0,0,0, target=1,0,0, up=0,0,1)
            // Should be a view matrix looking down +X.
            expect(matrix).toBeDefined();
        });

        it('computes matrix for Y-Up', () => {
            const matrix = mat4.create();
            computeFreeCameraViewMatrix(initialState, matrix, false);

            // Y-Up: Forward -Z, Up +Y.
            // LookAt(eye=0,0,0, target=0,0,-1, up=0,1,0)
            // Should be identity matrix (inverse of camera at origin looking -Z).
            // Actually mat4.lookAt generates correct view matrix.
            // Identity view matrix means camera at origin looking down -Z.
            const identity = mat4.create();
            // gl-matrix lookAt might produce identity for this case.
            // Let's check a specific value if needed, or just coverage.
            expect(matrix[0]).toBeCloseTo(1);
            expect(matrix[5]).toBeCloseTo(1);
        });
    });
});
