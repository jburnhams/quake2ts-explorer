import {
  createGame,
  GameImports,
  GameExports,
  GameCreateOptions,
  GameTraceResult,
  GameStateSnapshot,
  MulticastType,
  ServerCommand
} from 'quake2ts/game';
import {
  AssetManager,
  VirtualFileSystem,
  GameEngine,
  BspMap
} from 'quake2ts/engine';
import {
  Vec3,
  UserCommand,
  EntityState,
  PlayerState,
  traceBox,
  CollisionModel,
  CollisionTraceParams,
  pointContents
} from 'quake2ts/shared';
import { createCollisionModel } from '../utils/collisionAdapter';
import { getConsoleService } from './consoleService';
import { saveGame, loadGame } from './saveService';

// Interface for the GameService logic
export interface GameSimulation {
  start(): void;
  stop(): void;
  tick(deltaMs: number, cmd: UserCommand): void;
  getSnapshot(): GameStateSnapshot | null;

  // Lifecycle
  initGame(mapName: string, options: Partial<GameCreateOptions>): Promise<void>;
  shutdownGame(): void;

  // Accessors
  getExports(): GameExports | null;
}

class GameServiceImpl implements GameSimulation, GameImports {
  private vfs: VirtualFileSystem;
  private assetManager: AssetManager;
  private gameExports: GameExports | null = null;
  private gameEngine: GameEngine;
  private mapName: string | null = null;
  private collisionModel: CollisionModel | null = null;

  constructor(vfs: VirtualFileSystem, assetManager?: AssetManager) {
    this.vfs = vfs;
    this.assetManager = assetManager || new AssetManager(vfs);

    // Construct the GameEngine object required by createGame
    this.gameEngine = {
      vfs: this.vfs,
      assetManager: this.assetManager
    };

    this.registerCommands();
  }

  private registerCommands() {
      const console = getConsoleService();

      console.registerCommand('map', async (args) => {
          if (args.length < 1) {
              console.log('Usage: map <mapname>', 'warning');
              return;
          }
          const mapName = args[0];
          console.log(`Loading map ${mapName}...`, 'info');
          try {
             await this.initGame(mapName);
             console.log(`Map ${mapName} loaded.`, 'info');
          } catch (e) {
             console.log(`Failed to load map: ${e}`, 'error');
          }
      });

      console.registerCommand('save', async (args) => {
          if (args.length < 2) {
              console.log('Usage: save <slot> <name>', 'warning');
              return;
          }
          const slot = parseInt(args[0], 10);
          const name = args.slice(1).join(' ');
          try {
              await saveGame(slot, name);
              console.log(`Game saved to slot ${slot}: ${name}`, 'info');
          } catch (e) {
              console.log(`Save failed: ${e}`, 'error');
          }
      });

      console.registerCommand('load', async (args) => {
           if (args.length < 1) {
              console.log('Usage: load <slot>', 'warning');
              return;
          }
          const slot = parseInt(args[0], 10);
          try {
              const save = await loadGame(slot);
              if (save) {
                  // In real impl, we would load state here.
                  // For now, just re-init map if available
                  // await this.loadState(save.gameState);
                  console.log(`Loaded save: ${save.name}`, 'info');
                  // Hack: re-init map
                  // this.initGame(save.mapName);
              } else {
                  console.log(`No save found in slot ${slot}`, 'warning');
              }
          } catch (e) {
               console.log(`Load failed: ${e}`, 'error');
          }
      });

      console.registerCommand('god', () => {
          if (this.gameExports) {
              this.gameExports.setGodMode(true);
              console.log('God Mode enabled', 'info');
          } else {
              console.log('Game not running', 'error');
          }
      });

      console.registerCommand('noclip', () => {
          if (this.gameExports) {
              this.gameExports.setNoclip(true);
              console.log('Noclip enabled', 'info');
          } else {
              console.log('Game not running', 'error');
          }
      });

      console.registerCommand('notarget', () => {
          if (this.gameExports) {
              this.gameExports.setNotarget(true);
              console.log('Notarget enabled', 'info');
          } else {
              console.log('Game not running', 'error');
          }
      });

      console.registerCommand('give', (args) => {
          if (args.length < 1) {
              console.log('Usage: give <item>', 'warning');
              return;
          }
          if (this.gameExports) {
              this.gameExports.giveItem(args[0]);
              console.log(`Gave ${args[0]}`, 'info');
          } else {
              console.log('Game not running', 'error');
          }
      });

      console.registerCommand('kill', () => {
          if (this.gameExports) {
              this.gameExports.damage(10000);
              console.log('Suicide', 'info');
          } else {
              console.log('Game not running', 'error');
          }
      });
  }

  // --- GameSimulation Implementation ---

  start(): void {
    // Game loop control is handled externally
  }

