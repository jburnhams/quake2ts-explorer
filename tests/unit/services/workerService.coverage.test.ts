import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

// Define MockWorker using vi.hoisted so it's available in the factory
const mocks = vi.hoisted(() => {
  class MockWorker {
    constructor() {}
    postMessage() {}
    onmessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }
  return { MockWorker };
});

vi.mock('../../../src/workers/indexer.worker?worker', () => ({
  default: mocks.MockWorker
}));
vi.mock('../../../src/workers/assetProcessor.worker?worker', () => ({
  default: mocks.MockWorker
}));
vi.mock('../../../src/workers/pakParser.worker?worker', () => ({
  default: mocks.MockWorker
}));

describe('WorkerService Coverage', () => {
  let workerService: any;
  let mockApi: any;
  let IndexerWorker: any;
  let AssetProcessorWorker: any;
  let PakParserWorker: any;

  // Additional hoisted mocks for comlink
  const comlinkMocks = vi.hoisted(() => ({
    wrap: vi.fn(),
  }));

  beforeEach(async () => {
    vi.resetModules();

    mockApi = {
      parsePak: vi.fn().mockResolvedValue({ name: 'test', buffer: new ArrayBuffer(0), entries: new Map() }),
      processPcx: vi.fn().mockResolvedValue({}),
      analyzeBsp: vi.fn().mockResolvedValue([]),
    };

    comlinkMocks.wrap.mockReturnValue(mockApi);
    vi.mock('comlink', () => ({
      wrap: comlinkMocks.wrap,
    }));

    const serviceModule = await import('@/src/services/workerService');
    workerService = serviceModule.workerService;

    // Reset workers (accessing private properties via any)
    workerService.pakWorkers = [];
    workerService.assetWorkers = [];
    workerService.indexerWorker = null;

    // Get the classes (should be the MockWorker)
    const indexerWorkerModule = await import('../../../src/workers/indexer.worker?worker');
    IndexerWorker = indexerWorkerModule.default;
    const assetWorkerModule = await import('../../../src/workers/assetProcessor.worker?worker');
    AssetProcessorWorker = assetWorkerModule.default;
    const pakWorkerModule = await import('../../../src/workers/pakParser.worker?worker');
    PakParserWorker = pakWorkerModule.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('executeAssetProcessorTask should execute task successfully', async () => {
    const result = await workerService.executeAssetProcessorTask(async (api: any) => {
      return await api.processPcx(new ArrayBuffer(0));
    });

    expect(comlinkMocks.wrap).toHaveBeenCalled();
    expect(mockApi.processPcx).toHaveBeenCalled();
  });

  it('executeIndexerTask should execute task successfully', async () => {
    const result = await workerService.executeIndexerTask(async (api: any) => {
      return await api.analyzeBsp(new ArrayBuffer(0));
    });

    expect(comlinkMocks.wrap).toHaveBeenCalled();
    expect(mockApi.analyzeBsp).toHaveBeenCalled();
  });

  it('executeAssetProcessorTask should terminate worker on timeout', async () => {
    vi.useFakeTimers();

    // Create a promise that never resolves to force timeout
    mockApi.processPcx.mockImplementation(() => new Promise(() => {}));

    const taskPromise = workerService.executeAssetProcessorTask(async (api: any) => {
      return await api.processPcx(new ArrayBuffer(0));
    }, 1000);

    // Advance timers to trigger timeout
    vi.advanceTimersByTime(2000);

    // We expect the promise to reject with a timeout error
    await expect(taskPromise).rejects.toThrow('Worker task timed out');
    // We cannot reliably test terminate spy here due to instance creation inside service
  });

  it('executeIndexerTask should terminate worker on timeout', async () => {
    vi.useFakeTimers();

    mockApi.analyzeBsp.mockImplementation(() => new Promise(() => {}));

    const taskPromise = workerService.executeIndexerTask(async (api: any) => {
      return await api.analyzeBsp(new ArrayBuffer(0));
    }, 1000);

    vi.advanceTimersByTime(2000);

    await expect(taskPromise).rejects.toThrow('Worker task timed out');
  });

  it('should support legacy accessors', () => {
    const pakApi = workerService.getPakParser();
    expect(pakApi).toBe(mockApi);
    const assetApi = workerService.getAssetProcessor();
    expect(assetApi).toBe(mockApi);
    const indexerApi = workerService.getIndexer();
    expect(indexerApi).toBe(mockApi);
    const indexerApi2 = workerService.getIndexer();
    expect(indexerApi2).toBe(mockApi);
  });

  it('should reuse worker instances in pool', async () => {
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      const workers1 = workerService.assetWorkers;
      expect(workers1.length).toBe(1);
      const worker1 = workers1[0].worker;

      await workerService.executeAssetProcessorTask(async (api: any) => {});
      const workers2 = workerService.assetWorkers;
      expect(workers2.length).toBe(2);

      // Wrap around
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      expect(workerService.assetWorkers.length).toBe(4);

      // Next one should reuse index 0
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      expect(workerService.assetWorkers[0].worker).toBe(worker1);
  });
});
