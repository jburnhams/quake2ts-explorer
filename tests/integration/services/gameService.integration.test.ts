
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { VirtualFileSystem } from 'quake2ts/engine';
import { pakSource } from '@/tests/integration/utils/testAssets';
import fs from 'fs';
import path from 'path';

// Need to mock webgl and audio context for node environment
jest.mock('quake2ts/engine', () => {
  const actual = jest.requireActual('quake2ts/engine');
  return {
    ...actual,
    createWebGLContext: jest.fn(),
    AudioSystem: jest.fn().mockImplementation(() => ({
      update: jest.fn(),
      shutdown: jest.fn()
    }))
  };
});

// We need a real map file for integration test.
// The prompt says pak.pak contains maps/demo1.bsp
describe('GameService Integration', () => {
  let vfs: VirtualFileSystem;
  const PAK_PATH = path.join(process.cwd(), 'pak.pak');

  beforeAll(() => {
    // Check if pak.pak exists
    if (!fs.existsSync(PAK_PATH)) {
      console.warn('Skipping integration test: pak.pak not found');
      return;
    }
  });

  beforeEach(async () => {
    if (!fs.existsSync(PAK_PATH)) return;

    vfs = new VirtualFileSystem();
    const buffer = fs.readFileSync(PAK_PATH).buffer;

    // The engine's VirtualFileSystem doesn't export mountPak directly in public API usually?
    // Let's check imports.
    const { PakArchive } = jest.requireActual('quake2ts/engine');
    const archive = new PakArchive(buffer);
    vfs.mountPak(archive);
  });

  afterEach(() => {
    shutdownGameService();
  });

  it('should initialize game with real map', async () => {
    if (!fs.existsSync(PAK_PATH)) return;

    const game = await createGameSimulation(vfs, 'maps/demo1.bsp');
    expect(game).toBeDefined();

    const snapshot = game.getSnapshot();
    expect(snapshot).toBeDefined();
    // Valid snapshot should have time
    expect(typeof snapshot.time).toBe('number');
  });

  it('should run simulation steps', async () => {
    if (!fs.existsSync(PAK_PATH)) return;

    const game = await createGameSimulation(vfs, 'maps/demo1.bsp');

    const startSnapshot = game.getSnapshot();
    const startTime = startSnapshot.time;

    // Run 10 ticks
    const cmd = {
      msec: 25,
      buttons: 0,
      angles: { x: 0, y: 0, z: 0 },
      forwardmove: 0,
      sidemove: 0,
      upmove: 0,
      impulse: 0,
      lightlevel: 0
    };

    for (let i = 0; i < 10; i++) {
        game.tick(25, cmd);
    }

    const endSnapshot = game.getSnapshot();
    expect(endSnapshot.time).toBeGreaterThan(startTime);
  });
});