  stop(): void {
    if (this.gameExports) {
      this.gameExports.shutdown();
      this.gameExports = null;
    }
    this.collisionModel = null;
  }

  tick(deltaMs: number, cmd: UserCommand): void {
    if (this.gameExports) {
      this.gameExports.frame(deltaMs, cmd);
    }
  }

  getSnapshot(): GameStateSnapshot | null {
    if (this.gameExports) {
      return this.gameExports.snapshot();
    }
    return null;
  }

  async initGame(mapName: string, options: Partial<GameCreateOptions> = {}): Promise<void> {
    this.mapName = mapName;

    // Ensure map is loaded and create collision model
    const map = await this.assetManager.getMap(mapName);
    if (!map) {
        throw new Error(`Failed to load map: ${mapName}`);
    }

    this.collisionModel = createCollisionModel(map);

    // Default options
    const createOptions: GameCreateOptions = {
      maxClients: 1,
      deathmatch: false,
      coop: false,
      skill: 1,
      gravity: { x: 0, y: 0, z: -800 },
      ...options
    };

    // Create the game instance
    this.gameExports = createGame(this, this.gameEngine, createOptions);

    // Initialize
    this.gameExports.init();

    // Spawn the world
    if (this.gameExports.spawnWorld) {
        this.gameExports.spawnWorld();
    }
  }

  shutdownGame(): void {
    this.stop();
  }

  getExports(): GameExports | null {
    return this.gameExports;
  }

  // --- GameImports Implementation ---

  trace(start: Vec3, mins: Vec3, maxs: Vec3, end: Vec3, passent: any, contentmask: number): GameTraceResult {
    if (!this.collisionModel) {
        return {
          allsolid: false,
          startsolid: false,
          fraction: 1.0,
          endpos: end,
          plane: { normal: { x: 0, y: 0, z: 1 }, dist: 0, type: 0, signbits: 0 },
          surface: { name: 'null', flags: 0, value: 0 },
          contents: 0,
          ent: null
        };
    }

    const params: CollisionTraceParams = {
        model: this.collisionModel,
        start,
        end,
        mins: mins, // traceBox handles null/undefined mins/maxs by treating as ray?
                    // Usage says "mins: Vec3 | null" in game export, but traceBox params might be strict.
                    // If mins/maxs are zero vector or null, it is a ray trace.
        maxs: maxs,
        contentMask: contentmask
    };

    // Note: The game engine might pass specific mins/maxs.
    // We need to ensure types match. `GameImports.trace` uses `Vec3`. `CollisionTraceParams` uses `Vec3`.
    // The `passent` is the entity to skip. `traceBox` doesn't handle entity skipping natively for world traces,
    // but typically world trace is against the map.
    // Entities trace is separate.

    // TODO: We are only tracing against the world (BSP) here.
    // To support tracing against other entities, we need an entity system reference or `clip` manager.
    // For single player against world geometry, this is often sufficient for basic movement.

    const result = traceBox(params);

    // Map CollisionTraceResult to GameTraceResult
    return {
        allsolid: result.allsolid,
        startsolid: result.startsolid,
        fraction: result.fraction,
        endpos: result.endpos,
        plane: result.plane || { normal: { x: 0, y: 0, z: 1 }, dist: 0, type: 0, signbits: 0 },
        surface: { name: 'surface', flags: result.surfaceFlags || 0, value: 0 }, // Surface info might be limited
        contents: result.contents || 0,
        ent: null // World trace doesn't hit entities
    };
  }

  pointcontents(point: Vec3): number {
    if (!this.collisionModel) return 0;
    return pointContents(point, this.collisionModel);
  }

  multicast(origin: Vec3, to: MulticastType, event: ServerCommand, ...args: any[]): void {
  }

  unicast(entity: any, reliable: boolean, event: ServerCommand, ...args: any[]): void {
  }

  configstring(index: number, value: string): void {
    // In client-server, this updates the client.
    // In local game, we might store this to pass to our local client/renderer.
  }

  serverCommand(cmd: string): void {
  }

  soundIndex(name: string): number {
    return 0;
  }

  modelIndex(name: string): number {
    return 0;
  }

  imageIndex(name: string): number {
    return 0;
  }

  linkentity(entity: any): void {
  }

  unlinkentity(entity: any): void {
  }
}

// Singleton instance management
let gameServiceInstance: GameServiceImpl | null = null;

export function createGameSimulation(vfs: VirtualFileSystem): GameSimulation {
  if (gameServiceInstance) {
     return gameServiceInstance;
  }
  gameServiceInstance = new GameServiceImpl(vfs);
  return gameServiceInstance;
}

export function getGameService(): GameSimulation | null {
  return gameServiceInstance;
}

export function resetGameService(): void {
    if (gameServiceInstance) {
        gameServiceInstance.stop();
        gameServiceInstance = null;
    }
}

export const shutdownGameService = resetGameService;
