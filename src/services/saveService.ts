import { SerializedGameState } from 'quake2ts/game';
import { PlayerState } from 'quake2ts/shared';
import { getGameService } from './gameService';

export interface SavedGame {
  slot: number;
  name: string;
  timestamp: number;
  mapName: string;
  playerState: PlayerState;
  gameState: SerializedGameState;
  screenshot?: string; // base64
}

const STORAGE_PREFIX = 'quake2ts-save-';

export async function saveGame(slot: number, name: string): Promise<void> {
  const gameService = getGameService();
  if (!gameService) {
    throw new Error('Game not running');
  }

  const exports = gameService.getExports();
  if (!exports) {
    throw new Error('Game exports not available');
  }

  const snapshot = gameService.getSnapshot();
  if (!snapshot) {
     throw new Error('No game snapshot available');
  }

  // Serialize game state
  // Assuming exports.serialize() exists as per d.ts
  const gameState = exports.serialize();

  const playerState: PlayerState = {
      stats: snapshot.stats,
      origin: snapshot.origin,
      viewAngles: snapshot.viewangles,
      velocity: snapshot.velocity,
      blend: snapshot.blend,
      // ... fill strictly required fields with defaults or from snapshot
      onGround: false,
      waterLevel: 0,
      mins: {x:0,y:0,z:0},
      maxs: {x:0,y:0,z:0},
      damageAlpha: snapshot.damageAlpha,
      damageIndicators: snapshot.damageIndicators,
      kick_angles: snapshot.kick_angles,
      kick_origin: snapshot.kick_origin,
      gunoffset: snapshot.gunoffset,
      gunangles: snapshot.gunangles,
      gunindex: snapshot.gunindex,
      pm_type: snapshot.pm_type,
      pm_time: snapshot.pm_time,
      pm_flags: snapshot.pm_flags,
      gun_frame: snapshot.gun_frame,
      rdflags: snapshot.rdflags,
      fov: snapshot.fov,
      renderfx: snapshot.renderfx
  };

  const save: SavedGame = {
    slot,
    name,
    timestamp: Date.now(),
    mapName: 'unknown',
    playerState,
    gameState
  };

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${slot}`, JSON.stringify(save));
  } catch (e) {
    throw new Error('Failed to save game: Storage quota exceeded?');
  }
}

export async function loadGame(slot: number): Promise<SavedGame | null> {
  const json = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);
  if (!json) return null;

  try {
    return JSON.parse(json) as SavedGame;
  } catch {
    return null;
  }
}

export function listSaves(): SavedGame[] {
  const saves: SavedGame[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const json = localStorage.getItem(key);
        if (json) {
          saves.push(JSON.parse(json));
        }
      } catch {
        // Ignore corrupted
      }
    }
  }
  return saves.sort((a, b) => b.timestamp - a.timestamp);
}

export function deleteSave(slot: number): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${slot}`);
}

export const saveService = {
  saveGame,
  loadGame,
  listSaves,
  deleteSave
};
