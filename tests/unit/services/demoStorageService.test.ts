// tests/unit/services/demoStorageService.test.ts
import { demoStorageService } from '../../../src/services/demoStorageService';

// Mock IndexedDB
const mockTransaction = {
  objectStore: jest.fn(),
};

const mockObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  index: jest.fn(),
  createIndex: jest.fn(),
};

const mockIndex = {
  getAll: jest.fn(),
};

const mockDB = {
  transaction: jest.fn(() => mockTransaction),
  objectStoreNames: {
    contains: jest.fn(),
  },
  createObjectStore: jest.fn(() => mockObjectStore),
};

const mockIDBRequest = {
  onsuccess: null as any,
  onerror: null as any,
  result: null as any,
};

const mockOpenRequest = {
  ...mockIDBRequest,
  onupgradeneeded: null as any,
};

global.indexedDB = {
  open: jest.fn(() => mockOpenRequest),
} as any;

global.Blob = class {
  size: number;
  type: string;
  constructor(content: any[], options: any) {
    this.size = content[0].length;
    this.type = options.type;
  }
} as any;

// Override crypto to control randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
    getRandomValues: jest.fn((arr) => arr)
  },
  writable: true
});

describe('DemoStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (demoStorageService as any).db = null; // Reset singleton state

    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockObjectStore.index.mockReturnValue(mockIndex);

    // Setup request mocks to auto-succeed
    mockObjectStore.put.mockReturnValue(mockIDBRequest);
    mockObjectStore.get.mockReturnValue(mockIDBRequest);
    mockObjectStore.delete.mockReturnValue(mockIDBRequest);
    mockIndex.getAll.mockReturnValue(mockIDBRequest);
  });

  const createRequest = () => ({
      onsuccess: null as any,
      onerror: null as any,
      result: null as any
  });

  const initDB = async () => {
    const initPromise = demoStorageService.initDB();
    if (mockOpenRequest.onsuccess) {
        mockOpenRequest.result = mockDB;
        mockOpenRequest.onsuccess({ target: mockOpenRequest } as any);
    }
    await initPromise;
  };

  it('initializes the database', async () => {
    const initPromise = demoStorageService.initDB();
    expect(indexedDB.open).toHaveBeenCalledWith('Quake2TS-Demos', expect.any(Number));

    // Simulate success
    mockOpenRequest.result = mockDB;
    mockOpenRequest.onsuccess({ target: mockOpenRequest } as any);

    await initPromise;
    expect((demoStorageService as any).db).toBe(mockDB);
  });

  it('saves a demo', async () => {
    await initDB();

    const data = new Uint8Array([1, 2, 3]);
    const savePromise = demoStorageService.saveDemo('test.dm2', data);

    // Simulate success
    mockIDBRequest.onsuccess();

    const id = await savePromise;
    expect(id).toBe('test-uuid');
    expect(mockObjectStore.put).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-uuid',
      name: 'test.dm2',
      size: 3
    }));
  });

  it('retrieves demos', async () => {
    await initDB();

    const demos = [{ id: '1', date: 100 }, { id: '2', date: 200 }];
    mockIDBRequest.result = demos;

    const listPromise = demoStorageService.getDemos();
    mockIDBRequest.onsuccess();

    const result = await listPromise;
    expect(result).toEqual([{ id: '2', date: 200 }, { id: '1', date: 100 }]); // Reversed
    expect(mockObjectStore.index).toHaveBeenCalledWith('date');
  });

  it('deletes a demo', async () => {
    await initDB();

    const deletePromise = demoStorageService.deleteDemo('test-id');
    mockIDBRequest.onsuccess();

    await deletePromise;
    expect(mockObjectStore.delete).toHaveBeenCalledWith('test-id');
  });

  it('creates object store on upgrade', async () => {
    const initPromise = demoStorageService.initDB();

    mockDB.objectStoreNames.contains.mockReturnValue(false);

    mockOpenRequest.result = mockDB;
    mockOpenRequest.onupgradeneeded({ target: mockOpenRequest } as any);

    expect(mockDB.createObjectStore).toHaveBeenCalledWith('demos', { keyPath: 'id' });

    mockOpenRequest.onsuccess({ target: mockOpenRequest } as any);
    await initPromise;
  });

  it('retrieves a single demo', async () => {
    await initDB();
    const demo = { id: 'test-id', name: 'demo' };
    mockIDBRequest.result = demo;

    const promise = demoStorageService.getDemo('test-id');
    mockIDBRequest.onsuccess();

    const result = await promise;
    expect(result).toBe(demo);
  });

  it('updates demo metadata', async () => {
    await initDB();
    const demo = { id: 'test-id', name: 'demo' };

    // Create distinct requests for get and put
    const getReq = createRequest();
    const putReq = createRequest();

    mockObjectStore.get.mockReturnValueOnce(getReq);
    mockObjectStore.put.mockReturnValueOnce(putReq);

    const promise = demoStorageService.updateDemoMetadata('test-id', { mapName: 'base1' });

    // Get succeeds
    getReq.result = demo;
    getReq.onsuccess();

    // Put happens inside get callback
    // Wait for microtasks?
    await Promise.resolve();

    // Put succeeds
    expect(mockObjectStore.put).toHaveBeenCalledWith(expect.objectContaining({ mapName: 'base1' }));
    putReq.onsuccess();

    await promise;
  });
});
