import { saveGame, loadGame, listSaves, deleteSave } from '@/src/services/saveService';
import { getGameService } from '@/src/services/gameService';

// Mock dependencies
jest.mock('@/src/services/gameService', () => ({
  getGameService: jest.fn()
}));

const mockGameService = {
  createSave: jest.fn(),
  loadSave: jest.fn()
};

describe('SaveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (getGameService as jest.Mock).mockReturnValue(mockGameService);
  });

  const mockSaveFile = {
    version: 1,
    timestamp: 123456789,
    map: 'q2dm1',
    difficulty: 1,
    playtimeSeconds: 60,
    gameState: {},
    level: {},
    rng: {},
    entities: {},
    cvars: [],
    configstrings: []
  };

  test('saveGame stores data in localStorage', async () => {
    mockGameService.createSave.mockReturnValue(mockSaveFile);

    await saveGame(1, 'Test Save', 'data:image/png;base64,...');

    expect(mockGameService.createSave).toHaveBeenCalledWith('Test Save');
    const stored = localStorage.getItem('quake2ts-save-1');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.name).toBe('Test Save');
    expect(parsed.slot).toBe(1);
    expect(parsed.data).toEqual(mockSaveFile);
    expect(parsed.screenshot).toBe('data:image/png;base64,...');
  });

  test('saveGame throws if no game service', async () => {
    (getGameService as jest.Mock).mockReturnValue(null);
    await expect(saveGame(1, 'Test')).rejects.toThrow('No active game');
  });

  test('loadGame retrieves and loads data', async () => {
    const savedGame = {
      slot: 1,
      name: 'Test',
      timestamp: 123,
      mapName: 'q2dm1',
      data: mockSaveFile
    };
    localStorage.setItem('quake2ts-save-1', JSON.stringify(savedGame));

    const result = await loadGame(1);

    expect(mockGameService.loadSave).toHaveBeenCalledWith(mockSaveFile);
    expect(result).toEqual(savedGame);
  });

  test('loadGame returns null if slot empty', async () => {
    const result = await loadGame(99);
    expect(result).toBeNull();
  });

  test('listSaves returns sorted saves', () => {
    const save1 = { slot: 1, name: 'Old', timestamp: 100, data: {} };
    const save2 = { slot: 2, name: 'New', timestamp: 200, data: {} };
    localStorage.setItem('quake2ts-save-1', JSON.stringify(save1));
    localStorage.setItem('quake2ts-save-2', JSON.stringify(save2));

    const list = listSaves();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe('New'); // Sorted by timestamp desc
    expect(list[1].name).toBe('Old');
  });

  test('deleteSave removes item', () => {
    localStorage.setItem('quake2ts-save-1', '{}');
    deleteSave(1);
    expect(localStorage.getItem('quake2ts-save-1')).toBeNull();
  });
});
