export const CACHE_STORES = {
  PAK_INDEX: 'pak-index',
  THUMBNAILS: 'thumbnails',
  ASSET_METADATA: 'asset-metadata',
  DEMO_INDEX: 'demo-index'
} as const;

export type CacheStoreName = typeof CACHE_STORES[keyof typeof CACHE_STORES];

const DB_NAME = 'quake2ts-cache';
const DB_VERSION = 1;

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

        Object.values(CACHE_STORES).forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                // keyPath 'key' is simple and effective for our use cases
                db.createObjectStore(storeName, { keyPath: 'key' });
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
            resolve(result ? result.data : undefined);
        };
    });
  }

  async set<T>(storeName: CacheStoreName, key: string, data: T): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
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

  close(): void {
      if (this.db) {
          this.db.close();
          this.db = null;
          this.initPromise = null;
      }
  }
}

export const cacheService = new CacheService();
