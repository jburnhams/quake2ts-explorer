import { Ray } from '../components/UniversalViewer/adapters/types';
import { vec3 } from 'gl-matrix';

export class TransformUtils {
  // Projects a ray onto a line (axis) defined by origin and direction
  // Returns the point on the line closest to the ray, and the parameter t along the line
  static projectRayToLine(ray: Ray, lineOrigin: vec3, lineDir: vec3): { point: vec3, t: number } {
    // Vector from line origin to ray origin
    const w0 = vec3.create();
    vec3.sub(w0, vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]), lineOrigin);

    const a = vec3.dot(vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]), vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]));
    const b = vec3.dot(vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]), lineDir);
    const c = vec3.dot(lineDir, lineDir);
    const d = vec3.dot(vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]), w0);
    const e = vec3.dot(lineDir, w0);

    const denom = a * c - b * b;
    if (denom < 0.00001) {
       // Parallel
       return { point: lineOrigin, t: 0 };
    }

    const t = (a * e - b * d) / denom;
    const point = vec3.create();
    vec3.scaleAndAdd(point, lineOrigin, lineDir, t);

    return { point, t };
  }

  // Snap value to grid
  static snap(value: number, gridSize: number): number {
      if (gridSize <= 0) return value;
      return Math.round(value / gridSize) * gridSize;
  }

  // Projects a ray onto a plane defined by a normal and a point on the plane (origin)
  static projectRayToPlane(ray: Ray, planeNormal: vec3, planeOrigin: vec3): { point: vec3, t: number } | null {
      const rayDir = vec3.fromValues(ray.direction[0], ray.direction[1], ray.direction[2]);
      const rayOrigin = vec3.fromValues(ray.origin[0], ray.origin[1], ray.origin[2]);

      const denom = vec3.dot(planeNormal, rayDir);

      if (Math.abs(denom) < 0.000001) {
          return null; // Parallel
      }

      const p0l0 = vec3.create();
      vec3.sub(p0l0, planeOrigin, rayOrigin);
      const t = vec3.dot(p0l0, planeNormal) / denom;

      if (t < 0) return null; // Behind the ray origin? Actually useful to return intersection even if behind?
      // For gizmo interaction we typically want t > 0, but dragging logic might handle negative if camera is inside...
      // Let's return intersection regardless of sign? No, usually forward only.

      const point = vec3.create();
      vec3.scaleAndAdd(point, rayOrigin, rayDir, t);

      return { point, t };
  }
}
