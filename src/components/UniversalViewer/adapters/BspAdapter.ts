import { Camera, BspSurfacePipeline, createBspSurfaces, buildBspGeometry, Texture2D, parseWal, walToRgba, BspGeometryBuildResult, resolveLightStyles, applySurfaceState, BspMap, BspSurfaceInput, BspEntity, findLeafForPoint } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter, Ray } from './types';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { DebugMode } from '@/src/types/debugMode';
import { DebugRenderer } from './DebugRenderer';
import { GizmoRenderer } from './GizmoRenderer';
import { TransformAxis, TransformMode } from '@/src/utils/transformUtils';
import { getSurfaceFlagNames } from '@/src/utils/surfaceFlagParser';

export class BspAdapter implements ViewerAdapter {
  private pipeline: BspSurfacePipeline | null = null;
  private geometry: BspGeometryBuildResult | null = null;
  private textures: Map<string, Texture2D> = new Map();
  private whiteTexture: Texture2D | null = null;
  private map: BspMap | null = null;
  private surfaces: BspSurfaceInput[] = [];
  private gl: WebGL2RenderingContext | null = null;
  private renderOptions: RenderOptions = { mode: 'textured', color: [1, 1, 1] };
  private hiddenClassnames: Set<string> = new Set();
  private hoveredEntity: BspEntity | null = null;
  private selectedEntities: Set<BspEntity> = new Set();
  private highlightedLightmapIndex: number | null = null;
  private activeSurfaceFlagFilter: string | null = null;
  private debugMode: DebugMode = DebugMode.None;
  private debugRenderer: DebugRenderer | null = null;
  private gizmoRenderer: GizmoRenderer | null = null;

