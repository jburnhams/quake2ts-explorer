
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { consoleService } from '@/src/services/consoleService';
import { VirtualFileSystem } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
  VirtualFileSystem: jest.fn().mockImplementation(() => ({})),
  AssetManager: jest.fn().mockImplementation(() => ({
    getMap: jest.fn().mockResolvedValue({
        // Minimal map mock
        leafs: [], nodes: [], models: [], planes: [], brushes: [], brushSides: [], leafLists: { leafBrushes: [] }
    }),
    clearCache: jest.fn()
  }))
}));

jest.mock('quake2ts/game', () => ({
  createGame: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockReturnValue({ state: {} }),
    shutdown: jest.fn(),
    spawnWorld: jest.fn(),
    entities: [
        { classname: 'player', index: 1, flags: 0, movetype: 0 },
        { classname: 'other', index: 2 }
    ],
    setGodMode: jest.fn(),
    setNoclip: jest.fn(),
    setNotarget: jest.fn(),
    giveItem: jest.fn(),
    damage: jest.fn()
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
    buildCollisionModel: jest.fn(),
    Vec3: {},
    CollisionPlane: {}
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
        const service = createGameSimulation(vfs);
        await service.initGame('test_map', {});

        // Debug: Verify game exports are set
        expect(service.getExports()).toBeDefined();

        expect(commands['god']).toBeDefined();
        expect(commands['noclip']).toBeDefined();
        expect(commands['notarget']).toBeDefined();
        expect(commands['give']).toBeDefined();
        expect(commands['kill']).toBeDefined();

        // Execute commands
        commands['god']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('God Mode'), expect.any(String));

        commands['noclip']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Noclip'), expect.any(String));

        commands['notarget']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Notarget'), expect.any(String));

        commands['kill']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Suicide'), expect.any(String));

        commands['give'](['weapon_shotgun']);
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Gave'), expect.any(String));

        // Edge case: give without args
        commands['give']([]);
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Usage'), expect.any(String));
    });

    it('should handle uninitialized game', async () => {
        // Just create, don't init
        createGameSimulation(vfs);

        commands['god']();
        expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Game not running'), expect.any(String));
    });
});
