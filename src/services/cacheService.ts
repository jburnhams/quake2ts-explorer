export const CACHE_STORES = {
  PAK_INDEX: 'pak-index',
  THUMBNAILS: 'thumbnails',
  ASSET_METADATA: 'asset-metadata',
  DEMO_INDEX: 'demo-index'
} as const;

export type CacheStoreName = typeof CACHE_STORES[keyof typeof CACHE_STORES];

const DB_NAME = 'quake2ts-cache';
const DB_VERSION = 2;

export class CacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error('Failed to open cache DB'));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        Object.values(CACHE_STORES).forEach(storeName => {
            let store: IDBObjectStore;
            if (!db.objectStoreNames.contains(storeName)) {
                store = db.createObjectStore(storeName, { keyPath: 'key' });
            } else {
                store = transaction!.objectStore(storeName);
            }

            if (!store.indexNames.contains('timestamp')) {
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
    });

    return this.initPromise;
  }

  async get<T>(storeName: CacheStoreName, key: string): Promise<T | undefined> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onerror = () => reject(new Error(`Failed to get from ${storeName}`));
        request.onsuccess = () => {
            const result = request.result;
            // Update timestamp on access for LRU
            if (result) {
                this.touch(storeName, key, result).catch(() => {});
            }
            resolve(result ? result.data : undefined);
        };
    });
  }

  private async touch(storeName: CacheStoreName, key: string, entry: any): Promise<void> {
      // Don't block main get
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      entry.timestamp = Date.now();
      store.put(entry);
  }

  async set<T>(storeName: CacheStoreName, key: string, data: T): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const db = this.db;

    // Enforce quota before setting (simple check)
    // In a real app, we might do this periodically or on idle
    await this.enforceQuota(storeName, 1000); // Max 1000 items for now

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const entry = {
            key,
            data,
            timestamp: Date.now()
        };
        const request = store.put(entry);

        request.onerror = () => reject(new Error(`Failed to set in ${storeName}`));
        request.onsuccess = () => resolve();
    });
  }

  async enforceQuota(storeName: CacheStoreName, maxItems: number): Promise<void> {
      if (!this.db) return;

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const countRequest = store.count();

          countRequest.onsuccess = () => {
              if (countRequest.result > maxItems) {
                  const itemsToDelete = countRequest.result - maxItems;
                  const index = store.index('timestamp');
                  const cursorRequest = index.openKeyCursor(); // Oldest first
                  let deleted = 0;

                  cursorRequest.onsuccess = () => {
                      const cursor = cursorRequest.result;
                      if (cursor && deleted < itemsToDelete) {
                          store.delete(cursor.primaryKey);
                          deleted++;
                          cursor.continue();
                      } else {
                          resolve();
                      }
                  };
                  cursorRequest.onerror = () => reject(new Error('Failed to iterate cursor'));
              } else {
                  resolve();
              }
          };
          countRequest.onerror = () => reject(new Error('Failed to count items'));
      });
  }

  async delete(storeName: CacheStoreName, key: string): Promise<void> {
      await this.init();
      if (!this.db) throw new Error('DB not initialized');

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);

          request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
          request.onsuccess = () => resolve();
      });
  }

  async clear(storeName: CacheStoreName): Promise<void> {
      await this.init();
      if (!this.db) throw new Error('DB not initialized');

      return new Promise((resolve, reject) => {
          const transaction = this.db!.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
          request.onsuccess = () => resolve();
      });
  }

  async clearAll(): Promise<void> {
      await this.init();
      const promises = Object.values(CACHE_STORES).map(store => this.clear(store));
      await Promise.all(promises);
  }

  async getStats(): Promise<Record<CacheStoreName, { count: number }>> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const stats: Partial<Record<CacheStoreName, { count: number }>> = {};
    const storeNames = Object.values(CACHE_STORES);

    await Promise.all(storeNames.map(async (storeName) => {
        return new Promise<void>((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();

            countRequest.onsuccess = () => {
                stats[storeName] = { count: countRequest.result };
                resolve();
            };
            countRequest.onerror = () => reject(new Error(`Failed to count ${storeName}`));
        });
    }));

    return stats as Record<CacheStoreName, { count: number }>;
  }

  async getStorageEstimate(): Promise<{ usage?: number, quota?: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate();
    }
    return {};
  }

  async export(storeName: CacheStoreName): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = () => reject(new Error(`Failed to export ${storeName}`));
        request.onsuccess = () => {
             resolve(request.result);
        };
    });
  }

  close(): void {
      if (this.db) {
          this.db.close();
          this.db = null;
          this.initPromise = null;
      }
  }
}

export const cacheService = new CacheService();
