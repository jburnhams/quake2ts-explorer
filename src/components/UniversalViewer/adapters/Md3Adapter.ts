import { Camera, Md3Model, Md3ModelMesh, Md3Pipeline, parsePcx, pcxToRgba, Texture2D } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter } from './types';
import { mat4 } from 'gl-matrix';

export class Md3Adapter implements ViewerAdapter {
  private pipeline: Md3Pipeline | null = null;
  private modelMesh: Md3ModelMesh | null = null;
  private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };
  private skinTexture: Texture2D | null = null;
  private model: Md3Model | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'md3') throw new Error('Invalid file type for Md3Adapter');

    this.pipeline = new Md3Pipeline(gl);
    // Pass dummy args for frame and lerp if required by constructor length 4
    // @ts-ignore - Assuming constructor signature based on length check
    this.modelMesh = new Md3ModelMesh(gl, file.model, 0, 0);
    this.model = file.model;

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
    // Update model mesh animation state
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void {
    if (!this.pipeline || !this.modelMesh) return;

    const projection = camera.projectionMatrix;
    const mvp = mat4.create();
    mat4.multiply(mvp, projection as mat4, viewMatrix);

    if (this.skinTexture) {
      gl.activeTexture(gl.TEXTURE0);
      this.skinTexture.bind();
    }

    this.pipeline.bind({
      modelViewProjection: mvp as any,
      lightDirection: [0.5, 1.0, 0.3],
      tint: [1.0, 1.0, 1.0, 1.0],
      diffuseSampler: 0,
      renderMode: {
        mode: this.renderOptions.mode,
        color: [...this.renderOptions.color, 1.0],
        applyToAll: true,
      }
    });

    this.modelMesh.bind();
    const drawMode = this.renderOptions.mode === 'wireframe' ? gl.LINES : gl.TRIANGLES;
    gl.drawElements(drawMode, this.modelMesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  cleanup(): void {
  }

  setRenderOptions(options: RenderOptions) {
    this.renderOptions = options;
  }
}
