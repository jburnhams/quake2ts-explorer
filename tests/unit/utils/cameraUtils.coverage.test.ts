
import {
    computeCameraPosition,
    updateFreeCamera,
    computeFreeCameraViewMatrix
} from '@/src/utils/cameraUtils';
import { vec3, mat4 } from 'gl-matrix';

describe('CameraUtils Coverage', () => {
    it('should compute orbit camera position', () => {
        const orbit = { radius: 10, theta: 0, phi: Math.PI/2, target: vec3.create() };
        const pos = computeCameraPosition(orbit);
        expect(pos[0]).toBeCloseTo(10);
        expect(pos[1]).toBeCloseTo(0);
        expect(pos[2]).toBeCloseTo(0);
    });

    it('should update free camera (Y-up)', () => {
        const state = { position: vec3.create(), rotation: vec3.create() };
        const inputs = {
            forward: true, backward: false, left: false, right: false,
            deltaX: 0, deltaY: 0
        };
        const newState = updateFreeCamera(state, inputs, 1, 100, 0.002, false);

        // Y-up: Forward is -Z.
        expect(newState.position[2]).toBeLessThan(0);
    });

    it('should update free camera (Z-up)', () => {
        const state = { position: vec3.create(), rotation: vec3.create() };
        const inputs = {
            forward: true, backward: false, left: false, right: false,
            deltaX: 0, deltaY: 0
        };
        const newState = updateFreeCamera(state, inputs, 1, 100, 0.002, true);

        // Z-up: Forward is +X (at yaw 0)
        expect(newState.position[0]).toBeGreaterThan(0);
    });

    it('should rotate free camera', () => {
        const state = { position: vec3.create(), rotation: vec3.create() };
        const inputs = {
            forward: false, backward: false, left: false, right: false,
            deltaX: 100, deltaY: 0 // Turn right
        };
        const newState = updateFreeCamera(state, inputs, 1, 100, 0.002, false);

        // Yaw should change
        expect(newState.rotation[1]).not.toBe(0);
    });

    it('should compute view matrix (Y-up)', () => {
        const state = { position: vec3.fromValues(0,0,10), rotation: vec3.create() };
        const view = mat4.create();
        computeFreeCameraViewMatrix(state, view, false);

        // Looking down -Z from (0,0,10) -> Identity view offset by -10 Z?
        // Identity lookAt from (0,0,10) to (0,0,9) up (0,1,0)
        // Should result in translation -10 Z
        expect(view[14]).toBeCloseTo(-10);
    });

    it('should compute view matrix (Z-up)', () => {
        const state = { position: vec3.fromValues(0,0,0), rotation: vec3.create() };
        const view = mat4.create();
        computeFreeCameraViewMatrix(state, view, true);
        expect(view).toBeDefined();
    });
});
