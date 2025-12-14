
import { createGameSimulation, shutdownGameService } from '../../../src/services/gameService';
import { getPakService } from '../../../src/services/pakService';
import { VirtualFileSystem } from 'quake2ts/engine';
import path from 'path';
import fs from 'fs';

describe('GameService Integration', () => {
    let vfs: VirtualFileSystem;

    beforeAll(async () => {
        // Load pak.pak from repo root if possible
        const pakPath = path.resolve(__dirname, '../../../public/pak.pak');
        if (!fs.existsSync(pakPath)) {
            console.warn("pak.pak not found, skipping integration test requiring real assets");
            return;
        }

        const buffer = fs.readFileSync(pakPath);
        const pakService = getPakService();
        await pakService.loadPakFromBuffer('pak.pak', buffer.buffer);
        vfs = pakService.getVfs();
    });

    afterEach(() => {
        shutdownGameService();
    });

    it('should load a map and run simulation', async () => {
        if (!vfs) return;

        // "maps/demo1.bsp" is known to exist
        const game = await createGameSimulation(vfs, 'maps/demo1.bsp');

        // Run for a few frames
        const cmd = {
            msec: 25,
            buttons: 0,
            angles: { x: 0, y: 0, z: 0 },
            forwardmove: 0,
            sidemove: 0,
            upmove: 0,
            impulse: 0,
            lightlevel: 0,
            sequence: 0,
            serverFrame: 0
        };

        const step = {
            frame: 1,
            deltaMs: 25,
            nowMs: 1000
        };

        for (let i = 0; i < 10; i++) {
            game.tick(step, cmd);
            step.frame++;
            step.nowMs += 25;
        }

        const snapshot = game.getSnapshot();
        expect(snapshot).toBeDefined();

        expect(snapshot.level).toBeDefined();
        expect(snapshot.level.timeSeconds).toBeGreaterThan(0);

        // Client might not be defined if no client connected?
        // GameExports has clientConnect().
        // In my gameService init, I didn't connect a client.
        // So `snapshot.client` is undefined.

        // Let's assume basic simulation working is enough for now.
        // We verified time advanced.
        expect(snapshot.entities).toBeDefined();
    });
});
