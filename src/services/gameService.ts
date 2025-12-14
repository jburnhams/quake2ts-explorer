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
  type GameTraceResult,
  type MulticastType
} from 'quake2ts/game';

import {
  Vec3,
  type UserCommand,
  traceBox,
  pointContents,
  type CollisionModel,
  type CollisionTraceParams,
  CollisionEntityIndex,
  type CollisionEntityLink
} from 'quake2ts/shared';

import { createCollisionModel } from '../utils/collisionAdapter';

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
    const engineHost = {
      vfs: this.vfs,
      assetManager: this.assetManager
    };

    const imports: Partial<GameImports> = {
      trace: this.trace.bind(this),
      pointcontents: this.pointcontents.bind(this),
      multicast: this.multicast.bind(this),
      unicast: this.unicast.bind(this),
      configstring: this.configstring.bind(this),
      serverCommand: this.serverCommand.bind(this),
      soundIndex: this.soundIndex.bind(this),
      modelIndex: this.modelIndex.bind(this),
      imageIndex: this.imageIndex.bind(this),
      linkentity: this.linkentity.bind(this),
      unlinkentity: this.unlinkentity.bind(this),
    };

    this.gameExports = createGame(imports, engineHost, options);
    const initialFrame = this.gameExports.init(performance.now());
    if (initialFrame) {
      this.latestFrameResult = initialFrame;
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
      this.gameExports.shutdown();
      this.gameExports = null;
    }
    this.assetManager.resetForLevelChange();
    this.currentMap = null;
    this.collisionModel = null;
    // Reset entity index? It's specific to this instance, GC will handle it.
  }

  tick(step: FixedStepContext, cmd: UserCommand): void {
    if (!this.gameExports) return;
    this.latestFrameResult = this.gameExports.frame(step, cmd);
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

  trace(start: Vec3, mins: Vec3, maxs: Vec3, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult {
    const nullTrace = {
        allsolid: false,
        startsolid: false,
        fraction: 1.0,
        endpos: end,
        plane: { normal: { x: 0, y: 1, z: 0 }, dist: 0, type: 0, signbits: 0 },
        surface: { name: "default", flags: 0, value: 0 },
        contents: 0,
        ent: null
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
    // passId is the entity ID to ignore (self)
    const entityResult = this.entityIndex.trace({
        ...traceParams,
        passId: passent ? passent.id : -1
    });

    // 3. Combine results (take nearest)
    // If entity collision is closer (smaller fraction), use it.
    let finalResult = worldResult;
    let hitEntity: number | null = null;

    if (entityResult.fraction < worldResult.fraction) {
        finalResult = entityResult;
        hitEntity = entityResult.entityId;
    }

    // If startsolid, we might need to handle differently, but usually physics engine handles it.

    // Map back to GameTraceResult
    // We need to resolve hitEntity ID to an Entity object.
    // GameExports.entities.find(e => e.id === hitEntity)
    // But GameImports doesn't have direct access to GameExports.entities usually,
    // but we are inside GameServiceImpl which holds gameExports.

    let ent: Entity | null = null;
    if (hitEntity !== null && this.gameExports) {
        // Assuming we can access entities from gameExports
        // GameExports.entities is EntitySystem
        // EntitySystem has find/get methods?
        // EntitySystem definition: find(predicate), findAll, etc.
        // It doesn't seem to have getById(id).
        // But we can use find(e => e.id === hitEntity).
        ent = this.gameExports.entities.find(e => e.id === hitEntity);
    }

    return {
        allsolid: finalResult.allsolid,
        startsolid: finalResult.startsolid,
        fraction: finalResult.fraction,
        endpos: finalResult.endpos,
        plane: finalResult.plane || { normal: { x: 0, y: 0, z: 1 }, dist: 0, type: 0, signbits: 0 },
        surface: { name: "unknown", flags: finalResult.surfaceFlags || 0, value: 0 },
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
    if (entity.solid === 0) return; // NOT_SOLID (SolidType.NOT is 0 usually)

    const link: CollisionEntityLink = {
        id: entity.id,
        origin: entity.origin,
        mins: entity.mins,
        maxs: entity.maxs,
        contents: entity.clipmask || 1, // Default to 1 if no mask? Or use solid type mapping?
        // entity.solid type enum: NOT, TRIGGER, BBOX, BSP.
        // We probably only link BBOX and BSP.
    };
    this.entityIndex.link(link);
  }

  unlinkentity(entity: Entity): void {
    this.entityIndex.unlink(entity.id);
  }
}

// Singleton management
let gameServiceInstance: GameServiceImpl | null = null;

export async function createGameSimulation(
  vfs: VirtualFileSystem,
  mapName: string,
  options: GameCreateOptions = {
    maxClients: 1,
    deathmatch: false,
    coop: false,
    skill: 1,
    gravity: { x: 0, y: 0, z: -800 }
  }
): Promise<GameSimulation> {
  // If exists, shutdown previous
  if (gameServiceInstance) {
    gameServiceInstance.shutdown();
  }

  const service = new GameServiceImpl(vfs, mapName);
  await service.init(options);

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
