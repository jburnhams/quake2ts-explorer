
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { AssetManager, VirtualFileSystem } from 'quake2ts/engine';
import { createGame } from 'quake2ts/game';
import { traceBox, pointContents, CollisionEntityIndex } from 'quake2ts/shared';

// Mock dependencies
const mockLoadMap = jest.fn().mockResolvedValue({
    leafs: [],
    planes: [],
    nodes: [],
    models: [{ headnode: 0 }],
    entities: []
});

jest.mock('quake2ts/engine', () => {
    return {
        AssetManager: jest.fn().mockImplementation(() => ({
            loadMap: mockLoadMap,
            clearCache: jest.fn()
        })),
        VirtualFileSystem: jest.fn(),
    };
});

jest.mock('quake2ts/game', () => ({
    createGame: jest.fn().mockReturnValue({
        init: jest.fn().mockReturnValue({ state: {} }),
        shutdown: jest.fn(),
        frame: jest.fn().mockReturnValue({ state: {} }),
        createSave: jest.fn(),
        loadSave: jest.fn(),
        entities: { find: jest.fn() }
    })
}));

jest.mock('quake2ts/shared', () => ({
    traceBox: jest.fn().mockReturnValue({ fraction: 1.0, endpos: { x: 0, y: 0, z: 0 }, allsolid: false, startsolid: false }),
    pointContents: jest.fn().mockReturnValue(0),
    CollisionEntityIndex: jest.fn().mockImplementation(() => ({
        trace: jest.fn().mockReturnValue({ fraction: 1.0, endpos: { x: 0, y: 0, z: 0 } }),
        link: jest.fn(),
        gatherTriggerTouches: jest.fn()
    })),
    Vec3: jest.fn()
}));

jest.mock('@/src/utils/collisionAdapter', () => ({
    createCollisionModel: jest.fn().mockReturnValue({})
}));

jest.mock('@/src/services/consoleService', () => ({
    consoleService: {
        registerCommand: jest.fn(),
        unregisterCommand: jest.fn(),
        log: jest.fn()
    },
    LogLevel: { WARNING: 'warning', ERROR: 'error' }
}));

describe('GameService', () => {
    let vfs: any;

    beforeEach(() => {
        jest.clearAllMocks();
        vfs = new VirtualFileSystem();
    });

    afterEach(() => {
        shutdownGameService();
    });

    it('should initialize successfully', async () => {
        const game = await createGameSimulation(vfs, 'testmap');
        expect(createGame).toHaveBeenCalled();
        expect(game).toBeDefined();
    });

    it('should load map during initialization', async () => {
        await createGameSimulation(vfs, 'testmap');
        expect(mockLoadMap).toHaveBeenCalledWith('testmap');
    });

    it('should shutdown properly', async () => {
        const game = await createGameSimulation(vfs, 'testmap');
        game.shutdown();
        const mockGameExports = createGame(null as any, null as any, null as any);
        expect(mockGameExports.shutdown).toHaveBeenCalled();
    });

    it('should tick game simulation', async () => {
        const game = await createGameSimulation(vfs, 'testmap');
        const cmd: any = {};
        const step: any = { frame: 1, deltaMs: 25, nowMs: 1000 };
        game.tick(step, cmd);

        const mockGameExports = createGame(null as any, null as any, null as any);
        expect(mockGameExports.frame).toHaveBeenCalledWith(step, cmd);
    });

    it('should return snapshot', async () => {
        const game = await createGameSimulation(vfs, 'testmap');
        const snapshot = game.getSnapshot();
        expect(snapshot).toBeDefined();
    });
});
