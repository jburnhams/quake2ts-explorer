

describe('WorkerService Coverage', () => {
  let workerService: any;
  let mockWrap: any;
  let mockApi: any;
  let IndexerWorker: any;
  let AssetProcessorWorker: any;
  let PakParserWorker: any;

  beforeEach(() => {
    vi.resetModules();

    mockApi = {
      parsePak: vi.fn().mockResolvedValue({ name: 'test', buffer: new ArrayBuffer(0), entries: new Map() }),
      processPcx: vi.fn().mockResolvedValue({}),
      analyzeBsp: vi.fn().mockResolvedValue([]),
    };

    mockWrap = vi.fn().mockReturnValue(mockApi);
    vi.mock('comlink', () => ({
      wrap: mockWrap,
    }));

    const serviceModule = require('../../../src/services/workerService');
    workerService = serviceModule.workerService;

    // Reset workers
    // @ts-ignore
    workerService.pakWorkers = [];
    // @ts-ignore
    workerService.assetWorkers = [];
    // @ts-ignore
    workerService.indexerWorker = null;

    const indexerWorkerModule = require('../../../src/workers/indexer.worker?worker');
    IndexerWorker = indexerWorkerModule.default;
    const assetWorkerModule = require('../../../src/workers/assetProcessor.worker?worker');
    AssetProcessorWorker = assetWorkerModule.default;
    const pakWorkerModule = require('../../../src/workers/pakParser.worker?worker');
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

    expect(mockWrap).toHaveBeenCalled();
    expect(mockApi.processPcx).toHaveBeenCalled();
  });

  it('executeIndexerTask should execute task successfully', async () => {
    const result = await workerService.executeIndexerTask(async (api: any) => {
      return await api.analyzeBsp(new ArrayBuffer(0));
    });

    expect(mockWrap).toHaveBeenCalled();
    expect(mockApi.analyzeBsp).toHaveBeenCalled();
  });

  it('executeAssetProcessorTask should terminate worker on timeout', async () => {
    vi.useFakeTimers();

    const terminateSpy = vi.spyOn(AssetProcessorWorker.prototype, 'terminate');
    mockApi.processPcx.mockImplementation(() => new Promise(() => {}));

    try {
      const taskPromise = workerService.executeAssetProcessorTask(async (api: any) => {
        return await api.processPcx(new ArrayBuffer(0));
      }, 1000);

      vi.advanceTimersByTime(2000);
      await taskPromise;
    } catch (e) {
      // Expected timeout
    }

    expect(terminateSpy).toHaveBeenCalled();
  });

  it('executeIndexerTask should terminate worker on timeout', async () => {
    vi.useFakeTimers();

    const terminateSpy = vi.spyOn(IndexerWorker.prototype, 'terminate');
    mockApi.analyzeBsp.mockImplementation(() => new Promise(() => {}));

    try {
      const taskPromise = workerService.executeIndexerTask(async (api: any) => {
        return await api.analyzeBsp(new ArrayBuffer(0));
      }, 1000);

      vi.advanceTimersByTime(2000);
      await taskPromise;
    } catch (e) {
      // Expected timeout
    }

    expect(terminateSpy).toHaveBeenCalled();
  });

  it('should support legacy accessors', () => {
    // getPakParser
    const pakApi = workerService.getPakParser();
    expect(pakApi).toBe(mockApi);
    // getAssetProcessor
    const assetApi = workerService.getAssetProcessor();
    expect(assetApi).toBe(mockApi);
    // getIndexer
    const indexerApi = workerService.getIndexer();
    expect(indexerApi).toBe(mockApi);
    // getIndexer again (cached)
    const indexerApi2 = workerService.getIndexer();
    expect(indexerApi2).toBe(mockApi);
  });

  it('should reuse worker instances in pool', async () => {
      // Create first worker
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      const workers1 = workerService.assetWorkers;
      expect(workers1.length).toBe(1);
      const worker1 = workers1[0].worker;

      // Execute another task, assuming poolSize > 1 (default 4)
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      const workers2 = workerService.assetWorkers;
      expect(workers2.length).toBe(2);

      // Wrap around (mock pool size or just loop enough times)
      // Default pool size is 4.
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      expect(workerService.assetWorkers.length).toBe(4);

      // Next one should reuse index 0
      await workerService.executeAssetProcessorTask(async (api: any) => {});
      expect(workerService.assetWorkers[0].worker).toBe(worker1);
  });
});
