import { Camera } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { mat4, vec3 } from 'gl-matrix';

export interface RenderOptions {
  mode: 'textured' | 'wireframe' | 'solid' | 'solid-faceted' | 'random';
  color: [number, number, number];
  generateRandomColor?: boolean;
}

export interface ViewerAdapter {
  load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void>;
  update(deltaTime: number): void;
  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void;
  cleanup(): void;

  // Render options
  setRenderOptions?(options: RenderOptions): void;

  // Playback controls
  play?(): void;
  pause?(): void;
  seek?(time: number): void;
  isPlaying?(): boolean;
  getDuration?(): number;
  getCurrentTime?(): number;
  setSpeed?(speed: number): void;

  // Returns true if the adapter wants to control the camera (e.g. demo playback)
  hasCameraControl?(): boolean;
  // Get the camera position/angles from the adapter if it controls the camera
  getCameraUpdate?(): { position: vec3; angles: vec3 };

  // Returns true if the adapter requires Z-up coordinate system (e.g. BSP/DM2)
  useZUp?(): boolean;
}
