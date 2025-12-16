import { TransformUtils } from '../../../src/utils/transformUtils';
import { vec3 } from 'gl-matrix';

describe('TransformUtils', () => {
    describe('snap', () => {
        it('snaps value to grid', () => {
            expect(TransformUtils.snap(12, 10)).toBe(10);
            expect(TransformUtils.snap(18, 10)).toBe(20);
            expect(TransformUtils.snap(5, 10)).toBe(10); // Round up? 5/10=0.5 -> 1 -> 10. Math.round(0.5)=1
            expect(TransformUtils.snap(4, 10)).toBe(0);
        });

        it('handles zero or negative grid size', () => {
            expect(TransformUtils.snap(123, 0)).toBe(123);
            expect(TransformUtils.snap(123, -10)).toBe(123);
        });
    });

    describe('projectRayToLine', () => {
        it('projects ray to line correctly', () => {
            const ray = {
                origin: [0, 0, 0] as [number, number, number],
                direction: [0, 0, 1] as [number, number, number] // Ray along Z
            };
            const lineOrigin = vec3.fromValues(10, 0, 0);
            const lineDir = vec3.fromValues(0, 1, 0); // Line along Y at X=10

            const result = TransformUtils.projectRayToLine(ray, lineOrigin, lineDir);
            expect(result.t).toBeCloseTo(0);
            expect(result.point[0]).toBeCloseTo(10);
            expect(result.point[1]).toBeCloseTo(0);
            expect(result.point[2]).toBeCloseTo(0);
        });

        it('handles parallel lines', () => {
             const ray = {
                origin: [0, 0, 0] as [number, number, number],
                direction: [1, 0, 0] as [number, number, number]
            };
            const lineOrigin = vec3.fromValues(0, 10, 0);
            const lineDir = vec3.fromValues(1, 0, 0);

            const result = TransformUtils.projectRayToLine(ray, lineOrigin, lineDir);
            expect(result.t).toBe(0);
            expect(result.point).toEqual(lineOrigin);
        });
    });

    describe('projectRayToPlane', () => {
        it('calculates intersection of ray and plane', () => {
            const ray = {
                origin: [0, 0, 10] as [number, number, number], // 10 units above origin
                direction: [0, 0, -1] as [number, number, number] // Pointing down
            };
            const planeOrigin = vec3.fromValues(0, 0, 0);
            const planeNormal = vec3.fromValues(0, 0, 1); // XY plane

            const result = TransformUtils.projectRayToPlane(ray, planeNormal, planeOrigin);
            expect(result).not.toBeNull();
            if (result) {
                expect(result.t).toBeCloseTo(10);
                expect(result.point[0]).toBeCloseTo(0);
                expect(result.point[1]).toBeCloseTo(0);
                expect(result.point[2]).toBeCloseTo(0);
            }
        });

        it('returns null if ray is parallel to plane', () => {
            const ray = {
                origin: [0, 0, 10] as [number, number, number],
                direction: [1, 0, 0] as [number, number, number] // Parallel to XY plane
            };
            const planeOrigin = vec3.fromValues(0, 0, 0);
            const planeNormal = vec3.fromValues(0, 0, 1);

            const result = TransformUtils.projectRayToPlane(ray, planeNormal, planeOrigin);
            expect(result).toBeNull();
        });
    });
});
