import { createGameSimulation } from '@/src/services/gameService';
import { VirtualFileSystem, AssetManager } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import { buildCollisionModel, traceBox } from 'quake2ts/shared';

// Mocks
jest.mock('quake2ts/engine', () => {
  return {
    VirtualFileSystem: jest.fn().mockImplementation(() => ({})),
    AssetManager: jest.fn().mockImplementation(() => ({
      loadMap: jest.fn(),
      getMap: jest.fn()
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
    CollisionEntityIndex: jest.fn().mockImplementation(() => ({
      link: jest.fn(),
      unlink: jest.fn(),
      trace: jest.fn().mockReturnValue({ fraction: 1.0, entityId: null })
    })),
    traceBox: jest.fn().mockReturnValue({
        fraction: 1.0,
        allsolid: false,
        startsolid: false,
        endpos: {x:0,y:0,z:0},
        plane: { normal: {x:0,y:0,z:1}, dist:0, type:0 },
        contents: 0,
        surfaceFlags: 0
    }),
    pointContents: jest.fn().mockReturnValue(0),
  };
});

describe('GameService', () => {
  let vfs: any;
  let assetManager: any;
  let gameInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    vfs = new VirtualFileSystem();
    assetManager = new AssetManager(vfs);
    (AssetManager as unknown as jest.Mock).mockImplementation(() => assetManager);

    // Mock map data
    assetManager.loadMap.mockResolvedValue({
      planes: [],
      nodes: [],
      leafs: [], // Note: gameService maps 'leafs'
      leafLists: { leafBrushes: [] },
      brushes: [],
      brushSides: [],
      texInfo: [],
      models: [],
      visibility: null
    });

    gameInstance = {
      init: jest.fn(),
      shutdown: jest.fn(),
      frame: jest.fn().mockReturnValue({ state: { time: 100 } }),
      snapshot: jest.fn(),
      entities: []
    };
    (createGame as jest.Mock).mockReturnValue(gameInstance);
  });

  it('initializes game simulation correctly', async () => {
    const simulation = await createGameSimulation(vfs, 'maps/test.bsp');

    expect(assetManager.loadMap).toHaveBeenCalledWith('maps/test.bsp');
    expect(createGame).toHaveBeenCalled();
    expect(buildCollisionModel).toHaveBeenCalled();

    simulation.start();
    expect(gameInstance.init).toHaveBeenCalled();
  });

  it('runs game loop tick', async () => {
    const simulation = await createGameSimulation(vfs, 'maps/test.bsp');

    const cmd = {
       msec: 50,
       buttons: 0,
       angles: {x:0, y:0, z:0} as any,
       forwardmove: 0,
       sidemove: 0,
       upmove: 0,
       impulse: 0,
       lightlevel: 0
    };

    simulation.tick(50, cmd);
    expect(gameInstance.frame).toHaveBeenCalled();
  });

  it('returns snapshot', async () => {
    const simulation = await createGameSimulation(vfs, 'maps/test.bsp');
    simulation.tick(50, {} as any); // trigger frame to set snapshot

    const snapshot = simulation.getSnapshot();
    expect(snapshot).toEqual({ time: 100 });
  });

  it('shuts down game', async () => {
    const simulation = await createGameSimulation(vfs, 'maps/test.bsp');
    simulation.shutdown();
    expect(gameInstance.shutdown).toHaveBeenCalled();
  });
});
