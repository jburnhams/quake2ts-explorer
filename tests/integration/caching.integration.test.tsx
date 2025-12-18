import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PakService } from '@/src/services/pakService';
import { cacheService, CACHE_STORES } from '@/src/services/cacheService';
import { workerService } from '@/src/services/workerService';
import { WorkerPakArchive } from '@/src/utils/WorkerPakArchive';

jest.mock('@/src/services/workerService');

describe('Caching Integration', () => {
    let service: PakService;
    let storeData: Record<string, any>;

    beforeEach(() => {
        storeData = {};

        // Mock IndexedDB
        const mockIDB = {
            open: jest.fn().mockImplementation((name, version) => {
                const request: any = {
                    result: {
                        objectStoreNames: { contains: () => true },
                        createObjectStore: jest.fn(),
                        transaction: jest.fn().mockReturnValue({
                            objectStore: jest.fn().mockImplementation((storeName) => ({
                                put: jest.fn().mockImplementation((val) => {
                                    storeData[`${storeName}:${val.key}`] = val.data;
                                    const req = { onsuccess: null, onerror: null };
                                    setTimeout(() => req.onsuccess && (req.onsuccess as any)({ target: req }), 0);
                                    return req;
                                }),
                                get: jest.fn().mockImplementation((key) => {
                                    const data = storeData[`${storeName}:${key}`];
                                    const req = { result: data ? { data } : undefined, onsuccess: null, onerror: null };
                                    setTimeout(() => req.onsuccess && (req.onsuccess as any)({ target: req }), 0);
                                    return req;
                                }),
                                delete: jest.fn(),
                                clear: jest.fn()
                            }))
                        })
                    },
                    onsuccess: null,
                    onupgradeneeded: null,
                    onerror: null
                };
                setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
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

        const file = {
            name: 'cache_test.pak',
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100))
        } as unknown as File;

        await service.loadPakFile(file);

        // Verify it's in storeData
        const keys = Object.keys(storeData);
        const pakIndexKey = keys.find(k => k.startsWith(CACHE_STORES.PAK_INDEX));
        expect(pakIndexKey).toBeDefined();
        expect(storeData[pakIndexKey!]).toBe(dummyEntries);
    });

    it('should use cached PAK index on second load', async () => {
        // 1. Setup cache miss logic
        const dummyEntries = new Map([['cached.txt', { offset: 0, length: 10 }]]);
        (workerService.executePakParserTask as jest.Mock).mockResolvedValue({
            entries: dummyEntries,
            buffer: new ArrayBuffer(0),
            name: 'test'
        });

        const buffer = new ArrayBuffer(100);
        const file = {
            name: 'cache_test.pak',
            arrayBuffer: jest.fn().mockResolvedValue(buffer)
        } as unknown as File;

        // 2. First load
        await service.loadPakFile(file);

        expect(workerService.executePakParserTask).toHaveBeenCalledTimes(1);

        // 3. Reset mock to fail if called
        (workerService.executePakParserTask as jest.Mock).mockClear();
        (workerService.executePakParserTask as jest.Mock).mockRejectedValue(new Error('Worker should not be called'));

        // 4. Second load
        const archive = await service.loadPakFile(file);

        expect(workerService.executePakParserTask).not.toHaveBeenCalled();
        expect(archive).toBeDefined();

        // Use type assertion or access via unknown if listEntries not on interface
        // PakArchive usually has listEntries or we can check property via cast
        expect((archive as any).entries).toBeDefined();
    });
});
