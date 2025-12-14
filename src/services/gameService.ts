import {
  AssetManager,
  VirtualFileSystem,
  type BspMap,
  type FixedStepContext,
  type GameFrameResult
} from 'quake2ts/engine';

import {
  createGame,
  type GameImports,
  type GameExports,
  type GameCreateOptions,
  type GameStateSnapshot,
  type Entity,
  type MulticastType,
  type GameEngine
} from 'quake2ts/game';

// Import GameTraceResult from where it is defined (likely imports module inside quake2ts/game)
// It is not exported from 'quake2ts/game' root index.d.ts?
// Wait, index.d.ts imports it from './imports.js' but doesn't export it?
// "export type { GameImports };" in index.d.ts
// But GameImports uses GameTraceResult.
// If it's not exported, we can't import it easily unless we use subpath imports if available.
// Or we redefine it matching the interface.
// `imports.d.ts` has `export interface GameTraceResult`.
// But `index.d.ts` doesn't export it directly.
// Let's try to import from `quake2ts/game/dist/types/imports` if possible, but package.json likely blocks it.
// Or just define it locally matching the interface.

import {
  Vec3,
  type UserCommand,
  traceBox,
  pointContents,
  type CollisionModel,
  type CollisionTraceParams,
  CollisionEntityIndex,
  type CollisionEntityLink,
  type CollisionPlane
} from 'quake2ts/shared';

import { createCollisionModel } from '../utils/collisionAdapter';

// Re-define GameTraceResult since it's not exported from main entry point
interface GameTraceResult {
    allsolid: boolean;
    startsolid: boolean;
    fraction: number;
    endpos: Vec3;
    plane: CollisionPlane | null;
    surfaceFlags: number;
    contents: number;
    ent: Entity | null;
}

// Re-export types
export type { GameSimulation, GameStateSnapshot };

interface GameSimulation {
  start(): void;
  stop(): void;
  tick(step: FixedStepContext, cmd: UserCommand): void;
  getSnapshot(): GameStateSnapshot;
  shutdown(): void;
}

class GameServiceImpl implements GameSimulation, GameImports {
  private gameExports: GameExports | null = null;
  private assetManager: AssetManager;
  private currentMap: BspMap | null = null;
  private collisionModel: CollisionModel | null = null;
  private entityIndex: CollisionEntityIndex;
  private configStrings = new Map<number, string>();
  private soundIndices = new Map<string, number>();
  private modelIndices = new Map<string, number>();
  private imageIndices = new Map<string, number>();
  private latestFrameResult: GameFrameResult<GameStateSnapshot> | null = null;

  constructor(
    private vfs: VirtualFileSystem,
    private mapName: string
  ) {
    this.assetManager = new AssetManager(vfs);
    this.entityIndex = new CollisionEntityIndex();
  }

  async init(options: GameCreateOptions): Promise<void> {
    // 1. Load the map
    this.currentMap = await this.assetManager.loadMap(this.mapName);

    // Convert to CollisionModel for physics
    if (this.currentMap) {
        this.collisionModel = createCollisionModel(this.currentMap);
    }

    // 2. Initialize the game instance
    const engineHost: GameEngine = {
      trace: (start: Vec3, end: Vec3): unknown => {
          if (!this.collisionModel) return null;
          return traceBox({
              model: this.collisionModel,
              start,
              end,
              headnode: 0
          });
      },
      sound: (entity, channel, sound, volume, attenuation, timeofs) => {
          // Stub for audio
      },
      soundIndex: (sound) => this.soundIndex(sound),
      modelIndex: (model) => this.modelIndex(model),
      multicast: (origin, type, event, ...args) => this.multicast(origin, type, event, ...args),
      unicast: (ent, reliable, event, ...args) => this.unicast(ent, reliable, event, ...args),
      configstring: (index, value) => this.configstring(index, value),
      serverCommand: (cmd) => this.serverCommand(cmd)
    };

    const imports: Partial<GameImports> = {
      trace: this.trace.bind(this),
      pointcontents: this.pointcontents.bind(this),
      multicast: this.multicast.bind(this),
      unicast: this.unicast.bind(this),
      configstring: this.configstring.bind(this),
      serverCommand: this.serverCommand.bind(this),
      linkentity: this.linkentity.bind(this),
      areaEdicts: this.areaEdicts.bind(this),
      setLagCompensation: this.setLagCompensation.bind(this)
    };

    this.gameExports = createGame(imports, engineHost, options);
    const sim = this.gameExports as unknown as import('quake2ts/engine').GameSimulation<GameStateSnapshot>;

    const initialFrame = sim.init(performance.now());
    if (initialFrame && typeof initialFrame === 'object') {
        this.latestFrameResult = initialFrame as GameFrameResult<GameStateSnapshot>;
    }

    // 3. Initialize level logic (spawn entities)
    if (this.currentMap && this.currentMap.entities) {
       // TODO: Parse entities string and spawn them
    }
  }

  start(): void {
    // Game starts ticking via external loop calling tick()
  }

  stop(): void {
    // Stop logic
  }

  shutdown(): void {
    if (this.gameExports) {
      const sim = this.gameExports as unknown as import('quake2ts/engine').GameSimulation<GameStateSnapshot>;
      sim.shutdown();
      this.gameExports = null;
    }
    this.assetManager.resetForLevelChange();
    this.currentMap = null;
    this.collisionModel = null;
  }

  tick(step: FixedStepContext, cmd: UserCommand): void {
    if (!this.gameExports) return;
    const sim = this.gameExports as unknown as import('quake2ts/engine').GameSimulation<GameStateSnapshot>;
    this.latestFrameResult = sim.frame(step, cmd);
  }

