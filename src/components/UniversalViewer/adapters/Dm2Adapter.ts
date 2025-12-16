import { Camera, DemoPlaybackController } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { ViewerAdapter } from './types';
import { mat4, vec3 } from 'gl-matrix';
import { BspAdapter } from './BspAdapter';
import { CameraMode } from '@/src/types/cameraMode';
import { OrbitState, FreeCameraState, updateFreeCamera, computeCameraPosition } from '@/src/utils/cameraUtils';
import { CameraSettings, DEFAULT_CAMERA_SETTINGS } from '@/src/types/CameraSettings';
import { CinematicPath, PathInterpolator, CameraKeyframe } from '@/src/utils/cameraPath';

export class Dm2Adapter implements ViewerAdapter {
  private controller: DemoPlaybackController | null = null;
  private bspAdapter: BspAdapter | null = null;
  private isPlayingState = false;
  private cameraPosition = vec3.create();
  private cameraAngles = vec3.create();
  private cameraMode: CameraMode = CameraMode.FirstPerson;

  // Camera states
  private freeCamera: FreeCameraState = { position: vec3.create(), rotation: vec3.create() };
  private orbitCamera: OrbitState = { radius: 200, theta: 0, phi: Math.PI / 4, target: vec3.create() };
  private cameraSettings: CameraSettings = DEFAULT_CAMERA_SETTINGS;

  // Cinematic Path
  private cinematicPath: CinematicPath | null = null;
  private pathInterpolator: PathInterpolator | null = null;

