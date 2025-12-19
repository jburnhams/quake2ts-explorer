import { demoStorageService } from '@/src/services/demoStorageService';
import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';

// Fake IndexedDB implementation mock
const mockIndexedDB = {
    open: jest.fn(),
};

const mockDb = {
    transaction: jest.fn(),
    objectStoreNames: { contains: jest.fn() },
    createObjectStore: jest.fn(),
};

const mockTransaction = {
    objectStore: jest.fn(),
};

const mockStore = {
    put: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    index: jest.fn(),
    createIndex: jest.fn(),
};

// Global assignment
(global as any).indexedDB = mockIndexedDB;

// Safely mock crypto.randomUUID
const originalCrypto = global.crypto;
Object.defineProperty(global, 'crypto', {
    value: {
        ...originalCrypto,
        randomUUID: jest.fn().mockReturnValue('uuid')
    },
    writable: true
});

describe('DemoStorageService Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // @ts-ignore
        demoStorageService.db = null;

        mockIndexedDB.open.mockReturnValue({
            result: mockDb,
            onsuccess: null,
            onerror: null,
            onupgradeneeded: null,
        } as any);

        mockDb.transaction.mockReturnValue(mockTransaction);
        mockTransaction.objectStore.mockReturnValue(mockStore);
        mockStore.index.mockReturnValue({ getAll: mockStore.getAll });
    });

    afterAll(() => {
        // Restore crypto
        if (originalCrypto) {
             Object.defineProperty(global, 'crypto', {
                value: originalCrypto,
                writable: true
            });
        }
    });

    const triggerOpenSuccess = () => {
        const req = mockIndexedDB.open.mock.results[0].value;
        if (req.onsuccess) req.onsuccess({ target: req });
    };

    const triggerOpenError = () => {
        const req = mockIndexedDB.open.mock.results[0].value;
        if (req.onerror) req.onerror({});
    };

    it('should init DB successfully', async () => {
        const promise = demoStorageService.initDB();
        triggerOpenSuccess();
        await expect(promise).resolves.toBeUndefined();
    });

    it('should handle init DB failure', async () => {
         const promise = demoStorageService.initDB();
         triggerOpenError();
         await expect(promise).rejects.toThrow('Failed to open IndexedDB');
    });

    it('should save demo successfully', async () => {
        const promise = demoStorageService.saveDemo('test', new Blob([]));
        triggerOpenSuccess();

        const putReq = { onsuccess: null, onerror: null };
        mockStore.put.mockReturnValue(putReq);

        await new Promise(resolve => setTimeout(resolve, 0));

        if (putReq.onsuccess) (putReq as any).onsuccess();

        await expect(promise).resolves.toBe('uuid');
    });

    it('should handle save demo error', async () => {
        const promise = demoStorageService.saveDemo('test', new Blob([]));
        triggerOpenSuccess();

        const putReq = { onsuccess: null, onerror: null };
        mockStore.put.mockReturnValue(putReq);

        await new Promise(resolve => setTimeout(resolve, 0));

        if (putReq.onerror) (putReq as any).onerror();

        await expect(promise).rejects.toThrow('Failed to save demo');
    });

    it('should get demos successfully', async () => {
        const promise = demoStorageService.getDemos();
        triggerOpenSuccess();

        const getAllReq = { result: [], onsuccess: null, onerror: null };
        mockStore.getAll.mockReturnValue(getAllReq);

        await new Promise(resolve => setTimeout(resolve, 0));
        if (getAllReq.onsuccess) (getAllReq as any).onsuccess();

        await expect(promise).resolves.toEqual([]);
    });

    it('should handle get demos error', async () => {
        const promise = demoStorageService.getDemos();
        triggerOpenSuccess();

        const getAllReq = { result: [], onsuccess: null, onerror: null };
        mockStore.getAll.mockReturnValue(getAllReq);

        await new Promise(resolve => setTimeout(resolve, 0));
        if (getAllReq.onerror) (getAllReq as any).onerror();

        await expect(promise).rejects.toThrow('Failed to retrieve demos');
    });

    it('should get specific demo', async () => {
        const promise = demoStorageService.getDemo('1');
        triggerOpenSuccess();

        const getReq = { result: { id: '1' }, onsuccess: null, onerror: null };
        mockStore.get.mockReturnValue(getReq);

        await new Promise(resolve => setTimeout(resolve, 0));
        if (getReq.onsuccess) (getReq as any).onsuccess();

        await expect(promise).resolves.toEqual({ id: '1' });
    });

    it('should delete demo', async () => {
        const promise = demoStorageService.deleteDemo('1');
        triggerOpenSuccess();

        const delReq = { onsuccess: null, onerror: null };
        mockStore.delete.mockReturnValue(delReq);

        await new Promise(resolve => setTimeout(resolve, 0));
        if (delReq.onsuccess) (delReq as any).onsuccess();

        await expect(promise).resolves.toBeUndefined();
    });

    it('should update demo metadata', async () => {
        const promise = demoStorageService.updateDemoMetadata('1', { name: 'new' });
        triggerOpenSuccess();

        const getReq = { result: { id: '1', name: 'old' }, onsuccess: null, onerror: null };
        mockStore.get.mockReturnValue(getReq);

        await new Promise(resolve => setTimeout(resolve, 0));

        const putReq = { onsuccess: null, onerror: null };
        mockStore.put.mockReturnValue(putReq);

        if (getReq.onsuccess) (getReq as any).onsuccess();

        await new Promise(resolve => setTimeout(resolve, 0));

        if (putReq.onsuccess) (putReq as any).onsuccess();

        await expect(promise).resolves.toBeUndefined();
    });

    it('should fail update if demo not found', async () => {
        const promise = demoStorageService.updateDemoMetadata('1', { name: 'new' });
        triggerOpenSuccess();

        const getReq = { result: null, onsuccess: null, onerror: null };
        mockStore.get.mockReturnValue(getReq);

        await new Promise(resolve => setTimeout(resolve, 0));
        if (getReq.onsuccess) (getReq as any).onsuccess();

        await expect(promise).rejects.toThrow('Demo 1 not found');
    });
});
