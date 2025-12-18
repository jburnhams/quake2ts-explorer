import { cacheService, CACHE_STORES } from '../../../src/services/cacheService';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('CacheService', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockStore: any;
  let mockOpenRequest: any;

  beforeEach(() => {
    // Reset singleton state if possible.
    (cacheService as any).db = null;
    (cacheService as any).initPromise = null;

    mockStore = {
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      count: jest.fn(),
      getAll: jest.fn(),
      createIndex: jest.fn(),
      index: jest.fn(),
      indexNames: { contains: jest.fn().mockReturnValue(false) }
    };

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore)
    };

    mockDB = {
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(false)
      },
      createObjectStore: jest.fn().mockReturnValue(mockStore),
      transaction: jest.fn().mockReturnValue(mockTransaction),
      close: jest.fn()
    };

    mockOpenRequest = {
      result: mockDB,
      transaction: mockTransaction, // Added for upgrade needed
      onsuccess: null,
      onupgradeneeded: null,
      onerror: null
    };

    // Mock indexedDB.open
    const mockOpen = jest.fn().mockImplementation(() => {
        // trigger success asynchronously
        setTimeout(() => {
            if (mockOpenRequest.onsuccess) {
                mockOpenRequest.onsuccess({ target: mockOpenRequest });
            }
        }, 0);
        return mockOpenRequest;
    });

    Object.defineProperty(global, 'indexedDB', {
      value: {
        open: mockOpen
      },
      writable: true
    });
  });

  it('should initialize database and create stores with indexes', async () => {
    const mockOpen = global.indexedDB.open as jest.Mock;
    mockOpen.mockImplementation(() => {
        setTimeout(() => {
            if (mockOpenRequest.onupgradeneeded) {
                mockOpenRequest.onupgradeneeded({ target: mockOpenRequest });
            }
            if (mockOpenRequest.onsuccess) {
                mockOpenRequest.onsuccess({ target: mockOpenRequest });
            }
        }, 0);
        return mockOpenRequest;
    });

    await cacheService.init();

    expect(mockDB.createObjectStore).toHaveBeenCalledWith(CACHE_STORES.PAK_INDEX, { keyPath: 'key' });
    expect(mockStore.createIndex).toHaveBeenCalledWith('timestamp', 'timestamp', { unique: false });
  });

  it('should set value in cache', async () => {
    // Mock enforceQuota to resolve immediately
    mockStore.count.mockImplementation(() => {
        const req = { onsuccess: null, result: 0 };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    mockStore.put.mockImplementation((val: any) => {
        const req = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    await cacheService.set(CACHE_STORES.PAK_INDEX, 'key1', 'data1');

    expect(mockTransaction.objectStore).toHaveBeenCalledWith(CACHE_STORES.PAK_INDEX);
    expect(mockStore.put).toHaveBeenCalledWith(expect.objectContaining({
        key: 'key1',
        data: 'data1'
    }));
  });

  it('should touch timestamp on get', async () => {
    mockStore.get.mockImplementation((key: string) => {
        const req = { onsuccess: null, onerror: null, result: { data: 'data1', timestamp: 100 } };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    // Mock touch put
    mockStore.put.mockImplementation(() => {
        const req = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    const result = await cacheService.get(CACHE_STORES.PAK_INDEX, 'key1');
    expect(result).toBe('data1');
    expect(mockStore.put).toHaveBeenCalled(); // Should have touched
  });

  it('should enforce quota by deleting oldest', async () => {
    mockStore.count.mockImplementation(() => {
         const req = { onsuccess: null, result: 1005 }; // 5 over limit (assuming 1000)
         setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
         return req;
    });

    let iter = 0;
    const mockCursor = {
        primaryKey: 'k1',
        continue: jest.fn(() => {
            iter++;
            if (iter >= 5) {
                mockCursorRequest.result = null; // stop
            }
            setTimeout(() => mockCursorRequest.onsuccess && (mockCursorRequest.onsuccess as any)(), 0);
        })
    };

    const mockCursorRequest: any = {
        onsuccess: null,
        result: mockCursor
    };

    const mockIndex = {
        openKeyCursor: jest.fn().mockImplementation(() => {
             setTimeout(() => mockCursorRequest.onsuccess && (mockCursorRequest.onsuccess as any)(), 0);
             return mockCursorRequest;
        })
    };
    mockStore.index.mockReturnValue(mockIndex);

    mockStore.delete.mockImplementation(() => {
        const req = { onsuccess: null };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    await cacheService.init();
    await cacheService.enforceQuota(CACHE_STORES.PAK_INDEX, 1000);

    expect(mockStore.delete).toHaveBeenCalledTimes(5);
  });
});
