import { cacheService, CACHE_STORES } from '../../../src/services/cacheService';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('CacheService', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockStore: any;
  let mockOpenRequest: any;

  beforeEach(() => {
    // Reset singleton state if possible.
    // CacheService stores 'db' and 'initPromise'.
    // We can't easily reset private properties without casting.
    (cacheService as any).db = null;
    (cacheService as any).initPromise = null;

    mockStore = {
      put: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn()
    };

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore)
    };

    mockDB = {
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(false)
      },
      createObjectStore: jest.fn(),
      transaction: jest.fn().mockReturnValue(mockTransaction)
    };

    mockOpenRequest = {
      result: mockDB,
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

  it('should initialize database and create stores', async () => {
    // We need to trigger upgrade needed
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
    expect(mockDB.createObjectStore).toHaveBeenCalledWith(CACHE_STORES.THUMBNAILS, { keyPath: 'key' });
  });

  it('should set value in cache', async () => {
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

  it('should get value from cache', async () => {
    mockStore.get.mockImplementation((key: string) => {
        const req = { onsuccess: null, onerror: null, result: { data: 'data1' } };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    const result = await cacheService.get(CACHE_STORES.PAK_INDEX, 'key1');
    expect(result).toBe('data1');
  });

  it('should return undefined if key not found', async () => {
    mockStore.get.mockImplementation((key: string) => {
        const req = { onsuccess: null, onerror: null, result: undefined };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    const result = await cacheService.get(CACHE_STORES.PAK_INDEX, 'missing');
    expect(result).toBeUndefined();
  });
});
