import { workerService } from '@/src/services/workerService';
import { jest, describe, it, expect } from '@jest/globals';

// Use the exact path that resolves with moduleNameMapper or relative path
// The issue is likely the query parameter ?worker in jest.mock
// We already have a mock for ?worker in jest.base.config.js, so we might not need to explicit mock it here if we just want it to exist.
// But comlink wrap expects a certain interface.

describe('WorkerService', () => {
  it('should create a worker instance on first access', () => {
    // The worker import is already mocked by jest.base.config.js mapping to workerMock.js
    const worker = workerService.getPakParser();
    expect(worker).toBeDefined();
  });

  it('should return the same worker instance on subsequent calls', () => {
    const worker1 = workerService.getPakParser();
    const worker2 = workerService.getPakParser();
    expect(worker1).toBe(worker2);
  });
});
