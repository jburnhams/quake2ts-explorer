import { Camera, Md2Model, Md2Pipeline, Md2MeshBuffers, createAnimationState, advanceAnimation, computeFrameBlend, parsePcx, pcxToRgba, Texture2D, Md2FrameBlend, AnimationSequence, Md2Animation } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter, AnimationInfo, FrameInfo } from './types';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { DebugMode } from '@/src/types/debugMode';
import { DebugRenderer } from './DebugRenderer';

export class Md2Adapter implements ViewerAdapter {
  private pipeline: Md2Pipeline | null = null;
  private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };
  private meshBuffers: Md2MeshBuffers | null = null;
  private skinTexture: Texture2D | null = null;
  private animState: any = null;
  private model: Md2Model | null = null;
  private animations: Md2Animation[] = [];
  private isPlayingState = true;
  private animSpeed = 1.0;
  private debugMode: DebugMode = DebugMode.None;
  private debugRenderer: DebugRenderer | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'md2') throw new Error('Invalid file type for Md2Adapter');

    this.model = file.model;
    this.animations = file.animations;

    this.pipeline = new Md2Pipeline(gl);
    this.debugRenderer = new DebugRenderer(gl);
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

  setDebugMode(mode: DebugMode) {
      this.debugMode = mode;
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void {
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
      diffuseSampler: 0,
      renderMode: {
        mode: this.renderOptions.mode,
        color: [...this.renderOptions.color, 1.0],
        applyToAll: true,
        generateRandomColor: this.renderOptions.generateRandomColor,
      }
    });

    this.meshBuffers.bind();
    const drawMode = this.renderOptions.mode === 'wireframe' ? gl.LINES : gl.TRIANGLES;
    gl.drawElements(drawMode, this.meshBuffers.indexCount, gl.UNSIGNED_SHORT, 0);

    // Debug Rendering
    if (this.debugMode !== DebugMode.None && this.debugRenderer) {
        this.debugRenderer.clear();

        if (this.debugMode === DebugMode.BoundingBoxes) {
            // Simplified: Draw a static box or calculated box from model bounds
            // MD2 frames have explicit translate and scale which define the bounds relative to the compressed vertices.
            // However, getting the exact AABB for the current interpolated frame requires iterating vertices.
            // We can approximate or use the frame's stored bounds if available (unlikely in parsed structure directly exposed).
            // Better to just draw a box that encompasses typical player size for now,
            // or if we had access to the frame header info.

            // NOTE: Ideally we would calculate min/max from vertices here.
            this.debugRenderer.addBox(vec3.fromValues(-24, -24, -24), vec3.fromValues(24, 24, 60), vec4.fromValues(0, 1, 0, 1));
        }

        if (this.debugMode === DebugMode.Normals) {
             // We can access vertices from the meshBuffers if mapped, or re-compute.
             // Visualizing normals is complex without direct vertex access in this loop.
        }

        this.debugRenderer.render(mvp);
    }
  }

  cleanup(): void {
    // No-op
  }

  setRenderOptions(options: RenderOptions) {
    this.renderOptions = options;
  }

  play() { this.isPlayingState = true; }
  pause() { this.isPlayingState = false; }
  isPlaying() { return this.isPlayingState; }
  setSpeed(speed: number) { this.animSpeed = speed; }

  getAnimations(): AnimationInfo[] {
    if (!this.animations) return [];
    return this.animations.map(a => ({
      name: a.name,
      firstFrame: a.firstFrame,
      lastFrame: a.lastFrame,
      fps: 9
    }));
  }

  setAnimation(name: string): void {
    const anim = this.animations.find(a => a.name === name);
    if (anim) {
      const sequence: AnimationSequence = {
        name: anim.name,
        start: anim.firstFrame,
        end: anim.lastFrame,
        fps: 9,
        loop: true
      };
      this.animState = createAnimationState(sequence);
      this.isPlayingState = true;
    }
  }

  getFrameInfo(): FrameInfo {
    if (!this.model) return { currentFrame: 0, totalFrames: 0, interpolatedFrame: 0 };

    if (this.animState) {
      const blend = computeFrameBlend(this.animState);
      return {
        currentFrame: blend.frame0,
        totalFrames: this.model.header.numFrames,
        interpolatedFrame: blend.frame0 + blend.lerp
      };
    }

    return {
      currentFrame: 0,
      totalFrames: this.model.header.numFrames,
      interpolatedFrame: 0
    };
  }

  seekFrame(frame: number): void {
    if (!this.animState) return;

    const seq = this.animState.sequence;
    const targetFrame = Math.max(seq.start, Math.min(seq.end, frame));
    const time = (targetFrame - seq.start) / seq.fps;

    this.animState = {
      sequence: seq,
      time: time
    };
  }
}
