import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile } from '@/src/services/pakService';

describe('PreviewPanel Component', () => {
  it('shows empty state when no file selected', () => {
    render(<PreviewPanel parsedFile={null} filePath={null} />);
    expect(screen.getByText('Select a file to preview')).toBeInTheDocument();
  });

  it('shows file path in header', () => {
    const parsedTxt: ParsedFile = { type: 'txt', content: 'test content' };
    render(<PreviewPanel parsedFile={parsedTxt} filePath="readme.txt" />);
    expect(screen.getByText('readme.txt')).toBeInTheDocument();
  });

  describe('Image Preview', () => {
    it('renders canvas for PCX files', () => {
      const parsedPcx: ParsedFile = {
        type: 'pcx',
        image: { width: 64, height: 64, bitsPerPixel: 8, palette: new Uint8Array(768), data: new Uint8Array(64 * 64) },
        rgba: new Uint8Array(64 * 64 * 4),
        width: 64,
        height: 64,
      };
      render(<PreviewPanel parsedFile={parsedPcx} filePath="pics/test.pcx" />);
      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-canvas')).toBeInTheDocument();
    });

    it('shows dimensions for images', () => {
      const parsedPcx: ParsedFile = {
        type: 'pcx',
        image: { width: 64, height: 64, bitsPerPixel: 8, palette: new Uint8Array(768), data: new Uint8Array(64 * 64) },
        rgba: new Uint8Array(64 * 64 * 4),
        width: 64,
        height: 64,
      };
      render(<PreviewPanel parsedFile={parsedPcx} filePath="pics/test.pcx" />);
      expect(screen.getByText(/64 x 64/)).toBeInTheDocument();
    });

    it('renders canvas for WAL files with rgba', () => {
      const parsedWal: ParsedFile = {
        type: 'wal',
        texture: {
          name: 'test',
          width: 64,
          height: 64,
          mipmaps: [],
          animName: '',
          flags: 0,
          contents: 0,
          value: 0,
        },
        rgba: new Uint8Array(64 * 64 * 4),
        width: 64,
        height: 64,
      };
      render(<PreviewPanel parsedFile={parsedWal} filePath="textures/test.wal" />);
      expect(screen.getByTestId('image-preview')).toBeInTheDocument();
    });

    it('shows palette required message for WAL without rgba', () => {
      const parsedWal: ParsedFile = {
        type: 'wal',
        texture: {
          name: 'test',
          width: 64,
          height: 64,
          mipmaps: [],
          animName: '',
          flags: 0,
          contents: 0,
          value: 0,
        },
        rgba: null,
        width: 64,
        height: 64,
      };
      render(<PreviewPanel parsedFile={parsedWal} filePath="textures/test.wal" />);
      expect(screen.getByTestId('wal-no-palette')).toBeInTheDocument();
      expect(screen.getByText(/palette/i)).toBeInTheDocument();
    });
  });

  describe('Model Preview', () => {
    it('renders model preview for MD2', () => {
      const parsedMd2: ParsedFile = {
        type: 'md2',
        model: {
          header: { numFrames: 10, numVertices: 100, numTriangles: 50, numSkins: 1, numGlCommands: 200 },
          frames: [],
          skins: [],
          texCoords: [],
          triangles: [],
          glCommands: [],
        },
      };
      render(<PreviewPanel parsedFile={parsedMd2} filePath="models/test.md2" />);
      expect(screen.getByTestId('model-preview')).toBeInTheDocument();
      expect(screen.getByText('MD2 Model')).toBeInTheDocument();
    });

    it('renders model preview for MD3', () => {
      const parsedMd3: ParsedFile = {
        type: 'md3',
        model: {
          header: { numFrames: 5, numSurfaces: 2, numTags: 1 },
          frames: [],
          tags: [],
          surfaces: [],
        },
      };
      render(<PreviewPanel parsedFile={parsedMd3} filePath="models/test.md3" />);
      expect(screen.getByTestId('model-preview')).toBeInTheDocument();
      expect(screen.getByText('MD3 Model')).toBeInTheDocument();
    });
  });

  describe('Audio Preview', () => {
    it('renders audio preview for WAV', () => {
      const parsedWav: ParsedFile = {
        type: 'wav',
        audio: {
          channels: 1,
          sampleRate: 22050,
          bitsPerSample: 16,
          samples: new Int16Array(22050),
        },
      };
      render(<PreviewPanel parsedFile={parsedWav} filePath="sounds/test.wav" />);
      expect(screen.getByTestId('audio-preview')).toBeInTheDocument();
      expect(screen.getByTestId('audio-play-button')).toBeInTheDocument();
    });

    it('shows audio info', () => {
      const parsedWav: ParsedFile = {
        type: 'wav',
        audio: {
          channels: 2,
          sampleRate: 44100,
          bitsPerSample: 16,
          samples: new Int16Array(88200),
        },
      };
      render(<PreviewPanel parsedFile={parsedWav} filePath="sounds/test.wav" />);
      expect(screen.getByText(/44100 Hz/)).toBeInTheDocument();
      expect(screen.getByText(/2 channels/)).toBeInTheDocument();
    });
  });

  describe('Text Preview', () => {
    it('renders text content', () => {
      const parsedTxt: ParsedFile = {
        type: 'txt',
        content: 'Hello World\nLine 2',
      };
      render(<PreviewPanel parsedFile={parsedTxt} filePath="readme.txt" />);
      expect(screen.getByTestId('text-preview')).toBeInTheDocument();
      expect(screen.getByText(/Hello World/)).toBeInTheDocument();
    });
  });

  describe('Hex Preview', () => {
    it('renders hex dump for unknown files', () => {
      const parsedUnknown: ParsedFile = {
        type: 'unknown',
        data: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
      };
      render(<PreviewPanel parsedFile={parsedUnknown} filePath="file.bin" />);
      expect(screen.getByTestId('hex-preview')).toBeInTheDocument();
    });
  });
});
