import {
  type FixedStepContext,
  type VirtualFileSystem,
  AssetManager
} from '@quake2ts/engine';

import {
  type GameSimulation,
  type GameSaveFile,
  type GameStateSnapshot as GameSnapshot
} from './gameService';

import {
  type UserCommand,
  type PlayerState,
  type EntityState,
  traceBox,
  pointContents,
  type CollisionTraceParams,
  CollisionEntityIndex,
  type CollisionEntityLink,
  type CollisionPlane,
  Vec3,
  type PmoveTraceResult,
  CONTENTS_SOLID
} from '@quake2ts/shared';
import { type Entity } from '@quake2ts/game';

import { createCollisionModel } from '../utils/collisionAdapter';
import { networkService, type GameStateSnapshot as NetSnapshot } from './networkService';
import { predictionService } from './predictionService';

export class MultiplayerGameService implements GameSimulation {
  private latestSnapshot: NetSnapshot | null = null;
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

  public getSnapshot(): GameSnapshot {
    const ps = this.predictedState || this.latestSnapshot?.playerState || ({} as PlayerState);

    // Map PlayerState to GameStateSnapshot (flattened)
    return {
        time: this.latestSnapshot?.time || 0,
        gravity: { x: 0, y: 0, z: -800 },
        origin: ps.origin || { x: 0, y: 0, z: 0 },
        velocity: ps.velocity || { x: 0, y: 0, z: 0 },
        viewangles: ps.viewAngles || { x: 0, y: 0, z: 0 },
        pmFlags: ps.pm_flags || 0,
        pmType: ps.pm_type || 0,
        waterlevel: ps.waterLevel || 0,
        deltaAngles: { x: 0, y: 0, z: 0 },

        stats: ps.stats || [],
        health: (ps.stats && ps.stats[1]) || 0,
        armor: (ps.stats && ps.stats[4]) || 0,
        ammo: (ps.stats && ps.stats[2]) || 0,

        blend: ps.blend || [0, 0, 0, 0],
        pickupIcon: ps.pickupIcon,
        damageAlpha: ps.damageAlpha || 0,
        damageIndicators: ps.damageIndicators || [],

        kick_angles: ps.kick_angles || { x: 0, y: 0, z: 0 },
        kick_origin: ps.kick_origin || { x: 0, y: 0, z: 0 },
        gunoffset: ps.gunoffset || { x: 0, y: 0, z: 0 },
        gunangles: ps.gunangles || { x: 0, y: 0, z: 0 },
        gunindex: ps.gunindex || 0,
        pm_time: ps.pm_time || 0,
        gun_frame: ps.gun_frame || 0,
        rdflags: ps.rdflags || 0,
        fov: ps.fov || 90,
        renderfx: ps.renderfx || 0,

        // World / Level
        level: {} as any,
        entities: {
            activeCount: this.latestSnapshot?.entities.length || 0,
            worldClassname: 'worldspawn'
        },
        packetEntities: this.latestSnapshot?.entities || []
    } as unknown as GameSnapshot;
  }

  public getConfigStrings(): Map<number, string> {
      return new Map();
  }

  public createSave(description: string): GameSaveFile {
    throw new Error("Cannot save in multiplayer");
  }

  public loadSave(save: GameSaveFile): void {
    throw new Error("Cannot load save in multiplayer");
  }

  private onServerSnapshot(netSnapshot: NetSnapshot): void {
    this.latestSnapshot = netSnapshot;

    // Update prediction with proper server time
    predictionService.onServerFrame(netSnapshot.playerState as any, 0, netSnapshot.time);
  }

  private onDisconnect(reason: string): void {
    console.log(`Disconnected: ${reason}`);
    this.stop();
  }

  // --- Collision Trace for Prediction ---
  // Matches PmoveTraceFn
  private trace(start: Vec3, end: Vec3, mins?: Vec3, maxs?: Vec3): PmoveTraceResult {
    if (!this.collisionModel) {
        return {
            allsolid: false,
            startsolid: false,
            fraction: 1.0,
            endpos: end,
            // plane: ... PmoveTraceResult expects planeNormal?
        };
    }

    const traceParams: CollisionTraceParams = {
        model: this.collisionModel,
        start,
        end,
        mins: mins || undefined,
        maxs: maxs || undefined,
        headnode: 0,
        contentMask: CONTENTS_SOLID // Default mask
    };

    const result = traceBox(traceParams);

    // Convert to PmoveTraceResult
    return {
        allsolid: result.allsolid,
        startsolid: result.startsolid,
        fraction: result.fraction,
        endpos: result.endpos,
        planeNormal: result.plane?.normal, // Adapt plane
        surfaceFlags: result.surfaceFlags,
        contents: result.contents
    };
  }

  private pointContents(point: Vec3): number {
    if (!this.collisionModel) return 0;
    return pointContents(point, this.collisionModel, 0);
  }
}

export const multiplayerGameService = new MultiplayerGameService();
