import { Camera, BspSurfacePipeline, createBspSurfaces, buildBspGeometry, Texture2D, parseWal, walToRgba, BspGeometryBuildResult, resolveLightStyles, applySurfaceState, BspMap, BspSurfaceInput, BspEntity } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter, Ray } from './types';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { DebugMode } from '@/src/types/debugMode';
import { DebugRenderer } from './DebugRenderer';

export class BspAdapter implements ViewerAdapter {
  private pipeline: BspSurfacePipeline | null = null;
  private geometry: BspGeometryBuildResult | null = null;
  private textures: Map<string, Texture2D> = new Map();
  private map: BspMap | null = null;
  private surfaces: BspSurfaceInput[] = [];
  private gl: WebGL2RenderingContext | null = null;
  private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };
  private hiddenClassnames: Set<string> = new Set();
  private hoveredEntity: BspEntity | null = null;
  private debugMode: DebugMode = DebugMode.None;
  private debugRenderer: DebugRenderer | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type === 'bsp') {
        this.map = file.map;
    } else {
        throw new Error('Invalid file type for BspAdapter');
    }

    await this.loadMap(gl, this.map, pakService);
  }

  async loadMap(gl: WebGL2RenderingContext, map: BspMap, pakService: PakService) {
    this.gl = gl;
    this.map = map;
    this.pipeline = new BspSurfacePipeline(gl);
    this.debugRenderer = new DebugRenderer(gl);
    this.surfaces = createBspSurfaces(map);
    this.geometry = buildBspGeometry(gl, this.surfaces, map, { hiddenClassnames: this.hiddenClassnames });

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

  pickEntity(ray: Ray): { entity: BspEntity; model: any; distance: number } | null {
    if (!this.map) return null;
    return this.map.pickEntity(ray);
  }

  setHoveredEntity(entity: BspEntity | null) {
      this.hoveredEntity = entity;
  }

  setDebugMode(mode: DebugMode) {
      this.debugMode = mode;
  }

  private getModelFromEntity(entity: BspEntity): any {
      if (!this.map || !entity) return null;

      if (entity.classname === 'worldspawn') {
          return this.map.models[0];
      }

      if (entity.properties && entity.properties.model && entity.properties.model.startsWith('*')) {
          const modelIndex = parseInt(entity.properties.model.substring(1));
          if (!isNaN(modelIndex) && modelIndex >= 0 && modelIndex < this.map.models.length) {
              return this.map.models[modelIndex];
          }
      }
      return null;
  }

  render(gl: WebGL2RenderingContext, camera: Camera, viewMatrix: mat4): void {
    if (!this.pipeline || !this.geometry) return;

    const projection = camera.projectionMatrix;
    const mvp = mat4.create();
    mat4.multiply(mvp, projection as mat4, viewMatrix);

    const lightStyles = resolveLightStyles();
    const styleValues = Array.from(lightStyles);
    const timeSeconds = performance.now() / 1000;

    const hoveredModel = this.hoveredEntity ? this.getModelFromEntity(this.hoveredEntity) : null;

    // Normal Rendering Loop
    for (let i = 0; i < this.geometry.surfaces.length; i++) {
        const surface = this.geometry.surfaces[i];
        const inputSurface = this.surfaces[i];

        let isHighlighted = false;
        if (hoveredModel) {
             if (inputSurface.faceIndex >= hoveredModel.firstFace && inputSurface.faceIndex < hoveredModel.firstFace + hoveredModel.numFaces) {
                 isHighlighted = true;
             }
        }

        const texture = this.textures.get(surface.texture);
        if (texture && this.debugMode !== DebugMode.Lightmaps) {
            gl.activeTexture(gl.TEXTURE0);
            texture.bind();
        } else if (this.debugMode === DebugMode.Lightmaps) {
             // Use a white texture for lightmap mode to show only lighting
             const whiteTex = new Texture2D(gl); // Ideally cached
             whiteTex.bind(); // Placeholder logic
             // Real implementation should bind a white texture
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
            timeSeconds: timeSeconds,
            renderMode: {
                mode: isHighlighted ? 'solid' : this.renderOptions.mode,
                color: isHighlighted ? [1.0, 0.0, 0.0, 1.0] : [...this.renderOptions.color, 1.0],
                applyToAll: true,
                generateRandomColor: isHighlighted ? false : this.renderOptions.generateRandomColor,
            }
        });

        applySurfaceState(gl, state);

        surface.vao.bind();
        const drawMode = this.renderOptions.mode === 'wireframe' ? gl.LINES : gl.TRIANGLES;
        gl.drawElements(drawMode, surface.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    // Debug Rendering
    if (this.debugMode !== DebugMode.None && this.debugRenderer && this.map) {
        this.debugRenderer.clear();

        if (this.debugMode === DebugMode.BoundingBoxes) {
            this.map.entities.entities.forEach(entity => {
                const model = this.getModelFromEntity(entity);
                if (model) {
                    this.debugRenderer?.addBox(model.min, model.max, vec4.fromValues(0, 1, 0, 1));
                }
            });
        }

        if (this.debugMode === DebugMode.Normals) {
             this.surfaces.forEach(surface => {
                 if (surface.plane) {
                     // Approximate face center
                     // This requires vertex access which we don't easily have here without reprocessing
                     // For BSP, we can use the plane normal and distance to visualize plane normals
                     // Or iterate edges
                 }
             });
        }

        if (this.debugMode === DebugMode.PVS) {
            // Visualize visible clusters from camera position
            const camPos = camera.position;
            const leaf = this.map.findLeaf(camPos as any);
            if (leaf && leaf.cluster !== -1) {
                const pvs = this.map.pvs[leaf.cluster];
                 // Iterate clusters and draw boxes for leaves in visible clusters
                 // This is expensive, so simplified visualization:
                 // Draw the current leaf box
                 this.debugRenderer.addBox(leaf.min, leaf.max, vec4.fromValues(1, 1, 0, 1));
            }
        }

         if (this.debugMode === DebugMode.Collision) {
            // Draw collision hulls (head nodes)
            // Simplified: Draw head node boxes
         }

        this.debugRenderer.render(mvp);
    }
  }

  cleanup(): void {
    this.textures.forEach(t => {
      // t.dispose()?
    });
    this.textures.clear();
  }

  getUniqueClassnames(): string[] {
    return this.map?.entities.getUniqueClassnames() ?? [];
  }

  useZUp() { return true; }

  setRenderOptions(options: RenderOptions) {
    this.renderOptions = options;
  }

  setHiddenClasses(hidden: Set<string>) {
    this.hiddenClassnames = hidden;
    if (this.gl && this.map && this.surfaces.length > 0) {
        this.geometry = buildBspGeometry(this.gl, this.surfaces, this.map, { hiddenClassnames: hidden });
    }
  }
}
