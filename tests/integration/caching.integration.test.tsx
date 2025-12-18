import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PakService } from '@/src/services/pakService';
import { cacheService, CACHE_STORES } from '@/src/services/cacheService';
import { workerService } from '@/src/services/workerService';
import { WorkerPakArchive } from '@/src/utils/WorkerPakArchive';
import { thumbnailService } from '@/src/services/thumbnailService';

jest.mock('@/src/services/workerService');

describe('Caching Integration', () => {
    let service: PakService;
    let storeData: Record<string, any>;

    beforeEach(() => {
        storeData = {};

        const mockStore = {
            put: jest.fn().mockImplementation((val: any) => {
                storeData[`store:${val.key}`] = val.data;
                const req = { onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess && (req.onsuccess as any)({ target: req }), 0);
                return req;
            }),
            get: jest.fn().mockImplementation((key: string) => {
                const data = storeData[`store:${key}`];
                const req = { result: data ? { data } : undefined, onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess && (req.onsuccess as any)({ target: req }), 0);
                return req;
            }),
            delete: jest.fn(),
            clear: jest.fn(),
            count: jest.fn().mockImplementation(() => {
                const req = { result: Object.keys(storeData).length, onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess && (req.onsuccess as any)({ target: req }), 0);
                return req;
            }),
            createIndex: jest.fn(),
            indexNames: { contains: jest.fn().mockReturnValue(false) }
        };

        // Mock IndexedDB
        const mockIDB = {
            open: jest.fn().mockImplementation((name, version) => {
                const request: any = {
                    result: {
                        objectStoreNames: { contains: () => false },
                        createObjectStore: jest.fn().mockReturnValue(mockStore),
                        transaction: jest.fn().mockReturnValue({
                            objectStore: jest.fn().mockReturnValue(mockStore)
                        })
                    },
                    transaction: {
                        objectStore: jest.fn().mockReturnValue(mockStore)
                    },
                    onsuccess: null,
                    onupgradeneeded: null,
                    onerror: null
                };

                // Simulate upgrade needed first if version matches?
                // cacheService sets version 2.
                // We'll simulate upgrade needed then success.
                setTimeout(() => {
                    if (request.onupgradeneeded) {
                        request.onupgradeneeded({ target: request });
                    }
                    if (request.onsuccess) {
                        request.onsuccess({ target: request });
                    }
                }, 0);
                return request;
            })
        };

        Object.defineProperty(global, 'indexedDB', { value: mockIDB, writable: true });

        // Reset cacheService
        (cacheService as any).db = null;
        (cacheService as any).initPromise = null;

        service = new PakService();
        jest.clearAllMocks();
    });

    it('should cache parsed PAK index', async () => {
        const dummyEntries = new Map([['file.txt', { offset: 0, length: 10 }]]);
        (workerService.executePakParserTask as jest.Mock).mockResolvedValue({
            entries: dummyEntries,
            buffer: new ArrayBuffer(0),
            name: 'test'
        });

        const buffer = new ArrayBuffer(100);
        const bytes = new Uint8Array(buffer);
        bytes.set([0x50, 0x41, 0x43, 0x4B]); // PACK
        // Offset 12, size 0
        new DataView(buffer).setUint32(4, 12, true);
        new DataView(buffer).setUint32(8, 0, true);

        const file = {
            name: 'cache_test.pak',
            arrayBuffer: jest.fn().mockResolvedValue(buffer)
        } as unknown as File;

        await service.loadPakFile(file);

        // Wait for async cache operations (set is not awaited in loadPakFile)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify it's in storeData
        // Note: our mockStore uses 'store:' prefix, we should check calls or data
        // The storeName is not part of key in mockStore unless we differentiate stores in mock.
        // In this simple mock, all stores share 'storeData' with prefix 'store:'.
        // But the put implementation: storeData[`store:${val.key}`] = val.data;
        // It uses fixed prefix 'store:'.

        // We can check if *something* was stored.
        const keys = Object.keys(storeData);
        expect(keys.length).toBeGreaterThan(0);
        // The key used in PakService contains hash
        const cachedEntry = Object.values(storeData)[0];
        expect(cachedEntry).toBe(dummyEntries);
    });

    it('should use cached PAK index on second load', async () => {
        const dummyEntries = new Map([['cached.txt', { offset: 0, length: 10 }]]);
        (workerService.executePakParserTask as jest.Mock).mockResolvedValue({
            entries: dummyEntries,
            buffer: new ArrayBuffer(0),
            name: 'test'
        });

        const buffer = new ArrayBuffer(100);
        const bytes = new Uint8Array(buffer);
        bytes.set([0x50, 0x41, 0x43, 0x4B]); // PACK
        new DataView(buffer).setUint32(4, 12, true);
        new DataView(buffer).setUint32(8, 0, true);

        const file = {
            name: 'cache_test.pak',
            arrayBuffer: jest.fn().mockResolvedValue(buffer)
        } as unknown as File;

        await service.loadPakFile(file);

        // Wait for async cache set
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(workerService.executePakParserTask).toHaveBeenCalledTimes(1);

        (workerService.executePakParserTask as jest.Mock).mockClear();
        (workerService.executePakParserTask as jest.Mock).mockRejectedValue(new Error('Worker should not be called'));

        const archive = await service.loadPakFile(file);

        expect(workerService.executePakParserTask).not.toHaveBeenCalled();
        expect(archive).toBeDefined();
    });

    it('should cache and retrieve thumbnails', async () => {
        const blob = new Blob(['image data']);
        await thumbnailService.saveThumbnail('test-thumb', blob);

        const keys = Object.keys(storeData);
        expect(keys.length).toBeGreaterThan(0);

        const retrieved = await thumbnailService.getThumbnail('test-thumb');
        expect(retrieved).toBeDefined();
        expect(retrieved).toEqual(blob);
    });
});
