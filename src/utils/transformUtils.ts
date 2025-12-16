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
}
