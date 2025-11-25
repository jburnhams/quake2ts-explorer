import { vec3, mat4 } from 'gl-matrix';

export interface OrbitState {
  radius: number;
  theta: number;
  phi: number;
  target: vec3;
}

export interface FreeCameraState {
  position: vec3;
  rotation: vec3; // pitch, yaw, roll
}

export function computeCameraPosition(orbit: OrbitState): vec3 {
    const x = orbit.target[0] + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    const y = orbit.target[1] + orbit.radius * Math.cos(orbit.phi);
    const z = orbit.target[2] + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    return [x, y, z];
}

export function updateFreeCamera(
  state: FreeCameraState,
  inputs: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    deltaX: number;
    deltaY: number;
  },
  dt: number,
  speed: number = 100,
  sensitivity: number = 0.002,
  useZUp: boolean = false
): FreeCameraState {
  const nextRotation = vec3.clone(state.rotation);
  const nextPosition = vec3.clone(state.position);

  // Update Rotation (Yaw and Pitch)
  // deltaX -> Yaw. deltaY -> Pitch.
  // Standard mouse look: Right movement (positive deltaX) -> Turn Right.
  // Up movement (negative deltaY usually in screen coords) -> Look Up.
  // But inputs.deltaY depends on how we capture it. Typically movementY is positive when moving down.
  // Moving mouse down -> Look down (Pitch decrease? or increase?).

  // Let's define:
  // Pitch (rotation[0]): Looking up/down. Positive = Up? Or Down?
  // Yaw (rotation[1]): Turning left/right.

  // Convention:
  // If Y-up (OpenGL):
  //   Yaw rotates around Y.
  //   Pitch rotates around local X (Right).
  //   Yaw: +DeltaX (Right) -> Turn Right.
  //   Looking down -Z. Right is +X.
  //   Turn Right = Clockwise around +Y (looking from top). This is Negative rotation.
  //   So Yaw -= deltaX * sensitivity.

  //   Pitch: +DeltaY (Down) -> Look Down.
  //   Look Down = Rotate around X.
  //   +X is Right. Rotate "down" means nose goes down.
  //   Right-hand rule thumb on +X -> fingers curl Y to Z.
  //   Z is back. Y is up.
  //   Rotate + angle around X -> Y goes towards Z (back). Looking up?
  //   Wait. (0,1,0) rotated +90deg around (1,0,0) -> (0,0,1).
  //   So +Pitch is Look Up (towards back? No).
  //   Let's check `mat4.rotateX`.
  //   If I look down -Z. +Pitch means looking up?
  //   Usually Pitch 0 = Horizon. +Pitch = Up. -Pitch = Down.
  //   So if DeltaY is positive (Mouse Down), we want Pitch to decrease.

  // If Z-up (Quake):
  //   Yaw rotates around Z.
  //   Pitch rotates around local Right (Y?).
  //   Yaw: +DeltaX (Right) -> Turn Right.
  //   Turn Right = Clockwise around +Z. Negative rotation.
  //   So Yaw -= deltaX * sensitivity.

  //   Pitch: +DeltaY (Down) -> Look Down.
  //   If we want +Pitch = Up. Then Pitch -= deltaY * sensitivity.

  nextRotation[1] -= inputs.deltaX * sensitivity;
  nextRotation[0] -= inputs.deltaY * sensitivity;

  // Clamp Pitch
  const PITCH_LIMIT = Math.PI / 2 - 0.01;
  nextRotation[0] = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, nextRotation[0]));

  // Update Position
  // Calculate Forward and Right vectors based on Yaw.
  // (We ignore Pitch for movement usually - "flying" vs "walking", but "move camera" usually means flying for free cam)
  // If we want "free fly", forward vector includes pitch.
  // Let's assume free fly (spectator).

  const forward = vec3.create();
  const right = vec3.create();
  const up = vec3.create();

  const yaw = nextRotation[1];
  const pitch = nextRotation[0];

  if (useZUp) {
      // Z-up (Quake)
      // Yaw 0 -> +X (Forward).
      // Pitch 0 -> Horizon.

      // forward:
      // x = cos(yaw) * cos(pitch)
      // y = sin(yaw) * cos(pitch)
      // z = sin(pitch)

      forward[0] = Math.cos(yaw) * Math.cos(pitch);
      forward[1] = Math.sin(yaw) * Math.cos(pitch);
      forward[2] = Math.sin(pitch);

      // Global Up is Z (0,0,1)
      vec3.set(up, 0, 0, 1);
  } else {
      // Y-up (OpenGL)
      // Yaw 0 -> -Z (Forward).
      // Pitch 0 -> Horizon.

      // forward:
      // x = sin(yaw) * cos(pitch)
      // y = sin(pitch)
      // z = -cos(yaw) * cos(pitch)
      // Wait, let's verify.
      // Yaw=0, Pitch=0 -> x=0, y=0, z=-1. Correct.
      // Yaw=90 (PI/2) -> x=1, y=0, z=0. Right?
      // If Yaw rotates around Y. +90 (CCW) -> Faces -X?
      // My logic above said +Yaw is CCW.
      // Earlier I said Right Turn (Mouse Right) = Negative Yaw.
      // So -90 -> Faces +X.
      // sin(-90) = -1. So x=-1?
      // Maybe my formula is slightly off for "Standard" mapping.
      // Let's stick to standard math:
      // x = sin(yaw) * cos(pitch)
      // z = cos(yaw) * cos(pitch)
      // y = sin(pitch)

      // If Yaw=0, Pitch=0 -> x=0, z=1, y=0. (Faces +Z).
      // We want to face -Z.
      // So maybe z = -cos(yaw)...

      // Let's just use gl-matrix rotate logic implicitly or build vector.
      // Actually, simplest is:
      // Rotate (0, 0, -1) by Pitch (X) then Yaw (Y).

      const viewDir = vec3.fromValues(0, 0, -1);
      vec3.rotateX(viewDir, viewDir, [0, 0, 0], pitch);
      vec3.rotateY(viewDir, viewDir, [0, 0, 0], yaw);
      vec3.copy(forward, viewDir);

      vec3.set(up, 0, 1, 0);
  }

  vec3.normalize(forward, forward);

  // Right vector = Forward x Up
  // But strictly, Right should be horizontal.
  // If we fly, Forward can be up/down.
  // Cross(Forward, WorldUp) gives horizontal Right.
  vec3.cross(right, forward, up);
  vec3.normalize(right, right);

  // Re-calculate local Up if needed, but we don't need it for movement unless strafing up/down (Space/C).
  // Movement:
  const moveSpeed = speed * dt;
  const moveVec = vec3.create();

  if (inputs.forward) vec3.scaleAndAdd(moveVec, moveVec, forward, moveSpeed);
  if (inputs.backward) vec3.scaleAndAdd(moveVec, moveVec, forward, -moveSpeed);
  if (inputs.right) vec3.scaleAndAdd(moveVec, moveVec, right, moveSpeed);
  if (inputs.left) vec3.scaleAndAdd(moveVec, moveVec, right, -moveSpeed);

  vec3.add(nextPosition, nextPosition, moveVec);

  return {
    position: nextPosition,
    rotation: nextRotation
  };
}

export function computeFreeCameraViewMatrix(
  state: FreeCameraState,
  viewMatrix: mat4,
  useZUp: boolean = false
) {
  const yaw = state.rotation[1];
  const pitch = state.rotation[0];
  const position = state.position;

  const target = vec3.create();
  const up = vec3.create();
  const forward = vec3.create();

  if (useZUp) {
      // Z-Up (Quake)
      forward[0] = Math.cos(yaw) * Math.cos(pitch);
      forward[1] = Math.sin(yaw) * Math.cos(pitch);
      forward[2] = Math.sin(pitch);
      vec3.set(up, 0, 0, 1);
  } else {
      // Y-Up (OpenGL)
      // Replicating rotation logic from update:
      // RotY(yaw) * RotX(pitch) * (0,0,-1)
      const viewDir = vec3.fromValues(0, 0, -1);
      vec3.rotateX(viewDir, viewDir, [0, 0, 0], pitch);
      vec3.rotateY(viewDir, viewDir, [0, 0, 0], yaw);
      vec3.copy(forward, viewDir);
      vec3.set(up, 0, 1, 0);
  }

  vec3.add(target, position, forward);
  mat4.lookAt(viewMatrix, position, target, up);
}
