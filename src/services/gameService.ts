import {
  AssetManager,
  VirtualFileSystem,
  type BspMap,
  type BspPlane,
  type BspNode,
  type BspLeaf,
  type BspBrush,
  type BspBrushSide,
  type BspModel
} from 'quake2ts/engine';

import {
  createGame,
  type GameImports,
  type GameExports,
  type GameCreateOptions,
  type Entity,
  type GameTraceResult,
  type GameStateSnapshot,
  type UserCommand,
} from 'quake2ts/game';

import {
  type Vec3,
  vec3,
  traceBox,
  buildCollisionModel,
  type CollisionModel,
  type CollisionLumpData,
  pointContents
} from 'quake2ts/shared';

export interface GameSimulation {
  initGame(mapName: string, options: GameCreateOptions): Promise<void>;
  start(): void;
  stop(): void;
  tick(deltaMs: number, cmd: UserCommand): void;
  getSnapshot(): GameStateSnapshot | null;
  isRunning(): boolean;
  shutdown(): void;
}

export interface GameServiceState {
  isInitialized: boolean;
  isRunning: boolean;
  currentMap: string | null;
}

class GameServiceImpl implements GameSimulation {
  private game: GameExports | null = null;
  private assetManager: AssetManager;
  private vfs: VirtualFileSystem;
  private mapName: string | null = null;
  private bspMap: BspMap | null = null;
  private collisionModel: CollisionModel | null = null;

