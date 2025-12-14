import fs from 'fs';
import path from 'path';
import { createGameSimulation } from '@/src/services/gameService';
import { VirtualFileSystem, PakArchive } from 'quake2ts/engine';

// Real game simulation test
describe('GameService Integration', () => {
    it('loads demo1.bsp and runs game simulation', async () => {
        const pakPath = path.resolve(process.cwd(), 'public', 'pak.pak');
        if (!fs.existsSync(pakPath)) {
            console.warn('public/pak.pak not found, skipping integration test');
            return;
        }
        const buffer = fs.readFileSync(pakPath);
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        const vfs = new VirtualFileSystem();
        const archive = PakArchive.fromArrayBuffer('pak.pak', arrayBuffer);
        vfs.mountPak(archive);

        // Verify map exists
        expect(vfs.hasFile('maps/demo1.bsp')).toBe(true);

        const simulation = await createGameSimulation(vfs, 'maps/demo1.bsp');

        simulation.start();

        // Run a few ticks
        for(let i=0; i<10; i++) {
             simulation.tick(50, {
                 msec: 50,
                 buttons: 0,
                 angles: {x:0, y:0, z:0} as any,
                 forwardmove: 0,
                 sidemove: 0,
                 upmove: 0,
                 impulse: 0,
                 lightlevel: 0
             });
        }

        const snapshot = simulation.getSnapshot();
        expect(snapshot).toBeDefined();
        if (snapshot) {
             // Game starts at time 0 or small value.
             // If we ticked 10 * 50ms = 500ms.
             // But game.init might reset time.
             // Just checking it's an object is good start.
             expect(snapshot).toHaveProperty('entities');
             expect(snapshot).toHaveProperty('stats');
        }

        simulation.shutdown();
    });
});
