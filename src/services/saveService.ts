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

export async function loadGame(slot: number): Promise<SavedGame | null> {
  const json = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
  if (!json) {
    return null;
  }

  let savedGame: SavedGame;
  try {
    savedGame = JSON.parse(json);
  } catch (e) {
    throw new Error(`Failed to parse save file in slot ${slot}`);
  }

  const gameService = getGameService();

  // If we have a running game, try to load directly
  if (gameService) {
      gameService.loadSave(savedGame.data);
  }

  return savedGame;
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

export const saveService = {
  saveGame,
  loadGame,
  listSaves,
  deleteSave
};
