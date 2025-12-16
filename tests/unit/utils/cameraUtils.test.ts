import { describe, it, expect } from '@jest/globals';
import { vec3, mat4 } from 'gl-matrix';
import { updateFreeCamera, computeFreeCameraViewMatrix, FreeCameraState } from '../../../src/utils/cameraUtils';

describe('cameraUtils - FreeCamera', () => {
    const initialState: FreeCameraState = {
        position: [0, 0, 0] as vec3,
        rotation: [0, 0, 0] as vec3 // pitch, yaw, roll
    };

    it('should calculate view matrix correctly (identity)', () => {
        const matrix = mat4.create();
        computeFreeCameraViewMatrix(initialState, matrix);
        // Expect identity matrix
        const expected = mat4.create();

        // Handle -0 vs 0 issues in Float32Array by using simple loop or spread
        // or just expect to be close to

        for (let i = 0; i < 16; i++) {
            expect(matrix[i]).toBeCloseTo(expected[i]);
        }
    });

    it('should translate camera position in view matrix', () => {
        const state: FreeCameraState = {
            ...initialState,
            position: [10, 20, 30] as vec3
        };
        const matrix = mat4.create();
        computeFreeCameraViewMatrix(state, matrix);

        // View matrix is inverse of camera transform.
        // Translate(10, 20, 30) -> Inverse is Translate(-10, -20, -30)
        const expected = mat4.create();
        mat4.translate(expected, expected, [-10, -20, -30]);

        // Float precision might be an issue, but gl-matrix matches should be exact for integers if simple
        // Using toBeCloseTo equivalent for matrices?
        // Let's just check the translation component
        expect(matrix[12]).toBe(-10);
        expect(matrix[13]).toBe(-20);
        expect(matrix[14]).toBe(-30);
    });

    it('should update yaw and pitch based on mouse input', () => {
        const state = { ...initialState };
        const inputs = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            deltaX: 100,
            deltaY: 50
        };
        const dt = 1;
        const sensitivity = 0.002;

        const newState = updateFreeCamera(state, inputs, dt, 100, sensitivity, false);

        // deltaX (mouse right) -> Rotate Right -> Decrease Yaw (or increase depending on convention)
        // Usually, positive deltaX (right) -> turn right -> Yaw decreases (positive rotation is CCW)
        // Or Yaw increases if we consider right-handed system Y-up.
        // Let's define convention: Yaw is around Y.
        // Right turn = Negative rotation around Y?
        // Let's assume standard FPS: Mouse right -> Turn right.
        // If Y is up, +Z is backwards (GL). X is Right.
        // Looking down -Z. Turn right -> look towards +X.
        // This is a rotation around -Y (clock-wise looking from top).
        // So angle should decrease.

        expect(newState.rotation[1]).toBeCloseTo(initialState.rotation[1] - inputs.deltaX * sensitivity);
        expect(newState.rotation[0]).toBeCloseTo(initialState.rotation[0] - inputs.deltaY * sensitivity);
    });

    it('should clamp pitch', () => {
        const state = { ...initialState };
        const inputs = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            deltaX: 0,
            deltaY: 10000 // Huge movement
        };
        const newState = updateFreeCamera(state, inputs, 1, 100, 0.002, false);

        // Pitch should be clamped to -PI/2 to PI/2 (roughly)
        expect(Math.abs(newState.rotation[0])).toBeLessThanOrEqual(Math.PI / 2);
    });

    it('should move forward when forward key is pressed (Y-up)', () => {
        const state = { ...initialState }; // Facing -Z (default)
        const inputs = {
            forward: true,
            backward: false,
            left: false,
            right: false,
            deltaX: 0,
            deltaY: 0
        };
        const dt = 1.0;
        const speed = 10.0;

        // Initial rotation 0, 0, 0. Default view usually -Z in OpenGL.
        // Forward means moving along -Z.

        const newState = updateFreeCamera(state, inputs, dt, speed, 0.002, false); // useZUp = false

        expect(newState.position[0]).toBeCloseTo(0);
        expect(newState.position[1]).toBeCloseTo(0);
        expect(newState.position[2]).toBeCloseTo(-10);
    });

    it('should move forward when forward key is pressed (Z-up)', () => {
        // In Z-up (Quake), Forward is typically X.
        // Yaw 0 -> Facing X?
        // Let's assume Yaw 0 faces X in Z-up.
        const state = { ...initialState };
        const inputs = {
            forward: true,
            backward: false,
            left: false,
            right: false,
            deltaX: 0,
            deltaY: 0
        };
        const dt = 1.0;
        const speed = 10.0;

        const newState = updateFreeCamera(state, inputs, dt, speed, 0.002, true); // useZUp = true

        // If Yaw=0 faces X
        expect(newState.position[0]).toBeCloseTo(10);
        expect(newState.position[1]).toBeCloseTo(0);
        expect(newState.position[2]).toBeCloseTo(0);
    });

    it('should move backward and strafe (Y-up)', () => {
        const state = { ...initialState }; // Facing -Z
        const inputs = {
            forward: false,
            backward: true,
            left: true,
            right: false,
            deltaX: 0,
            deltaY: 0
        };
        const dt = 1.0;
        const speed = 10.0;

        // Backward: +Z (10)
        // Left: -X (-10) if Right is +X.
        // Wait, cross product logic:
        // Forward: -Z (0, 0, -1). Up: +Y (0, 1, 0).
        // Right = Forward x Up = (-Z) x (+Y) = (0,0,-1) x (0,1,0) = (1, 0, 0) = +X.
        // So Left is -X.

        const newState = updateFreeCamera(state, inputs, dt, speed, 0.002, false);

        expect(newState.position[0]).toBeCloseTo(-10); // Left
        expect(newState.position[1]).toBeCloseTo(0);
        expect(newState.position[2]).toBeCloseTo(10);  // Backward
    });
});
