import { vec3, vec4 } from 'gl-matrix';
import { DebugRenderer } from '../adapters/DebugRenderer';
import { Ray } from '../adapters/types';
import { distRaySegment, intersectRayPlane } from '@/src/utils/math/rayIntersections';

export type GizmoAxis = 'x' | 'y' | 'z';

export class GizmoController {
    private position: vec3 = vec3.create();
    private size: number = 32;

    setPosition(pos: vec3) {
        vec3.copy(this.position, pos);
    }

    render(renderer: DebugRenderer) {
        // X Axis (Red)
        const xEnd = vec3.create();
        vec3.add(xEnd, this.position, [this.size, 0, 0]);
        renderer.addLine(this.position, xEnd, vec4.fromValues(1, 0, 0, 1));
        // Add "arrow head" (simple line for now)
        const arrowSize = this.size * 0.2;
        renderer.addLine(xEnd, vec3.fromValues(xEnd[0] - arrowSize, xEnd[1] + arrowSize * 0.5, xEnd[2]), vec4.fromValues(1, 0, 0, 1));
        renderer.addLine(xEnd, vec3.fromValues(xEnd[0] - arrowSize, xEnd[1] - arrowSize * 0.5, xEnd[2]), vec4.fromValues(1, 0, 0, 1));

        // Y Axis (Green)
        const yEnd = vec3.create();
        vec3.add(yEnd, this.position, [0, this.size, 0]);
        renderer.addLine(this.position, yEnd, vec4.fromValues(0, 1, 0, 1));
        renderer.addLine(yEnd, vec3.fromValues(yEnd[0] + arrowSize * 0.5, yEnd[1] - arrowSize, yEnd[2]), vec4.fromValues(0, 1, 0, 1));
        renderer.addLine(yEnd, vec3.fromValues(yEnd[0] - arrowSize * 0.5, yEnd[1] - arrowSize, yEnd[2]), vec4.fromValues(0, 1, 0, 1));

        // Z Axis (Blue)
        const zEnd = vec3.create();
        vec3.add(zEnd, this.position, [0, 0, this.size]);
        renderer.addLine(this.position, zEnd, vec4.fromValues(0, 0, 1, 1));
        renderer.addLine(zEnd, vec3.fromValues(zEnd[0], zEnd[1] + arrowSize * 0.5, zEnd[2] - arrowSize), vec4.fromValues(0, 0, 1, 1));
        renderer.addLine(zEnd, vec3.fromValues(zEnd[0], zEnd[1] - arrowSize * 0.5, zEnd[2] - arrowSize), vec4.fromValues(0, 0, 1, 1));
    }

    intersect(ray: Ray): GizmoAxis | null {
        const threshold = 2.0; // Distance tolerance

        const origin = vec3.fromValues(ray.origin.x, ray.origin.y, ray.origin.z);
        const dir = vec3.fromValues(ray.direction.x, ray.direction.y, ray.direction.z);
        vec3.normalize(dir, dir);

        const xEnd = vec3.create();
        vec3.add(xEnd, this.position, [this.size, 0, 0]);
        const distX = distRaySegment(origin, dir, this.position, xEnd);

        const yEnd = vec3.create();
        vec3.add(yEnd, this.position, [0, this.size, 0]);
        const distY = distRaySegment(origin, dir, this.position, yEnd);

        const zEnd = vec3.create();
        vec3.add(zEnd, this.position, [0, 0, this.size]);
        const distZ = distRaySegment(origin, dir, this.position, zEnd);

        // Prioritize closest axis
        if (distX < threshold && distX <= distY && distX <= distZ) return 'x';
        if (distY < threshold && distY <= distX && distY <= distZ) return 'y';
        if (distZ < threshold && distZ <= distX && distZ <= distY) return 'z';

        return null;
    }

    getNewPosition(
        axis: GizmoAxis,
        startPosition: vec3,
        ray: Ray,
        cameraForward: vec3
    ): vec3 {
        // Project ray onto a plane defined by the axis and camera direction
        const rayOrigin = vec3.fromValues(ray.origin.x, ray.origin.y, ray.origin.z);
        const rayDir = vec3.fromValues(ray.direction.x, ray.direction.y, ray.direction.z);
        vec3.normalize(rayDir, rayDir);

        // Determine plane normal based on axis.
        // We want a plane containing the axis line, facing the camera.
        const axisDir = vec3.create();
        if (axis === 'x') vec3.set(axisDir, 1, 0, 0);
        else if (axis === 'y') vec3.set(axisDir, 0, 1, 0);
        else vec3.set(axisDir, 0, 0, 1);

        // Normal is cross product of axis and another vector not parallel to it.
        // Better: Plane normal is cross(axis, cross(axis, cameraForward))?
        // Simple approach: Use one of the cardinal planes (XY, XZ, YZ) that is most perpendicular to camera

        let planeNormal = vec3.create();

        // Pick best plane
        if (axis === 'x') {
             // Dragging X. Plane could be XY or XZ.
             // If camera is looking down (Z), use XY. If looking front (Y), use XZ.
             const dotY = Math.abs(cameraForward[1]);
             const dotZ = Math.abs(cameraForward[2]);
             if (dotZ > dotY) vec3.set(planeNormal, 0, 0, 1); // XY plane
             else vec3.set(planeNormal, 0, 1, 0); // XZ plane
        } else if (axis === 'y') {
             // Dragging Y. Plane XY or YZ.
             const dotX = Math.abs(cameraForward[0]);
             const dotZ = Math.abs(cameraForward[2]);
             if (dotZ > dotX) vec3.set(planeNormal, 0, 0, 1); // XY plane
             else vec3.set(planeNormal, 1, 0, 0); // YZ plane
        } else {
             // Dragging Z. Plane XZ or YZ.
             const dotX = Math.abs(cameraForward[0]);
             const dotY = Math.abs(cameraForward[1]);
             if (dotY > dotX) vec3.set(planeNormal, 0, 1, 0); // XZ plane
             else vec3.set(planeNormal, 1, 0, 0); // YZ plane
        }

        const intersection = vec3.create();
        if (intersectRayPlane(rayOrigin, rayDir, startPosition, planeNormal, intersection)) {
             const newPos = vec3.create();
             vec3.copy(newPos, startPosition);

             // Constrain to axis
             if (axis === 'x') newPos[0] = intersection[0];
             if (axis === 'y') newPos[1] = intersection[1];
             if (axis === 'z') newPos[2] = intersection[2];

             return newPos;
        }

        return startPosition;
    }
}
