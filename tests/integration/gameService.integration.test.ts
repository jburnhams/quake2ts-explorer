import { getGameService } from '@/src/services/gameService';
import { PakService } from '@/src/services/pakService';
import path from 'path';
import fs from 'fs';

// Since we are in a node environment without WebGL, we cannot perform full integration tests
// that involve rendering or full engine initialization if it depends on browser APIs.
// However, we can test that the service handles real asset loading (files) correctly
// if we mock the parts that require browser APIs.

// We need to mock things that `gameService` uses but that fail in Node.
// `quake2ts/engine` and `quake2ts/game` are compiled JS that might use browser globals.

// We will rely on the unit tests for deep logic verification.
// This integration test will verify that we can load the PAK file and pass the VFS to the game service.

describe('GameService Integration', () => {
  let pakService: PakService;

  beforeAll(async () => {
    // Load local pak.pak
    const pakPath = path.resolve(__dirname, '../../pak.pak');
    if (!fs.existsSync(pakPath)) {
      console.warn('pak.pak not found, skipping integration test');
      return;
    }

    const buffer = fs.readFileSync(pakPath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    pakService = new PakService();
    await pakService.loadPakFromBuffer('pak.pak', arrayBuffer);
  });

  it('should initialize game service with real VFS', () => {
    if (!pakService) return;

    const gameService = getGameService(pakService.getVfs());
    expect(gameService).toBeDefined();

    // We can't easily call initGame because it will try to load a map and potentially hit
    // browser-only code in AssetManager or createGame.
    // However, we can verify that the VFS passed has the files we expect.

    const vfs = pakService.getVfs();
    expect(vfs.list().files.length).toBeGreaterThan(0);
    expect(vfs.hasFile('maps/demo1.bsp')).toBe(true);
  });
});
