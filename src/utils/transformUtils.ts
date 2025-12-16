import { mat4, vec3, quat, vec4 } from 'gl-matrix';
import { Camera } from 'quake2ts/engine';
import { Ray } from '../components/UniversalViewer/adapters/types';

export enum TransformMode {
    Translate = 'translate',
    Rotate = 'rotate',
    Scale = 'scale'
}

export enum TransformAxis {
    X = 'x',
    Y = 'y',
    Z = 'z',
    None = 'none'
}

export interface GizmoState {
    activeAxis: TransformAxis;
    hoveredAxis: TransformAxis;
    mode: TransformMode;
    position: vec3;
    rotation: quat;
    scale: vec3;
    isDragging: boolean;
}

export function intersectRaySphere(rayOrigin: vec3, rayDir: vec3, sphereCenter: vec3, radius: number): boolean {
    const m = vec3.create();
    vec3.subtract(m, rayOrigin, sphereCenter);
    const b = vec3.dot(m, rayDir);
    const c = vec3.dot(m, m) - radius * radius;
    if (c > 0 && b > 0) return false;
    const discr = b * b - c;
    if (discr < 0) return false;
    return true;
}

export function intersectRayAABB(rayOrigin: vec3, rayDir: vec3, min: vec3, max: vec3): boolean {
    let tmin = (min[0] - rayOrigin[0]) / rayDir[0];
    let tmax = (max[0] - rayOrigin[0]) / rayDir[0];

    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

    let tymin = (min[1] - rayOrigin[1]) / rayDir[1];
    let tymax = (max[1] - rayOrigin[1]) / rayDir[1];

    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

    if ((tmin > tymax) || (tymin > tmax)) return false;

    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (min[2] - rayOrigin[2]) / rayDir[2];
    let tzmax = (max[2] - rayOrigin[2]) / rayDir[2];

    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

    if ((tmin > tzmax) || (tzmin > tmax)) return false;

    return true;
}

export function intersectRayPlane(rayOrigin: vec3, rayDir: vec3, planeNormal: vec3, planeDist: number): vec3 | null {
    const denom = vec3.dot(planeNormal, rayDir);
    if (Math.abs(denom) > 1e-6) {
        const t = -(vec3.dot(planeNormal, rayOrigin) + planeDist) / denom;
        if (t >= 0) {
            const hit = vec3.create();
            vec3.scaleAndAdd(hit, rayOrigin, rayDir, t);
            return hit;
        }
    }
    return null;
}
