import { Camera, Md3Model, Md3ModelMesh, Md3Pipeline, parsePcx, pcxToRgba, Texture2D, Md3Surface, Md3SurfaceMesh } from 'quake2ts/engine';

import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter } from './types';
import { mat4 } from 'gl-matrix';

export class Md3Adapter implements ViewerAdapter {
  private pipeline: Md3Pipeline | null = null;
  private surfaces: Map<string, { mesh: Md3SurfaceMesh, name: string }> = new Map();
  private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };
  private skinTextures: Map<string, Texture2D> = new Map();
  private model: Md3Model | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'md3') throw new Error('Invalid file type for Md3Adapter');

    this.pipeline = new Md3Pipeline(gl);
    this.model = file.model;

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
    // Update model mesh animation state
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
        }
      });
    }
  }

  cleanup(): void {
  }

  setRenderOptions(options: RenderOptions) {
    this.renderOptions = options;
  }
}
