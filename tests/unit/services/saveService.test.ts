
import { saveGame, loadGame, listSaves, deleteSave, type SavedGame } from '@/src/services/saveService';
import { getGameService } from '@/src/services/gameService';

// Mock dependencies
jest.mock('@/src/services/gameService', () => ({
    getGameService: jest.fn()
}));

describe('SaveService Coverage', () => {
    let mockStorage: any;
    let mockGameService: any;

    beforeEach(() => {
        mockStorage = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn((key) => mockStorage[key] || null),
                setItem: jest.fn((key, val) => mockStorage[key] = val),
                removeItem: jest.fn((key) => delete mockStorage[key]),
                length: 0,
                key: jest.fn((i) => Object.keys(mockStorage)[i])
            },
            writable: true
        });

        mockGameService = {
            createSave: jest.fn().mockReturnValue({ valid: true, map: 'map1' }),
            loadSave: jest.fn(),
            getExports: jest.fn().mockReturnValue({
                serialize: jest.fn().mockReturnValue({ valid: true, map: 'map1' }),
                loadState: jest.fn()
            }),
            getSnapshot: jest.fn().mockReturnValue({
                stats: [],
                origin: {x:0,y:0,z:0},
                viewangles: {x:0,y:0,z:0},
                velocity: {x:0,y:0,z:0},
                blend: [0,0,0,0],
                damageAlpha: 0,
                damageIndicators: [],
                kick_angles: {x:0,y:0,z:0},
                kick_origin: {x:0,y:0,z:0},
                gunoffset: {x:0,y:0,z:0},
                gunangles: {x:0,y:0,z:0},
                gunindex: 0,
                pm_type: 0,
                pm_time: 0,
                pm_flags: 0,
                gun_frame: 0,
                rdflags: 0,
                fov: 90,
                renderfx: 0
            })
        };
        (getGameService as jest.Mock).mockReturnValue(mockGameService);

        jest.clearAllMocks();
    });

    it('should save game', async () => {
        await saveGame(1, 'test');

        expect(localStorage.setItem).toHaveBeenCalled();
        expect(mockStorage['quake2ts-save-1']).toBeDefined();
        const saved = JSON.parse(mockStorage['quake2ts-save-1']);
        expect(saved.name).toBe('test');
    });

    it('should throw if no game service on save', async () => {
        (getGameService as jest.Mock).mockReturnValue(null);
        await expect(saveGame(1, 'test')).rejects.toThrow("Game not running");
    });

    it('should load game', async () => {
        const saved = { slot: 1, name: 'test', gameState: {} };
        mockStorage['quake2ts-save-1'] = JSON.stringify(saved);

        const loaded = await loadGame(1);
        expect(loaded).toEqual(saved);
        // Note: loadGame in service layer just retrieves data, doesn't apply it
    });

    it('should return null if no save found', async () => {
        const result = await loadGame(99);
        expect(result).toBeNull();
    });

    it('should list saves', () => {
        mockStorage['quake2ts-save-1'] = JSON.stringify({ slot: 1, timestamp: 100 });
        mockStorage['quake2ts-save-2'] = JSON.stringify({ slot: 2, timestamp: 200 });
        mockStorage['other-key'] = 'data';

        Object.defineProperty(localStorage, 'length', { value: 3 });

        const saves = listSaves();
        expect(saves).toHaveLength(2);
        // Should be sorted by timestamp desc
        expect(saves[0].slot).toBe(2);
    });

    it('should delete save', () => {
        mockStorage['quake2ts-save-1'] = 'data';
        deleteSave(1);
        expect(localStorage.removeItem).toHaveBeenCalledWith('quake2ts-save-1');
    });

    it('should handle quota error', async () => {
        const error = new DOMException('Quota', 'QuotaExceededError');
        localStorage.setItem = jest.fn().mockImplementation(() => { throw error; });

        await expect(saveGame(1, 'test')).rejects.toThrow("Storage quota exceeded");
    });
});
