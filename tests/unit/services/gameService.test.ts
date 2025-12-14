
import { createGameSimulation, getGameService, shutdownGameService } from '../../../src/services/gameService';
import { VirtualFileSystem, AssetManager } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import { traceBox, pointContents, CollisionEntityIndex } from 'quake2ts/shared';
import { createCollisionModel } from '../../../src/utils/collisionAdapter';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
  return {
    VirtualFileSystem: jest.fn(),
    AssetManager: jest.fn().mockImplementation(() => ({
      loadMap: jest.fn().mockResolvedValue({ entities: [], planes: [], nodes: [], leafs: [], brushes: [], brushSides: [], models: [], leafLists: { leafBrushes: [] } }),
      clearCache: jest.fn(),
      resetForLevelChange: jest.fn(),
    })),
  };
});

jest.mock('quake2ts/game', () => {
  const mockSnapshot = {
    time: 100,
    playerState: {},
    entities: [],
    events: []
  };

  const mockGameExports = {
    init: jest.fn().mockReturnValue({ state: mockSnapshot }),
    shutdown: jest.fn(),
    frame: jest.fn().mockReturnValue({ state: mockSnapshot }),
    entities: {
        find: jest.fn() // Mock entity system
    }
  };

  return {
    createGame: jest.fn().mockReturnValue(mockGameExports),
  };
});

jest.mock('quake2ts/shared', () => {
  return {
    traceBox: jest.fn().mockReturnValue({ fraction: 1.0, endpos: {x:0,y:0,z:0}, allsolid: false, startsolid: false, surfaceFlags: 0 }),
    pointContents: jest.fn().mockReturnValue(0),
    Vec3: jest.fn(),
    CollisionEntityIndex: jest.fn().mockImplementation(() => {
        return {
            link: jest.fn(),
            unlink: jest.fn(),
            trace: jest.fn().mockReturnValue({ fraction: 1.0, entityId: null })
        };
    })
  };
});

jest.mock('../../../src/utils/collisionAdapter', () => ({
  createCollisionModel: jest.fn().mockReturnValue({})
}));

