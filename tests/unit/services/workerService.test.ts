import { vi, describe, it, expect, beforeEach } from 'vitest';

// Define mocks outside describe block to ensure they are accessible in vi.mock
const mockApi = {
  parsePak: vi.fn().mockResolvedValue({ name: 'test', buffer: new ArrayBuffer(0), entries: new Map() }),
  processPcx: vi.fn().mockResolvedValue({}),
  processWal: vi.fn().mockResolvedValue({}),
};

const mockWrap = vi.fn().mockReturnValue(mockApi);
const terminateMock = vi.fn();

// Helper for resetting mocks
const resetMocks = () => {
    mockApi.parsePak.mockReset();
    mockApi.parsePak.mockResolvedValue({ name: 'test', buffer: new ArrayBuffer(0), entries: new Map() });
    mockApi.processPcx.mockReset();
    mockApi.processWal.mockReset();
    mockWrap.mockClear();
    mockWrap.mockReturnValue(mockApi);
    terminateMock.mockClear();
};

vi.mock('comlink', () => ({
  wrap: mockWrap,
}));

vi.mock('@/src/workers/pakParser.worker?worker', () => ({
  default: class MockWorker {
    terminate = terminateMock;
    postMessage = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  }
}));

describe('WorkerService', () => {
  let workerService: any;
  let PakParserWorker: any;

  beforeEach(async () => {
    vi.resetModules();
    resetMocks();

    // We need to require the service after mocking dependencies
    const serviceModule = await import('@/src/services/workerService');
    workerService = serviceModule.workerService;

    // Re-import the mocked worker constructor
    const workerModule = await import('@/src/workers/pakParser.worker?worker');
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

    // We already have terminateMock which is assigned to the prototype's instances in our mock class above
    // So we can just check if terminateMock was called.

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

    expect(terminateMock).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
