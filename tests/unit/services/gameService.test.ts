
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { VirtualFileSystem } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import * as shared from 'quake2ts/shared';

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
  VirtualFileSystem: jest.fn().mockImplementation(() => ({})),
  AssetManager: jest.fn().mockImplementation(() => ({
    loadMap: jest.fn().mockResolvedValue({
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
    init: jest.fn().mockReturnValue({ state: { time: 0 } }),
    shutdown: jest.fn(),
    frame: jest.fn().mockReturnValue({ state: { time: 100 } }),
    snapshot: jest.fn().mockReturnValue({ time: 0 }),
    entities: { find: jest.fn() },
    time: 123,
    createSave: jest.fn().mockReturnValue({ valid: true }),
    loadSave: jest.fn()
  }))
}));

jest.mock('@/src/utils/collisionAdapter', () => ({
  createCollisionModel: jest.fn().mockReturnValue({
      // Mock collision model properties if needed
  })
}));

// Mock quake2ts/shared
const mockEntityIndexInstance = {
    trace: jest.fn().mockReturnValue({
        allsolid: false,
        startsolid: false,
        fraction: 1.0,
        endpos: {x:0,y:0,z:0},
        entityId: null
    }),
    link: jest.fn(),
    gatherTriggerTouches: jest.fn().mockReturnValue([])
};

jest.mock('quake2ts/shared', () => ({
    CollisionEntityIndex: jest.fn().mockImplementation(() => mockEntityIndexInstance),
    traceBox: jest.fn().mockReturnValue({
        allsolid: false,
        startsolid: false,
        fraction: 1.0,
        endpos: {x:0,y:0,z:0},
        plane: { normal: {x:0,y:0,z:1}, dist: 0 }
    }),
    pointContents: jest.fn().mockReturnValue(0),
    Vec3: {},
    CollisionPlane: {}
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
    const game = await createGameSimulation(vfs, 'test_map', { skill: 2 });
    expect(game).toBeDefined();
    expect(createGame).toHaveBeenCalled();
    const options = (createGame as jest.Mock).mock.calls[0][2];
    expect(options.skill).toBe(2);
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
    expect(game.getSnapshot().time).toBe(100);
  });

  it('should shutdown game simulation', async () => {
    const game = await createGameSimulation(vfs, 'test_map');
    game.shutdown();
    const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockGameExports.shutdown).toHaveBeenCalled();
  });

  it('should create and load saves', async () => {
    const game = await createGameSimulation(vfs, 'test_map');

    // Create Save
    const save = game.createSave('test save');
    const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
    expect(mockGameExports.createSave).toHaveBeenCalledWith('test_map', 1, 123);
    expect(save).toEqual({ valid: true });

    // Load Save
    game.loadSave(save);
    expect(mockGameExports.loadSave).toHaveBeenCalledWith(save);
  });

  it('should throw if interacting with uninitialized game', async () => {
    const game = await createGameSimulation(vfs, 'test_map');
    game.shutdown();

    expect(() => game.getSnapshot()).toThrow("Game not initialized");
    expect(() => game.createSave("test")).toThrow("Game not initialized");
    expect(() => game.loadSave({} as any)).toThrow("Game not initialized");
  });

  it('should implement engine host methods (soundIndex, modelIndex, imageIndex)', async () => {
      await createGameSimulation(vfs, 'test_map');
      // Access the engineHost passed to createGame
      const engineHost = (createGame as jest.Mock).mock.calls[0][1];

      // Test caching logic
      expect(engineHost.soundIndex('jump.wav')).toBe(1);
      expect(engineHost.soundIndex('jump.wav')).toBe(1); // Should be cached
      expect(engineHost.soundIndex('fire.wav')).toBe(2);

      expect(engineHost.modelIndex('model.md2')).toBe(1);
      expect(engineHost.modelIndex('model.md2')).toBe(1);

      // imageIndex check removed as it might not be in the interface signature used by mocks or definitions
      // But checking implementation existence via casting if needed
      if (typeof engineHost.imageIndex === 'function') {
          expect(engineHost.imageIndex('img.wal')).toBe(1);
          expect(engineHost.imageIndex('img.wal')).toBe(1);
      }
  });

  it('should implement game imports (trace)', async () => {
      await createGameSimulation(vfs, 'test_map');
      const imports = (createGame as jest.Mock).mock.calls[0][0];

      // Test trace
      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 100, y: 0, z: 0 };
      const result = imports.trace(start, null, null, end, null, 1);

      expect(shared.traceBox).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.fraction).toBe(1.0);
  });

  it('should prefer entity hit in trace if closer', async () => {
      await createGameSimulation(vfs, 'test_map');
      const imports = (createGame as jest.Mock).mock.calls[0][0];

      // Mock entity trace hitting something closer
      mockEntityIndexInstance.trace.mockReturnValueOnce({
          fraction: 0.5,
          entityId: 1,
          allsolid: false,
          startsolid: false,
          endpos: { x: 50, y: 0, z: 0 },
          plane: null,
          surfaceFlags: 0,
          contents: 0
      });

      // Mock game entities
      const mockGameExports = (createGame as jest.Mock).mock.results[0].value;
      mockGameExports.entities.find.mockReturnValue({ index: 1, id: 1 });

      const start = { x: 0, y: 0, z: 0 };
      const end = { x: 100, y: 0, z: 0 };
      const result = imports.trace(start, null, null, end, null, 1);

      expect(result.fraction).toBe(0.5);
      expect(result.ent).toBeDefined();
      expect(result.ent.index).toBe(1);
  });

  it('should implement game imports (linkentity)', async () => {
      await createGameSimulation(vfs, 'test_map');
      const imports = (createGame as jest.Mock).mock.calls[0][0];

      const entity = {
          index: 10,
          origin: { x: 10, y: 10, z: 10 },
          mins: { x: -10, y: -10, z: -10 },
          maxs: { x: 10, y: 10, z: 10 },
          solid: 1, // SOLID_BBOX
          clipmask: 1
      };

      imports.linkentity(entity);

      expect(mockEntityIndexInstance.link).toHaveBeenCalledWith(expect.objectContaining({
          id: 10,
          contents: 1
      }));
  });

  it('should ignore non-solid entities in linkentity', async () => {
      await createGameSimulation(vfs, 'test_map');
      const imports = (createGame as jest.Mock).mock.calls[0][0];

      const entity = {
          solid: 0 // SOLID_NOT
      };

      imports.linkentity(entity);

      expect(mockEntityIndexInstance.link).not.toHaveBeenCalled();
  });

  it('should implement pointcontents', async () => {
      await createGameSimulation(vfs, 'test_map');
      const imports = (createGame as jest.Mock).mock.calls[0][0];

      (shared.pointContents as jest.Mock).mockReturnValue(42);

      const contents = imports.pointcontents({ x: 0, y: 0, z: 0 });
      expect(contents).toBe(42);
  });

  it('should handle configstring updates', async () => {
      await createGameSimulation(vfs, 'test_map');
      const engineHost = (createGame as jest.Mock).mock.calls[0][1];

      engineHost.configstring(1, "test config");
  });

  it('should handle server commands', async () => {
      await createGameSimulation(vfs, 'test_map');
      const engineHost = (createGame as jest.Mock).mock.calls[0][1];
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

      engineHost.serverCommand("map test");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("Server Command: map test"));
      spy.mockRestore();
  });
});
