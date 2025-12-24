import { indexedDBService } from '../../../src/services/indexedDBService';

describe('IndexedDBService', () => {
  let mockDB: any;
  let mockTransaction: any;
  let mockObjectStore: any;
  let mockRequest: any;
  let mockIndex: any;

  beforeEach(() => {
    // Reset singleton internal state
    (indexedDBService as any).db = null;

    mockRequest = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    mockIndex = {
      get: vi.fn().mockReturnValue(mockRequest),
    };

    mockObjectStore = {
      createIndex: vi.fn(),
      put: vi.fn().mockReturnValue(mockRequest),
      getAll: vi.fn().mockReturnValue(mockRequest),
      delete: vi.fn().mockReturnValue(mockRequest),
      index: vi.fn().mockReturnValue(mockIndex),
    };

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
    };

    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn().mockReturnValue(mockObjectStore),
    };

    global.indexedDB = {
      open: vi.fn().mockReturnValue(mockRequest),
    } as any;

    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: vi.fn().mockReturnValue('mock-uuid'),
      },
      writable: true,
    });
  });

  it('initializes the database successfully', async () => {
    const initPromise = indexedDBService.initDB();

    mockRequest.result = mockDB;
    mockRequest.onsuccess({ target: mockRequest });

    await initPromise;
    expect(global.indexedDB.open).toHaveBeenCalledWith('Quake2TS', 1);
  });

  it('handles database initialization error', async () => {
    const initPromise = indexedDBService.initDB();

    mockRequest.onerror();

    await expect(initPromise).rejects.toThrow('Failed to open IndexedDB');
  });

  it('creates object store on upgrade', async () => {
    const initPromise = indexedDBService.initDB();

    mockRequest.result = mockDB;
    mockRequest.onupgradeneeded({ target: mockRequest });

    // Resolve the promise via success
    mockRequest.onsuccess({ target: mockRequest });
    await initPromise;

    expect(mockDB.createObjectStore).toHaveBeenCalledWith('paks', { keyPath: 'id' });
    expect(mockObjectStore.createIndex).toHaveBeenCalledWith('nameSize', ['name', 'size'], { unique: false });
  });

  it('saves a pak file', async () => {
    // Initialize first
    const initPromise = indexedDBService.initDB();
    mockRequest.result = mockDB;
    mockRequest.onsuccess({ target: mockRequest });
    await initPromise;

    const file = new File(['content'], 'test.pak');

    // For savePak checkRequest (get duplicate)
    const savePromise = indexedDBService.savePak(file);

    // Simulate no duplicate found (checkRequest.onsuccess with undefined result)
    const checkRequest = mockIndex.get.mock.results[0].value;
    checkRequest.result = undefined;
    checkRequest.onsuccess();

    // Now putRequest should be triggered
    const putRequest = mockObjectStore.put.mock.results[0].value;
    putRequest.onsuccess();

    const id = await savePromise;
    expect(id).toBe('mock-uuid');
    expect(mockObjectStore.put).toHaveBeenCalledWith(expect.objectContaining({
        name: 'test.pak',
        id: 'mock-uuid'
    }));
  });

  it('updates an existing pak file (reuses ID)', async () => {
    // Initialize
    const initPromise = indexedDBService.initDB();
    mockRequest.result = mockDB;
    mockRequest.onsuccess({ target: mockRequest });
    await initPromise;

    const file = new File(['content'], 'test.pak');

    const savePromise = indexedDBService.savePak(file);

    // Simulate duplicate found
    const existingRecord = { id: 'existing-id', name: 'test.pak', size: file.size };
    const checkRequest = mockIndex.get.mock.results[0].value;
    checkRequest.result = existingRecord;
    checkRequest.onsuccess();

    // putRequest
    const putRequest = mockObjectStore.put.mock.results[0].value;
    putRequest.onsuccess();

    const id = await savePromise;
    expect(id).toBe('existing-id');
  });

  it('retrieves all paks', async () => {
    const initPromise = indexedDBService.initDB();
    mockRequest.result = mockDB;
    mockRequest.onsuccess({ target: mockRequest });
    await initPromise;

    const getPromise = indexedDBService.getPaks();

    const getAllRequest = mockObjectStore.getAll.mock.results[0].value;
    getAllRequest.result = [{ id: '1', name: 'test.pak' }];
    getAllRequest.onsuccess();

    const paks = await getPromise;
    expect(paks).toHaveLength(1);
    expect(paks[0].name).toBe('test.pak');
  });

  it('deletes a pak', async () => {
    const initPromise = indexedDBService.initDB();
    mockRequest.result = mockDB;
    mockRequest.onsuccess({ target: mockRequest });
    await initPromise;

    const deletePromise = indexedDBService.deletePak('pak-id');

    const deleteRequest = mockObjectStore.delete.mock.results[0].value;
    deleteRequest.onsuccess();

    await deletePromise;
    expect(mockObjectStore.delete).toHaveBeenCalledWith('pak-id');
  });

  it('handles save error when DB not initialized', async () => {
      // Don't call initDB
      // But savePak calls initDB internally.
      // So we fail the init.
      const savePromise = indexedDBService.savePak(new File([], 'test'));
      mockRequest.onerror(); // fail init
      await expect(savePromise).rejects.toThrow('Failed to open IndexedDB');
  });

  it('handles save error when put fails', async () => {
    const initPromise = indexedDBService.initDB();
    mockRequest.result = mockDB;
    mockRequest.onsuccess({ target: mockRequest });
    await initPromise;

    const savePromise = indexedDBService.savePak(new File([], 'test'));

    // No duplicate
    const checkRequest = mockIndex.get.mock.results[0].value;
    checkRequest.result = undefined;
    checkRequest.onsuccess();

    // Put fails
    const putRequest = mockObjectStore.put.mock.results[0].value;
    putRequest.onerror();

    await expect(savePromise).rejects.toThrow('Failed to save PAK file');
  });
});
