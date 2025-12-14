
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
    traceBox: jest.fn().mockReturnValue({ fraction: 1.0, endpos: {x:0,y:0,z:0}, allsolid: false, startsolid: false }),
    pointContents: jest.fn().mockReturnValue(0),
    Vec3: jest.fn(),
    CollisionEntityIndex: jest.fn().mockImplementation(() => {
        // Return a mock instance with spyable methods
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
    // Verify collision model creation
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
      // We need to capture the GameImports passed to createGame
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

      // Call trace on the implementation
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

      // Access the mock instance returned by CollisionEntityIndex constructor
      // Since jest.mock implementation returns an object, we need to grab THAT object or ensure it's the one used.
      // The implementation in jest.mock above returns a NEW object every time.
      // We can grab it from mock.results of the constructor spy.
      const mockIndexInstance = (CollisionEntityIndex as jest.Mock).mock.results[0].value;

      mockIndexInstance.trace.mockReturnValue({
          fraction: 0.5,
          entityId: 99,
          endpos: { x: 50, y: 0, z: 0 },
          allsolid: false,
          startsolid: false
      });

      mockEntitySystem.find.mockReturnValue({ id: 99, classname: 'target' });

      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 100, y: 0, z: 0 };

      const result = capturedImports.trace(start, null, null, end, null, 0);

      expect(mockIndexInstance.trace).toHaveBeenCalled();
      expect(result.fraction).toBe(0.5);
      expect(result.ent).toBeDefined();
      expect(result.ent.id).toBe(99);
  });
});
