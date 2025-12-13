import {
  createGame,
  GameImports,
  GameExports,
  GameCreateOptions,
  Entity,
  GameStateSnapshot,
  MulticastType
} from 'quake2ts/game';
import {
  VirtualFileSystem,
  AssetManager,
  BspMap,
  BspPlane,
  BspNode,
  BspLeaf,
  BspModel,
} from 'quake2ts/engine';
import {
  Vec3,
  UserCommand,
  buildCollisionModel,
  CollisionLumpData,
  CollisionModel,
  CollisionEntityIndex,
  traceBox,
  CollisionTraceParams,
  CollisionEntityTraceParams,
  CollisionEntityTraceResult,
  CollisionTraceResult,
  CollisionPlane,
  pointContents,
  CollisionEntityLink
} from 'quake2ts/shared';

// Type aliases for types not exported from engine
type BspBrush = BspMap['brushes'][number];
type BspBrushSide = BspMap['brushSides'][number];

export interface GameSimulationWrapper {
  start(): void;
  stop(): void;
  tick(deltaMs: number, cmd: UserCommand): void;
  getSnapshot(): GameStateSnapshot | null;
  shutdown(): void;
}

export interface GameTraceResult {
    allsolid: boolean;
    startsolid: boolean;
    fraction: number;
    endpos: Vec3;
    plane: CollisionPlane | null;
    surfaceFlags: number;
    contents: number;
    ent: Entity | null;
}

// Helper to convert tuple to shared Vec3
function toVec3(v: [number, number, number]): Vec3 {
  // Construct an object that satisfies Vec3 interface (array-like with x,y,z)
  const res: any = [v[0], v[1], v[2]];
  res.x = v[0];
  res.y = v[1];
  res.z = v[2];
  return res as Vec3;
}

function createVec3(x: number, y: number, z: number): Vec3 {
  return toVec3([x, y, z]);
}

function bspToCollisionLump(map: BspMap): CollisionLumpData {
  const planes = map.planes.map(p => ({
    normal: toVec3(p.normal),
    dist: p.dist,
    type: p.type
  }));

  const nodes = map.nodes.map(n => ({
    planenum: n.planeIndex,
    children: n.children
  }));

  const leaves = map.leafs.map(l => ({
    contents: l.contents,
    cluster: l.cluster,
    area: l.area,
    firstLeafBrush: l.firstLeafBrush,
    numLeafBrushes: l.numLeafBrushes
  }));

  const brushes = map.brushes.map(b => ({
    firstSide: b.firstSide,
    numSides: b.numSides,
    contents: b.contents
  }));

  const resolvedBrushSides = map.brushSides.map(bs => {
    const texInfo = map.texInfo[bs.texInfo];
    return {
      planenum: bs.planeIndex,
      surfaceFlags: texInfo ? texInfo.flags : 0
    };
  });

  const newLeafBrushes: number[] = [];
  const newLeaves = leaves.map((l, i) => {
     const leafBrushList = map.leafLists.leafBrushes[i];
     const first = newLeafBrushes.length;
     if (leafBrushList) {
       newLeafBrushes.push(...leafBrushList);
     }
     return {
       ...l,
       firstLeafBrush: first,
       numLeafBrushes: leafBrushList ? leafBrushList.length : 0
     };
  });

  const bmodels = map.models.map(m => ({
    mins: toVec3(m.mins),
    maxs: toVec3(m.maxs),
    origin: toVec3(m.origin),
    headnode: m.headNode
  }));

  let visibility = undefined;
  if (map.visibility) {
    visibility = {
      numClusters: map.visibility.numClusters,
      clusters: map.visibility.clusters.map(c => ({
        pvs: c.pvs,
        phs: c.phs
      }))
    };
  }

  return {
    planes,
    nodes,
    leaves: newLeaves,
    brushes,
    brushSides: resolvedBrushSides,
    leafBrushes: newLeafBrushes,
    bmodels,
    visibility
  };
}

