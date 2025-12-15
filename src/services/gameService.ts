import {
  AssetManager,
  VirtualFileSystem,
  type BspMap,
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

import {
  Vec3,
  type UserCommand,
  pointContents,
  type CollisionModel,
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
  tick(deltaMs: number, cmd: UserCommand): void;
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

  // Simulation state
  private frameCount = 0;

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

    if (!this.currentMap) {
      throw new Error(`Failed to load map: ${this.mapName}`);
    }

    // Convert to CollisionModel for physics
    this.collisionModel = createCollisionModel(this.currentMap);

    // 2. Initialize the game instance
    const engineHost: GameEngine = {
      vfs: this.vfs,
      assetManager: this.assetManager
    };

    const imports: Partial<GameImports> = {
      pointcontents: this.pointcontents.bind(this),
      multicast: this.multicast.bind(this),
      unicast: this.unicast.bind(this),
      configstring: this.configstring.bind(this),
      serverCommand: this.serverCommand.bind(this),
      linkentity: this.linkentity.bind(this),
      unlinkentity: this.unlinkentity.bind(this),
      soundIndex: this.soundIndex.bind(this),
      modelIndex: this.modelIndex.bind(this),
      imageIndex: this.imageIndex.bind(this),
      areaEdicts: this.areaEdicts.bind(this),
      setLagCompensation: this.setLagCompensation.bind(this)
    };

    this.gameExports = createGame(imports, engineHost, options);

    if (this.gameExports && typeof this.gameExports.init === 'function') {
        this.gameExports.init();
    }
  }

  start(): void {
    // Reset simulation state
    this.frameCount = 0;
  }

  stop(): void {
    // Stop logic
  }

  shutdown(): void {
    if (this.gameExports) {
      this.gameExports.shutdown();
      this.gameExports = null;
    }
    this.assetManager.clearCache();
    this.currentMap = null;
    this.collisionModel = null;
  }

  tick(deltaMs: number, cmd: UserCommand): void {
    if (!this.gameExports) return;

    this.frameCount++;
    this.gameExports.frame(this.frameCount, cmd);
  }

  getSnapshot(): GameStateSnapshot {
    if (!this.gameExports) {
      throw new Error("Game not initialized");
    }

    return this.gameExports.snapshot();
  }

  // --- GameImports Implementations ---

  trace(start: Vec3, mins: Vec3 | null, maxs: Vec3 | null, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult {
    // Stub implementation as engine handles traces internally now
    return {
        allsolid: false,
        startsolid: false,
        fraction: 1.0,
        endpos: end,
        plane: { normal: { x: 0, y: 1, z: 0 }, dist: 0, type: 0, signbits: 0 },
        surfaceFlags: 0,
        contents: 0,
        ent: null
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
      maxClients: 1, // Added maxClients based on usage.md
      ...options
  };

  // Force cast to GameCreateOptions to ignore extra properties
  const service = new GameServiceImpl(vfs, mapName);
  await service.init(fullOptions as unknown as GameCreateOptions);

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
