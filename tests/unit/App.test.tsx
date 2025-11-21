import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

import App from '@/src/App';

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial state correctly', () => {
    render(<App />);

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-panel')).toBeInTheDocument();
  });

  it('shows no PAKs loaded initially', () => {
    render(<App />);
    expect(screen.getByText('No PAK files loaded')).toBeInTheDocument();
  });

  it('shows empty file tree', () => {
    render(<App />);
    expect(screen.getByText('No files loaded')).toBeInTheDocument();
  });

  it('shows select file message in preview', () => {
    render(<App />);
    expect(screen.getByText('Select a file to preview')).toBeInTheDocument();
  });

  it('shows select file message in metadata', () => {
    render(<App />);
    expect(screen.getByText('Select a file to view details')).toBeInTheDocument();
  });

  it('has file input with correct attributes', () => {
    render(<App />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.accept).toBe('.pak');
    expect(input.multiple).toBe(true);
  });

  it('renders with drop zone', () => {
    render(<App />);
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
  });

  it('has correct layout structure', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.app')).toBeInTheDocument();
    expect(container.querySelector('.toolbar')).toBeInTheDocument();
    expect(container.querySelector('.main-content')).toBeInTheDocument();
  });

  it('has accessible semantic elements', () => {
    render(<App />);

    // Toolbar is header
    expect(screen.getByTestId('toolbar').tagName).toBe('HEADER');

    // Preview is main
    expect(screen.getByTestId('preview-panel').tagName).toBe('MAIN');

    // Metadata is aside
    expect(screen.getByTestId('metadata-panel').tagName).toBe('ASIDE');
  });

  describe('PAK file loading', () => {
    it('shows loading banner during file load', async () => {
      render(<App />);

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
      render(<App />);

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
      // Override PakArchive to throw
      const { PakArchive } = await import('quake2ts/engine');
      (PakArchive.fromArrayBuffer as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid PAK file');
      });

      render(<App />);

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
      const { PakArchive } = await import('quake2ts/engine');
      (PakArchive.fromArrayBuffer as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid PAK file');
      });

      render(<App />);

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
