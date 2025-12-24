import { STORAGE_API_URL } from './authService';
import { getMimeType } from '../config/mimeTypes';

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  key: string;
  type: string;
  collection_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
}

export interface CreateEntryRequest {
  key: string;
  file: Blob | File;
  collection_id?: number;
}

class RemoteStorageService {
  async listCollections(): Promise<Collection[]> {
    const response = await fetch(`${STORAGE_API_URL}/api/collections`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to list collections: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createCollection(data: CreateCollectionRequest): Promise<Collection> {
    const response = await fetch(`${STORAGE_API_URL}/api/collections`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create collection: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async createEntry(data: CreateEntryRequest): Promise<Entry> {
    const formData = new FormData();
    formData.append('key', data.key);
    formData.append('file', data.file);

    // Automatically determine type if possible, otherwise use mapping
    const mimeType = getMimeType(data.key);
    formData.append('type', mimeType);

    if (data.collection_id) {
      formData.append('collection_id', data.collection_id.toString());
    }

    const response = await fetch(`${STORAGE_API_URL}/api/storage/entry`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      // If it's a conflict (409) or similar, we might want to handle it, but for now we throw
      // User instruction said "assume it will handle duplicates", so we might just log and ignore if specific errors occur?
      // But standard REST creates usually fail on duplicate unique keys.
      // We will throw and let the caller catch and decide (e.g., log warning).
      throw new Error(`Failed to create entry ${data.key}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const remoteStorageService = new RemoteStorageService();
