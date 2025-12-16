export interface StoredDemo {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  date: number;
  duration?: number;
  mapName?: string;
  tags?: string[];
}

const DB_NAME = 'Quake2TS-Demos';
const DB_VERSION = 1;
const STORE_NAME = 'demos';

export class DemoStorageService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      // Using a separate DB for demos to avoid versioning conflicts with PAK DB
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create demos store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  async saveDemo(name: string, data: Uint8Array | Blob, metadata: Partial<StoredDemo> = {}): Promise<string> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Explicitly cast or handle Uint8Array to Blob conversion safely for TS
      let blob: Blob;
      if (data instanceof Blob) {
          blob = data;
      } else {
          // TS might complain about Uint8Array being a SharedArrayBuffer view which is not BlobPart in some envs
          // We can cast to unknown then BlobPart to bypass if we are sure it is safe in browser
          blob = new Blob([data as unknown as BlobPart], { type: 'application/octet-stream' });
      }

      const id = crypto.randomUUID();

      const record: StoredDemo = {
        id,
        name,
        blob,
        size: blob.size,
        date: Date.now(),
        ...metadata
      };

      const request = store.put(record);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(new Error('Failed to save demo'));
    });
  }

  async getDemos(): Promise<StoredDemo[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('date'); // Sort by date
      const request = index.getAll(); // By default ascending, might need reverse

      request.onsuccess = () => {
        // Reverse to show newest first
        const results = request.result as StoredDemo[];
        resolve(results.reverse());
      };
      request.onerror = () => reject(new Error('Failed to retrieve demos'));
    });
  }

  async getDemo(id: string): Promise<StoredDemo | undefined> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get demo ${id}`));
    });
  }

  async deleteDemo(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete demo ${id}`));
    });
  }

  async updateDemoMetadata(id: string, metadata: Partial<StoredDemo>): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
        if (!this.db) return reject(new Error('Database not initialized'));

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const record = getRequest.result as StoredDemo;
            if (!record) {
                reject(new Error(`Demo ${id} not found`));
                return;
            }

            const updatedRecord = { ...record, ...metadata };
            const putRequest = store.put(updatedRecord);

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(new Error('Failed to update demo metadata'));
        };

        getRequest.onerror = () => reject(new Error(`Failed to get demo ${id} for update`));
    });
  }
}

export const demoStorageService = new DemoStorageService();