  // Smooth stepping
  private isStepping = false;
  private stepTargetTime = 0;
  private stepStartFrameTime = 0; // The time at start of step
  private stepProgress = 0;
  private stepDuration = 0.2; // 200ms animation for step

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'dm2') throw new Error('Invalid file type for Dm2Adapter');

    this.controller = new DemoPlaybackController();
    const buffer = file.data.buffer.slice(file.data.byteOffset, file.data.byteOffset + file.data.byteLength) as ArrayBuffer;
    this.demoBuffer = buffer; // Store for extraction
    this.controller.loadDemo(buffer);

    // Attempt to load map
    let mapPath = 'maps/demo1.bsp';
    const parts = filePath.split('/');
    const filename = parts[parts.length - 1];
    const name = filename.split('.')[0];
    const potentialMap = `maps/${name}.bsp`;

    if (pakService.hasFile(potentialMap)) {
        mapPath = potentialMap;
    }

    if (pakService.hasFile(mapPath)) {
         try {
             const mapFile = await pakService.parseFile(mapPath);
             if (mapFile.type === 'bsp') {
                 this.bspAdapter = new BspAdapter();
                 await this.bspAdapter.loadMap(gl, mapFile.map, pakService);
             } else {
                console.warn('Map file is not a valid BSP:', mapPath);
             }
         } catch (e) {
             console.warn('Failed to load map for demo', e);
         }
    } else {
        console.warn('Map file not found:', mapPath);
    }

    this.controller.play();
    this.isPlayingState = true;
  }

  update(deltaTime: number): void {
    if (!this.controller) return;

    if (this.isStepping) {
        this.stepProgress += deltaTime;
        if (this.stepProgress >= this.stepDuration) {
            this.stepProgress = this.stepDuration;
            this.isStepping = false;
            this.controller.seekToTime(this.stepTargetTime);
        } else {
            const t = this.stepProgress / this.stepDuration;
            // Ease out cubic
            const ease = 1 - Math.pow(1 - t, 3);
            const currentTime = this.stepStartFrameTime + (this.stepTargetTime - this.stepStartFrameTime) * ease;
            this.controller.seekToTime(currentTime);
        }
    } else if (this.isPlayingState) {
        this.controller.update(deltaTime);
    }

    // Update camera state
    const frameIdx = this.controller.getCurrentFrame();
    const frameData = this.controller.getFrameData(frameIdx);

    if (frameData && frameData.playerState) {
        const playerOrigin = frameData.playerState.origin as any;
        const playerAngles = frameData.playerState.viewangles as any;

        switch (this.cameraMode) {
            case CameraMode.FirstPerson:
                if (playerOrigin) vec3.copy(this.cameraPosition, playerOrigin);
                if (playerAngles) vec3.copy(this.cameraAngles, playerAngles);
                // Adjust for view height (Quake 2 is typically ~22 units up)
                this.cameraPosition[2] += 22;
                break;

            case CameraMode.ThirdPerson:
                if (playerOrigin && playerAngles) {
                    const viewOffset = vec3.create();

                    // Convert angles to radians
                    const pitch = playerAngles[0] * (Math.PI / 180);
                    const yaw = playerAngles[1] * (Math.PI / 180);

                    // Calculate backward vector
                    // Z-up: yaw rotates around Z
                    // forward x = cos(yaw) * cos(pitch)
                    // forward y = sin(yaw) * cos(pitch)
                    // forward z = sin(pitch)

                    const forward = vec3.fromValues(
                        Math.cos(yaw) * Math.cos(pitch),
                        Math.sin(yaw) * Math.cos(pitch),
                        Math.sin(pitch)
                    );

                    // Move camera back along negative forward vector
                    vec3.scale(viewOffset, forward, -this.cameraSettings.thirdPersonDistance);
                    vec3.add(this.cameraPosition, playerOrigin, viewOffset);
                    this.cameraPosition[2] += 22; // Add eye height

                    vec3.copy(this.cameraAngles, playerAngles);
                }
                break;

            case CameraMode.Free:
                 // Handled by updateFreeCamera in UI or external input,
                 // but here we just use stored freeCamera state
                 vec3.copy(this.cameraPosition, this.freeCamera.position);
                 // Convert rotation (radians) back to degrees for cameraAngles if needed by renderer
                 // But engine camera usually expects something else?
                 // Actually Dm2Adapter.getCameraUpdate returns angles.
                 // UniversalViewer applies them to camera.angles.
                 // Engine Camera uses angles in degrees.

                 // FreeCameraState uses radians [pitch, yaw, roll]
                 this.cameraAngles[0] = this.freeCamera.rotation[0] * (180 / Math.PI);
                 this.cameraAngles[1] = this.freeCamera.rotation[1] * (180 / Math.PI);
                 this.cameraAngles[2] = this.freeCamera.rotation[2] * (180 / Math.PI);
                 break;

            case CameraMode.Orbital:
                 if (playerOrigin) {
                     this.orbitCamera.target = vec3.clone(playerOrigin);
                     // computeCameraPosition assumes Y-up usually in utils, but we have a Z-up helper in UniversalViewer.
                     // We should reimplement Z-up orbit here.
                     const x = this.orbitCamera.radius * Math.sin(this.orbitCamera.phi) * Math.cos(this.orbitCamera.theta);
                     const y = this.orbitCamera.radius * Math.sin(this.orbitCamera.phi) * Math.sin(this.orbitCamera.theta);
                     const z = this.orbitCamera.radius * Math.cos(this.orbitCamera.phi);

                     vec3.set(this.cameraPosition,
                        playerOrigin[0] + x,
                        playerOrigin[1] + y,
                        playerOrigin[2] + z
                     );

                     // Look at target
                     const lookDir = vec3.create();
                     vec3.subtract(lookDir, this.orbitCamera.target, this.cameraPosition);
                     vec3.normalize(lookDir, lookDir);

                     // Convert lookDir to angles (pitch, yaw)
                     // Z-up:
                     // yaw = atan2(y, x)
                     // pitch = asin(z)

                     const yawRad = Math.atan2(lookDir[1], lookDir[0]);
                     const pitchRad = Math.asin(lookDir[2]);

                     this.cameraAngles[0] = pitchRad * (180 / Math.PI);
                     this.cameraAngles[1] = yawRad * (180 / Math.PI);
                     this.cameraAngles[2] = 0;
                 }
                 break;

            case CameraMode.Cinematic:
                 if (this.pathInterpolator) {
                     // Get time from controller
                     const time = this.controller.getCurrentTime();
                     this.pathInterpolator.getStateAtTime(time, this.cameraPosition, this.cameraAngles);
                 } else {
                     // Fallback to first person if no path
                     if (playerOrigin) vec3.copy(this.cameraPosition, playerOrigin);
                     if (playerAngles) vec3.copy(this.cameraAngles, playerAngles);
                 }
                 break;
        }
    }

    if (this.bspAdapter) {
        this.bspAdapter.update(deltaTime);
    }
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void {
      if (this.bspAdapter) {
          this.bspAdapter.render(gl, camera, viewMatrix);
      }
  }

  cleanup(): void {
      this.bspAdapter?.cleanup();
      this.controller?.stop();
  }

  play() {
      this.isStepping = false;
      this.controller?.play();
      this.isPlayingState = true;
  }

  pause() {
      this.isStepping = false;
      this.controller?.pause();
      this.isPlayingState = false;
  }

  isPlaying() { return this.isPlayingState; }

  getDuration() { return this.controller?.getDuration() || 0; }
  getCurrentTime() { return this.controller?.getCurrentTime() || 0; }
  getDemoController() { return this.controller; }

  hasCameraControl() {
      return this.cameraMode === CameraMode.FirstPerson ||
             this.cameraMode === CameraMode.ThirdPerson ||
             this.cameraMode === CameraMode.Cinematic;
  }

  getCameraUpdate() {
      return { position: this.cameraPosition, angles: this.cameraAngles };
  }

  setCameraMode(mode: CameraMode) {
      this.cameraMode = mode;
      // Note: Logic for initializing free/orbit camera state when switching is now handled by UniversalViewer
  }

  setCameraSettings(settings: CameraSettings) {
      this.cameraSettings = settings;
      if (this.controller) {
          // If we support adjusting playback speed for cinematic mode here, we could use settings.cinematicSpeed
          // But controller playback speed is usually handled by UI "Speed" slider.
          // However, we could enforce cinematic speed if in cinematic mode.
          if (this.cameraMode === CameraMode.Cinematic) {
              this.controller.setSpeed(settings.cinematicSpeed);
          }
      }
  }

  setCinematicPath(path: CinematicPath | null) {
      this.cinematicPath = path;
      this.pathInterpolator = path ? new PathInterpolator(path) : null;
  }

  useZUp() { return true; }

  stepForward(frames: number = 1) {
      if (!this.controller) return;

      this.pause();

      const current = this.controller.getCurrentTime();
      const totalFrames = this.controller.getFrameCount();
      const duration = this.controller.getDuration();
      const avgFrameTime = totalFrames > 0 ? duration / totalFrames : 0.1;

      this.stepStartFrameTime = current;
      this.stepTargetTime = Math.min(duration, current + (frames * avgFrameTime));
      this.stepProgress = 0;
      this.isStepping = true;
  }

  stepBackward(frames: number = 1) {
      if (!this.controller) return;

      this.pause();

      const current = this.controller.getCurrentTime();
      const totalFrames = this.controller.getFrameCount();
      const duration = this.controller.getDuration();
      const avgFrameTime = totalFrames > 0 ? duration / totalFrames : 0.1;

      this.stepStartFrameTime = current;
      this.stepTargetTime = Math.max(0, current - (frames * avgFrameTime));
      this.stepProgress = 0;
      this.isStepping = true;
  }

  getDemoBuffer(): ArrayBuffer | null {
      // Need to expose the internal buffer from the controller if possible.
      // Since controller doesn't expose it via public API, we might need to store it when loading.
      // But we can store a reference during load().
      return this.demoBuffer;
  }

  private demoBuffer: ArrayBuffer | null = null;
}
