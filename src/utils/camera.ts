import { Camera } from '@quake2ts/engine';
import { vec3, mat4 } from 'gl-matrix';

export interface Ray {
  origin: [number, number, number];
  direction: [number, number, number];
}

export function createPickingRay(
  camera: Camera,
  viewMatrix: mat4,
  mouseCoords: { x: number; y: number },
  viewport: { width: number; height: number }
): Ray {
  // Convert mouse coords (0..width, 0..height) to NDC (-1..1, -1..1)
  // Mouse Y is top-down, NDC Y is bottom-up
  const x = (mouseCoords.x / viewport.width) * 2 - 1;
  const y = 1 - (mouseCoords.y / viewport.height) * 2;

  // Clip coords on near plane
  const clipCoords = vec3.fromValues(x, y, -1.0);
  // Clip coords on far plane
  const clipCoordsFar = vec3.fromValues(x, y, 1.0);

  // Inverse Projection * View matrix
  const invProjView = mat4.create();
  const projView = mat4.create();
  mat4.multiply(projView, camera.projectionMatrix as mat4, viewMatrix);
  mat4.invert(invProjView, projView);

  // Unproject near point
  const worldNear = vec3.create();
  vec3.transformMat4(worldNear, clipCoords, invProjView);

  // Unproject far point
  const worldFar = vec3.create();
  vec3.transformMat4(worldFar, clipCoordsFar, invProjView);

  const direction = vec3.create();
  vec3.subtract(direction, worldFar, worldNear);
  vec3.normalize(direction, direction);

  return {
    origin: [worldNear[0], worldNear[1], worldNear[2]],
    direction: [direction[0], direction[1], direction[2]]
  };
}
