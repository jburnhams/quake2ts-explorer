import {
  type FixedStepContext,
  type GameFrameResult,
  type VirtualFileSystem,
  type BspMap,
  AssetManager
} from 'quake2ts/engine';

import {
  type GameSimulation,
  type GameStateSnapshot,
  type GameSaveFile
} from './gameService';

import {
  type UserCommand,
  type PlayerState,
  type EntityState,
  traceBox,
  pointContents,
  type CollisionTraceParams,
  CollisionEntityIndex,
  type Entity,
  type CollisionEntityLink,
  type CollisionPlane,
  Vec3
} from 'quake2ts/shared';

import { createCollisionModel } from '../utils/collisionAdapter';
import { networkService, type GameStateSnapshot as NetSnapshot } from './networkService';
import { predictionService } from './predictionService';
import { inputService } from './inputService';

export class MultiplayerGameService implements GameSimulation {
  private latestSnapshot: GameStateSnapshot | null = null;
  private predictedState: PlayerState | null = null;
  private isRunning: boolean = false;
  private assetManager: AssetManager | null = null;
  private collisionModel: any = null; // CollisionModel
  private entityIndex: CollisionEntityIndex | null = null;

  constructor() {
    // Setup network callbacks
    networkService.setCallbacks({
      onSnapshot: (snapshot) => this.onServerSnapshot(snapshot),
      onDisconnect: (reason) => this.onDisconnect(reason)
      // TODO: Handle other callbacks
    });
  }

  public async init(vfs: VirtualFileSystem, mapName: string): Promise<void> {
    this.assetManager = new AssetManager(vfs);
    this.entityIndex = new CollisionEntityIndex();

    // Load map for collision
    const map = await this.assetManager.loadMap(mapName);
    if (!map) {
      throw new Error(`Failed to load map: ${mapName}`);
    }

    this.collisionModel = createCollisionModel(map);

    // Init prediction with collision traces
    predictionService.init({
      trace: this.trace.bind(this),
      pointContents: this.pointContents.bind(this)
    });
  }

  public async start(): Promise<void> {
    if (!this.assetManager) {
        throw new Error("MultiplayerGameService not initialized with map");
    }
    this.isRunning = true;
    predictionService.setEnabled(true);
  }

  public stop(): void {
    this.isRunning = false;
    predictionService.setEnabled(false);
  }

  public shutdown(): void {
    this.stop();
    networkService.disconnect();
    this.assetManager = null;
    this.collisionModel = null;
    this.entityIndex = null;
  }

  public tick(step: FixedStepContext, cmd: UserCommand): void {
    if (!this.isRunning) return;

    // 1. Send command to server
    networkService.sendCommand(cmd);

    // 2. Predict local movement
    const predicted = predictionService.predict(cmd);

    // Store for rendering
    this.predictedState = predicted;
  }

  public getSnapshot(): GameStateSnapshot {
    if (!this.latestSnapshot) {
        return {
            time: 0,
            playerState: this.predictedState || ({} as PlayerState),
            entities: [],
            events: []
        };
    }

    return {
        ...this.latestSnapshot,
        playerState: this.predictedState || this.latestSnapshot.playerState
    };
  }

  public createSave(description: string): GameSaveFile {
    throw new Error("Cannot save in multiplayer");
  }

  public loadSave(save: GameSaveFile): void {
    throw new Error("Cannot load save in multiplayer");
  }

  private onServerSnapshot(netSnapshot: NetSnapshot): void {
    this.latestSnapshot = {
        time: netSnapshot.time,
        playerState: netSnapshot.playerState,
        entities: netSnapshot.entities,
        events: []
    };

    // Update prediction with proper server time
    predictionService.onServerFrame(netSnapshot.playerState as any, 0, netSnapshot.time);
  }

  private onDisconnect(reason: string): void {
    console.log(`Disconnected: ${reason}`);
    this.stop();
  }

  // --- Collision Trace for Prediction ---
  // Mirrors GameServiceImpl logic
  private trace(start: Vec3, mins: Vec3 | null, maxs: Vec3 | null, end: Vec3, passent: Entity | null, contentmask: number): any {
    if (!this.collisionModel) {
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

    const traceParams: CollisionTraceParams = {
        model: this.collisionModel,
        start,
        end,
        mins: mins || undefined,
        maxs: maxs || undefined,
        headnode: 0,
        contentMask: contentmask
    };

    return traceBox(traceParams);
    // Note: We skip entity trace for prediction usually, or need to replicate entity linking locally.
    // Standard Q2 client prediction mostly traces against world.
  }

  private pointContents(point: Vec3): number {
    if (!this.collisionModel) return 0;
    return pointContents(point, this.collisionModel, 0);
  }
}

export const multiplayerGameService = new MultiplayerGameService();
