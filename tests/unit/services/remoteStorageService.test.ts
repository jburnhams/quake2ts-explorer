import { remoteStorageService } from '../../../src/services/remoteStorageService';
import { STORAGE_API_URL } from '../../../src/services/authService';

// Mock global fetch
global.fetch = vi.fn();

describe('RemoteStorageService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listCollections', () => {
    it('calls the correct endpoint and returns data', async () => {
      const mockCollections = [{ id: 1, name: 'test' }];
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockCollections,
      });

      const result = await remoteStorageService.listCollections();

      expect(global.fetch).toHaveBeenCalledWith(`${STORAGE_API_URL}/api/collections`, {
        method: 'GET',
        credentials: 'include',
      });
      expect(result).toEqual(mockCollections);
    });

    it('throws error on failure', async () => {
      (global.fetch as vi.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(remoteStorageService.listCollections()).rejects.toThrow('Failed to list collections');
    });
  });

  describe('createCollection', () => {
    it('calls the correct endpoint with data', async () => {
      const input = { name: 'My Collection', description: 'Desc' };
      const mockResponse = { id: 1, ...input };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await remoteStorageService.createCollection(input);

      expect(global.fetch).toHaveBeenCalledWith(`${STORAGE_API_URL}/api/collections`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
      }));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createEntry', () => {
    it('calls the correct endpoint with FormData', async () => {
      const file = new Blob(['content'], { type: 'text/plain' });
      const input = { key: 'test.txt', file, collection_id: 1 };
      const mockResponse = { id: 10, key: 'test.txt' };

      (global.fetch as vi.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await remoteStorageService.createEntry(input);

      expect(global.fetch).toHaveBeenCalledWith(`${STORAGE_API_URL}/api/storage/entry`, expect.objectContaining({
        method: 'POST',
        // Body is FormData, hard to inspect exactly without utilities, but we check call
      }));

      const callArgs = (global.fetch as vi.Mock).mock.calls[0][1];
      const formData = callArgs.body as FormData;
      expect(formData.get('key')).toBe('test.txt');
      expect(formData.get('collection_id')).toBe('1');
      // Mime type inference check (txt -> text/plain)
      expect(formData.get('type')).toBe('text/plain');

      expect(result).toEqual(mockResponse);
    });
  });
});
