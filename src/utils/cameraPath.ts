import { vec3, quat } from 'gl-matrix';

export interface CameraKeyframe {
  time: number; // Timestamp in seconds (relative to demo start or path start)
  position: vec3;
  rotation: vec3; // Euler angles (pitch, yaw, roll) in degrees
}

export interface CinematicPath {
  name: string;
  keyframes: CameraKeyframe[];
  loop: boolean;
}

/**
 * Catmull-Rom spline interpolation for a series of points.
 * Calculates position at time t given 4 control points p0, p1, p2, p3.
 * t is normalized between 0 (at p1) and 1 (at p2).
 */
function catmullRom(out: vec3, p0: vec3, p1: vec3, p2: vec3, p3: vec3, t: number): void {
  const t2 = t * t;
  const t3 = t2 * t;

  out[0] = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
  out[1] = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  out[2] = 0.5 * ((2 * p1[2]) + (-p0[2] + p2[2]) * t + (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 + (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3);
}

/**
 * Linear interpolation for angles, handling wrapping logic if needed (though euler lerp is tricky, slerp is better).
 * For simplicity, we convert euler to quat, slerp, then back to euler.
 */
function interpolateRotation(out: vec3, r1: vec3, r2: vec3, t: number): void {
    const q1 = quat.create();
    const q2 = quat.create();

    // gl-matrix fromEuler order: x, y, z (pitch, yaw, roll)
    quat.fromEuler(q1, r1[0], r1[1], r1[2]);
    quat.fromEuler(q2, r2[0], r2[1], r2[2]);

    const qResult = quat.create();
    quat.slerp(qResult, q1, q2, t);

    // Convert back to euler? Or just use quat for camera?
    // The engine camera usually expects Euler angles in degrees.
    // gl-matrix getEuler is not standard, we might need manual conversion or just simple Lerp if angles are close.
    // Simple Lerp is often "good enough" for camera paths if we avoid gimbal lock areas.
    // Let's stick to simple Lerp for now to avoid complexity of Quat->Euler conversion issues.

    // Handle wrap-around for Yaw (Y axis, index 1)
    let y1 = r1[1];
    let y2 = r2[1];

    // Shortest path interpolation
    if (Math.abs(y2 - y1) > 180) {
        if (y2 > y1) y1 += 360;
        else y2 += 360;
    }

    out[0] = r1[0] + (r2[0] - r1[0]) * t;
    out[1] = r1[1] + (y2 - y1) * t;
    out[2] = r1[2] + (r2[2] - r1[2]) * t;
}

export class PathInterpolator {
    private path: CinematicPath;

    constructor(path: CinematicPath) {
        this.path = path;
        // Ensure sorted by time
        this.path.keyframes.sort((a, b) => a.time - b.time);
    }

    public getStateAtTime(time: number, outPos: vec3, outRot: vec3): void {
        const frames = this.path.keyframes;
        if (frames.length === 0) return;

        if (frames.length === 1) {
            vec3.copy(outPos, frames[0].position);
            vec3.copy(outRot, frames[0].rotation);
            return;
        }

        // Clamp time
        const startTime = frames[0].time;
        const endTime = frames[frames.length - 1].time;

        let t = time;
        if (t < startTime) t = startTime;
        if (t > endTime) {
            if (this.path.loop) {
                t = startTime + ((t - startTime) % (endTime - startTime));
            } else {
                t = endTime;
            }
        }

        // Find current segment
        let i = 0;
        for (; i < frames.length - 1; i++) {
            if (t >= frames[i].time && t <= frames[i+1].time) {
                break;
            }
        }

        // Segment i to i+1
        const k0 = i > 0 ? frames[i-1] : frames[i]; // Previous (for spline)
        const k1 = frames[i];                        // Current
        const k2 = frames[i+1];                      // Next
        const k3 = i < frames.length - 2 ? frames[i+2] : frames[i+1]; // Next Next

        // Normalized time for this segment
        const duration = k2.time - k1.time;
        const alpha = duration > 0 ? (t - k1.time) / duration : 0;

        // Interpolate Position (Spline)
        catmullRom(outPos, k0.position, k1.position, k2.position, k3.position, alpha);

        // Interpolate Rotation (Linear/Slerp)
        // Note: Spline interpolation for rotation can be unstable, Linear is safer between keyframes
        interpolateRotation(outRot, k1.rotation, k2.rotation, alpha);
    }
}
