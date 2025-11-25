import { Camera, BspSurfacePipeline, createBspSurfaces, buildBspGeometry, Texture2D, parseWal, walToRgba, BspGeometryBuildResult, resolveLightStyles, applySurfaceState, BspMap } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { ViewerAdapter, RenderingOptions } from './types';
import { mat4 } from 'gl-matrix';

export class BspAdapter implements ViewerAdapter {
  private pipeline: BspSurfacePipeline | null = null;
  private geometry: BspGeometryBuildResult | null = null;
  private textures: Map<string, Texture2D> = new Map();
  private map: BspMap | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type === 'bsp') {
        this.map = file.map;
    } else {
        throw new Error('Invalid file type for BspAdapter');
    }

    await this.loadMap(gl, this.map, pakService);
  }

  async loadMap(gl: WebGL2RenderingContext, map: BspMap, pakService: PakService) {
    this.map = map;
    this.pipeline = new BspSurfacePipeline(gl);
    const surfaces = createBspSurfaces(map);
    this.geometry = buildBspGeometry(gl, surfaces);

    const neededTextures = new Set<string>();
    this.geometry.surfaces.forEach(s => neededTextures.add(s.texture));

    const promises = Array.from(neededTextures).map(async name => {
        const path = `textures/${name}.wal`;
        if (pakService.hasFile(path)) {
            try {
                const data = await pakService.readFile(path);
                const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
                const wal = parseWal(buffer);
                const palette = pakService.getPalette();
                if (palette) {
                     const prepared = walToRgba(wal, palette);
                     const tex = new Texture2D(gl);
                     tex.bind();
                     tex.setParameters({
                         minFilter: gl.LINEAR_MIPMAP_LINEAR,
                         magFilter: gl.LINEAR,
                         wrapS: gl.REPEAT,
                         wrapT: gl.REPEAT
                     });
                     if (prepared.levels.length > 0) {
                         const level0 = prepared.levels[0];
                         tex.uploadImage(0, gl.RGBA, level0.width, level0.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, level0.rgba);
                         gl.generateMipmap(gl.TEXTURE_2D);
                         this.textures.set(name, tex);
                     }
                }
            } catch (e) {
                console.warn(`Failed to load texture ${name}`, e);
            }
        }
    });
    await Promise.all(promises);
  }

  update(deltaTime: number): void {
    // Static map
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4, options: RenderingOptions): void {
    if (!this.pipeline || !this.geometry) return;

    const projection = camera.projectionMatrix;
    const mvp = mat4.create();
    mat4.multiply(mvp, projection as mat4, viewMatrix);

    const lightStyles = resolveLightStyles();
    const styleValues = Array.from(lightStyles);
    const timeSeconds = performance.now() / 1000;

    for (const surface of this.geometry.surfaces) {
        const texture = this.textures.get(surface.texture);
        if (texture) {
            gl.activeTexture(gl.TEXTURE0);
            texture.bind();
        }

        if (surface.lightmap) {
             const atlas = this.geometry.lightmaps[surface.lightmap.atlasIndex];
             if (atlas) {
                 gl.activeTexture(gl.TEXTURE1);
                 atlas.texture.bind();
             }
        }

        const state = this.pipeline.bind({
            modelViewProjection: mvp as any,
            diffuseSampler: 0,
            lightmapSampler: 1,
            styleValues: styleValues,
            surfaceFlags: surface.surfaceFlags,
            timeSeconds: timeSeconds
        });

        applySurfaceState(gl, state);

        surface.vao.bind();
        gl.drawElements(gl.TRIANGLES, surface.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  cleanup(): void {
    this.textures.forEach(t => {
      // t.dispose()?
    });
    this.textures.clear();
  }

  useZUp() { return true; }
}
