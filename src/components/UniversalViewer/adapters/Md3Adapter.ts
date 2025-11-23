import { Camera, Md3ModelMesh, Md3Pipeline } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { ViewerAdapter } from './types';
import { mat4 } from 'gl-matrix';

export class Md3Adapter implements ViewerAdapter {
  private pipeline: Md3Pipeline | null = null;
  private modelMesh: Md3ModelMesh | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type !== 'md3') throw new Error('Invalid file type for Md3Adapter');

    this.pipeline = new Md3Pipeline(gl);
    this.modelMesh = new Md3ModelMesh(gl, file.model);
  }

  update(deltaTime: number): void {
    // Update model mesh animation state
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void {
    if (!this.pipeline || !this.modelMesh) return;

    const projection = camera.projectionMatrix;
    const mvp = mat4.create();
    mat4.multiply(mvp, projection as mat4, viewMatrix);

    // Placeholder render logic
  }

  cleanup(): void {
  }
}