  async load(gl: WebGL2RenderingContext, file: ParsedFile, pakService: PakService, filePath: string): Promise<void> {
    if (file.type === 'bsp') {
        this.map = file.map;
    } else {
        throw new Error('Invalid file type for BspAdapter');
    }

    // Create 1x1 white texture for lightmap/fullbright fallback
    this.whiteTexture = new Texture2D(gl);
    this.whiteTexture.bind();
    this.whiteTexture.uploadImage(0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.whiteTexture.setParameters({
        minFilter: gl.NEAREST,
        magFilter: gl.NEAREST,
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE
    });

    await this.loadMap(gl, this.map, pakService);
  }

  async loadMap(gl: WebGL2RenderingContext, map: BspMap, pakService: PakService) {
    this.gl = gl;
    this.map = map;
    this.pipeline = new BspSurfacePipeline(gl);
    this.debugRenderer = new DebugRenderer(gl);
    this.gizmoRenderer = new GizmoRenderer(gl);
    this.surfaces = createBspSurfaces(map);
    this.geometry = buildBspGeometry(gl, this.surfaces, map, { hiddenClassnames: this.hiddenClassnames });

    // Initialize white texture for fullbright/lighting-only modes
    this.whiteTexture = new Texture2D(gl);
    this.whiteTexture.bind();
    this.whiteTexture.uploadImage(0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

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

  pickEntity(ray: Ray): { entity: BspEntity; model: any; distance: number; faceIndex?: number } | null {
    if (!this.map) return null;

    // Check gizmo first if selection exists
    if (this.selectedEntities.size > 0 && this.gizmoRenderer) {
        const axis = this.gizmoRenderer.checkIntersection(ray);
        if (axis !== TransformAxis.None) {
             this.gizmoRenderer.setHoveredAxis(axis);
             return null; // Consume click for gizmo
        } else {
             this.gizmoRenderer.setHoveredAxis(TransformAxis.None);
        }
    }

    const result = this.map.pickEntity(ray);
    if (result) {
        return result;
    }
    return null;
  }

  getHoveredGizmoAxis(): string {
      return this.gizmoRenderer ? this.gizmoRenderer.getHoveredAxis() : 'none';
  }

  // Helper to get surface properties for the picked face
  getSurfaceProperties(faceIndex: number) {
      if (!this.map || !this.map.faces || faceIndex < 0 || faceIndex >= this.map.faces.length) return null;
      const face = this.map.faces[faceIndex];
      // Type assertion as the library definition might be missing texInfo in strict mode
      // or using different casing
      const mapAny = this.map as any;
      const texInfos = mapAny.texinfo || mapAny.texInfo;

      if (!texInfos) return null;

      // Handle property name variations
      const texInfoIndex = (face as any).texInfoIndex !== undefined ? (face as any).texInfoIndex : (face as any).texinfo;

      if (texInfoIndex === undefined || texInfoIndex < 0 || texInfoIndex >= texInfos.length) return null;

      const texInfo = texInfos[texInfoIndex];

      return {
          textureName: texInfo.texture,
          flags: texInfo.flags,
          value: texInfo.value,
          contents: texInfo.contents
      };
  }

  setHoveredEntity(entity: BspEntity | null) {
      this.hoveredEntity = entity;
  }

  setSelectedEntities(entities: Set<BspEntity>) {
      this.selectedEntities = entities;
  }

  highlightLightmapSurfaces(atlasIndex: number) {
      this.highlightedLightmapIndex = atlasIndex;
  }

  setSurfaceFlagFilter(flag: string | null) {
      this.activeSurfaceFlagFilter = flag;
  }

  clearHighlights() {
      this.highlightedLightmapIndex = null;
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
    const brightness = this.renderOptions.brightness !== undefined ? this.renderOptions.brightness : 1.0;
    const fullbright = this.renderOptions.fullbright === true;

    // Convert to Array for compatibility with BspSurfacePipeline binding which expects number[]
    // resolveLightStyles returns Float32Array
    const styleValues: number[] = new Array(lightStyles.length);
    for (let j = 0; j < lightStyles.length; j++) {
        // If fullbright, force style value to 1.0 to avoid pulsing.
        if (fullbright) {
            styleValues[j] = 1.0;
        } else {
            styleValues[j] = lightStyles[j] * brightness;
        }
    }

    const timeSeconds = performance.now() / 1000;
    const hoveredModel = this.hoveredEntity ? this.getModelFromEntity(this.hoveredEntity) : null;

    // Normal Rendering Loop
    for (let i = 0; i < this.geometry.surfaces.length; i++) {
        const surface = this.geometry.surfaces[i];
        const inputSurface = this.surfaces[i];

        let isHighlighted = false;
        let isSelected = false;

        // Check selection/hover for brush models
        if (hoveredModel && inputSurface.faceIndex >= hoveredModel.firstFace && inputSurface.faceIndex < hoveredModel.firstFace + hoveredModel.numFaces) {
            isHighlighted = true;
        }

        for (const selected of this.selectedEntities) {
            const selectedModel = this.getModelFromEntity(selected);
            if (selectedModel && inputSurface.faceIndex >= selectedModel.firstFace && inputSurface.faceIndex < selectedModel.firstFace + selectedModel.numFaces) {
                isSelected = true;
                break;
            }
        }

        if (this.highlightedLightmapIndex !== null) {
            if (surface.lightmap && surface.lightmap.atlasIndex === this.highlightedLightmapIndex) {
                 isHighlighted = true;
            }
        }

        if (this.activeSurfaceFlagFilter) {
            const flagNames = getSurfaceFlagNames(surface.surfaceFlags);
            if (flagNames.includes(this.activeSurfaceFlagFilter)) {
                isHighlighted = true;
            } else {
                 continue; // Hide non-matching surfaces
            }
        }

        // Lighting Control: Brightness
        // We use the 'color' uniform to apply brightness scaling.
        // Default color is [1,1,1]. We scale by renderOptions.brightness.
        const brightness = this.renderOptions.brightness !== undefined ? this.renderOptions.brightness : 1.0;
        const baseColor = this.renderOptions.color;
        const scaledColor: [number, number, number, number] = [
            baseColor[0] * brightness,
            baseColor[1] * brightness,
            baseColor[2] * brightness,
            1.0
        ];

        const renderColor = isSelected ? [0.0, 1.0, 0.0, 1.0] : (isHighlighted ? [1.0, 0.0, 0.0, 1.0] : scaledColor);

        const texture = this.textures.get(surface.texture);
        if (texture && this.debugMode !== DebugMode.Lightmaps) {
            gl.activeTexture(gl.TEXTURE0);
            texture.bind();
        } else if (this.debugMode === DebugMode.Lightmaps && this.whiteTexture) {
             // Use a white texture for lightmap mode to show only lighting
             gl.activeTexture(gl.TEXTURE0);
             this.whiteTexture.bind();
        }

        // Lighting Control: Fullbright
        if (this.renderOptions.fullbright && this.whiteTexture) {
             gl.activeTexture(gl.TEXTURE1);
             this.whiteTexture.bind();
        } else {
             if (surface.lightmap) {
                 const atlas = this.geometry.lightmaps[surface.lightmap.atlasIndex];
                 if (atlas) {
                     gl.activeTexture(gl.TEXTURE1);
                     atlas.texture.bind();
                 }
             }
        }


        const state = this.pipeline.bind({
            modelViewProjection: mvp as any,
            diffuseSampler: 0,
            lightmapSampler: 1,
            styleValues: styleValues, // Pass modified styles as array
            surfaceFlags: surface.surfaceFlags,
            timeSeconds: timeSeconds,
            renderMode: {
                mode: (isHighlighted || isSelected) ? 'solid' : this.renderOptions.mode,
                color: renderColor as [number, number, number, number],
                applyToAll: true,
                generateRandomColor: (isHighlighted || isSelected) ? false : this.renderOptions.generateRandomColor,
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
                const isSelected = this.selectedEntities.has(entity);
                const color = isSelected ? vec4.fromValues(0, 1, 0, 1) : vec4.fromValues(1, 1, 0, 1);

                const model = this.getModelFromEntity(entity);
                if (model) {
                    this.debugRenderer?.addBox(model.min, model.max, color);
                } else if (entity.properties && entity.properties.origin) {
                    // For point entities without a brush model, draw a small box at origin
                    // Origin string format "x y z"
                    const parts = entity.properties.origin.split(' ').map(parseFloat);
                    if (parts.length === 3 && !parts.some(isNaN)) {
                        const origin = vec3.fromValues(parts[0], parts[1], parts[2]);
                        const size = 16;
                        const min = vec3.fromValues(origin[0] - size/2, origin[1] - size/2, origin[2] - size/2);
                        const max = vec3.fromValues(origin[0] + size/2, origin[1] + size/2, origin[2] + size/2);
                        this.debugRenderer?.addBox(min, max, color);
                    }
                }
            });
        }

        if (this.debugMode === DebugMode.Normals) {
             this.surfaces.forEach(surface => {
                 const face = this.map?.faces[surface.faceIndex];
                 if (face && this.map) {
                     const plane = this.map.planes[face.planeIndex];
                     if (surface.vertices && surface.vertices.length >= 3) {
                         const x = surface.vertices[0];
                         const y = surface.vertices[1];
                         const z = surface.vertices[2];
                         const start = vec3.fromValues(x, y, z);
                         const normal = vec3.fromValues(plane.normal[0], plane.normal[1], plane.normal[2]);
                         const end = vec3.create();
                         vec3.scaleAndAdd(end, start, normal, 10);
                         this.debugRenderer?.addLine(start, end, vec4.fromValues(0, 1, 1, 1));
                     }
                 }
             });
        }

        if (this.debugMode === DebugMode.PVSClusters) {
            // Visualize visible clusters from camera position
            const camPos = camera.position;
            if (camPos) {
                 const leafIndex = findLeafForPoint(this.map, camPos as any);
                 if (leafIndex >= 0 && leafIndex < this.map.leafs.length) {
                     const leaf = this.map.leafs[leafIndex];
                     if (leaf && leaf.cluster !== -1) {
                         // Draw the current leaf box
                         const min = vec3.fromValues(leaf.mins[0], leaf.mins[1], leaf.mins[2]);
                         const max = vec3.fromValues(leaf.maxs[0], leaf.maxs[1], leaf.maxs[2]);
                         this.debugRenderer.addBox(min, max, vec4.fromValues(1, 1, 0, 1));
                     }
                 }
            }
        }

        this.debugRenderer.render(mvp);
    }

    // Render Gizmo on top
    if (this.selectedEntities.size > 0 && this.gizmoRenderer) {
         // Determine gizmo position (average of selected)
         const center = vec3.create();
         let count = 0;
         this.selectedEntities.forEach(ent => {
             const model = this.getModelFromEntity(ent);
             if (model) {
                 const min = vec3.fromValues(model.min[0], model.min[1], model.min[2]);
                 const max = vec3.fromValues(model.max[0], model.max[1], model.max[2]);
                 vec3.add(center, center, min);
                 vec3.add(center, center, max);
                 count += 2; // Adding min and max
             } else if (ent.properties.origin) {
                 const parts = ent.properties.origin.split(' ').map(parseFloat);
                 if (parts.length === 3 && !parts.some(isNaN)) {
                     vec3.add(center, center, vec3.fromValues(parts[0], parts[1], parts[2]));
                     count++;
                 }
             }
         });

         if (count > 0) {
             // For brushes we added min+max, so divide by 2*N
             // For points we added origin, so divide by N
             // But we mixed them.
             // Wait, center calculation:
             // Sum of all centers.
             // Brush center = (min+max)/2
             // Point center = origin
             // Let's re-do logic properly.
             vec3.scale(center, center, 0); // reset
             count = 0;
             this.selectedEntities.forEach(ent => {
                 const model = this.getModelFromEntity(ent);
                 if (model) {
                     const c = vec3.create();
                     vec3.add(c, model.min as vec3, model.max as vec3);
                     vec3.scale(c, c, 0.5);
                     vec3.add(center, center, c);
                     count++;
                 } else if (ent.properties.origin) {
                     const parts = ent.properties.origin.split(' ').map(parseFloat);
                     if (parts.length === 3 && !parts.some(isNaN)) {
                        vec3.add(center, center, vec3.fromValues(parts[0], parts[1], parts[2]));
                        count++;
                     }
                 }
             });

             if (count > 0) {
                 vec3.scale(center, center, 1 / count);
                 this.gizmoRenderer.setPosition(center);
                 this.gizmoRenderer.render(projection, view, camera);
             }
         }
    }
  }

  cleanup(): void {
    this.textures.forEach(t => {
      // t.dispose()?
    });
    this.textures.clear();
    // this.whiteTexture = null; // Can't dispose easily if no dispose method, but let GC handle it
  }

  getUniqueClassnames(): string[] {
    return this.map?.entities.getUniqueClassnames() ?? [];
  }

  getLightmaps(): Texture2D[] {
      return this.geometry ? this.geometry.lightmaps.map(l => l.texture) : [];
  }

  getLightmapInfo(atlasIndex: number): { width: number; height: number; surfaceCount: number } {
      if (!this.geometry || !this.geometry.lightmaps[atlasIndex]) {
          return { width: 0, height: 0, surfaceCount: 0 };
      }
      const width = 128;
      const height = 128;

      let surfaceCount = 0;
      for (const surface of this.geometry.surfaces) {
          if (surface.lightmap && surface.lightmap.atlasIndex === atlasIndex) {
              surfaceCount++;
          }
      }

      return { width, height, surfaceCount };
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
