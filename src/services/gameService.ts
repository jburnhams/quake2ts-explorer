import {
  AssetManager,
  VirtualFileSystem,
  type BspMap,
  type GameFrameResult,
  type FixedStepContext
} from 'quake2ts/engine';

import {
  createGame,
  type GameImports,
  type GameExports,
  type GameCreateOptions,
  type GameStateSnapshot,
  type Entity,
  type MulticastType,
  type GameEngine,
  type GameSaveFile
} from 'quake2ts/game';

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
import { multiplayerGameService } from './multiplayerGameService';

// Re-define GameTraceResult since it's not exported from main entry point of game package
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
export type { GameSimulation, GameStateSnapshot, GameSaveFile };

interface GameSimulation {
  start(): void;
  stop(): void;
  tick(step: FixedStepContext, cmd: UserCommand): void;
  getSnapshot(): GameStateSnapshot;
  shutdown(): void;
  createSave(description: string): GameSaveFile;
  loadSave(save: GameSaveFile): void;
}

// Factory options extension
export interface ExtendedGameCreateOptions extends Partial<GameCreateOptions> {
  multiplayer?: boolean;
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
  private skill: number = 1; // Default difficulty

  constructor(
    private vfs: VirtualFileSystem,
    private mapName: string
  ) {
    this.assetManager = new AssetManager(vfs);
    this.entityIndex = new CollisionEntityIndex();
  }

  async init(options: GameCreateOptions): Promise<void> {
    // Store skill for save games
    if (options.skill !== undefined) {
      this.skill = options.skill;
    }

    // 1. Load the map
    this.currentMap = await this.assetManager.loadMap(this.mapName);

    if (!this.currentMap) {
      throw new Error(`Failed to load map: ${this.mapName}`);
    }

    // Convert to CollisionModel for physics
    this.collisionModel = createCollisionModel(this.currentMap);

    // 2. Initialize the game instance
    const engineHost: GameEngine = {
      trace: (start: Vec3, end: Vec3) => {
          // GameEngine trace signature is simpler than GameImports.trace
          return this.trace(start, null, null, end, null, 1 /* MASK_SOLID usually */);
      },
      sound: (entity, channel, sound, volume, attenuation, timeofs) => {
          // Stub for audio
      },
      soundIndex: this.soundIndex.bind(this),
      modelIndex: this.modelIndex.bind(this),
      multicast: this.multicast.bind(this),
      unicast: this.unicast.bind(this),
      configstring: this.configstring.bind(this),
      serverCommand: this.serverCommand.bind(this)
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

    // Call init if available and capture initial frame result
    if (this.gameExports) {
        const result = (this.gameExports as any).init(performance.now());
        if (result) {
            this.latestFrameResult = result as GameFrameResult<GameStateSnapshot>;
        }
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
      (this.gameExports as any).shutdown();
      this.gameExports = null;
    }
    // AssetManager cleanup
    if (typeof (this.assetManager as any).clearCache === 'function') {
        (this.assetManager as any).clearCache();
    }
    this.currentMap = null;
    this.collisionModel = null;
  }

  tick(step: FixedStepContext, cmd: UserCommand): void {
    if (!this.gameExports) return;

    this.latestFrameResult = (this.gameExports as any).frame(step, cmd);
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

  createSave(description: string): GameSaveFile {
    if (!this.gameExports) {
      throw new Error("Game not initialized");
    }

    // Calculate playtime (using current game time from exports)
    const playtimeSeconds = this.gameExports.time || 0;

    // Cast to any to bypass potential missing type definitions in current library version
    return (this.gameExports as any).createSave(this.mapName, this.skill, playtimeSeconds);
  }

  loadSave(save: GameSaveFile): void {
    if (!this.gameExports) {
      throw new Error("Game not initialized");
    }

    // Cast to any to bypass potential missing type definitions in current library version
    (this.gameExports as any).loadSave(save);
  }

  // --- GameImports / EngineHost Implementations ---

  trace(start: Vec3, mins: Vec3 | null, maxs: Vec3 | null, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult {
    const nullTrace: GameTraceResult = {
        allsolid: false,
        startsolid: false,
        fraction: 1.0,
        endpos: end,
        plane: { normal: { x: 0, y: 1, z: 0 }, dist: 0, type: 0, signbits: 0 },
        surfaceFlags: 0,
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
        plane: finalResult.plane || null,
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

// Singleton management for local game
let gameServiceInstance: GameSimulation | null = null;

export async function createGameSimulation(
  vfs: VirtualFileSystem,
  mapName: string,
  options: ExtendedGameCreateOptions = {}
): Promise<GameSimulation> {
  // If exists, shutdown previous
  if (gameServiceInstance) {
    gameServiceInstance.shutdown();
  }

  // Check if multiplayer requested
  if (options.multiplayer) {
      await multiplayerGameService.init(vfs, mapName);
      gameServiceInstance = multiplayerGameService;
      return multiplayerGameService;
  }

  // Local game setup
  const fullOptions: GameCreateOptions = {
      gravity: { x: 0, y: 0, z: -800 },
      deathmatch: false,
      coop: false,
      skill: 1,
      // maxClients removed as it's not in the interface
      ...options
  } as GameCreateOptions;

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
