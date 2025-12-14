import { Camera, DemoPlaybackController } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { ViewerAdapter } from './types';
import { mat4, vec3 } from 'gl-matrix';
import { BspAdapter } from './BspAdapter';

export class Dm2Adapter implements ViewerAdapter {
  private controller: DemoPlaybackController | null = null;
  private bspAdapter: BspAdapter | null = null;
  private isPlayingState = false;
  private cameraPosition = vec3.create();
  private cameraAngles = vec3.create();

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

    // Always update camera state from controller
    const frameIdx = this.controller.getCurrentFrame();
    const frameData = this.controller.getFrameData(frameIdx);

    if (frameData && frameData.playerState) {
         if (frameData.playerState.origin) vec3.copy(this.cameraPosition, frameData.playerState.origin as any);
         if (frameData.playerState.viewangles) vec3.copy(this.cameraAngles, frameData.playerState.viewangles as any);
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

  hasCameraControl() { return true; }
  getCameraUpdate() {
      return { position: this.cameraPosition, angles: this.cameraAngles };
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
}
