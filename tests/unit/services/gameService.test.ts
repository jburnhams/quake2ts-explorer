import { getGameService, resetGameService, GameSimulation } from '@/src/services/gameService';
import { VirtualFileSystem, AssetManager } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import { vec3, traceBox, pointContents, buildCollisionModel } from 'quake2ts/shared';

// Mock quake2ts modules
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
        leafLists: { leafBrushes: [] },
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
      snapshot: jest.fn().mockReturnValue({}),
    }),
  };
});

jest.mock('quake2ts/shared', () => {
  return {
    vec3: {
      clone: jest.fn((v) => ({...v})),
      fromValues: jest.fn((x, y, z) => ({x, y, z})), // Mock Vec3 as object {x,y,z}
      create: jest.fn(() => ({x:0, y:0, z:0})),
    },
    traceBox: jest.fn().mockReturnValue({
      allsolid: false,
      startsolid: false,
      fraction: 1.0,
      endpos: {x:0, y:0, z:0},
      plane: null,
      contents: 0,
      surfaceFlags: 0
    }),
    pointContents: jest.fn().mockReturnValue(0),
    buildCollisionModel: jest.fn().mockReturnValue({}) // Mock collision model
  };
});

describe('GameService', () => {
  let vfs: VirtualFileSystem;
  let gameService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resetGameService();
    vfs = new VirtualFileSystem();
    gameService = getGameService(vfs);
  });

  it('should return a new instance if requested (singleton reset behavior)', () => {
    // The implementation was changed to always return a new instance to handle VFS updates
    // So equality check is no longer valid, but checking that it returns a valid instance is.
    const service1 = getGameService(vfs);
    const service2 = getGameService(vfs);
    expect(service1).not.toBe(service2);
    expect(service1).toBeDefined();
    expect(service2).toBeDefined();
  });

  it('should initialize the game and build collision model', async () => {
    const mapName = 'test_map';
    const options = { maxClients: 1, deathmatch: false, coop: false, skill: 0 };

    await gameService.initGame(mapName, options);

    expect(AssetManager).toHaveBeenCalledWith(vfs);
    expect(createGame).toHaveBeenCalled();
    expect(buildCollisionModel).toHaveBeenCalled();

    const gameInstance = (createGame as jest.Mock).mock.results[0].value;
    expect(gameInstance.init).toHaveBeenCalled();
  });

  it('should tick the game', async () => {
    await gameService.initGame('test', {});
    const cmd = { msec: 0, buttons: 0, angles: {x:0,y:0,z:0}, forwardmove: 0, sidemove: 0, upmove: 0, impulse: 0, lightlevel: 0 };

    gameService.tick(16, cmd);

    const gameInstance = (createGame as jest.Mock).mock.results[0].value;
    expect(gameInstance.frame).toHaveBeenCalledWith(0, cmd);

    gameService.tick(16, cmd);
    expect(gameInstance.frame).toHaveBeenCalledWith(1, cmd);
  });

  it('should return snapshot', async () => {
    await gameService.initGame('test', {});
    const snapshot = gameService.getSnapshot();
    const gameInstance = (createGame as jest.Mock).mock.results[0].value;
    expect(gameInstance.snapshot).toHaveBeenCalled();
    expect(snapshot).toBeDefined();
  });

  it('should shutdown correctly', async () => {
    await gameService.initGame('test', {});
    const gameInstance = (createGame as jest.Mock).mock.results[0].value;

    gameService.shutdown();

    expect(gameInstance.shutdown).toHaveBeenCalled();
    expect(gameService.isRunning()).toBe(false);
  });

  it('should handle game imports trace', async () => {
     await gameService.initGame('test', {});
     const gameImports = (createGame as jest.Mock).mock.calls[0][0];

     const start = {x:0,y:0,z:0};
     const end = {x:0,y:10,z:0};
     const traceResult = gameImports.trace(start, {x:-1,y:-1,z:-1}, {x:1,y:1,z:1}, end, null, 0);

     expect(traceBox).toHaveBeenCalled();
     expect(traceResult).toBeDefined();
     expect(traceResult.fraction).toBe(1.0);
  });

  it('should handle game imports pointcontents', async () => {
     await gameService.initGame('test', {});
     const gameImports = (createGame as jest.Mock).mock.calls[0][0];

     gameImports.pointcontents({x:0,y:0,z:0});
     expect(pointContents).toHaveBeenCalled();
  });
});
