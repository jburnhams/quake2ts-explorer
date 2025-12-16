import { saveGame, loadGame, listSaves, deleteSave } from '../../src/services/saveService';
import { getGameService } from '../../src/services/gameService';

jest.mock('../../src/services/gameService', () => ({
  getGameService: jest.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    key: jest.fn((i: number) => Object.keys(store)[i] || null),
    get length() { return Object.keys(store).length; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('SaveService', () => {
  const mockGameState = { some: 'state' };
  const mockSnapshot = {
      stats: [100, 50, 25],
      origin: { x: 10, y: 10, z: 10 },
      viewangles: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      blend: [0, 0, 0, 0],
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
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();

    (getGameService as jest.Mock).mockReturnValue({
      getExports: () => ({
        serialize: jest.fn().mockReturnValue(mockGameState)
      }),
      getSnapshot: () => mockSnapshot
    });
  });

  it('should save game', async () => {
    await saveGame(1, 'My Save');

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'quake2ts-save-1',
        expect.stringContaining('"name":"My Save"')
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'quake2ts-save-1',
        expect.stringContaining('"gameState":{"some":"state"}')
    );
  });

  it('should load game', async () => {
    await saveGame(1, 'My Save');
    const loaded = await loadGame(1);

    expect(loaded).toBeDefined();
    expect(loaded?.name).toBe('My Save');
    expect(loaded?.gameState).toEqual(mockGameState);
    expect(loaded?.playerState.origin).toEqual(mockSnapshot.origin);
  });

  it('should list saves', async () => {
    await saveGame(1, 'Save 1');
    await saveGame(2, 'Save 2');

    const saves = listSaves();
    expect(saves.length).toBe(2);
    expect(saves.find(s => s.slot === 1)?.name).toBe('Save 1');
    expect(saves.find(s => s.slot === 2)?.name).toBe('Save 2');
  });

  it('should delete save', async () => {
    await saveGame(1, 'Save 1');
    deleteSave(1);

    const loaded = await loadGame(1);
    expect(loaded).toBeNull();
  });

  it('should throw if game not running', async () => {
    (getGameService as jest.Mock).mockReturnValue(null);
    await expect(saveGame(1, 'Test')).rejects.toThrow('Game not running');
  });
});
