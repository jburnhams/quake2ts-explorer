export interface CameraSettings {
  thirdPersonDistance: number;
  thirdPersonFOV: number;
  freeCamSpeed: number;
  cinematicSpeed: number;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  thirdPersonDistance: 100,
  thirdPersonFOV: 90,
  freeCamSpeed: 400,
  cinematicSpeed: 1.0,
};
