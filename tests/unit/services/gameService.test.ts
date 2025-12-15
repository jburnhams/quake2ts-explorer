
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { VirtualFileSystem, AssetManager } from 'quake2ts/engine';
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
    init: jest.fn(),
    shutdown: jest.fn(),
    frame: jest.fn(),
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

    game.tick(25, cmd);

    const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockGameExports.frame).toHaveBeenCalledWith(1, cmd);

    game.tick(25, cmd);
    expect(mockGameExports.frame).toHaveBeenCalledWith(2, cmd);
  });

  it('should shutdown game simulation', async () => {
    const game = await createGameSimulation(vfs, 'test_map');

    game.shutdown();

    const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockGameExports.shutdown).toHaveBeenCalled();
  });
});
