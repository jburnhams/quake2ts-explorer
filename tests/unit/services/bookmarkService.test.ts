import { BookmarkService, Bookmark } from '@/src/services/bookmarkService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
});

describe('BookmarkService', () => {
  let service: BookmarkService;
  const demoId = 'test-demo-123';

  beforeEach(() => {
    localStorage.clear();
    // Re-import to get a fresh instance if needed, or just use the singleton.
    // Since it is a singleton, we rely on localStorage clearing to reset state.
    service = BookmarkService.getInstance();
  });

  it('should start with empty bookmarks', () => {
    const bookmarks = service.getBookmarks(demoId);
    expect(bookmarks).toEqual([]);
  });

  it('should add a bookmark', () => {
    const newBookmark = service.addBookmark(demoId, {
      name: 'Cool Frag',
      frame: 100,
      timeSeconds: 10.5
    });

    expect(newBookmark.id).toBeDefined();
    expect(newBookmark.name).toBe('Cool Frag');
    expect(newBookmark.frame).toBe(100);

    const bookmarks = service.getBookmarks(demoId);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0]).toEqual(newBookmark);
  });

  it('should sort bookmarks by frame', () => {
    service.addBookmark(demoId, { name: 'Late', frame: 200, timeSeconds: 20 });
    service.addBookmark(demoId, { name: 'Early', frame: 50, timeSeconds: 5 });

    const bookmarks = service.getBookmarks(demoId);
    expect(bookmarks).toHaveLength(2);
    expect(bookmarks[0].name).toBe('Early');
    expect(bookmarks[1].name).toBe('Late');
  });

  it('should delete a bookmark', () => {
    const b1 = service.addBookmark(demoId, { name: 'Delete Me', frame: 100, timeSeconds: 10 });
    const b2 = service.addBookmark(demoId, { name: 'Keep Me', frame: 200, timeSeconds: 20 });

    service.deleteBookmark(demoId, b1.id);

    const bookmarks = service.getBookmarks(demoId);
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].id).toBe(b2.id);
  });

  it('should update a bookmark', () => {
    const b1 = service.addBookmark(demoId, { name: 'Original Name', frame: 100, timeSeconds: 10 });

    service.updateBookmark(demoId, b1.id, { name: 'Updated Name', description: 'New Desc' });

    const bookmarks = service.getBookmarks(demoId);
    expect(bookmarks[0].name).toBe('Updated Name');
    expect(bookmarks[0].description).toBe('New Desc');
  });

  it('should re-sort after update if frame changes', () => {
    const b1 = service.addBookmark(demoId, { name: 'First', frame: 10, timeSeconds: 1 });
    const b2 = service.addBookmark(demoId, { name: 'Second', frame: 20, timeSeconds: 2 });

    service.updateBookmark(demoId, b1.id, { frame: 30 }); // Move First to end

    const bookmarks = service.getBookmarks(demoId);
    expect(bookmarks[0].name).toBe('Second');
    expect(bookmarks[1].name).toBe('First');
  });

  it('should persist data to localStorage', () => {
    service.addBookmark(demoId, { name: 'Persisted', frame: 100, timeSeconds: 10 });

    // Simulate app reload by getting fresh instance (or just checking raw storage)
    const rawData = localStorage.getItem(`quake2ts-demo-bookmarks-${demoId}`);
    expect(rawData).toBeTruthy();
    const parsed = JSON.parse(rawData!);
    expect(parsed.bookmarks[0].name).toBe('Persisted');
  });

  it('extractClip should return null (stub)', async () => {
    const buffer = new ArrayBuffer(8);
    const result = await service.extractClip(buffer, 0, 10);
    expect(result).toBeNull();
  });

  it('extractClip should throw on invalid range', async () => {
    const buffer = new ArrayBuffer(8);
    await expect(service.extractClip(buffer, 10, 5)).rejects.toThrow('Invalid frame range');
  });
});
