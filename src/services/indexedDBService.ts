export interface StoredPak {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  updatedAt: number;
}

const DB_NAME = 'Quake2TS';
const DB_VERSION = 1;
const STORE_NAME = 'paks';

export class IndexedDBService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('nameSize', ['name', 'size'], { unique: false });
        }
      };
    });
  }

  async savePak(file: File): Promise<string> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('nameSize');

      // Check for duplicate by name + size
      const checkRequest = index.get([file.name, file.size]);

      checkRequest.onsuccess = () => {
        const existingRecord = checkRequest.result as StoredPak | undefined;

        let id = crypto.randomUUID();
        if (existingRecord) {
          id = existingRecord.id; // Reuse ID if updating
        }

        const record: StoredPak = {
          id,
          name: file.name,
          blob: file,
          size: file.size,
          updatedAt: Date.now(),
        };

        const putRequest = store.put(record);

        putRequest.onsuccess = () => resolve(id);
        putRequest.onerror = () => reject(new Error('Failed to save PAK file'));
      };

      checkRequest.onerror = () => reject(new Error('Failed to check for duplicates'));
    });
  }

  async getPaks(): Promise<StoredPak[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to retrieve PAK files'));
    });
  }

  async deletePak(id: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete PAK file ${id}`));
    });
  }
}

// Singleton
export const indexedDBService = new IndexedDBService();
