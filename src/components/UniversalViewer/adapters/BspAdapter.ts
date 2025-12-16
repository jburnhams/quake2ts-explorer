import { Camera, BspSurfacePipeline, createBspSurfaces, buildBspGeometry, Texture2D, parseWal, walToRgba, BspGeometryBuildResult, resolveLightStyles, applySurfaceState, BspMap, BspSurfaceInput, BspEntity, findLeafForPoint } from 'quake2ts/engine';
import { ParsedFile, PakService } from '../../../services/pakService';
import { RenderOptions, ViewerAdapter, Ray, PickOptions } from './types';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { DebugMode } from '@/src/types/debugMode';
import { DebugRenderer } from './DebugRenderer';
import { GizmoRenderer, GizmoAxis, GizmoMode } from './GizmoRenderer';
import { getSurfaceFlagNames } from '@/src/utils/surfaceFlagParser';
import { EntityEditorService, SelectionMode } from '@/src/services/entityEditorService';
import { TransformUtils } from '@/src/utils/transformUtils';

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
  private highlightedLightmapIndex: number | null = null;
  private activeSurfaceFlagFilter: string | null = null;
  private debugMode: DebugMode = DebugMode.None;
  private debugRenderer: DebugRenderer | null = null;
  private gizmoRenderer: GizmoRenderer | null = null;
  private gizmoMode: GizmoMode = 'translate';

  // Task 1.4: Configurable snap size, default 16
  private gridSnap: number = 16;
  private rotationSnap: number = 15; // 15 degrees

  private dragState: {
      activeAxis: GizmoAxis;
      startRayPoint: vec3;
      originalEntityOrigin: vec3;
      originalEntityAngles: vec3;
      entityIndex: number;
      startAngle?: number; // For rotation
  } | null = null;

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

    // Add key listeners for gizmo modes
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input is focused (simple check)
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'w') {
          this.gizmoMode = 'translate';
          this.gizmoRenderer?.setMode('translate');
      } else if (e.key.toLowerCase() === 'e') {
          this.gizmoMode = 'rotate';
          this.gizmoRenderer?.setMode('rotate');
      } else if (e.key.toLowerCase() === 'r') {
          this.gizmoMode = 'scale';
          this.gizmoRenderer?.setMode('scale');
      }
  };

  async loadMap(gl: WebGL2RenderingContext, map: BspMap, pakService: PakService) {
    this.gl = gl;
    this.map = map;

    // Initialize EntityEditorService with map entities
    if (this.map.entities && this.map.entities.entities) {
        EntityEditorService.getInstance().setEntities(this.map.entities.entities);
    }

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

  setGridSnap(size: number) {
      this.gridSnap = size;
  }

  setRotationSnap(degrees: number) {
      this.rotationSnap = degrees;
  }

  pickEntity(ray: Ray, options?: PickOptions): { entity: BspEntity; model: any; distance: number; faceIndex?: number } | null {
    if (!this.map) return null;

    // Check Gizmo intersection first if something is selected
    const selectedEntities = EntityEditorService.getInstance().getSelectedEntities();
    if (selectedEntities.length > 0 && this.gizmoRenderer) {
        const entity = selectedEntities[0];
        if (entity.properties && entity.properties.origin) {
            const parts = entity.properties.origin.split(' ').map(parseFloat);
            if (parts.length === 3 && !parts.some(isNaN)) {
                const origin = vec3.fromValues(parts[0], parts[1], parts[2]);
                const hit = this.gizmoRenderer.intersect(ray, origin);
                if (hit) {
                    this.gizmoRenderer.setHoveredAxis(hit.axis);
                    return { entity, model: null, distance: hit.distance };
                } else {
                    this.gizmoRenderer.setHoveredAxis(null);
                }
            }
        }
    }

    const result = this.map.pickEntity(ray);

    if (result) {
        // Find index of entity in the list
        if (this.map.entities && this.map.entities.entities) {
             const index = this.map.entities.entities.indexOf(result.entity);
             if (index !== -1) {
                  const mode = options?.multiSelect ? SelectionMode.Toggle : SelectionMode.Single;
                  EntityEditorService.getInstance().selectEntity(index, mode);
             }
        }
        return result;
    } else {
        if (!options?.multiSelect) {
            EntityEditorService.getInstance().deselectAll();
        }
    }
    return null;
  }

  // Helper to get surface properties for the picked face
  getSurfaceProperties(faceIndex: number) {
      if (!this.map || !this.map.faces || faceIndex < 0 || faceIndex >= this.map.faces.length) return null;
      const face = this.map.faces[faceIndex];
      const mapAny = this.map as any;
      const texInfos = mapAny.texinfo || mapAny.texInfo;

      if (!texInfos) return null;

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

  onMouseDown(ray: Ray, event: MouseEvent): boolean {
      if (!this.gizmoRenderer) return false;

      const selectedEntities = EntityEditorService.getInstance().getSelectedEntities();
      if (selectedEntities.length === 0) return false;

      const entity = selectedEntities[0];
      const entityIds = EntityEditorService.getInstance().getSelectedEntityIds();
      const entityIndex = entityIds[0];

      // Get origin
      let origin = vec3.create();
      if (entity.properties && entity.properties.origin) {
          const parts = entity.properties.origin.split(' ').map(parseFloat);
          if (parts.length === 3 && !parts.some(isNaN)) {
               origin = vec3.fromValues(parts[0], parts[1], parts[2]);
          }
      }

      // Get initial angles
      let angles = vec3.create();
      if (entity.properties && entity.properties.angles) {
          const parts = entity.properties.angles.split(' ').map(parseFloat);
          if (parts.length === 3 && !parts.some(isNaN)) {
              vec3.set(angles, parts[0], parts[1], parts[2]);
          }
      } else if (entity.properties && entity.properties.angle) {
           const angle = parseFloat(entity.properties.angle);
           if (!isNaN(angle)) {
               // angle usually means yaw (rotation around Z), but check quake logic.
               // It's often: 0 = East, 90 = North.
               vec3.set(angles, 0, angle, 0);
           }
      }

      const hit = this.gizmoRenderer.intersect(ray, origin);
      if (hit) {
          this.gizmoRenderer.setActiveAxis(hit.axis);

          if (this.gizmoMode === 'translate') {
              // Calculate point on axis line closest to ray
              const axisDir = vec3.create();
              if (hit.axis === 'x') vec3.set(axisDir, 1, 0, 0);
              if (hit.axis === 'y') vec3.set(axisDir, 0, 1, 0);
              if (hit.axis === 'z') vec3.set(axisDir, 0, 0, 1);

              const projection = TransformUtils.projectRayToLine(ray, origin, axisDir);

              this.dragState = {
                  activeAxis: hit.axis,
                  startRayPoint: projection.point,
                  originalEntityOrigin: vec3.clone(origin),
                  originalEntityAngles: vec3.clone(angles),
                  entityIndex: entityIndex
              };
          } else if (this.gizmoMode === 'rotate') {
             // Calculate initial angle on plane
             // Plane Normal depends on axis
             let planeNormal = vec3.create();
             if (hit.axis === 'x') vec3.set(planeNormal, 1, 0, 0); // YZ Plane
             if (hit.axis === 'y') vec3.set(planeNormal, 0, 1, 0); // XZ Plane
             if (hit.axis === 'z') vec3.set(planeNormal, 0, 0, 1); // XY Plane

             const hitPoint = TransformUtils.projectRayToPlane(ray, planeNormal, origin);
             if (hitPoint) {
                 // Calculate angle relative to center
                 const rel = vec3.create();
                 vec3.sub(rel, hitPoint.point, origin);

                 // atan2 based on axis
                 let startAngle = 0;
                 if (hit.axis === 'x') startAngle = Math.atan2(rel[2], rel[1]); // z, y
                 if (hit.axis === 'y') startAngle = Math.atan2(rel[2], rel[0]); // z, x (Check sign/direction?)
                 if (hit.axis === 'z') startAngle = Math.atan2(rel[1], rel[0]); // y, x

                 this.dragState = {
                     activeAxis: hit.axis,
                     startRayPoint: hitPoint.point, // Not really used for rotation logic but keeping consistent
                     originalEntityOrigin: vec3.clone(origin),
                     originalEntityAngles: vec3.clone(angles),
                     entityIndex: entityIndex,
                     startAngle: startAngle
                 };
             }
          }

          return true; // Consumed
      }
      return false;
  }

  onMouseMove(ray: Ray, event: MouseEvent): boolean {
      // Hover effect logic
      if (!this.dragState) {
          if (this.gizmoRenderer && EntityEditorService.getInstance().getSelectedEntities().length > 0) {
              const entity = EntityEditorService.getInstance().getSelectedEntities()[0];
               let origin = vec3.create();
                if (entity.properties && entity.properties.origin) {
                    const parts = entity.properties.origin.split(' ').map(parseFloat);
                    if (parts.length === 3 && !parts.some(isNaN)) {
                        origin = vec3.fromValues(parts[0], parts[1], parts[2]);
                    }
                }
              const hit = this.gizmoRenderer.intersect(ray, origin);
              this.gizmoRenderer.setHoveredAxis(hit ? hit.axis : null);
              if (hit) return true;
          }
          return false;
      }

      // Dragging Logic
      if (this.dragState) {
          const { activeAxis, startRayPoint, originalEntityOrigin, entityIndex, originalEntityAngles, startAngle } = this.dragState;

          if (this.gizmoMode === 'translate') {
            const axisDir = vec3.create();
            if (activeAxis === 'x') vec3.set(axisDir, 1, 0, 0);
            if (activeAxis === 'y') vec3.set(axisDir, 0, 1, 0);
            if (activeAxis === 'z') vec3.set(axisDir, 0, 0, 1);

            const projection = TransformUtils.projectRayToLine(ray, originalEntityOrigin, axisDir);

            // Delta vector
            const delta = vec3.create();
            vec3.sub(delta, projection.point, startRayPoint);

            // Apply delta to original origin
            const newOrigin = vec3.create();
            vec3.add(newOrigin, originalEntityOrigin, delta);

            // Grid Snap
            if (event.shiftKey) {
                newOrigin[0] = TransformUtils.snap(newOrigin[0], this.gridSnap);
                newOrigin[1] = TransformUtils.snap(newOrigin[1], this.gridSnap);
                newOrigin[2] = TransformUtils.snap(newOrigin[2], this.gridSnap);
            }

            // Update Entity
            const entity = EntityEditorService.getInstance().getEntity(entityIndex);
            if (entity) {
                const updatedEntity = { ...entity };
                if (!updatedEntity.properties) updatedEntity.properties = {};
                updatedEntity.properties.origin = `${newOrigin[0]} ${newOrigin[1]} ${newOrigin[2]}`;
                // Cast to any to bypass strict type check for now, as BspEntity definition might vary
                (updatedEntity as any).origin = [newOrigin[0], newOrigin[1], newOrigin[2]];

                EntityEditorService.getInstance().updateEntity(entityIndex, updatedEntity);
            }
          } else if (this.gizmoMode === 'rotate' && startAngle !== undefined) {
             let planeNormal = vec3.create();
             if (activeAxis === 'x') vec3.set(planeNormal, 1, 0, 0);
             if (activeAxis === 'y') vec3.set(planeNormal, 0, 1, 0);
             if (activeAxis === 'z') vec3.set(planeNormal, 0, 0, 1);

             const hitPoint = TransformUtils.projectRayToPlane(ray, planeNormal, originalEntityOrigin);
             if (hitPoint) {
                 const rel = vec3.create();
                 vec3.sub(rel, hitPoint.point, originalEntityOrigin);

                 let currentAngle = 0;
                 if (activeAxis === 'x') currentAngle = Math.atan2(rel[2], rel[1]);
                 if (activeAxis === 'y') currentAngle = Math.atan2(rel[2], rel[0]);
                 if (activeAxis === 'z') currentAngle = Math.atan2(rel[1], rel[0]);

                 let deltaAngle = currentAngle - startAngle;
                 // Convert to degrees
                 let deltaDeg = deltaAngle * (180 / Math.PI);

                 // Snap
                 if (event.shiftKey) {
                     deltaDeg = Math.round(deltaDeg / this.rotationSnap) * this.rotationSnap;
                 }

                 const newAngles = vec3.clone(originalEntityAngles);

                 // If rotating around Z (Yaw):
                 if (activeAxis === 'z') newAngles[1] += deltaDeg;
                 // If rotating around Y (Pitch):
                 if (activeAxis === 'y') newAngles[0] += deltaDeg;
                 // If rotating around X (Roll):
                 if (activeAxis === 'x') newAngles[2] += deltaDeg;

                 // Normalize 0-360
                 for(let i=0; i<3; i++) {
                     while(newAngles[i] < 0) newAngles[i] += 360;
                     while(newAngles[i] >= 360) newAngles[i] -= 360;
                 }

                 const entity = EntityEditorService.getInstance().getEntity(entityIndex);
                 if (entity) {
                    const updatedEntity = { ...entity };
                    if (!updatedEntity.properties) updatedEntity.properties = {};
                    updatedEntity.properties.angles = `${newAngles[0]} ${newAngles[1]} ${newAngles[2]}`;

                    // Also update 'angle' if it exists and we rotated yaw
                    if (updatedEntity.properties.angle && activeAxis === 'z') {
                        updatedEntity.properties.angle = `${Math.round(newAngles[1])}`;
                    }

                    EntityEditorService.getInstance().updateEntity(entityIndex, updatedEntity);
                 }
             }
          }

          return true;
      }
      return false;
  }

  onMouseUp(ray: Ray, event: MouseEvent): boolean {
      if (this.dragState) {
          this.dragState = null;
          if (this.gizmoRenderer) this.gizmoRenderer.setActiveAxis(null);
          return true;
      }
      return false;
  }

  cleanup(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.textures.forEach(t => {
      // t.dispose()?
    });
    this.textures.clear();
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
    const freezeLights = this.renderOptions.freezeLights === true;

    const styleValues: number[] = new Array(lightStyles.length);
    for (let j = 0; j < lightStyles.length; j++) {
        if (fullbright || freezeLights) {
            styleValues[j] = 1.0;
        } else {
            styleValues[j] = lightStyles[j] * brightness;
        }
    }

    const timeSeconds = freezeLights ? 0 : performance.now() / 1000;
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

        const texture = this.textures.get(surface.texture);
        if (texture && this.debugMode !== DebugMode.Lightmaps) {
            gl.activeTexture(gl.TEXTURE0);
            texture.bind();
        } else if (this.debugMode === DebugMode.Lightmaps && this.whiteTexture) {
             gl.activeTexture(gl.TEXTURE0);
             this.whiteTexture.bind();
        }

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

        const brightness = this.renderOptions.brightness !== undefined ? this.renderOptions.brightness : 1.0;
        const baseColor = this.renderOptions.color;
        const scaledColor: [number, number, number, number] = [
            baseColor[0] * brightness,
            baseColor[1] * brightness,
            baseColor[2] * brightness,
            1.0
        ];

        const state = this.pipeline.bind({
            modelViewProjection: mvp as any,
            diffuseSampler: 0,
            lightmapSampler: 1,
            styleValues: styleValues,
            surfaceFlags: surface.surfaceFlags,
            timeSeconds: timeSeconds,
            renderMode: {
                mode: isHighlighted ? 'solid' : this.renderOptions.mode,
                color: isHighlighted ? [1.0, 0.0, 0.0, 1.0] : scaledColor,
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
    if (this.debugRenderer && this.map) {
        this.debugRenderer.clear();

        const selectedEntities = EntityEditorService.getInstance().getSelectedEntities();
        selectedEntities.forEach(entity => {
            const model = this.getModelFromEntity(entity);
            if (model) {
                this.debugRenderer?.addBox(model.min, model.max, vec4.fromValues(1, 1, 0, 1));
            } else if (entity.properties && entity.properties.origin) {
                const parts = entity.properties.origin.split(' ').map(parseFloat);
                if (parts.length === 3 && !parts.some(isNaN)) {
                    const origin = vec3.fromValues(parts[0], parts[1], parts[2]);
                    const size = 20;
                    const min = vec3.fromValues(origin[0] - size/2, origin[1] - size/2, origin[2] - size/2);
                    const max = vec3.fromValues(origin[0] + size/2, origin[1] + size/2, origin[2] + size/2);
                    this.debugRenderer?.addBox(min, max, vec4.fromValues(1, 1, 0, 1));
                }
            }
        });

        if (this.debugMode !== DebugMode.None) {
            if (this.debugMode === DebugMode.BoundingBoxes) {
                this.map.entities.entities.forEach(entity => {
                    const model = this.getModelFromEntity(entity);
                    if (model) {
                        this.debugRenderer?.addBox(model.min, model.max, vec4.fromValues(0, 1, 0, 1));
                    } else if (entity.properties && entity.properties.origin) {
                        const parts = entity.properties.origin.split(' ').map(parseFloat);
                        if (parts.length === 3 && !parts.some(isNaN)) {
                            const origin = vec3.fromValues(parts[0], parts[1], parts[2]);
                            const size = 16;
                            const min = vec3.fromValues(origin[0] - size/2, origin[1] - size/2, origin[2] - size/2);
                            const max = vec3.fromValues(origin[0] + size/2, origin[1] + size/2, origin[2] + size/2);
                            this.debugRenderer?.addBox(min, max, vec4.fromValues(0, 1, 0, 1));
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
            const camPos = camera.position;
            if (camPos) {
                 const leafIndex = findLeafForPoint(this.map, camPos as any);
                 if (leafIndex >= 0 && leafIndex < this.map.leafs.length) {
                     const leaf = this.map.leafs[leafIndex];
                     if (leaf && leaf.cluster !== -1) {
                         const min = vec3.fromValues(leaf.mins[0], leaf.mins[1], leaf.mins[2]);
                         const max = vec3.fromValues(leaf.maxs[0], leaf.maxs[1], leaf.maxs[2]);
                         this.debugRenderer.addBox(min, max, vec4.fromValues(1, 1, 0, 1));
                     }
                 }
            }
        }

        if (this.debugMode === DebugMode.CollisionHulls) {
            // Visualize collision hulls (leafs with content)
            // CONTENTS_SOLID = 1
            // CONTENTS_WINDOW = 2
            // CONTENTS_AUX = 4
            // CONTENTS_LAVA = 8
            // CONTENTS_SLIME = 16
            // CONTENTS_WATER = 32
            // CONTENTS_MIST = 64

            // Iterate all leaves
            this.map.leafs.forEach(leaf => {
                const contents = leaf.contents;
                if (contents & 1) { // SOLID
                     const min = vec3.fromValues(leaf.mins[0], leaf.mins[1], leaf.mins[2]);
                     const max = vec3.fromValues(leaf.maxs[0], leaf.maxs[1], leaf.maxs[2]);
                     this.debugRenderer?.addBox(min, max, vec4.fromValues(1, 0, 0, 0.5)); // Red for solid
                } else if (contents & 8) { // LAVA
                     const min = vec3.fromValues(leaf.mins[0], leaf.mins[1], leaf.mins[2]);
                     const max = vec3.fromValues(leaf.maxs[0], leaf.maxs[1], leaf.maxs[2]);
                     this.debugRenderer?.addBox(min, max, vec4.fromValues(1, 0.5, 0, 0.5)); // Orange for lava
                } else if (contents & 16) { // SLIME
                     const min = vec3.fromValues(leaf.mins[0], leaf.mins[1], leaf.mins[2]);
                     const max = vec3.fromValues(leaf.maxs[0], leaf.maxs[1], leaf.maxs[2]);
                     this.debugRenderer?.addBox(min, max, vec4.fromValues(0, 1, 0, 0.5)); // Green for slime
                } else if (contents & 32) { // WATER
                     const min = vec3.fromValues(leaf.mins[0], leaf.mins[1], leaf.mins[2]);
                     const max = vec3.fromValues(leaf.maxs[0], leaf.maxs[1], leaf.maxs[2]);
                     this.debugRenderer?.addBox(min, max, vec4.fromValues(0, 0, 1, 0.5)); // Blue for water
                }
            });
        }

        this.debugRenderer.render(mvp);
      }
    }

    // Render Gizmo
    if (this.gizmoRenderer) {
        const selectedEntities = EntityEditorService.getInstance().getSelectedEntities();
        if (selectedEntities.length > 0) {
             const entity = selectedEntities[0];
             if (entity.properties && entity.properties.origin) {
                 const parts = entity.properties.origin.split(' ').map(parseFloat);
                 if (parts.length === 3 && !parts.some(isNaN)) {
                     const origin = vec3.fromValues(parts[0], parts[1], parts[2]);
                     gl.disable(gl.DEPTH_TEST);
                     this.gizmoRenderer.render(origin, mvp);
                     gl.enable(gl.DEPTH_TEST);
                 }
             }
        }
    }
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
}
