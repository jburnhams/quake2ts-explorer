import { updateFreeCamera, FreeCameraState } from '../../../src/utils/cameraUtils';


describe('cameraUtils extra coverage', () => {
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

    describe('updateFreeCamera movement', () => {
        it('moves backward (Y-Up)', () => {
            // Facing -Z. Backward is +Z.
            const newState = updateFreeCamera(initialState, { ...inputs, backward: true }, 1.0, 100, 0.002, false);
            expect(newState.position[2]).toBeCloseTo(100);
        });

        it('moves left (Y-Up)', () => {
            // Facing -Z. Up Y. Right is +X. Left is -X.
            const newState = updateFreeCamera(initialState, { ...inputs, left: true }, 1.0, 100, 0.002, false);
            expect(newState.position[0]).toBeCloseTo(-100);
        });

        it('moves right (Y-Up)', () => {
            // Facing -Z. Right is +X.
            const newState = updateFreeCamera(initialState, { ...inputs, right: true }, 1.0, 100, 0.002, false);
            expect(newState.position[0]).toBeCloseTo(100);
        });

        it('moves with combined inputs (Forward + Right)', () => {
            // Facing -Z. Forward -Z. Right +X.
            // Result should be (100, 0, -100)
            const newState = updateFreeCamera(initialState, { ...inputs, forward: true, right: true }, 1.0, 100, 0.002, false);
            expect(newState.position[0]).toBeCloseTo(100);
            expect(newState.position[2]).toBeCloseTo(-100);
        });
    });
});
