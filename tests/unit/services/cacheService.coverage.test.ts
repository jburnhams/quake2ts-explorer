import { cacheService, CACHE_STORES } from '../../../src/services/cacheService';


describe('CacheService Coverage', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockStore: any;
  let mockOpenRequest: any;

  beforeEach(() => {
    // Reset singleton state
    (cacheService as any).db = null;
    (cacheService as any).initPromise = null;

    mockStore = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      count: vi.fn(),
      getAll: vi.fn(),
      createIndex: vi.fn(),
      index: vi.fn(),
      indexNames: { contains: vi.fn().mockReturnValue(false) }
    };

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockStore)
    };

    mockDB = {
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false)
      },
      createObjectStore: vi.fn().mockReturnValue(mockStore),
      transaction: vi.fn().mockReturnValue(mockTransaction),
      close: vi.fn()
    };

    mockOpenRequest = {
      result: mockDB,
      transaction: mockTransaction,
      onsuccess: null,
      onupgradeneeded: null,
      onerror: null
    };

    const mockOpen = vi.fn().mockReturnValue(mockOpenRequest);

    Object.defineProperty(global, 'indexedDB', {
      value: {
        open: mockOpen
      },
      writable: true
    });
  });

  it('init handles error', async () => {
    const mockOpen = global.indexedDB.open as vi.Mock;
    mockOpen.mockImplementation(() => {
        setTimeout(() => {
            if (mockOpenRequest.onerror) {
                mockOpenRequest.onerror({ target: mockOpenRequest });
            }
        }, 0);
        return mockOpenRequest;
    });

    await expect(cacheService.init()).rejects.toThrow('Failed to open cache DB');
  });

  it('get throws if db not init', async () => {
      // We can't easily prevent init from running, but if init fails or returns but DB is null?
      // init() checks this.db.

      // If we mock open to succeed but result is null?
      mockOpenRequest.result = null;
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      await expect(cacheService.get(CACHE_STORES.PAK_INDEX, 'k')).rejects.toThrow('DB not initialized');
  });

  it('get handles error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      mockStore.get.mockImplementation(() => {
          const req = { onerror: null };
          setTimeout(() => req.onerror && (req.onerror as any)(), 0);
          return req;
      });

      await expect(cacheService.get(CACHE_STORES.PAK_INDEX, 'k')).rejects.toThrow('Failed to get from pak-index');
  });

  it('set handles error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      // Mock enforceQuota to resolve
      mockStore.count.mockImplementation(() => {
          const req = { onsuccess: null, result: 0 };
          setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
          return req;
      });

      mockStore.put.mockImplementation(() => {
          const req = { onerror: null };
          setTimeout(() => req.onerror && (req.onerror as any)(), 0);
          return req;
      });

      await expect(cacheService.set(CACHE_STORES.PAK_INDEX, 'k', 'v')).rejects.toThrow('Failed to set in pak-index');
  });

  it('delete handles error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      mockStore.delete.mockImplementation(() => {
          const req = { onerror: null };
          setTimeout(() => req.onerror && (req.onerror as any)(), 0);
          return req;
      });

      await expect(cacheService.delete(CACHE_STORES.PAK_INDEX, 'k')).rejects.toThrow('Failed to delete from pak-index');
  });

  it('clear handles error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      mockStore.clear.mockImplementation(() => {
          const req = { onerror: null };
          setTimeout(() => req.onerror && (req.onerror as any)(), 0);
          return req;
      });

      await expect(cacheService.clear(CACHE_STORES.PAK_INDEX)).rejects.toThrow('Failed to clear pak-index');
  });

  it('export handles error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      mockStore.getAll.mockImplementation(() => {
          const req = { onerror: null };
          setTimeout(() => req.onerror && (req.onerror as any)(), 0);
          return req;
      });

      await expect(cacheService.export(CACHE_STORES.PAK_INDEX)).rejects.toThrow('Failed to export pak-index');
  });

  it('getStats handles error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      mockStore.count.mockImplementation(() => {
          const req = { onerror: null };
          setTimeout(() => req.onerror && (req.onerror as any)(), 0);
          return req;
      });

      await expect(cacheService.getStats()).rejects.toThrow();
  });

  it('enforceQuota handles cursor error', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      mockStore.count.mockImplementation(() => {
          const req = { onsuccess: null, result: 2000 };
          setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
          return req;
      });

      const mockIndex = {
          openKeyCursor: vi.fn().mockImplementation(() => {
               const req = { onerror: null };
               setTimeout(() => req.onerror && (req.onerror as any)(), 0);
               return req;
          })
      };
      mockStore.index.mockReturnValue(mockIndex);

      await cacheService.init();
      await expect(cacheService.enforceQuota(CACHE_STORES.PAK_INDEX, 1000)).rejects.toThrow('Failed to iterate cursor');
  });

  it('close closes db', async () => {
      const mockOpen = global.indexedDB.open as vi.Mock;
      mockOpen.mockImplementation(() => {
          setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
          return mockOpenRequest;
      });

      await cacheService.init();
      cacheService.close();
      expect(mockDB.close).toHaveBeenCalled();
  });

  it('getStorageEstimate calls navigator.storage', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({ usage: 100, quota: 1000 });
      // @ts-ignore
      global.navigator.storage = { estimate: mockEstimate };

      const result = await cacheService.getStorageEstimate();
      expect(result).toEqual({ usage: 100, quota: 1000 });
  });

  it('getStorageEstimate returns empty object if unavailable', async () => {
      // @ts-ignore
      global.navigator.storage = undefined;

      const result = await cacheService.getStorageEstimate();
      expect(result).toEqual({});
  });

  it('getStats returns stats for all stores', async () => {
    const mockOpen = global.indexedDB.open as vi.Mock;
    mockOpen.mockImplementation(() => {
        setTimeout(() => mockOpenRequest.onsuccess && mockOpenRequest.onsuccess({ target: mockOpenRequest }), 0);
        return mockOpenRequest;
    });

    mockStore.count.mockImplementation(() => {
        const req = { onsuccess: null, result: 10 };
        setTimeout(() => req.onsuccess && (req.onsuccess as any)(), 0);
        return req;
    });

    const stats = await cacheService.getStats();
    expect(stats['pak-index']).toEqual({ count: 10 });
  });
});