  // Game imports implementation
  private configStrings = new Map<number, string>();
  private frameCount = 0;

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
    this.assetManager = new AssetManager(vfs);
  }

  async initGame(mapName: string, options: GameCreateOptions): Promise<void> {
    this.mapName = mapName;

    // Load map assets
    this.bspMap = await this.assetManager.getMap(mapName);

    // Build collision model from BSP
    this.collisionModel = this.createCollisionModel(this.bspMap);

    // Create game instance
    this.game = createGame(
      this.createGameImports(),
      { vfs: this.vfs, assetManager: this.assetManager },
      options
    );

    this.game.init();
  }

  private createCollisionModel(map: BspMap): CollisionModel {
    // Reconstruct the flat leafBrushes array and update leaves
    const leafBrushes: number[] = [];

    const leaves = map.leafs.map((l: BspLeaf, index: number) => {
      // Get the brushes for this leaf from the parsed leafLists
      // map.leafLists.leafBrushes is an array of arrays, indexed by leaf index
      const brushes = map.leafLists.leafBrushes[index];

      const firstLeafBrush = leafBrushes.length;
      let numLeafBrushes = 0;

      if (brushes && brushes.length > 0) {
        leafBrushes.push(...brushes);
        numLeafBrushes = brushes.length;
      }

      return {
        contents: l.contents,
        cluster: l.cluster,
        area: l.area,
        firstLeafBrush,
        numLeafBrushes
      };
    });

    const lumpData: CollisionLumpData = {
      planes: map.planes.map((p: BspPlane) => ({
        normal: { x: p.normal[0], y: p.normal[1], z: p.normal[2] },
        dist: p.dist,
        type: p.type
      })),
      nodes: map.nodes.map((n: BspNode) => ({
        planenum: n.planeIndex,
        children: n.children
      })),
      leaves: leaves,
      brushes: map.brushes.map((b: BspBrush) => ({
        firstSide: b.firstSide,
        numSides: b.numSides,
        contents: b.contents
      })),
      brushSides: map.brushSides.map((bs: BspBrushSide) => ({
        planenum: bs.planeIndex,
        surfaceFlags: 0
      })),
      leafBrushes: leafBrushes,
      bmodels: map.models.map((m: BspModel) => ({
        mins: { x: m.mins[0], y: m.mins[1], z: m.mins[2] },
        maxs: { x: m.maxs[0], y: m.maxs[1], z: m.maxs[2] },
        origin: { x: m.origin[0], y: m.origin[1], z: m.origin[2] },
        headnode: m.headNode
      })),
      visibility: map.visibility ? {
        numClusters: map.visibility.numClusters,
        clusters: map.visibility.clusters.map(c => ({
          pvs: c.pvs,
          phs: c.phs
        }))
      } : undefined
    };

    return buildCollisionModel(lumpData);
  }

  private createGameImports(): Partial<GameImports> {
    return {
      trace: (start: Vec3, mins: Vec3, maxs: Vec3, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult => {
        if (!this.collisionModel) {
          return {
            allsolid: false,
            startsolid: false,
            fraction: 1.0,
            endpos: vec3.clone(end),
            plane: { normal: vec3.fromValues(0, 1, 0), dist: 0, type: 0, signbits: 0 },
            surface: { name: 'default', flags: 0, value: 0 },
            contents: 0,
            ent: null
          };
        }

        const trace = traceBox({
          model: this.collisionModel,
          start: { x: start.x, y: start.y, z: start.z },
          end: { x: end.x, y: end.y, z: end.z },
          mins: { x: mins.x, y: mins.y, z: mins.z },
          maxs: { x: maxs.x, y: maxs.y, z: maxs.z },
          contentMask: contentmask
        });

        return {
          allsolid: trace.allsolid,
          startsolid: trace.startsolid,
          fraction: trace.fraction,
          endpos: trace.endpos,
          plane: trace.plane ? {
             normal: trace.plane.normal,
             dist: trace.plane.dist,
             type: trace.plane.type,
             signbits: trace.plane.signbits
          } : { normal: vec3.create(), dist: 0, type: 0, signbits: 0 },
          surface: {
            name: 'unknown',
            flags: trace.surfaceFlags || 0,
            value: 0
          },
          contents: trace.contents || 0,
          ent: null
        };
      },

      pointcontents: (point: Vec3): number => {
        if (!this.collisionModel) return 0;
        return pointContents(
          { x: point.x, y: point.y, z: point.z },
          this.collisionModel
        );
      },

      multicast: (origin: Vec3, to: number, event: string, ...args: any[]): void => {
        // Handle multicast events (sound, effects)
      },

      unicast: (entity: Entity, reliable: boolean, event: string, ...args: any[]): void => {
        // Handle unicast events
      },

      configstring: (index: number, value: string): void => {
        this.configStrings.set(index, value);
      },

      serverCommand: (cmd: string): void => {
        console.log('Server command:', cmd);
      },

      soundIndex: (name: string): number => {
        // Should register sound and return index
        return 0;
      },

      modelIndex: (name: string): number => {
        // Should register model and return index
        return 0;
      },

      imageIndex: (name: string): number => {
        // Should register image and return index
        return 0;
      },

      linkentity: (entity: Entity): void => {
        // Link entity to physics world
      },

      unlinkentity: (entity: Entity): void => {
        // Unlink entity from physics world
      }
    };
  }

  start(): void {
    if (!this.game) throw new Error('Game not initialized');
  }

  stop(): void {
  }

  tick(deltaMs: number, cmd: UserCommand): void {
    if (!this.game) return;
    this.game.frame(this.frameCount++, cmd);
  }

  getSnapshot(): GameStateSnapshot | null {
    if (!this.game) return null;
    return this.game.snapshot();
  }

  isRunning(): boolean {
    return this.game !== null;
  }

  shutdown(): void {
    if (this.game) {
      this.game.shutdown();
      this.game = null;
    }
    this.bspMap = null;
    this.collisionModel = null;
    this.mapName = null;
    this.configStrings.clear();
    this.frameCount = 0;
  }
}

// Singleton pattern for the service
let gameServiceInstance: GameServiceImpl | null = null;

export function getGameService(vfs: VirtualFileSystem): GameSimulation {
  // Always create a new service if VFS changes or reset existing one
  // For simplicity and correctness with new PAKs, we recreate it if VFS doesn't match
  // But GameServiceImpl doesn't expose VFS.
  // Let's just create a new one if it doesn't exist, or shutdown/recreate if it does.
  // Actually, to support switching PAKs, we should probably just return a new instance or update the existing one.
  // Since we have `shutdown`, let's ensure we are clean.

  if (gameServiceInstance) {
     // Check if we need to update VFS?
     // Simplest approach: Singleton is per-session. If VFS changes, we might want a new service.
     // But `usePakExplorer` creates a new PakService on file load, so `vfs` object reference changes.
     // So we should check if we need to replace the instance.

     // However, `GameServiceImpl` is private.
     // Let's just shutdown and replace if it exists, ensuring we always use the latest VFS.
     gameServiceInstance.shutdown();
  }
  gameServiceInstance = new GameServiceImpl(vfs);
  return gameServiceInstance;
}

export function resetGameService(): void {
  if (gameServiceInstance) {
    gameServiceInstance.shutdown();
    gameServiceInstance = null;
  }
}