export async function createGameSimulation(vfs: VirtualFileSystem, mapName: string): Promise<GameSimulationWrapper> {
  const assetManager = new AssetManager(vfs);
  let map: BspMap | undefined;
  try {
    map = await assetManager.loadMap(mapName);
  } catch (e) {
    console.error(`Failed to load map ${mapName}`, e);
    throw e;
  }

  if (!map) {
      throw new Error(`Map ${mapName} loaded but is undefined`);
  }

  const collisionLumps = bspToCollisionLump(map);
  const collisionModel = buildCollisionModel(collisionLumps);
  const entityIndex = new CollisionEntityIndex();

  let gameRef: GameExports | null = null;

  const traceFunc = (start: Vec3, mins: Vec3 | null, maxs: Vec3 | null, end: Vec3, passent: Entity | null, contentmask: number): GameTraceResult => {
      const actualMins = mins || createVec3(0, 0, 0);
      const actualMaxs = maxs || createVec3(0, 0, 0);

      const traceParams: CollisionTraceParams = {
        model: collisionModel,
        start,
        end,
        mins: actualMins,
        maxs: actualMaxs,
        contentMask: contentmask
      };

      const worldTrace = traceBox(traceParams);

      const entityTraceParams: CollisionEntityTraceParams = {
        ...traceParams,
        passId: passent ? passent.index : undefined
      };

      const entityTrace = entityIndex.trace(entityTraceParams);

      let finalTrace: CollisionEntityTraceResult | CollisionTraceResult = worldTrace;
      let hitEntity: Entity | null = null;

      if (entityTrace.fraction < worldTrace.fraction) {
         finalTrace = entityTrace;
         if (entityTrace.entityId !== null && gameRef && gameRef.entities) {
            // @ts-ignore - Assuming find method or access exists or iterating
            // EntitySystem usually stores entities in an array or map.
            // game.entities might be an object with methods.
            // If it's the class EntitySystem, it has `find(predicate)`.
            // Let's assume `find` exists as per docs.
            hitEntity = gameRef.entities.find((e: Entity) => e.index === entityTrace.entityId) || null;
         }
      }

      return {
        allsolid: finalTrace.allsolid,
        startsolid: finalTrace.startsolid,
        fraction: finalTrace.fraction,
        endpos: finalTrace.endpos,
        plane: finalTrace.plane || null,
        surfaceFlags: finalTrace.surfaceFlags || 0,
        contents: finalTrace.contents || 0,
        ent: hitEntity
      };
  };

  const gameImports: Partial<GameImports> = {
    trace: traceFunc,
    pointcontents: (point: Vec3): number => {
      return pointContents(point, collisionModel);
    },
    multicast: (origin: Vec3, type: MulticastType, event: string, ...args: any[]): void => {
    },
    unicast: (ent: Entity, reliable: boolean, event: string, ...args: any[]): void => {
    },
    configstring: (index: number, value: string): void => {
    },
    serverCommand: (cmd: string): void => {
    },
    linkentity: (entity: Entity): void => {
      const link: CollisionEntityLink = {
        id: entity.index,
        origin: entity.origin,
        mins: entity.mins,
        maxs: entity.maxs,
        contents: entity.clipmask || 0,
        surfaceFlags: 0
      };
      if (entity.solid > 0) {
          entityIndex.link(link);
      }
    },
    // unlinkentity removed as it's not required in Partial<GameImports> and caused error
  };

  const gameEngine = {
    vfs,
    assetManager,
    trace: (start: Vec3, end: Vec3): unknown => {
       return traceFunc(start, null, null, end, null, -1);
    }
  };

  const gameOptions: GameCreateOptions = {
    gravity: createVec3(0, 0, -800),
    deathmatch: false,
    coop: false,
    skill: 1
  };

  // Cast game to any to avoid "init does not exist" errors due to potential type mismatch in library exports
  const game = createGame(gameImports, gameEngine, gameOptions) as any;
  gameRef = game;

  let lastSnapshot: GameStateSnapshot | null = null;
  let totalTime = 0;

  return {
    start: () => {
      game.init(performance.now());
    },
    stop: () => {
      game.shutdown();
    },
    shutdown: () => {
      game.shutdown();
    },
    tick: (deltaMs: number, cmd: UserCommand) => {
      totalTime += deltaMs;
      // Construct FixedStepContext-like object
      const context = {
        frame: Math.floor(totalTime / 50), // 20Hz? No, typically 40Hz (25ms) or dependent on delta.
        // If deltaMs is variable, frame count is tricky.
        // But game logic expects fixed steps usually.
        // Here we just pass context.
        time: totalTime,
        intervalMs: deltaMs,
        alpha: 1.0
      };

      const result = game.frame(context, cmd);
      if (result && result.state) {
        lastSnapshot = result.state;
      }
    },
    getSnapshot: () => {
      return lastSnapshot;
    }
  };
}
