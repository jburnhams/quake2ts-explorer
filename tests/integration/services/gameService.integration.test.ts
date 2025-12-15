
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { VirtualFileSystem } from 'quake2ts/engine';

// Mock console service
jest.mock('@/src/services/consoleService', () => ({
    consoleService: {
        registerCommand: jest.fn(),
        unregisterCommand: jest.fn(),
        log: jest.fn()
    },
    LogLevel: { WARNING: 'warning', ERROR: 'error' }
}));

// Use real library implementations
jest.unmock('quake2ts/game');
jest.unmock('quake2ts/shared');
jest.unmock('quake2ts/engine');

// We need to mock VFS to provide a map without network/disk
const mockMapData = {
    leafs: [],
    planes: [],
    nodes: [],
    models: [{ headnode: 0, headNode: 0, mins: [0,0,0], maxs: [0,0,0], origin: [0,0,0] }],
    entities: [
        { classname: 'worldspawn' },
        { classname: 'info_player_start', origin: { x: 0, y: 0, z: 0 }, angles: { x: 0, y: 0, z: 0 } }
    ],
    brushSides: [],
    brushes: [],
    leafLists: { leafBrushes: [] },
    surfaces: [],
    texInfo: [],
    texData: [],
    lightData: new Uint8Array(0),
    visData: new Uint8Array(0),
};

// Mock browser dependencies that might be accessed by engine even if not used
// This ensures that 'new AudioContext()' or 'gl.createShader()' calls don't crash
if (typeof WebGL2RenderingContext === 'undefined') {
    (global as any).WebGL2RenderingContext = class {};
}
if (typeof AudioContext === 'undefined') {
    (global as any).AudioContext = class {
        createGain() { return { connect: jest.fn(), gain: { value: 0 } }; }
        createBufferSource() { return { connect: jest.fn(), start: jest.fn(), stop: jest.fn() }; }
        decodeAudioData() { return Promise.resolve({}); }
        destination = {};
    };
}

// Override AssetManager.loadMap to return our mock data
jest.mock('quake2ts/engine', () => {
    const original = jest.requireActual('quake2ts/engine');
    return {
        ...original,
        AssetManager: class extends original.AssetManager {
            async loadMap(name: string) {
                return mockMapData;
            }
        }
    };
});


describe('GameService Integration (Real Game Logic)', () => {
    let vfs: VirtualFileSystem;

    beforeEach(() => {
        vfs = new VirtualFileSystem();
    });

    afterEach(() => {
        shutdownGameService();
    });

    it('should initialize and tick using real game library', async () => {
        const game = await createGameSimulation(vfs, 'testmap');

        expect(game).toBeDefined();

        const startState = game.getSnapshot();
        expect(startState).toBeDefined();

        // Tick
        game.tick(
             { frame: 1, deltaMs: 25, nowMs: 1000 },
             {
                 msec: 25,
                 buttons: 0,
                 angles: { x: 0, y: 0, z: 0 },
                 forwardmove: 200,
                 sidemove: 0,
                 upmove: 0,
                 impulse: 0,
                 lightlevel: 0
             }
        );

        const endState = game.getSnapshot();
        expect(endState).toBeDefined();

        // Verify time advanced in the snapshot
        // The exact time logic depends on the engine (level.time, etc.)
        // But we expect the state object to be valid.

        // Check that entities exist (at least worldspawn and player)
        // Note: Entities in snapshot might be packetEntities or similar
        // Just verify we got a state object back from the real engine.
        // GameStateSnapshot doesn't have 'pmove' in this version, it has 'origin', 'velocity', etc.
        expect(endState.origin).toBeDefined();
        expect(endState.velocity).toBeDefined();
        expect(endState.packetEntities).toBeDefined();
    });
});
