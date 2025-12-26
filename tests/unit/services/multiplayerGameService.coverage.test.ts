
import { multiplayerGameService } from '@/src/services/multiplayerGameService';
import { networkService } from '@/src/services/networkService';
import { predictionService } from '@/src/services/predictionService';
import { PlayerState } from '@quake2ts/shared';

// Mock dependencies
vi.mock('@/src/services/networkService', () => ({
    networkService: {
        setCallbacks: vi.fn(),
        sendCommand: vi.fn(),
        disconnect: vi.fn()
    }
}));

vi.mock('@/src/services/predictionService', () => ({
    predictionService: {
        init: vi.fn(),
        setEnabled: vi.fn(),
        predict: vi.fn(),
        onServerFrame: vi.fn()
    }
}));

vi.mock('@quake2ts/engine', () => ({
    AssetManager: vi.fn().mockImplementation(() => ({
        loadMap: vi.fn().mockResolvedValue({})
    }))
}));

vi.mock('@quake2ts/shared', () => ({
    CollisionEntityIndex: vi.fn().mockImplementation(() => ({
        trace: vi.fn().mockReturnValue({ fraction: 1.0 }),
        link: vi.fn()
    })),
    traceBox: vi.fn().mockReturnValue({ fraction: 1.0, endpos: { x: 0, y: 0, z: 0 } }),
    pointContents: vi.fn().mockReturnValue(0),
    Vec3: {},
    CollisionPlane: {}
}));

vi.mock('@/src/utils/collisionAdapter', () => ({
    createCollisionModel: vi.fn().mockReturnValue({})
}));

vi.mock('@quake2ts/game', () => ({
    // Mock Entity if needed
}));

describe('MultiplayerGameService Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getSnapshot returns defaults when no snapshot available', () => {
        // Assume no snapshot yet
        const snapshot = multiplayerGameService.getSnapshot();
        expect(snapshot.time).toBe(0);
        expect(snapshot.stats.length).toBe(0);
    });

    it('getSnapshot maps playerState correctly', () => {
        const ps: PlayerState = {
            origin: { x: 10, y: 20, z: 30 },
            velocity: { x: 0, y: 0, z: 0 },
            viewAngles: { x: 0, y: 0, z: 0 },
            stats: [0, 100, 50, 0, 25], // Health=1, Ammo=2, Armor=4
            pm_flags: 1,
            pm_type: 2,
            waterLevel: 0,
            mins: { x: 0, y: 0, z: 0 },
            maxs: { x: 0, y: 0, z: 0 },
            damageAlpha: 0,
            damageIndicators: [],
            blend: [0, 0, 0, 0],
            kick_angles: { x: 0, y: 0, z: 0 },
            kick_origin: { x: 0, y: 0, z: 0 },
            gunoffset: { x: 0, y: 0, z: 0 },
            gunangles: { x: 0, y: 0, z: 0 },
            gunindex: 0,
            pm_time: 0,
            gun_frame: 0,
            rdflags: 0,
            fov: 90,
            renderfx: 0,
            onGround: true
        };

        // Simulate server snapshot reception
        const serverSnapshot = {
            time: 50,
            playerState: ps,
            entities: []
        };
        (multiplayerGameService as any).onServerSnapshot(serverSnapshot);

        const snapshot = multiplayerGameService.getSnapshot();
        expect(snapshot.time).toBe(50);
        expect(snapshot.origin).toEqual(ps.origin);
        expect(snapshot.health).toBe(100); // index 1
        expect(snapshot.ammo).toBe(50); // index 2
        expect(snapshot.armor).toBe(25); // index 4
    });

    it('getConfigStrings returns empty map', () => {
        const cs = multiplayerGameService.getConfigStrings();
        expect(cs).toBeInstanceOf(Map);
        expect(cs.size).toBe(0);
    });

    it('createSave throws error', () => {
        expect(() => multiplayerGameService.createSave("test")).toThrow("Cannot save");
    });

    it('loadSave throws error', () => {
        expect(() => multiplayerGameService.loadSave({} as any)).toThrow("Cannot load");
    });
});
