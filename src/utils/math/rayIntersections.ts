import { vec3 } from 'gl-matrix';

/**
 * Calculates the closest point on a line segment to a ray.
 * Useful for checking if a mouse ray is "close enough" to a wireframe line.
 */
export function distRaySegment(
  rayOrigin: vec3,
  rayDir: vec3,
  p0: vec3,
  p1: vec3
): number {
  const u = vec3.create();
  vec3.subtract(u, p1, p0); // Segment vector

  const v = vec3.create();
  vec3.copy(v, rayDir); // Ray direction

  const w = vec3.create();
  vec3.subtract(w, rayOrigin, p0);

  const a = vec3.dot(u, u);
  const b = vec3.dot(u, v);
  const c = vec3.dot(v, v);
  const d = vec3.dot(u, w);
  const e = vec3.dot(v, w);

  const D = a * c - b * b;
  let sc, tc;

  if (D < 1e-6) {
    // Parallel
    sc = 0.0;
    tc = b > c ? d / b : e / c;
  } else {
    sc = (b * e - c * d) / D;
    tc = (a * e - b * d) / D;
  }

  // Clamp sc to segment [0, 1]
  if (sc < 0.0) sc = 0.0;
  else if (sc > 1.0) sc = 1.0;

  // Recompute tc
  tc = (sc * b + e) / c;

  const dP = vec3.create();
  const scaleU = vec3.create();
  vec3.scale(scaleU, u, sc);

  const scaleV = vec3.create();
  vec3.scale(scaleV, v, tc);

  vec3.add(dP, w, scaleU); // w + sc * u
  vec3.subtract(dP, dP, scaleV); // (w + sc * u) - tc * v

  return vec3.length(dP);
}

/**
 * Intersect a ray with a plane defined by a point and a normal.
 */
export function intersectRayPlane(
    rayOrigin: vec3,
    rayDir: vec3,
    planePoint: vec3,
    planeNormal: vec3,
    outIntersection: vec3
): boolean {
    const denom = vec3.dot(planeNormal, rayDir);
    if (Math.abs(denom) > 1e-6) {
        const p0l0 = vec3.create();
        vec3.subtract(p0l0, planePoint, rayOrigin);
        const t = vec3.dot(p0l0, planeNormal) / denom;
        if (t >= 0) {
            vec3.scaleAndAdd(outIntersection, rayOrigin, rayDir, t);
            return true;
        }
    }
    return false;
}
