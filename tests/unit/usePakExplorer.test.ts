import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

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
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => usePakExplorer());

    expect(result.current.fileTree).toBeNull();
    expect(result.current.selectedPath).toBeNull();
    expect(result.current.metadata).toBeNull();
    expect(result.current.parsedFile).toBeNull();
    expect(result.current.pakCount).toBe(0);
    expect(result.current.fileCount).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('has handleFileSelect function', () => {
    const { result } = renderHook(() => usePakExplorer());
    expect(typeof result.current.handleFileSelect).toBe('function');
  });

  it('has handleTreeSelect function', () => {
    const { result } = renderHook(() => usePakExplorer());
    expect(typeof result.current.handleTreeSelect).toBe('function');
  });

  it('has dismissError function', () => {
    const { result } = renderHook(() => usePakExplorer());
    expect(typeof result.current.dismissError).toBe('function');
  });

  it('handleFileSelect sets loading state', async () => {
    const { result } = renderHook(() => usePakExplorer());

    const file = new File(['PACK'], 'test.pak', { type: 'application/octet-stream' });
    const fileList = { length: 1, item: () => file, 0: file, [Symbol.iterator]: function* () { yield file; } } as FileList;

    await act(async () => {
      await result.current.handleFileSelect(fileList);
    });

    // Loading should be false after completion
    expect(result.current.loading).toBe(false);
  });

  it('handleFileSelect ignores non-PAK files', async () => {
    const { result } = renderHook(() => usePakExplorer());

    const file = new File(['content'], 'readme.txt', { type: 'text/plain' });
    const fileList = { length: 1, item: () => file, 0: file, [Symbol.iterator]: function* () { yield file; } } as FileList;

    await act(async () => {
      await result.current.handleFileSelect(fileList);
    });

    expect(result.current.pakCount).toBe(0);
  });

  it('handleTreeSelect updates selectedPath', async () => {
    const { result } = renderHook(() => usePakExplorer());

    await act(async () => {
      await result.current.handleTreeSelect('readme.txt');
    });

    expect(result.current.selectedPath).toBe('readme.txt');
  });

  it('dismissError function resets error to null', () => {
    const { result } = renderHook(() => usePakExplorer());

    // Verify dismissError is callable and doesn't throw
    act(() => {
      result.current.dismissError();
    });

    expect(result.current.error).toBeNull();
  });

  it('handleTreeSelect handles missing files', async () => {
    const { result } = renderHook(() => usePakExplorer());

    await act(async () => {
      await result.current.handleTreeSelect('nonexistent.txt');
    });

    expect(result.current.metadata).toBeNull();
    expect(result.current.parsedFile).toBeNull();
  });

  it('loadFromUrl loads PAK from URL and clears previous', async () => {
    const { result } = renderHook(() => usePakExplorer());
    const originalFetch = global.fetch;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
        statusText: 'OK'
      })
    ) as jest.Mock;

    try {
      // Initial load manually to simulate existing state
      const file = new File(['PACK'], 'initial.pak', { type: 'application/octet-stream' });
      Object.defineProperty(file, 'arrayBuffer', {
        value: jest.fn().mockResolvedValue(new ArrayBuffer(10))
      });
      const fileList = { length: 1, item: () => file, 0: file, [Symbol.iterator]: function* () { yield file; } } as FileList;
      await act(async () => {
        await result.current.handleFileSelect(fileList);
      });

      if (result.current.error) {
          console.error('handleFileSelect error:', result.current.error);
      }
      console.log('Mounted Paks:', result.current.pakService.getMountedPaks());

      expect(result.current.pakService.getMountedPaks()).toHaveLength(1);
      expect(result.current.pakService.getMountedPaks()[0].name).toBe('initial.pak');

      // Load from URL
      await act(async () => {
        await result.current.loadFromUrl('http://example.com/default.pak');
      });

      expect(global.fetch).toHaveBeenCalledWith('http://example.com/default.pak', expect.objectContaining({
        signal: expect.any(Object)
      }));
      expect(result.current.pakService.getMountedPaks()).toHaveLength(1);
      expect(result.current.pakService.getMountedPaks()[0].name).toBe('default.pak');
      expect(result.current.error).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('loadFromUrl handles fetch errors', async () => {
    const { result } = renderHook(() => usePakExplorer());
    const originalFetch = global.fetch;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Not Found'
      })
    ) as jest.Mock;

    try {
      await act(async () => {
        await result.current.loadFromUrl('http://example.com/missing.pak');
      });

      expect(result.current.error).toContain('Failed to fetch');
      expect(result.current.error).toContain('Not Found');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
