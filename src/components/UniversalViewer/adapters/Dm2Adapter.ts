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

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'dm2') throw new Error('Invalid file type for Dm2Adapter');

    this.controller = new DemoPlaybackController();
    const buffer = file.data.buffer.slice(file.data.byteOffset, file.data.byteOffset + file.data.byteLength);
    this.controller.loadDemo(buffer);

    // Attempt to load map
    // Heuristic: Use same name as demo file
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
    if (this.controller && this.isPlayingState) {
        this.controller.update(deltaTime);
        const state = this.controller.getState() as any;
        if (state) {
            if (state.origin) vec3.copy(this.cameraPosition, state.origin);
            if (state.viewangles) vec3.copy(this.cameraAngles, state.viewangles);
            else if (state.angles) vec3.copy(this.cameraAngles, state.angles);
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

  play() { this.controller?.play(); this.isPlayingState = true; }
  pause() { this.controller?.pause(); this.isPlayingState = false; }
  isPlaying() { return this.isPlayingState; }

  hasCameraControl() { return true; }
  getCameraUpdate() {
      return { position: this.cameraPosition, angles: this.cameraAngles };
  }

  useZUp() { return true; }
}
