import { createGameSimulation } from '@/src/services/gameService';
import { VirtualFileSystem, AssetManager } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import { buildCollisionModel, traceBox, pointContents, CollisionEntityIndex } from 'quake2ts/shared';

// Mocks
jest.mock('quake2ts/engine', () => {
  return {
    VirtualFileSystem: jest.fn().mockImplementation(() => ({})),
    AssetManager: jest.fn().mockImplementation(() => ({
      loadMap: jest.fn(),
      getMap: jest.fn(),
      resetForLevelChange: jest.fn()
    })),
  };
});

jest.mock('quake2ts/game', () => {
  return {
    createGame: jest.fn(),
    MulticastType: { All: 0 }
  };
});

jest.mock('quake2ts/shared', () => {
  const actual = jest.requireActual('quake2ts/shared');
  return {
    ...actual,
    buildCollisionModel: jest.fn(),
    CollisionEntityIndex: jest.fn(),
    traceBox: jest.fn(),
    pointContents: jest.fn(),
    createVec3: jest.fn((x,y,z) => ({x,y,z})),
  };
});

const mockEntityIndexInstance = {
  link: jest.fn(),
  unlink: jest.fn(),
  trace: jest.fn().mockReturnValue({ fraction: 1.0, entityId: null })
};
(CollisionEntityIndex as unknown as jest.Mock).mockReturnValue(mockEntityIndexInstance);

