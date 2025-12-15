
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
            loadSave: jest.fn()
        };
        (getGameService as jest.Mock).mockReturnValue(mockGameService);

        jest.clearAllMocks();
    });

    it('should save game', async () => {
        await saveGame(1, 'test', 'img');

        expect(localStorage.setItem).toHaveBeenCalled();
        expect(mockStorage['quake2ts-save-1']).toBeDefined();
        const saved = JSON.parse(mockStorage['quake2ts-save-1']);
        expect(saved.name).toBe('test');
    });

    it('should throw if no game service on save', async () => {
        (getGameService as jest.Mock).mockReturnValue(null);
        await expect(saveGame(1, 'test')).rejects.toThrow("No active game");
    });

    it('should load game', async () => {
        const saved = { slot: 1, name: 'test', data: {} };
        mockStorage['quake2ts-save-1'] = JSON.stringify(saved);

        await loadGame(1);
        expect(mockGameService.loadSave).toHaveBeenCalled();
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