  getSnapshot(): GameStateSnapshot {
    if (!this.gameExports) {
      throw new Error("Game not initialized");
    }

    if (this.latestFrameResult && this.latestFrameResult.state) {
        return this.latestFrameResult.state;
    }

    throw new Error("No game snapshot available");
  }

  // --- GameImports Implementations ---

  trace(start: Vec3, mins: Vec3 | null, maxs: Vec3 | null, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult {
    const nullTrace = {
        allsolid: false,
        startsolid: false,
        fraction: 1.0,
        endpos: end,
        plane: { normal: { x: 0, y: 1, z: 0 }, dist: 0, type: 0, signbits: 0 },
        surface: { name: "default", flags: 0, value: 0 },
        contents: 0,
        ent: null,
        surfaceFlags: 0
    };

    if (!this.collisionModel) {
      return nullTrace;
    }

    // 1. Trace against world
    const traceParams: CollisionTraceParams = {
        model: this.collisionModel,
        start,
        end,
        mins: mins || undefined,
        maxs: maxs || undefined,
        headnode: 0, // Worldspawn
        contentMask: contentmask
    };

    const worldResult = traceBox(traceParams);

    // 2. Trace against entities
    const entityResult = this.entityIndex.trace({
        ...traceParams,
        passId: passent ? passent.index : -1 // Entity uses 'index', not 'id'
    });

    // 3. Combine results (take nearest)
    let finalResult = worldResult;
    let hitEntity: number | null = null;

    if (entityResult.fraction < worldResult.fraction) {
        finalResult = entityResult;
        hitEntity = entityResult.entityId;
    }

    let ent: Entity | null = null;
    if (hitEntity !== null && this.gameExports) {
        ent = this.gameExports.entities.find(e => e.index === hitEntity) || null;
    }

    return {
        allsolid: finalResult.allsolid,
        startsolid: finalResult.startsolid,
        fraction: finalResult.fraction,
        endpos: finalResult.endpos,
        plane: finalResult.plane || null, // GameTraceResult allows null plane?
        surfaceFlags: finalResult.surfaceFlags || 0,
        contents: finalResult.contents || 0,
        ent
    };
  }

  pointcontents(point: Vec3): number {
    if (!this.collisionModel) return 0;
    return pointContents(point, this.collisionModel, 0);
  }

  multicast(origin: Vec3, to: MulticastType, event: string, ...args: any[]): void {
    // Handle multicast events
  }

  unicast(entity: Entity, reliable: boolean, event: string, ...args: any[]): void {
    // Handle unicast events
  }

  configstring(index: number, value: string): void {
    this.configStrings.set(index, value);
  }

  serverCommand(cmd: string): void {
    // Handle server commands
    console.log(`Server Command: ${cmd}`);
  }

  soundIndex(name: string): number {
    if (this.soundIndices.has(name)) return this.soundIndices.get(name)!;
    const index = this.soundIndices.size + 1; // 1-based usually
    this.soundIndices.set(name, index);
    return index;
  }

  modelIndex(name: string): number {
    if (this.modelIndices.has(name)) return this.modelIndices.get(name)!;
    const index = this.modelIndices.size + 1;
    this.modelIndices.set(name, index);
    return index;
  }

  imageIndex(name: string): number {
    if (this.imageIndices.has(name)) return this.imageIndices.get(name)!;
    const index = this.imageIndices.size + 1;
    this.imageIndices.set(name, index);
    return index;
  }

  linkentity(entity: Entity): void {
    // Only link if solid
    if (entity.solid === 0) return; // NOT_SOLID

    // CollisionEntityLink requires { id, origin, mins, maxs, contents }
    const link: CollisionEntityLink = {
        id: entity.index, // Use index as id
        origin: entity.origin,
        mins: entity.mins,
        maxs: entity.maxs,
        contents: entity.clipmask || 1,
        surfaceFlags: 0 // Optional
    };
    this.entityIndex.link(link);
  }

  unlinkentity(entity: Entity | undefined): void {
    if (entity) {
        this.entityIndex.unlink(entity.index);
    }
  }

  areaEdicts(mins: Vec3, maxs: Vec3): number[] | null {
      return this.entityIndex.gatherTriggerTouches(
          { x: (mins.x + maxs.x)/2, y: (mins.y + maxs.y)/2, z: (mins.z + maxs.z)/2 },
          mins,
          maxs
      );
  }

  setLagCompensation(active: boolean, client?: Entity, lagMs?: number): void {
      // Stub
  }
}

// Singleton management
let gameServiceInstance: GameServiceImpl | null = null;

export async function createGameSimulation(
  vfs: VirtualFileSystem,
  mapName: string,
  options: Partial<GameCreateOptions> = {} // Allow partial options
): Promise<GameSimulation> {
  // If exists, shutdown previous
  if (gameServiceInstance) {
    gameServiceInstance.shutdown();
  }

  // Fill defaults
  const fullOptions: GameCreateOptions = {
      gravity: { x: 0, y: 0, z: -800 },
      deathmatch: false,
      coop: false,
      skill: 1,
      ...options
  };

  const service = new GameServiceImpl(vfs, mapName);
  await service.init(fullOptions);

  gameServiceInstance = service;
  return service;
}

export function getGameService(): GameSimulation | null {
  return gameServiceInstance;
}

export function shutdownGameService(): void {
  if (gameServiceInstance) {
    gameServiceInstance.shutdown();
    gameServiceInstance = null;
  }
}
