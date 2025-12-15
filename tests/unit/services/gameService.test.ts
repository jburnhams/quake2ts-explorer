
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { VirtualFileSystem } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
  VirtualFileSystem: jest.fn().mockImplementation(() => ({})),
  AssetManager: jest.fn().mockImplementation(() => ({
    loadMap: jest.fn().mockResolvedValue({
      // Mock BspMap
      entities: 'mock-entities',
      leafs: [],
      nodes: [],
      models: [],
      planes: []
    }),
    clearCache: jest.fn()
  }))
}));

jest.mock('quake2ts/game', () => ({
  createGame: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockReturnValue({ state: { time: 0 } }), // Return mock frame result
    shutdown: jest.fn(),
    frame: jest.fn().mockReturnValue({ state: { time: 100 } }), // Return mock frame result
    snapshot: jest.fn().mockReturnValue({ time: 0 }),
    entities: { find: jest.fn() }
  }))
}));

jest.mock('@/src/utils/collisionAdapter', () => ({
  createCollisionModel: jest.fn().mockReturnValue({})
}));

describe('GameService', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
    jest.clearAllMocks();
  });

  afterEach(() => {
    shutdownGameService();
  });

  it('should create and initialize game simulation', async () => {
    const game = await createGameSimulation(vfs, 'test_map');

    expect(game).toBeDefined();
    expect(createGame).toHaveBeenCalled();
  });

  it('should tick the game simulation', async () => {
    const game = await createGameSimulation(vfs, 'test_map');

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

    const step = { frame: 1, deltaMs: 25, nowMs: 1000 };
    game.tick(step, cmd);

    const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockGameExports.frame).toHaveBeenCalledWith(step, cmd);

    // Verify snapshot update
    const snapshot = game.getSnapshot();
    expect(snapshot.time).toBe(100);
  });

  it('should shutdown game simulation', async () => {
    const game = await createGameSimulation(vfs, 'test_map');

    game.shutdown();

    const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockGameExports.shutdown).toHaveBeenCalled();
  });
});
