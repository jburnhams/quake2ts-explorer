import { createGameSimulation, getGameService, resetGameService, GameSimulation } from '../../../src/services/gameService';
import { VirtualFileSystem, AssetManager } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import { traceBox, pointContents } from 'quake2ts/shared';
import { createCollisionModel } from '../../../src/utils/collisionAdapter';
import { getConsoleService } from '../../../src/services/consoleService';

// Mock dependencies
jest.mock('../../../src/services/consoleService', () => ({
  getConsoleService: jest.fn().mockReturnValue({
    registerCommand: jest.fn(),
    log: jest.fn()
  })
}));

jest.mock('../../../src/services/saveService', () => ({
  saveGame: jest.fn(),
  loadGame: jest.fn()
}));

jest.mock('quake2ts/engine', () => {
  return {
    VirtualFileSystem: jest.fn().mockImplementation(() => ({
      mountPak: jest.fn(),
    })),
    AssetManager: jest.fn().mockImplementation(() => ({
      getMap: jest.fn().mockResolvedValue({
        planes: [],
        nodes: [],
        leafs: [],
        brushes: [],
        brushSides: [],
        models: [],
        visibility: null
      }),
    })),
  };
});

jest.mock('quake2ts/game', () => {
  return {
    createGame: jest.fn().mockReturnValue({
      init: jest.fn(),
      shutdown: jest.fn(),
      frame: jest.fn(),
      snapshot: jest.fn(),
      spawnWorld: jest.fn(),
    }),
    MulticastType: {},
  };
});

jest.mock('quake2ts/shared', () => ({
  traceBox: jest.fn().mockReturnValue({
    allsolid: false,
    startsolid: false,
    fraction: 1.0,
    endpos: { x: 0, y: 0, z: 0 },
    plane: null,
    contents: 0
  }),
  pointContents: jest.fn().mockReturnValue(0),
  buildCollisionModel: jest.fn().mockReturnValue({}),
  Vec3: {},
}));

jest.mock('../../../src/utils/collisionAdapter', () => ({
  createCollisionModel: jest.fn().mockReturnValue({})
}));

describe('GameService', () => {
  let vfs: VirtualFileSystem;
  let gameService: GameSimulation;

  beforeEach(() => {
    resetGameService();
    vfs = new VirtualFileSystem();
    gameService = createGameSimulation(vfs);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const service1 = getGameService();
    const service2 = getGameService();
    expect(service1).toBe(service2);
    expect(service1).toBe(gameService);
  });

  it('should initialize the game', async () => {
    await gameService.initGame('maps/test.bsp', { deathmatch: true });

    expect(createGame).toHaveBeenCalledTimes(1);
    const mockExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockExports.init).toHaveBeenCalled();
    expect(mockExports.spawnWorld).toHaveBeenCalled();
    expect(createCollisionModel).toHaveBeenCalled();
  });

  it('should fail if map loading returns undefined', async () => {
    const AssetManagerMock = require('quake2ts/engine').AssetManager;
    // We override getMap for this test
    const mockGetMap = jest.fn().mockResolvedValue(undefined);
    // Note: AssetManager mock above uses factory. To override instance method:
    // We need to access the instance created.
    // But constructor is called in `createGameSimulation`.
    // We can't easily access the instance unless we expose it or spy on prototype.
    // Or we reset module mocks.

    // Easier way: Spy on AssetManager prototype
    // Or just use `mockImplementationOnce` on the mock class if we can access it.
    // The mock above is `AssetManager: jest.fn()...`.
    // So subsequent calls to `new AssetManager` return new mocks.
    // `resetGameService` clears instance. `createGameSimulation` creates new one.
    (require('quake2ts/engine').AssetManager as jest.Mock).mockImplementationOnce(() => ({
       getMap: mockGetMap
    }));

    resetGameService();
    gameService = createGameSimulation(vfs);

    await expect(gameService.initGame('maps/missing.bsp', {})).rejects.toThrow('Failed to load map: maps/missing.bsp');
  });

  it('should run simulation ticks', async () => {
    await gameService.initGame('maps/test.bsp', {});
    const cmd = {
        msec: 25,
        buttons: 0,
        angles: { x: 0, y: 0, z: 0 },
        forwardmove: 0,
        sidemove: 0,
        upmove: 0,
        impulse: 0,
        lightlevel: 0
    };

    gameService.tick(25, cmd);

    const mockExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockExports.frame).toHaveBeenCalledWith(25, cmd);
  });

  it('should return snapshots', async () => {
    await gameService.initGame('maps/test.bsp', {});

    const snapshot = gameService.getSnapshot();

    const mockExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockExports.snapshot).toHaveBeenCalled();
  });

  it('should shutdown the game', async () => {
    await gameService.initGame('maps/test.bsp', {});
    gameService.shutdownGame();

    const mockExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockExports.shutdown).toHaveBeenCalled();
  });

  it('should perform trace using collision model', async () => {
     await gameService.initGame('maps/test.bsp', {});
     const impl = gameService as any;

     const start = { x: 0, y: 0, z: 0 };
     const end = { x: 100, y: 0, z: 0 };
     const mins = { x: -16, y: -16, z: -24 };
     const maxs = { x: 16, y: 16, z: 32 };

     impl.trace(start, mins, maxs, end, null, 1);

     expect(traceBox).toHaveBeenCalledWith(expect.objectContaining({
         start,
         end,
         mins,
         maxs,
         contentMask: 1
     }));
  });

  it('should perform pointcontents check', async () => {
     await gameService.initGame('maps/test.bsp', {});
     const impl = gameService as any;

     const point = { x: 50, y: 50, z: 50 };
     impl.pointcontents(point);

     expect(pointContents).toHaveBeenCalledWith(point, expect.anything());
  });
});
