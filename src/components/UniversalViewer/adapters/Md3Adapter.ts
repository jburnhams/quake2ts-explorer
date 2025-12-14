import { Camera, Md3Model, Md3ModelMesh, Md3Pipeline, parsePcx, pcxToRgba, Texture2D, Md3Surface, Md3SurfaceMesh } from 'quake2ts/engine';

import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter, AnimationInfo, FrameInfo } from './types';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { DebugMode } from '@/src/types/debugMode';
import { DebugRenderer } from './DebugRenderer';

export class Md3Adapter implements ViewerAdapter {
  private pipeline: Md3Pipeline | null = null;
  private surfaces: Map<string, { mesh: Md3SurfaceMesh, name: string }> = new Map();
  private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };
  private skinTextures: Map<string, Texture2D> = new Map();
  private model: Md3Model | null = null;
  private debugMode: DebugMode = DebugMode.None;
  private debugRenderer: DebugRenderer | null = null;

  private currentFrame = 0;
  private isPlayingState = true;
  private animSpeed = 1.0;
  private totalFrames = 0;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'md3') throw new Error('Invalid file type for Md3Adapter');

    this.pipeline = new Md3Pipeline(gl);
    this.debugRenderer = new DebugRenderer(gl);
    this.model = file.model;
    this.totalFrames = this.model.header.numFrames;

    this.model.surfaces.forEach(surface => {
      this.surfaces.set(surface.name, {
        mesh: new Md3SurfaceMesh(gl, surface, { frame0: 0, frame1: 0, lerp: 0 }),
        name: surface.name
      });
    });

    const neededTextures = new Set<string>();
    this.model.surfaces.forEach(s => {
      s.shaders.forEach(shader => neededTextures.add(shader.name));
    });

    const promises = Array.from(neededTextures).map(async name => {
      if (pakService.hasFile(name)) {
        try {
          const data = await pakService.readFile(name);
          const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
          const pcx = parsePcx(buffer);
          const rgba = pcxToRgba(pcx);
          const tex = new Texture2D(gl);
          tex.bind();
          tex.setParameters({
            minFilter: gl.LINEAR_MIPMAP_LINEAR,
            magFilter: gl.LINEAR,
            wrapS: gl.REPEAT,
            wrapT: gl.REPEAT
          });
          tex.uploadImage(0, gl.RGBA, pcx.width, pcx.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
          gl.generateMipmap(gl.TEXTURE_2D);
          this.skinTextures.set(name, tex);
        } catch (e) {
          console.warn('Failed to load skin:', e);
        }
      }
    });

    await Promise.all(promises);
  }

  update(deltaTime: number): void {
    if (this.isPlayingState && this.totalFrames > 0) {
      this.currentFrame += deltaTime * 30 * this.animSpeed;
      while (this.currentFrame >= this.totalFrames) {
        this.currentFrame -= this.totalFrames;
      }
    }

    const frame0 = Math.floor(this.currentFrame);
    const frame1 = (frame0 + 1) % this.totalFrames;
    const lerp = this.currentFrame - frame0;
    const blend = { frame0, frame1, lerp };

    for (const [name, data] of this.surfaces) {
      const surface = this.model?.surfaces.find(s => s.name === name);
      if (surface) {
        data.mesh.update(surface, blend);
      }
    }
  }

  setDebugMode(mode: DebugMode) {
      this.debugMode = mode;
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void {
    if (!this.pipeline || this.surfaces.size === 0) return;

    const projection = camera.projectionMatrix;
    const mvp = mat4.create();
    mat4.multiply(mvp, projection as mat4, viewMatrix);

    this.pipeline.bind(mvp as any);

    for (const surface of this.surfaces.values()) {
      const modelSurface = this.model?.surfaces.find(s => s.name === surface.name);
      const textureName = modelSurface?.shaders[0]?.name;
      const texture = textureName ? this.skinTextures.get(textureName) : null;
      if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        texture.bind();
      }

      this.pipeline.drawSurface(surface.mesh, {
        diffuseSampler: 0,
        renderMode: {
          mode: this.renderOptions.mode,
          color: [...this.renderOptions.color, 1.0],
          applyToAll: true,
          generateRandomColor: this.renderOptions.generateRandomColor,
        }
      });
    }

    // Debug Rendering
    if (this.debugMode !== DebugMode.None && this.debugRenderer) {
        this.debugRenderer.clear();

        if (this.debugMode === DebugMode.BoundingBoxes) {
            // MD3 frames have bounds. We can use the current frame's bounds.
            const frameIndex = Math.floor(this.currentFrame);
            if (this.model && frameIndex >= 0 && frameIndex < this.model.frames.length) {
                const frame = this.model.frames[frameIndex];
                // Frame bounds are min/max.
                const min = vec3.fromValues(frame.minBounds[0], frame.minBounds[1], frame.minBounds[2]);
                const max = vec3.fromValues(frame.maxBounds[0], frame.maxBounds[1], frame.maxBounds[2]);
                this.debugRenderer.addBox(min, max, vec4.fromValues(0, 1, 0, 1));
            } else {
                 this.debugRenderer.addBox(vec3.fromValues(-20, -20, 0), vec3.fromValues(20, 20, 60), vec4.fromValues(0, 1, 0, 1));
            }
        }

        this.debugRenderer.render(mvp);
    }
  }

  cleanup(): void {
  }

  setRenderOptions(options: RenderOptions) {
    this.renderOptions = options;
  }

  play() { this.isPlayingState = true; }
  pause() { this.isPlayingState = false; }
  isPlaying() { return this.isPlayingState; }
  setSpeed(speed: number) { this.animSpeed = speed; }

  getAnimations(): AnimationInfo[] {
    return [{
      name: 'All Frames',
      firstFrame: 0,
      lastFrame: this.totalFrames - 1,
      fps: 30
    }];
  }

  setAnimation(name: string): void {
    this.currentFrame = 0;
    this.isPlayingState = true;
  }

  getFrameInfo(): FrameInfo {
    return {
      currentFrame: Math.floor(this.currentFrame),
      totalFrames: this.totalFrames,
      interpolatedFrame: this.currentFrame
    };
  }

  seekFrame(frame: number): void {
    this.currentFrame = Math.max(0, Math.min(this.totalFrames - 0.001, frame));
  }
}
