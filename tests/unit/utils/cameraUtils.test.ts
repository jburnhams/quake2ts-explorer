import { computeCameraPosition, updateFreeCamera, computeFreeCameraViewMatrix } from '@/src/utils/cameraUtils';
import { vec3, mat4 } from 'gl-matrix';

describe('cameraUtils', () => {
    describe('computeCameraPosition', () => {
        it('calculates position for spherical coordinates', () => {
             const orbit = {
                 radius: 10,
                 theta: 0,
                 phi: Math.PI / 2,
                 target: [0, 0, 0] as vec3
             };
             // phi=90 (z=0, x=r*cos(theta)), theta=0 -> x=10, y=0, z=0
             // formula: x = r * sin(phi) * cos(theta)
             // y = r * cos(phi)
             // z = r * sin(phi) * sin(theta)

             // Wait, standard math:
             // y = r * cos(PI/2) = 0
             // x = 10 * 1 * 1 = 10
             // z = 10 * 1 * 0 = 0

             const pos = computeCameraPosition(orbit);
             expect(pos[0]).toBeCloseTo(10); // x
             expect(pos[1]).toBeCloseTo(0);  // y
             expect(pos[2]).toBeCloseTo(0);  // z
        });
    });

    describe('updateFreeCamera', () => {
        it('updates rotation based on input (Y-Up)', () => {
            const state = { position: [0,0,0] as vec3, rotation: [0,0,0] as vec3 };
            const inputs = {
                forward: false, backward: false, left: false, right: false,
                deltaX: 100, deltaY: 50
            };
            const dt = 0.016;

            const next = updateFreeCamera(state, inputs, dt, 100, 0.01, false);

            // Yaw -= deltaX * sens = -1
            // Pitch -= deltaY * sens = -0.5
            expect(next.rotation[1]).toBeCloseTo(-1);
            expect(next.rotation[0]).toBeCloseTo(-0.5);
        });

        it('updates position moving forward (Y-Up)', () => {
             // Facing -Z (default 0,0)
             const state = { position: [0,0,0] as vec3, rotation: [0,0,0] as vec3 };
             const inputs = {
                forward: true, backward: false, left: false, right: false,
                deltaX: 0, deltaY: 0
            };
            const dt = 1.0;
            const speed = 10;

            const next = updateFreeCamera(state, inputs, dt, speed, 0.01, false);

            expect(next.position[0]).toBeCloseTo(0);
            expect(next.position[1]).toBeCloseTo(0);
            expect(next.position[2]).toBeCloseTo(-10);
        });

        it('updates position moving forward (Z-Up)', () => {
             // Z-Up: Yaw 0, Pitch 0 -> Forward = +X
             const state = { position: [0,0,0] as vec3, rotation: [0,0,0] as vec3 };
             const inputs = {
                forward: true, backward: false, left: false, right: false,
                deltaX: 0, deltaY: 0
            };
            const dt = 1.0;
            const speed = 10;

            const next = updateFreeCamera(state, inputs, dt, speed, 0.01, true);

            expect(next.position[0]).toBeCloseTo(10);
            expect(next.position[1]).toBeCloseTo(0);
            expect(next.position[2]).toBeCloseTo(0);
        });
    });

    describe('computeFreeCameraViewMatrix', () => {
         it('computes view matrix (Y-Up)', () => {
             const state = { position: [0,0,10] as vec3, rotation: [0,0,0] as vec3 };
             const view = mat4.create();
             computeFreeCameraViewMatrix(state, view, false);

             // Eye at 0,0,10. Looking -Z. Up Y.
             // Should result in translation -10 Z.
             const expected = mat4.create();
             mat4.lookAt(expected, [0,0,10], [0,0,9], [0,1,0]);

             expect(view).toEqual(expected);
         });

         it('computes view matrix (Z-Up)', () => {
             const state = { position: [-10,0,0] as vec3, rotation: [0,0,0] as vec3 };
             const view = mat4.create();
             computeFreeCameraViewMatrix(state, view, true);

             // Eye at -10,0,0. Looking +X (yaw 0). Up Z.
             const expected = mat4.create();
             mat4.lookAt(expected, [-10,0,0], [-9,0,0], [0,0,1]);

             expect(view).toEqual(expected);
         });
    });
});
