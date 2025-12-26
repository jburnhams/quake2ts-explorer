

describe('WorkerService', () => {
  let workerService: any;
  let mockWrap: any;
  let mockApi: any;
  let PakParserWorker: any;

  beforeEach(async () => {
    vi.resetModules();

    mockApi = {
      parsePak: vi.fn().mockResolvedValue({ name: 'test', buffer: new ArrayBuffer(0), entries: new Map() }),
      processPcx: vi.fn().mockResolvedValue({}),
      processWal: vi.fn().mockResolvedValue({}),
    };

    mockWrap = vi.fn().mockReturnValue(mockApi);
    vi.mock('comlink', () => ({
      wrap: mockWrap,
    }));

    // We need to require the service after mocking dependencies
    const serviceModule = await import('@/src/services/workerService');
    workerService = serviceModule.workerService;

    const workerModule = await import('../../../src/workers/pakParser.worker?worker');
    PakParserWorker = workerModule.default;
  });

  it('should execute pak parser task successfully', async () => {
    const result = await workerService.executePakParserTask(async (api: any) => {
      return await api.parsePak('test', new ArrayBuffer(0));
    });

    expect(mockWrap).toHaveBeenCalled();
    expect(mockApi.parsePak).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should timeout if task takes too long', async () => {
    vi.useFakeTimers();

    mockApi.parsePak.mockImplementation(() => new Promise(() => {}));

    const taskPromise = workerService.executePakParserTask(async (api: any) => {
      return await api.parsePak('test', new ArrayBuffer(0));
    }, 1000);

    vi.advanceTimersByTime(2000);

    await expect(taskPromise).rejects.toThrow('Worker task timed out');

    vi.useRealTimers();
  });

  it('should terminate worker on timeout', async () => {
    vi.useFakeTimers();

    const terminateSpy = vi.spyOn(PakParserWorker.prototype, 'terminate');

    mockApi.parsePak.mockImplementation(() => new Promise(() => {}));

    try {
      const taskPromise = workerService.executePakParserTask(async (api: any) => {
        return await api.parsePak('test', new ArrayBuffer(0));
      }, 1000);

      vi.advanceTimersByTime(2000);
      await taskPromise;
    } catch (e) {
      // Expected timeout
    }

    expect(terminateSpy).toHaveBeenCalled();

    vi.useRealTimers();
    terminateSpy.mockRestore();
  });
});
