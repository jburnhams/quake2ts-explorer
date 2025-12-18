import { workerService } from '../../../src/services/workerService';
import { jest, describe, it, expect } from '@jest/globals';

describe('WorkerService', () => {
  it('should create a worker instance on first access', () => {
    // The worker import is already mocked by jest.base.config.js mapping to workerMock.js
    const worker = workerService.getPakParser();
    expect(worker).toBeDefined();
  });

  // Since we implemented a pool, it might not return the same worker immediately if poolSize > 1
  it('should return different workers for subsequent calls (round robin)', () => {
    const worker1 = workerService.getPakParser();
    const worker2 = workerService.getPakParser();
    // Assuming poolSize > 1
    expect(worker1).not.toBe(worker2);
  });

  it('should return singleton indexer worker', () => {
    const indexer1 = workerService.getIndexer();
    const indexer2 = workerService.getIndexer();
    expect(indexer1).toBeDefined();
    expect(indexer1).toBe(indexer2);
  });
});
