import { vec3 } from 'quake2ts';

export interface OrbitState {
  radius: number;
  theta: number;
  phi: number;
  target: vec3;
}

export function computeCameraPosition(orbit: OrbitState): vec3 {
    const x = orbit.target[0] + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    const y = orbit.target[1] + orbit.radius * Math.cos(orbit.phi);
    const z = orbit.target[2] + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    return [x, y, z];
}