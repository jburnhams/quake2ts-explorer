import { Camera, Md2Model, Md2Pipeline, Md2MeshBuffers, createAnimationState, advanceAnimation, computeFrameBlend, parsePcx, pcxToRgba, Texture2D, Md2FrameBlend, AnimationSequence, Md2Animation } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { ViewerAdapter, RenderingOptions } from './types';
import { mat4 } from 'gl-matrix';

export class Md2Adapter implements ViewerAdapter {
  private pipeline: Md2Pipeline | null = null;
  private meshBuffers: Md2MeshBuffers | null = null;
  private skinTexture: Texture2D | null = null;
  private animState: any = null;
  private model: Md2Model | null = null;
  private animations: Md2Animation[] = [];
  private isPlayingState = true;
  private animSpeed = 1.0;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'md2') throw new Error('Invalid file type for Md2Adapter');

    this.model = file.model;
    this.animations = file.animations;

    this.pipeline = new Md2Pipeline(gl);
    const initialBlend: Md2FrameBlend = { frame0: 0, frame1: 0, lerp: 0.0 };
    this.meshBuffers = new Md2MeshBuffers(gl, this.model, initialBlend);

    // If we have animations, setup the first one
    if (this.animations.length > 0) {
      const sequence: AnimationSequence = {
        name: this.animations[0].name,
        start: this.animations[0].firstFrame,
        end: this.animations[0].lastFrame,
        fps: 9,
        loop: true
      };
      this.animState = createAnimationState(sequence);
    }

    if (this.model.skins.length > 0) {
      const skinPath = this.model.skins[0].name;
      if (pakService.hasFile(skinPath)) {
        try {
          const data = await pakService.readFile(skinPath);
          const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
          const pcx = parsePcx(buffer);
          const rgba = pcxToRgba(pcx);
          this.skinTexture = new Texture2D(gl);
          this.skinTexture.bind();
          this.skinTexture.setParameters({
            minFilter: gl.LINEAR_MIPMAP_LINEAR,
            magFilter: gl.LINEAR,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT
          });
          this.skinTexture.uploadImage(0, gl.RGBA, pcx.width, pcx.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
          gl.generateMipmap(gl.TEXTURE_2D);
        } catch (e) {
          console.warn('Failed to load skin:', e);
        }
      }
    }
  }

  update(deltaTime: number): void {
    if (this.isPlayingState && this.animState) {
      this.animState = advanceAnimation(this.animState, deltaTime * this.animSpeed);
    }
    if (this.meshBuffers && this.model && this.animState) {
       const frameBlend = computeFrameBlend(this.animState);
       this.meshBuffers.update(this.model, frameBlend);
    }
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4, options: RenderingOptions): void {
    if (!this.pipeline || !this.meshBuffers) return;

    if (this.skinTexture) {
      gl.activeTexture(gl.TEXTURE0);
      this.skinTexture.bind();
    }

    const projection = camera.projectionMatrix;
    const mvp = mat4.create();
    mat4.multiply(mvp, projection as mat4, viewMatrix);

    this.pipeline.bind({
      modelViewProjection: mvp as any,
      lightDirection: [0.5, 1.0, 0.3],
      tint: [1.0, 1.0, 1.0, 1.0],
      diffuseSampler: 0
    });

    this.pipeline.draw(this.meshBuffers, {
        mode: options.fillMode === 'wireframe' ? 'wireframe' : options.fillMode === 'solid' ? 'solid' : 'textured',
        applyToAll: true,
        color: options.solidColor ? [...options.solidColor, 1.0] : undefined
    });
  }

  cleanup(): void {
    // No-op
  }

  play() { this.isPlayingState = true; }
  pause() { this.isPlayingState = false; }
  isPlaying() { return this.isPlayingState; }
  setSpeed(speed: number) { this.animSpeed = speed; }
}
