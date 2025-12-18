import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('WorkerService', () => {
  let workerService: any;
  let mockWrap: any;
  let mockApi: any;
  let PakParserWorker: any;

  beforeEach(() => {
    jest.resetModules();

    mockApi = {
      parsePak: jest.fn().mockResolvedValue({ name: 'test', buffer: new ArrayBuffer(0), entries: new Map() }),
      processPcx: jest.fn().mockResolvedValue({}),
      processWal: jest.fn().mockResolvedValue({}),
    };

    mockWrap = jest.fn().mockReturnValue(mockApi);
    jest.mock('comlink', () => ({
      wrap: mockWrap,
    }));

    // We need to require the service after mocking dependencies
    const serviceModule = require('../../../src/services/workerService');
    workerService = serviceModule.workerService;

    const workerModule = require('../../../src/workers/pakParser.worker?worker');
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
    jest.useFakeTimers();

    mockApi.parsePak.mockImplementation(() => new Promise(() => {}));

    const taskPromise = workerService.executePakParserTask(async (api: any) => {
      return await api.parsePak('test', new ArrayBuffer(0));
    }, 1000);

    jest.advanceTimersByTime(2000);

    await expect(taskPromise).rejects.toThrow('Worker task timed out');

    jest.useRealTimers();
  });

  it('should terminate worker on timeout', async () => {
    jest.useFakeTimers();

    const terminateSpy = jest.spyOn(PakParserWorker.prototype, 'terminate');

    mockApi.parsePak.mockImplementation(() => new Promise(() => {}));

    try {
      const taskPromise = workerService.executePakParserTask(async (api: any) => {
        return await api.parsePak('test', new ArrayBuffer(0));
      }, 1000);

      jest.advanceTimersByTime(2000);
      await taskPromise;
    } catch (e) {
      // Expected timeout
    }

    expect(terminateSpy).toHaveBeenCalled();

    jest.useRealTimers();
    terminateSpy.mockRestore();
  });
});