describe('GameService', () => {
  let vfs: any;
  let assetManager: any;
  let gameInstance: any;
  let capturedImports: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockEntityIndexInstance behavior
    mockEntityIndexInstance.link.mockClear();
    mockEntityIndexInstance.unlink.mockClear();
    mockEntityIndexInstance.trace.mockReset().mockReturnValue({ fraction: 1.0, entityId: null });

    vfs = new VirtualFileSystem();
    assetManager = new AssetManager(vfs);
    (AssetManager as unknown as jest.Mock).mockImplementation(() => assetManager);

    // Mock map data with full structure to test bspToCollisionLump
    assetManager.loadMap.mockResolvedValue({
      planes: [{ normal: [0, 0, 1], dist: 0, type: 0 }],
      nodes: [{ planeIndex: 0, children: [1, -1] }],
      leafs: [{ contents: 1, cluster: 0, area: 0, firstLeafBrush: 0, numLeafBrushes: 1 }],
      leafLists: { leafBrushes: [0] },
      brushes: [{ firstSide: 0, numSides: 6, contents: 1 }],
      brushSides: [{ planeIndex: 0, texInfo: 0 }],
      texInfo: [{ flags: 0 }],
      models: [{ mins: [-10,-10,-10], maxs: [10,10,10], origin: [0,0,0], headNode: 0 }],
      visibility: { numClusters: 1, clusters: [{ pvs: [], phs: [] }] }
    });

    gameInstance = {
      init: jest.fn(),
      shutdown: jest.fn(),
      frame: jest.fn().mockReturnValue({ state: { time: 100 } }),
      snapshot: jest.fn(),
      entities: [
          { index: 1, origin: {x:0,y:0,z:0} } // Mock entity for trace find
      ]
    };

    (createGame as jest.Mock).mockImplementation((imports: any) => {
        capturedImports = imports;
        return gameInstance;
    });

    // Mock traceBox default return
    (traceBox as jest.Mock).mockReturnValue({
        fraction: 1.0,
        allsolid: false,
        startsolid: false,
        endpos: {x:0,y:0,z:0},
        plane: { normal: {x:0,y:0,z:1}, dist:0, type:0 },
        contents: 0,
        surfaceFlags: 0
    });

  });

  it('initializes game simulation correctly and maps BSP data', async () => {
    const simulation = await createGameSimulation(vfs, 'maps/test.bsp');

    expect(assetManager.loadMap).toHaveBeenCalledWith('maps/test.bsp');
    expect(createGame).toHaveBeenCalled();

    simulation.start();
    expect(gameInstance.init).toHaveBeenCalled();
  });

  it('handles map load failure', async () => {
      assetManager.loadMap.mockRejectedValue(new Error('Failed'));
      await expect(createGameSimulation(vfs, 'maps/fail.bsp')).rejects.toThrow('Failed');
  });

  it('handles undefined map', async () => {
      assetManager.loadMap.mockResolvedValue(undefined);
      await expect(createGameSimulation(vfs, 'maps/empty.bsp')).rejects.toThrow('Failed to load map');
  });

  it('runs game loop tick', async () => {
    const simulation = await createGameSimulation(vfs, 'maps/test.bsp');
    simulation.tick(50, {} as any);
    expect(gameInstance.frame).toHaveBeenCalled();
  });

  describe('GameImports callbacks', () => {
      let simulation: any;

      beforeEach(async () => {
          simulation = await createGameSimulation(vfs, 'maps/test.bsp');
      });

      it('implements trace callback (world hit)', () => {
          (traceBox as jest.Mock).mockReturnValue({
              fraction: 0.5,
              endpos: {x:50,y:0,z:0},
              contents: 1,
              plane: { normal: {x:-1,y:0,z:0}, dist: 50 },
              surfaceFlags: 0,
              allsolid: false,
              startsolid: false
          });
          mockEntityIndexInstance.trace.mockReturnValue({ fraction: 1.0 });

          const result = capturedImports.trace(
              {x:0,y:0,z:0}, {x:-10,y:-10,z:-10}, {x:10,y:10,z:10}, {x:100,y:0,z:0}, null, -1
          );

          expect(result.fraction).toBe(0.5);
          expect(result.contents).toBe(1);
          expect(result.ent).toBeNull();
      });

      it('implements trace callback (entity hit)', () => {
          (traceBox as jest.Mock).mockReturnValue({ fraction: 1.0 });
          mockEntityIndexInstance.trace.mockReturnValue({
              fraction: 0.5,
              entityId: 1,
              endpos: {x:50,y:0,z:0},
              plane: { normal: {x:-1,y:0,z:0}, dist: 50 },
              surfaceFlags: 0,
              contents: 1,
              allsolid: false,
              startsolid: false
          });

          // Update gameInstance.entities to support find
          gameInstance.entities = [{ index: 1, classname: 'player' }];

          const result = capturedImports.trace(
              {x:0,y:0,z:0}, null, null, {x:100,y:0,z:0}, null, -1
          );

          expect(result.fraction).toBe(0.5);
          expect(result.ent).toBeDefined();
          expect(result.ent.index).toBe(1);
      });

      it('implements pointcontents callback', () => {
          (pointContents as jest.Mock).mockReturnValue(42);
          const result = capturedImports.pointcontents({x:0,y:0,z:0});
          expect(result).toBe(42);
          expect(pointContents).toHaveBeenCalled();
      });

      it('implements linkentity callback', () => {
          const entity = {
              index: 1,
              origin: {x:0,y:0,z:0},
              mins: {x:-10,y:-10,z:-10},
              maxs: {x:10,y:10,z:10},
              solid: 1, // Solid
              clipmask: 1
          };
          capturedImports.linkentity(entity);
          expect(mockEntityIndexInstance.link).toHaveBeenCalledWith(expect.objectContaining({
              id: 1,
              contents: 1
          }));
      });

      it('skips linkentity if not solid', () => {
          const entity = {
              index: 1,
              origin: {x:0,y:0,z:0},
              mins: {x:-10,y:-10,z:-10},
              maxs: {x:10,y:10,z:10},
              solid: 0, // Not solid
              clipmask: 0
          };
          capturedImports.linkentity(entity);
          // Should we expect unlink? The code doesn't call unlink.
          // It only calls link if solid > 0.
          // The previous mockEntityIndex was created in beforeEach.
          // But capturedImports uses the one created inside createGameSimulation.
          // Wait, createGameSimulation calls `new CollisionEntityIndex()`.
          // My mock setup for CollisionEntityIndex should capture that instance.

          // Actually, mockEntityIndex variable in test points to the mock instance.
          // Since I used .mockImplementation inside Jest mock, all instances share behavior or I can access via mock.instances.
          // But I need to be sure capturedImports uses the mocked instance.
          // Yes, jest.mock replaces the constructor.

          expect(mockEntityIndexInstance.link).not.toHaveBeenCalled();
      });
  });
});
