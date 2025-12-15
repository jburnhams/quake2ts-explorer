import { getGameService, type GameSaveFile } from './gameService';

export interface SavedGame {
  slot: number;
  name: string;
  timestamp: number;
  mapName: string;
  screenshot?: string; // Base64
  data: GameSaveFile;
}

const STORAGE_KEY_PREFIX = 'quake2ts-save-';

export async function saveGame(slot: number, name: string, screenshot?: string): Promise<void> {
  const gameService = getGameService();
  if (!gameService) {
    throw new Error('No active game to save');
  }

  // Get current game state via GameService which delegates to GameExports.createSave
  const saveFile = gameService.createSave(name);

  const savedGame: SavedGame = {
    slot,
    name,
    timestamp: Date.now(),
    mapName: saveFile.map,
    screenshot,
    data: saveFile
  };

  try {
    const json = JSON.stringify(savedGame);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, json);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete old saves.');
    }
    throw e;
  }
}

export async function loadGame(slot: number): Promise<void> {
  const json = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
  if (!json) {
    throw new Error(`Save slot ${slot} is empty`);
  }

  let savedGame: SavedGame;
  try {
    savedGame = JSON.parse(json);
  } catch (e) {
    throw new Error(`Failed to parse save file in slot ${slot}`);
  }

  const gameService = getGameService();

  if (!gameService) {
      // NOTE: In a real app, we might need to initialize the game with the map first
      // using gameService.initGame(savedGame.mapName).
      // For now, we assume the game loop handles map loading or we're already in the right context.
      // Or we should throw.
      // Actually, if we are in the main menu, we should probably start the game mode with the map.
      // But loadGame signature here returns void.
      // Let's assume for now we are already running a game or caller handles init.
      throw new Error('Game service not initialized. Start game first or implement auto-init.');
  }

  gameService.loadSave(savedGame.data);
}

export function listSaves(): SavedGame[] {
  const saves: SavedGame[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const save: SavedGame = JSON.parse(value);
          saves.push(save);
        }
      } catch (e) {
        console.warn(`Failed to parse save ${key}`, e);
      }
    }
  }
  return saves.sort((a, b) => b.timestamp - a.timestamp);
}

export function deleteSave(slot: number): void {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slot}`);
}
