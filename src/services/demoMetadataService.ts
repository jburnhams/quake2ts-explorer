export interface DemoMetadata {
  id: string;
  customName?: string;
  description?: string;
  tags: string[];
  lastPlayed?: number;
  rating?: number;
  mapName?: string;
  duration?: number;
}

const STORAGE_PREFIX = 'quake2ts-demo-metadata-';

export class DemoMetadataService {
  private getStorageKey(id: string): string {
    return `${STORAGE_PREFIX}${id}`;
  }

  getMetadata(id: string): DemoMetadata {
    try {
      const stored = localStorage.getItem(this.getStorageKey(id));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load demo metadata', e);
    }

    // Return default empty metadata if none exists
    return {
      id,
      tags: []
    };
  }

  saveMetadata(metadata: DemoMetadata): void {
    try {
      localStorage.setItem(this.getStorageKey(metadata.id), JSON.stringify(metadata));
    } catch (e) {
      console.error('Failed to save demo metadata', e);
    }
  }

  deleteMetadata(id: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(id));
    } catch (e) {
      console.error('Failed to delete demo metadata', e);
    }
  }

  getAllMetadata(): DemoMetadata[] {
    const results: DemoMetadata[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            results.push(JSON.parse(stored));
          }
        }
      }
    } catch (e) {
      console.error('Failed to retrieve all metadata', e);
    }
    return results;
  }

  search(query: string): DemoMetadata[] {
    const all = this.getAllMetadata();
    const lowerQuery = query.toLowerCase();

    return all.filter(meta => {
      return (
        meta.id.toLowerCase().includes(lowerQuery) ||
        meta.customName?.toLowerCase().includes(lowerQuery) ||
        meta.description?.toLowerCase().includes(lowerQuery) ||
        meta.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        meta.mapName?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  addTag(id: string, tag: string): void {
    const meta = this.getMetadata(id);
    if (!meta.tags.includes(tag)) {
      meta.tags.push(tag);
      this.saveMetadata(meta);
    }
  }

  removeTag(id: string, tag: string): void {
    const meta = this.getMetadata(id);
    const index = meta.tags.indexOf(tag);
    if (index !== -1) {
      meta.tags.splice(index, 1);
      this.saveMetadata(meta);
    }
  }
}

export const demoMetadataService = new DemoMetadataService();
