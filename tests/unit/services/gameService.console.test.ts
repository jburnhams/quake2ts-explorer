
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { consoleService } from '@/src/services/consoleService';
import { VirtualFileSystem } from '@quake2ts/engine';
import { createGame } from '@quake2ts/game';

// Mock dependencies
vi.mock('@quake2ts/client', () => ({
    ClientPrediction: vi.fn().mockImplementation(() => ({
        setPredictionEnabled: vi.fn(),
        enqueueCommand: vi.fn(),
        setAuthoritative: vi.fn(),
        getPredictionError: vi.fn().mockReturnValue({x:0,y:0,z:0}),
        decayError: vi.fn(),
        getPredictedState: vi.fn()
    }))
}));

// Return a class with instance methods for AssetManager
vi.mock('@quake2ts/engine', () => {
  class MockAssetManager {
    loadMap = vi.fn().mockResolvedValue({
        leafs: [], nodes: [], models: [], planes: []
    });
    clearCache = vi.fn();
    resetForLevelChange = vi.fn();
  }

  return {
    VirtualFileSystem: vi.fn().mockImplementation(() => ({})),
    AssetManager: MockAssetManager
  };
});

vi.mock('@quake2ts/game', () => ({
  createGame: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockReturnValue({ state: {} }),
    shutdown: vi.fn(),
    entities: [
        { classname: 'player', index: 1, flags: 0, movetype: 0 },
        { classname: 'other', index: 2 }
    ]
  }))
}));

vi.mock('@/src/utils/collisionAdapter', () => ({
  createCollisionModel: vi.fn()
}));

vi.mock('@quake2ts/shared', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@quake2ts/shared')>();
    return {
        ...actual,
        CollisionEntityIndex: vi.fn().mockImplementation(() => ({
            trace: vi.fn().mockReturnValue({ fraction: 1.0 }),
            link: vi.fn(),
            gatherTriggerTouches: vi.fn()
        })),
        traceBox: vi.fn().mockReturnValue({ fraction: 1.0 }),
        pointContents: vi.fn().mockReturnValue(0),
        Vec3: {},
        CollisionPlane: {},
        NetChan: vi.fn().mockImplementation(() => ({
            setup: vi.fn(),
            transmit: vi.fn(),
            reset: vi.fn(),
            process: vi.fn()
        })),
        ServerCommand: {
          serverdata: 1,
          configstring: 2
        }
    };
});

describe('GameService Console Commands', () => {
    let commands: Record<string, Function> = {};
    let vfs: VirtualFileSystem;

    beforeEach(() => {
        vi.clearAllMocks();
        vfs = new VirtualFileSystem();
        commands = {};
        vi.spyOn(consoleService, 'registerCommand').mockImplementation((name, cb) => {
            commands[name] = cb;
        });
        vi.spyOn(consoleService, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        shutdownGameService();
        vi.restoreAllMocks();
    });

    it('should register and execute console commands', async () => {
        await createGameSimulation(vfs, 'test_map');

        expect(commands['god']).toBeDefined();
        expect(commands['noclip']).toBeDefined();
        expect(commands['notarget']).toBeDefined();
        expect(commands['give']).toBeDefined();
        expect(commands['kill']).toBeDefined();

        // Execute commands
        commands['god']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('god mode'), expect.any(String));

        commands['noclip']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('noclip'), expect.any(String));

        commands['notarget']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('notarget'), expect.any(String));

        commands['kill']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Suicide'), expect.any(String));

        commands['give'](['weapon_shotgun']);
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Giving item'), expect.any(String));

        // Edge case: give without args
        commands['give']([]);
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Usage'), expect.any(String));
    });

    it('should handle missing player in console commands', async () => {
        // Mock no player in entities
        (createGame as vi.Mock).mockImplementationOnce(() => ({
            init: vi.fn(),
            shutdown: vi.fn(),
            entities: [] // No player
        }));

        await createGameSimulation(vfs, 'test_map');

        commands['god']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Player not found'), expect.any(String));
    });
});
