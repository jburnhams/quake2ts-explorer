import type { vec3 } from 'quake2ts';

interface OrbitState {
  radius: number;
  theta: number;
  phi: number;
  target: vec3;
  panOffset: vec3;
}

export function computeCameraPosition(orbit: OrbitState): vec3 {
  const { radius, theta, phi, target, panOffset } = orbit;
  const x = target[0] + panOffset[0] + radius * Math.sin(phi) * Math.cos(theta);
  const y = target[1] + panOffset[1] + radius * Math.cos(phi);
  const z = target[2] + panOffset[2] + radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}
