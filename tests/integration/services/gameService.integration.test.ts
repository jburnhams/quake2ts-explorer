
import { createGameSimulation, shutdownGameService } from '@/src/services/gameService';
import { VirtualFileSystem } from 'quake2ts/engine';
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

describe('GameService Integration', () => {
  let vfs: VirtualFileSystem;
  const PAK_PATH = path.join(process.cwd(), 'public', 'pak.pak');

  beforeAll(() => {
    if (!fs.existsSync(PAK_PATH)) {
      console.warn('Skipping integration test: pak.pak not found');
      return;
    }
  });

  beforeEach(async () => {
    if (!fs.existsSync(PAK_PATH)) return;

    vfs = new VirtualFileSystem();
    const nodeBuffer = fs.readFileSync(PAK_PATH);
    const buffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
    const { PakArchive } = jest.requireActual('quake2ts/engine');
    // @ts-ignore - PakArchive.fromArrayBuffer is not typed in the jest import
    const archive = PakArchive.fromArrayBuffer('pak.pak', buffer);
    vfs.mountPak(archive);
  });

  afterEach(() => {
    shutdownGameService();
  });

  it('should initialize game with real map', async () => {
    if (!fs.existsSync(PAK_PATH)) return;

    const game = await createGameSimulation(vfs, 'maps/demo1.bsp');
    expect(game).toBeDefined();

    try {
        const snapshot = game.getSnapshot();
        expect(snapshot).toBeDefined();
    } catch (e) {
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
        game.tick({ frame: 1, deltaMs: 25, nowMs: 1000 }, cmd);
        const snapshot = game.getSnapshot();
        expect(snapshot).toBeDefined();
    }
  });

  it('should run simulation steps', async () => {
    if (!fs.existsSync(PAK_PATH)) return;

    const game = await createGameSimulation(vfs, 'maps/demo1.bsp');

    // Ticking
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
        game.tick({ frame: i + 1, deltaMs: 25, nowMs: i * 25 }, cmd);
    }

    const endSnapshot = game.getSnapshot();
    expect(endSnapshot).toBeDefined();
  });
});
