
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { PakService } from '../../src/services/pakService';

// Mock worker service to force fallback to main thread (where we can mock PakArchive)
vi.mock('../../src/services/workerService', () => ({
  workerService: {
    executePakParserTask: vi.fn().mockRejectedValue(new Error('Worker failed')),
    executeAssetProcessorTask: vi.fn().mockResolvedValue({}),
  }
}));

// Mock quake2ts/engine
vi.mock('@quake2ts/engine', () => ({
  PakArchive: {
    fromArrayBuffer: vi.fn((name: string, _buffer: ArrayBuffer) => ({
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
  VirtualFileSystem: vi.fn().mockImplementation(() => {
    const files = new Map<string, { path: string; size: number; sourcePak: string }>();
    return {
      mountPak: vi.fn((archive: { name: string; listEntries: () => Array<{ name: string; length: number }> }) => {
        for (const entry of archive.listEntries()) {
          files.set(entry.name, {
            path: entry.name,
            size: entry.length,
            sourcePak: archive.name,
          });
        }
      }),
      hasFile: vi.fn((path: string) => files.has(path)),
      stat: vi.fn((path: string) => files.get(path)),
      readFile: vi.fn(async (path: string) => {
        if (!files.has(path)) throw new Error(`File not found: ${path}`);
        return new TextEncoder().encode('test content');
      }),
      list: vi.fn(() => ({
        files: Array.from(files.values()),
        directories: [],
      })),
      findByExtension: vi.fn((ext: string) =>
        Array.from(files.values()).filter(f => f.path.endsWith(ext))
      ),
    };
  }),
  parsePcx: vi.fn(() => ({
    width: 64,
    height: 64,
    bitsPerPixel: 8,
    palette: new Uint8Array(768),
  })),
  pcxToRgba: vi.fn(() => new Uint8Array(64 * 64 * 4)),
  parseWal: vi.fn(() => ({
    name: 'test',
    width: 64,
    height: 64,
    mipmaps: [],
  })),
  walToRgba: vi.fn(() => ({
    levels: [{ level: 0, width: 64, height: 64, rgba: new Uint8Array(64 * 64 * 4) }],
  })),
  parseMd2: vi.fn(() => ({
    header: { numFrames: 10, numVertices: 100, numTriangles: 50, numSkins: 1, numGlCommands: 200 },
  })),
  parseMd3: vi.fn(() => ({
    header: { numFrames: 5, numSurfaces: 2, numTags: 1 },
  })),
  parseWav: vi.fn(() => ({
    channels: 1,
    sampleRate: 22050,
    bitsPerSample: 16,
    samples: new Int16Array(22050),
  })),
}));

// Mock services
vi.mock('@/src/services/gameService');
vi.mock('@/src/services/pakService', () => {
  const PakServiceMock = vi.fn().mockImplementation(function(this: any) {
     // Return the instance, which can have its own methods
     // But to support spyOn(prototype), we should probably use the prototype methods if they exist
     return {
          buildFileTree: vi.fn().mockReturnValue({ children: [] }),
          getMountedPaks: vi.fn().mockReturnValue([]),
          listDirectory: vi.fn().mockReturnValue({ files: [] }),
          loadPakFile: this.loadPakFile ? this.loadPakFile.bind(this) : vi.fn().mockResolvedValue(undefined),
          unloadPak: vi.fn(),
          loadPakFromBuffer: vi.fn().mockResolvedValue(undefined),
          getFileMetadata: vi.fn(),
          hasFile: vi.fn().mockReturnValue(false),
          parseFile: vi.fn(),
          vfs: {
            mountPak: vi.fn(),
            hasFile: vi.fn(),
            stat: vi.fn(),
            readFile: vi.fn(),
            list: vi.fn().mockReturnValue({ files: [], directories: [] }),
            findByExtension: vi.fn().mockReturnValue([]),
          }
     };
  });

  // Add methods to prototype so spyOn(PakService.prototype, 'method') works
  PakServiceMock.prototype.loadPakFile = vi.fn().mockResolvedValue(undefined);

  return {
    PakService: Object.assign(
        PakServiceMock,
        {
          getVfsPath: vi.fn((path: string) => path.includes(':') ? path.split(':').slice(1).join(':') : path)
        }
    )
  };
});

vi.mock('@/src/services/indexedDBService', () => ({
  indexedDBService: {
    init: vi.fn().mockResolvedValue(undefined),
    getPaks: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({}),
    saveSettings: vi.fn(),
  }
}));
vi.mock('@/src/services/themeService', () => ({
  themeService: {
    init: vi.fn(),
    setTheme: vi.fn(),
    getTheme: vi.fn().mockReturnValue('dark'),
  }
}));
vi.mock('@/src/services/consoleService', () => ({
  LogLevel: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SUCCESS: 'success'
  },
  consoleService: {
    registerCommand: vi.fn(),
    unregisterCommand: vi.fn(),
    log: vi.fn(),
    getLogs: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => {}),
  }
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to fail so built-in paks don't load, keeping pakCount 0 for tests
    global.fetch = vi.fn((url: string) => {
      if (url.includes('api/session')) {
         return Promise.resolve({
             ok: true,
             json: () => Promise.resolve({
                 user: {
                     id: 1,
                     name: 'Test User',
                     profile_picture: 'pic.jpg'
                 }
             })
         });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
    } as Response);
    }) as Mock;
  });

  it('renders initial state correctly', async () => {
    await act(async () => {
        render(<App />);
    });

    // Wait for auth check to complete
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-panel')).toBeInTheDocument();
  });

  it('shows no PAKs loaded initially', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No PAK files loaded')).toBeInTheDocument();
  });

  it('shows empty file tree', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No files loaded')).toBeInTheDocument();
  });

  it('shows select file message in preview', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Select a file to preview')).toBeInTheDocument();
  });

  it('shows select file message in metadata', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Select a file to view details')).toBeInTheDocument();
  });

  it('has file input with correct attributes', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.accept).toBe('.pak');
    expect(input.multiple).toBe(true);
  });

  it('renders with drop zone', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
  });

  it('has correct layout structure', async () => {
    const { container } = render(<App />);
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });
    expect(container.querySelector('.app')).toBeInTheDocument();
    expect(container.querySelector('.toolbar')).toBeInTheDocument();
    expect(container.querySelector('.main-content')).toBeInTheDocument();
  });

  it('has accessible semantic elements', async () => {
    await act(async () => {
        render(<App />);
    });
    await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
    });

    // Toolbar is header
    expect(screen.getByTestId('toolbar').tagName).toBe('HEADER');

    // Preview is main
    expect(screen.getByTestId('preview-panel').tagName).toBe('MAIN');

    // Metadata is aside
    expect(screen.getByTestId('metadata-panel').tagName).toBe('ASIDE');
  });

  describe('PAK file loading', () => {
    it('shows loading banner during file load', async () => {
      await act(async () => {
        render(<App />);
      });
      await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
      });

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['PACK'], 'test.pak', { type: 'application/octet-stream' });

      Object.defineProperty(input, 'files', { value: [file], configurable: true });

      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // After loading completes, loading banner should be gone
      await waitFor(() => {
        expect(screen.queryByTestId('loading-banner')).not.toBeInTheDocument();
      });
    });

    it('ignores non-PAK files', async () => {
      await act(async () => {
        render(<App />);
      });
      await waitFor(() => {
        expect(screen.queryByText('Checking authentication...')).not.toBeInTheDocument();
      });

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['content'], 'readme.txt', { type: 'text/plain' });

      Object.defineProperty(input, 'files', { value: [file], configurable: true });

      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByText('No PAK files loaded')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('shows error banner when PAK loading fails', async () => {
      await act(async () => {
        render(<App />);
      });

      // Wait for initial load to finish
      await waitFor(() => {
        expect(screen.queryByTestId('loading-banner')).not.toBeInTheDocument();
      });

      vi.spyOn(PakService.prototype, 'loadPakFile').mockRejectedValueOnce(new Error('Invalid PAK file'));

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['invalid'], 'bad.pak', { type: 'application/octet-stream' });

      Object.defineProperty(input, 'files', { value: [file], configurable: true });

      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      });
    });

    it('dismisses error when button clicked', async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<App />);
      });

      // Wait for initial load to finish
      await waitFor(() => {
        expect(screen.queryByTestId('loading-banner')).not.toBeInTheDocument();
      });

      vi.spyOn(PakService.prototype, 'loadPakFile').mockRejectedValueOnce(new Error('Invalid PAK file'));

      const input = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['invalid'], 'bad.pak', { type: 'application/octet-stream' });

      Object.defineProperty(input, 'files', { value: [file], configurable: true });

      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Dismiss'));

      expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
    });
  });
});