describe('GameService', () => {
  let vfsMock: any;

  beforeEach(() => {
    vfsMock = new VirtualFileSystem();
  });

  afterEach(() => {
    shutdownGameService();
    jest.clearAllMocks();
  });

  it('should initialize game successfully', async () => {
    const game = await createGameSimulation(vfsMock, 'maps/demo1.bsp');

    expect(createGame).toHaveBeenCalled();
    expect(game).toBeDefined();
    expect(getGameService()).toBe(game);
    expect(createCollisionModel).toHaveBeenCalled();
  });

  it('should shutdown game successfully', async () => {
    const game = await createGameSimulation(vfsMock, 'maps/demo1.bsp');
    shutdownGameService();

    const mockGame = createGame({}, {}, {}) as any;
    expect(mockGame.shutdown).toHaveBeenCalled();
    expect(getGameService()).toBeNull();
  });

  it('should tick game simulation', async () => {
    const game = await createGameSimulation(vfsMock, 'maps/demo1.bsp');
    const cmd: any = { msec: 25 };
    const step: any = { frame: 1, deltaMs: 25, nowMs: 1000 };

    game.tick(step, cmd);

    const mockGame = createGame({}, {}, {}) as any;
    expect(mockGame.frame).toHaveBeenCalledWith(step, cmd);
  });

  it('should return snapshot', async () => {
    const game = await createGameSimulation(vfsMock, 'maps/demo1.bsp');
    const snapshot = game.getSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.time).toBe(100);
  });

  it('should perform trace using collision model', async () => {
      let capturedImports: any;
      (createGame as jest.Mock).mockImplementation((imports, engine, options) => {
          capturedImports = imports;
          return {
              init: jest.fn().mockReturnValue({ state: {} }),
              shutdown: jest.fn(),
              frame: jest.fn().mockReturnValue({ state: {} }),
              entities: { find: jest.fn() }
          };
      });

      await createGameSimulation(vfsMock, 'maps/demo1.bsp');

      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 100, y: 0, z: 0 };
      const mins = { x: -10, y: -10, z: -10 };
      const maxs = { x: 10, y: 10, z: 10 };

      const result = capturedImports.trace(start, mins, maxs, end, null, 0);

      expect(traceBox).toHaveBeenCalledWith(expect.objectContaining({
          start,
          end,
          mins,
          maxs
      }));
      expect(result.fraction).toBe(1.0);
  });

  it('should trace against entities', async () => {
      let capturedImports: any;
      const mockEntitySystem = { find: jest.fn() };

      (createGame as jest.Mock).mockImplementation((imports) => {
          capturedImports = imports;
          return {
              init: jest.fn().mockReturnValue({ state: {} }),
              shutdown: jest.fn(),
              frame: jest.fn().mockReturnValue({ state: {} }),
              entities: mockEntitySystem
          };
      });

      await createGameSimulation(vfsMock, 'maps/demo1.bsp');

      const mockIndexInstance = (CollisionEntityIndex as jest.Mock).mock.results[0].value;

      mockIndexInstance.trace.mockReturnValue({
          fraction: 0.5,
          entityId: 99,
          endpos: { x: 50, y: 0, z: 0 },
          allsolid: false,
          startsolid: false
      });

      mockEntitySystem.find.mockReturnValue({ index: 99, classname: 'target' });

      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 100, y: 0, z: 0 };

      const result = capturedImports.trace(start, null, null, end, null, 0);

      expect(mockIndexInstance.trace).toHaveBeenCalled();
      expect(result.fraction).toBe(0.5);
      expect(result.ent).toBeDefined();
      expect(result.ent.index).toBe(99);
  });

  it('should implement pointcontents callback', async () => {
      let capturedImports: any;
      (createGame as jest.Mock).mockImplementation((imports) => {
          capturedImports = imports;
          return {
              init: jest.fn().mockReturnValue({ state: {} }),
              shutdown: jest.fn(),
              frame: jest.fn().mockReturnValue({ state: {} }),
              entities: { find: jest.fn() }
          };
      });

      await createGameSimulation(vfsMock, 'maps/demo1.bsp');

      (pointContents as jest.Mock).mockReturnValue(42);
      const result = capturedImports.pointcontents({x:0,y:0,z:0});
      expect(result).toBe(42);
      expect(pointContents).toHaveBeenCalled();
  });

  it('should implement linkentity callback for solid entities', async () => {
      let capturedImports: any;
      (createGame as jest.Mock).mockImplementation((imports) => {
          capturedImports = imports;
          return {
              init: jest.fn().mockReturnValue({ state: {} }),
              shutdown: jest.fn(),
              frame: jest.fn().mockReturnValue({ state: {} }),
              entities: { find: jest.fn() }
          };
      });

      await createGameSimulation(vfsMock, 'maps/demo1.bsp');
      const mockIndexInstance = (CollisionEntityIndex as jest.Mock).mock.results[0].value;

      const entity = {
          index: 1,
          origin: {x:0,y:0,z:0},
          mins: {x:-10,y:-10,z:-10},
          maxs: {x:10,y:10,z:10},
          solid: 1, // Solid
          clipmask: 1
      };

      capturedImports.linkentity(entity);
      expect(mockIndexInstance.link).toHaveBeenCalledWith(expect.objectContaining({
          id: 1,
          contents: 1
      }));
  });

  it('should skip linkentity if not solid', async () => {
      let capturedImports: any;
      (createGame as jest.Mock).mockImplementation((imports) => {
          capturedImports = imports;
          return {
              init: jest.fn().mockReturnValue({ state: {} }),
              shutdown: jest.fn(),
              frame: jest.fn().mockReturnValue({ state: {} }),
              entities: { find: jest.fn() }
          };
      });

      await createGameSimulation(vfsMock, 'maps/demo1.bsp');
      const mockIndexInstance = (CollisionEntityIndex as jest.Mock).mock.results[0].value;

      const entity = {
          index: 1,
          origin: {x:0,y:0,z:0},
          mins: {x:-10,y:-10,z:-10},
          maxs: {x:10,y:10,z:10},
          solid: 0, // Not solid
          clipmask: 0
      };

      capturedImports.linkentity(entity);
      expect(mockIndexInstance.link).not.toHaveBeenCalled();
  });
});
