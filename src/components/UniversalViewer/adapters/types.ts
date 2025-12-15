import { Camera, DemoPlaybackController } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { mat4, vec3 } from 'gl-matrix';
import { DebugMode } from '@/src/types/debugMode';
import { CameraMode } from '@/src/types/cameraMode';

export interface RenderOptions {
  mode: 'textured' | 'wireframe' | 'solid' | 'solid-faceted';
  color: [number, number, number];
  generateRandomColor?: boolean;
  // Lighting options
  brightness?: number;
  gamma?: number;
  ambient?: number;
  fullbright?: boolean;
}

export interface Ray {
  origin: [number, number, number];
  direction: [number, number, number];
}

export interface AnimationInfo {
  name: string;
  firstFrame: number;
  lastFrame: number;
  fps: number;
}

export interface FrameInfo {
  currentFrame: number;
  totalFrames: number;
  interpolatedFrame: number;
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

  // Animation support
  getAnimations?(): AnimationInfo[];
  setAnimation?(name: string): void;
  getFrameInfo?(): FrameInfo;
  seekFrame?(frame: number): void;

  // Returns true if the adapter wants to control the camera (e.g. demo playback)
  hasCameraControl?(): boolean;
  // Get the camera position/angles from the adapter if it controls the camera
  getCameraUpdate?(): { position: vec3; angles: vec3 };
  // Set the camera mode for the adapter
  setCameraMode?(mode: CameraMode): void;

  // Returns true if the adapter requires Z-up coordinate system (e.g. BSP/DM2)
  useZUp?(): boolean;

  // Set hidden classes for visibility toggling
  setHiddenClasses?(hidden: Set<string>): void;

  // Picking
  pickEntity?(ray: Ray): any;
  setHoveredEntity?(entity: any): void;

  // Debugging
  setDebugMode?(mode: DebugMode): void;

  // Demo Playback
  getDemoController?(): DemoPlaybackController | null;

  // Lightmap info (BSP specific, but useful to expose optionally)
  getLightmapInfo?(atlasIndex: number): { width: number; height: number; surfaceCount: number };
}
