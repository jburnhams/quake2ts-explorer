
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { consoleService } from '@/src/services/consoleService';
import { VirtualFileSystem } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';

// Mock dependencies
jest.mock('quake2ts/client', () => ({
    ClientPrediction: jest.fn().mockImplementation(() => ({
        setPredictionEnabled: jest.fn(),
        enqueueCommand: jest.fn(),
        setAuthoritative: jest.fn(),
        getPredictionError: jest.fn().mockReturnValue({x:0,y:0,z:0}),
        decayError: jest.fn(),
        getPredictedState: jest.fn()
    }))
}));

jest.mock('quake2ts/engine', () => ({
  VirtualFileSystem: jest.fn().mockImplementation(() => ({})),
  AssetManager: jest.fn().mockImplementation(() => ({
    loadMap: jest.fn().mockResolvedValue({
        // Minimal map mock
        leafs: [], nodes: [], models: [], planes: []
    }),
    clearCache: jest.fn()
  }))
}));

jest.mock('quake2ts/game', () => ({
  createGame: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockReturnValue({ state: {} }),
    shutdown: jest.fn(),
    entities: [
        { classname: 'player', index: 1, flags: 0, movetype: 0 },
        { classname: 'other', index: 2 }
    ]
  }))
}));

jest.mock('@/src/utils/collisionAdapter', () => ({
  createCollisionModel: jest.fn()
}));

jest.mock('quake2ts/shared', () => ({
    CollisionEntityIndex: jest.fn().mockImplementation(() => ({
        trace: jest.fn().mockReturnValue({ fraction: 1.0 }),
        link: jest.fn(),
        gatherTriggerTouches: jest.fn()
    })),
    traceBox: jest.fn().mockReturnValue({ fraction: 1.0 }),
    pointContents: jest.fn().mockReturnValue(0),
    Vec3: {},
    CollisionPlane: {},
    NetChan: jest.fn().mockImplementation(() => ({
        setup: jest.fn(),
        transmit: jest.fn(),
        reset: jest.fn(),
        process: jest.fn()
    }))
}));

describe('GameService Console Commands', () => {
    let commands: Record<string, Function> = {};
    let vfs: VirtualFileSystem;

    beforeEach(() => {
        vfs = new VirtualFileSystem();
        commands = {};
        jest.spyOn(consoleService, 'registerCommand').mockImplementation((name, cb) => {
            commands[name] = cb;
        });
        jest.spyOn(consoleService, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        shutdownGameService();
        jest.restoreAllMocks();
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
        (createGame as jest.Mock).mockImplementationOnce(() => ({
            init: jest.fn(),
            shutdown: jest.fn(),
            entities: [] // No player
        }));

        await createGameSimulation(vfs, 'test_map');

        commands['god']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Player not found'), expect.any(String));
    });
});
