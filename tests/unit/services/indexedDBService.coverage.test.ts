import { indexedDBService } from '../../../src/services/indexedDBService';
import 'fake-indexeddb/auto';


describe('IndexedDBService Coverage', () => {
    beforeEach(async () => {
        // Close existing connection to allow deletion
        if ((indexedDBService as any).db) {
            (indexedDBService as any).db.close();
            (indexedDBService as any).db = null;
        }

        // Clear DB
        const req = indexedDB.deleteDatabase('Quake2TS');
        await new Promise((resolve) => {
            req.onsuccess = resolve;
            req.onerror = resolve;
            req.onblocked = () => {
                console.warn('DB delete blocked');
                // Should resolve anyway or timeout?
                // fake-indexeddb might not fire blocked if we closed connection?
                // But resolving here might lead to race condition if delete hasn't finished.
                // But blocked event means it's waiting.
            };
        });

        // Reset service instance
        (indexedDBService as any).db = null;
    });

    afterEach(() => {
        if ((indexedDBService as any).db) {
            (indexedDBService as any).db.close();
            (indexedDBService as any).db = null;
        }
    });

    it('initializes DB on first call', async () => {
        const paks = await indexedDBService.getPaks();
        expect(paks).toEqual([]);
        expect((indexedDBService as any).db).toBeDefined();
    });

    it('saves a PAK file', async () => {
        const file = new File(['test'], 'test.pak', { type: 'application/octet-stream' });
        const id = await indexedDBService.savePak(file);
        expect(id).toBeDefined();

        const paks = await indexedDBService.getPaks();
        expect(paks.length).toBe(1);
        expect(paks[0].id).toBe(id);
        expect(paks[0].name).toBe('test.pak');
    });

    it('updates existing PAK if name and size match', async () => {
        const file1 = new File(['test'], 'test.pak', { type: 'application/octet-stream' });
        const id1 = await indexedDBService.savePak(file1);

        // Same file (name/size/content)
        const file2 = new File(['test'], 'test.pak', { type: 'application/octet-stream' });
        const id2 = await indexedDBService.savePak(file2);

        expect(id2).toBe(id1);
        const paks = await indexedDBService.getPaks();
        expect(paks.length).toBe(1);
    });

    it('deletes a PAK', async () => {
        const file = new File(['test'], 'test.pak', { type: 'application/octet-stream' });
        const id = await indexedDBService.savePak(file);

        await indexedDBService.deletePak(id);
        const paks = await indexedDBService.getPaks();
        expect(paks.length).toBe(0);
    });

    it('handles duplicate initialization', async () => {
        await indexedDBService.initDB();
        await indexedDBService.initDB(); // Should return immediately
        expect((indexedDBService as any).db).toBeDefined();
    });
});
