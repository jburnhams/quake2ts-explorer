import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock IndexedDB Service
jest.mock('@/src/services/indexedDBService', () => ({
  indexedDBService: {
    initDB: jest.fn(),
    savePak: jest.fn(async (file: File) => 'mock-id'),
    getPaks: jest.fn(async () => []),
    deletePak: jest.fn(),
  }
}));

// Mock worker service to avoid issues with real workers in JSDOM
// Use relative path to ensure we intercept the call from pakService.ts which imports it relatively
jest.mock('../../src/services/workerService', () => ({
    workerService: {
        getPakParser: jest.fn(() => ({
            parsePak: jest.fn(async (name: string, buffer: ArrayBuffer) => ({
                entries: new Map([
                    ['readme.txt', { name: 'readme.txt', offset: 0, length: 100 }],
                ]),
                buffer,
                name
            }))
        }))
    }
}));

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => ({
  PakArchive: {
    fromArrayBuffer: jest.fn((name: string, _buffer: ArrayBuffer) => ({
      name,
      entries: new Map([
        ['readme.txt', { name: 'readme.txt', offset: 0, length: 100 }],
      ]),
      checksum: 12345,
      size: 1024,
      listEntries: () => [
        { name: 'readme.txt', offset: 0, length: 100 },
      ],
    })),
  },
  VirtualFileSystem: jest.fn().mockImplementation(() => {
    const files = new Map<string, { path: string; size: number; sourcePak: string }>();
    return {
      mountPak: jest.fn((archive: { name: string; listEntries: () => Array<{ name: string; length: number }> }) => {
        // Mock ID logic: use archive name as sourcePak
        for (const entry of archive.listEntries()) {
          files.set(entry.name, {
            path: entry.name,
            size: entry.length,
            sourcePak: archive.name,
          });
        }
      }),
      hasFile: jest.fn((path: string) => files.has(path)),
      stat: jest.fn((path: string) => files.get(path)),
      readFile: jest.fn(async (path: string) => {
        if (!files.has(path)) throw new Error(`File not found: ${path}`);
        return new TextEncoder().encode('test content');
      }),
      list: jest.fn(() => ({
        files: Array.from(files.values()),
        directories: [],
      })),
      findByExtension: jest.fn((ext: string) =>
        Array.from(files.values()).filter(f => f.path.endsWith(ext))
      ),
    };
  }),
  parsePcx: jest.fn(() => ({
    width: 64,
    height: 64,
    bitsPerPixel: 8,
    palette: new Uint8Array(768),
  })),
  pcxToRgba: jest.fn(() => new Uint8Array(64 * 64 * 4)),
  parseWal: jest.fn(() => ({
    name: 'test',
    width: 64,
    height: 64,
    mipmaps: [],
  })),
  walToRgba: jest.fn(() => ({
    levels: [{ level: 0, width: 64, height: 64, rgba: new Uint8Array(64 * 64 * 4) }],
  })),
  parseMd2: jest.fn(() => ({
    header: { numFrames: 10, numVertices: 100, numTriangles: 50, numSkins: 1, numGlCommands: 200 },
  })),
  parseMd3: jest.fn(() => ({
    header: { numFrames: 5, numSurfaces: 2, numTags: 1 },
  })),
  parseWav: jest.fn(() => ({
    channels: 1,
    sampleRate: 22050,
    bitsPerSample: 16,
    samples: new Int16Array(22050),
  })),
}));

import { usePakExplorer } from '@/src/hooks/usePakExplorer';

describe('usePakExplorer Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset global fetch mock
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: false,
            statusText: 'Not Found'
        })
    ) as jest.Mock;
  });

  it('initializes with default state', async () => {
    const { result } = renderHook(() => usePakExplorer());

    // Wait for the effect to finish (even if it does nothing but fail silently on 404s)
    await waitFor(() => {
        expect(result.current.loading).toBe(false);
    });

    // Check that fileTree is NOT null (empty root node)
    expect(result.current.fileTree).not.toBeNull();
    expect(result.current.fileTree?.name).toBe('root');
    expect(result.current.fileTree?.children).toEqual([]);

    expect(result.current.selectedPath).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.parsedFile).toBeNull();
    expect(result.current.pakCount).toBe(0);
    expect(result.current.fileCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('has handleFileSelect function', async () => {
    const { result } = renderHook(() => usePakExplorer());
    // Wait for initialization
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.handleFileSelect).toBe('function');
  });

  it('handleFileSelect adds PAK files (not replace)', async () => {
    const { result } = renderHook(() => usePakExplorer());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const file = new File(['PACK'], 'test.pak', { type: 'application/octet-stream' });
    // Mock arrayBuffer properly
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));

    const fileList = {
        length: 1,
        item: (index) => index === 0 ? file : null,
        0: file,
        [Symbol.iterator]: function* () { yield file; },
        // Array.from needs map or iterator
    } as unknown as FileList;

    await act(async () => {
      await result.current.handleFileSelect(fileList);
    });

    expect(result.current.pakCount).toBe(1);
    expect(result.current.pakService.getMountedPaks()[0].name).toBe('test.pak');
  });

  it('handleFileSelect ignores non-PAK files', async () => {
    const { result } = renderHook(() => usePakExplorer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const file = new File(['content'], 'readme.txt', { type: 'text/plain' });
    const fileList = {
        length: 1,
        item: (index) => index === 0 ? file : null,
        0: file,
        [Symbol.iterator]: function* () { yield file; }
    } as unknown as FileList;

    await act(async () => {
      await result.current.handleFileSelect(fileList);
    });

    expect(result.current.pakCount).toBe(0);
  });

  it('loadFromUrl loads PAK from URL (additive)', async () => {
    const { result } = renderHook(() => usePakExplorer());
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
        statusText: 'OK'
      })
    ) as jest.Mock;

    await act(async () => {
      await result.current.loadFromUrl('http://example.com/default.pak');
    });

    expect(global.fetch).toHaveBeenCalledWith('http://example.com/default.pak', expect.objectContaining({
      signal: expect.any(Object)
    }));
    expect(result.current.pakCount).toBe(1);
    expect(result.current.pakService.getMountedPaks()[0].name).toBe('default.pak');
  });
});
