import { DemoPlaybackController } from 'quake2ts';

export interface Bookmark {
  id: string;
  name: string;
  frame: number;
  timeSeconds: number;
  description?: string;
  createdAt: number;
  thumbnailUrl?: string; // Optional: data URL or path to stored thumbnail
}

export interface DemoBookmarks {
  demoId: string; // Hash or unique identifier of the demo file
  bookmarks: Bookmark[];
}

const STORAGE_KEY_PREFIX = 'quake2ts-demo-bookmarks-';

export class BookmarkService {
  private static instance: BookmarkService;

  private constructor() {}

  public static getInstance(): BookmarkService {
    if (!BookmarkService.instance) {
      BookmarkService.instance = new BookmarkService();
    }
    return BookmarkService.instance;
  }

  private getStorageKey(demoId: string): string {
    return `${STORAGE_KEY_PREFIX}${demoId}`;
  }

  public getBookmarks(demoId: string): Bookmark[] {
    const key = this.getStorageKey(demoId);
    const stored = localStorage.getItem(key);
    if (!stored) {
      return [];
    }
    try {
      const data: DemoBookmarks = JSON.parse(stored);
      return data.bookmarks || [];
    } catch (e) {
      console.error('Failed to parse bookmarks for demo', demoId, e);
      return [];
    }
  }

  public addBookmark(
    demoId: string,
    bookmark: Omit<Bookmark, 'id' | 'createdAt'>
  ): Bookmark {
    const bookmarks = this.getBookmarks(demoId);

    // Check if a bookmark already exists at this frame (optional, but prevents duplicates)
    // For now, we allow multiple bookmarks at same frame.

    const newBookmark: Bookmark = {
      ...bookmark,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };

    bookmarks.push(newBookmark);
    bookmarks.sort((a, b) => a.frame - b.frame); // Keep sorted by frame

    this.saveBookmarks(demoId, bookmarks);
    return newBookmark;
  }

  public deleteBookmark(demoId: string, bookmarkId: string): void {
    const bookmarks = this.getBookmarks(demoId);
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    this.saveBookmarks(demoId, filtered);
  }

  public updateBookmark(demoId: string, bookmarkId: string, updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): void {
    const bookmarks = this.getBookmarks(demoId);
    const index = bookmarks.findIndex(b => b.id === bookmarkId);
    if (index !== -1) {
      bookmarks[index] = { ...bookmarks[index], ...updates };
      // Re-sort in case frame changed
      bookmarks.sort((a, b) => a.frame - b.frame);
      this.saveBookmarks(demoId, bookmarks);
    }
  }

  private saveBookmarks(demoId: string, bookmarks: Bookmark[]): void {
    const key = this.getStorageKey(demoId);
    const data: DemoBookmarks = {
      demoId,
      bookmarks
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Clip extraction stub
  // This depends on library support for extracting demo ranges
  public async extractClip(
    demoBuffer: ArrayBuffer,
    startFrame: number,
    endFrame: number
  ): Promise<ArrayBuffer | null> {
    // Check if the range is valid
    if (startFrame < 0 || endFrame <= startFrame) {
      throw new Error('Invalid frame range');
    }

    // Since the library does not yet export `extractDemoRange`, we will throw an error or return null.
    // If we had the library feature:
    // return DemoUtils.extractRange(demoBuffer, startFrame, endFrame);

    console.warn('Clip extraction is not yet supported by the underlying library.');
    return null;
  }
}

export const bookmarkService = BookmarkService.getInstance();
