import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '@/src/components/MetadataPanel';
import type { FileMetadata, ParsedFile } from '@/src/services/pakService';

const mockMetadata: FileMetadata = {
  path: 'pics/test.pcx',
  name: 'test.pcx',
  size: 1024,
  sourcePak: 'pak0.pak',
  extension: 'pcx',
  fileType: 'pcx',
};

describe('MetadataPanel Component', () => {
  it('shows empty state when no metadata', () => {
    render(<MetadataPanel metadata={null} parsedFile={null} />);
    expect(screen.getByText('Select a file to view details')).toBeInTheDocument();
  });

  it('shows file info when metadata provided', () => {
    render(<MetadataPanel metadata={mockMetadata} parsedFile={null} />);
    expect(screen.getByText('File Info')).toBeInTheDocument();
    expect(screen.getByText('test.pcx')).toBeInTheDocument();
    expect(screen.getByText('pics/test.pcx')).toBeInTheDocument();
    expect(screen.getByText('pak0.pak')).toBeInTheDocument();
  });

  it('formats bytes correctly', () => {
    render(<MetadataPanel metadata={mockMetadata} parsedFile={null} />);
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('shows uppercase extension', () => {
    render(<MetadataPanel metadata={mockMetadata} parsedFile={null} />);
    expect(screen.getByText('PCX')).toBeInTheDocument();
  });

  describe('PCX details', () => {
    it('shows PCX image details', () => {
      const parsedPcx: ParsedFile = {
        type: 'pcx',
        image: { width: 64, height: 64, bitsPerPixel: 8, palette: new Uint8Array(768), data: new Uint8Array(64 * 64) },
        rgba: new Uint8Array(64 * 64 * 4),
        width: 64,
        height: 64,
      };
      render(<MetadataPanel metadata={mockMetadata} parsedFile={parsedPcx} />);
      expect(screen.getByTestId('pcx-details')).toBeInTheDocument();
      expect(screen.getAllByText('64px').length).toBe(2); // width and height
    });
  });

  describe('WAL details', () => {
    it('shows WAL texture details', () => {
      const walMetadata: FileMetadata = { ...mockMetadata, extension: 'wal', fileType: 'wal' };
      const parsedWal: ParsedFile = {
        type: 'wal',
        texture: {
          name: 'testwal',
          width: 128,
          height: 128,
          mipmaps: [{ level: 0, width: 128, height: 128, data: new Uint8Array(128 * 128) }],
          animName: '',
          flags: 0,
          contents: 0,
          value: 0,
        },
        rgba: null,
        width: 128,
        height: 128,
      };
      render(<MetadataPanel metadata={walMetadata} parsedFile={parsedWal} />);
      expect(screen.getByTestId('wal-details')).toBeInTheDocument();
      expect(screen.getByText('testwal')).toBeInTheDocument();
    });
  });

  describe('MD2 details', () => {
    it('shows MD2 model details', () => {
      const md2Metadata: FileMetadata = { ...mockMetadata, path: 'models/test.md2', name: 'test.md2', extension: 'md2', fileType: 'md2' };
      const parsedMd2: ParsedFile = {
        type: 'md2',
        model: {
          header: { numFrames: 40, numVertices: 200, numTriangles: 100, numSkins: 2, numGlCommands: 500, skinWidth: 256, skinHeight: 256 },
          frames: [{ name: 'stand01', vertices: [] }],
          skins: [{ name: 'models/test/skin.pcx' }],
          texCoords: [],
          triangles: [],
          glCommands: [],
        },
        animations: [{ name: 'stand', firstFrame: 0, lastFrame: 0 }],
      };
      const hasFile = jest.fn(() => true);
      const onNavigateToFile = jest.fn();
      render(<MetadataPanel metadata={md2Metadata} parsedFile={parsedMd2} hasFile={hasFile} onNavigateToFile={onNavigateToFile} />);
      expect(screen.getByTestId('md2-details')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument(); // vertices
      expect(screen.getByText('100')).toBeInTheDocument(); // triangles
      expect(screen.getByText('stand')).toBeInTheDocument(); // animation name
      expect(screen.getByText('models/test/skin.pcx')).toBeInTheDocument(); // skin path as button text
    });

    it('shows clickable skin links when file exists', () => {
      const md2Metadata: FileMetadata = { ...mockMetadata, path: 'models/test.md2', name: 'test.md2', extension: 'md2', fileType: 'md2' };
      const parsedMd2: ParsedFile = {
        type: 'md2',
        model: {
          header: { numFrames: 1, numVertices: 10, numTriangles: 5, numSkins: 1, numGlCommands: 10, skinWidth: 256, skinHeight: 256 },
          frames: [{ name: 'frame01', vertices: [] }],
          skins: [{ name: 'models/test/skin.pcx' }],
          texCoords: [],
          triangles: [],
          glCommands: [],
        },
        animations: [],
      };
      const hasFile = jest.fn(() => true);
      const onNavigateToFile = jest.fn();
      render(<MetadataPanel metadata={md2Metadata} parsedFile={parsedMd2} hasFile={hasFile} onNavigateToFile={onNavigateToFile} />);

      const skinButton = screen.getByRole('button', { name: /models\/test\/skin\.pcx/i });
      expect(skinButton).toBeInTheDocument();

      skinButton.click();
      expect(onNavigateToFile).toHaveBeenCalledWith('models/test/skin.pcx');
    });

    it('shows missing indicator for non-existent skins', () => {
      const md2Metadata: FileMetadata = { ...mockMetadata, path: 'models/test.md2', name: 'test.md2', extension: 'md2', fileType: 'md2' };
      const parsedMd2: ParsedFile = {
        type: 'md2',
        model: {
          header: { numFrames: 1, numVertices: 10, numTriangles: 5, numSkins: 1, numGlCommands: 10, skinWidth: 256, skinHeight: 256 },
          frames: [{ name: 'frame01', vertices: [] }],
          skins: [{ name: 'models/missing/skin.pcx' }],
          texCoords: [],
          triangles: [],
          glCommands: [],
        },
        animations: [],
      };
      const hasFile = jest.fn(() => false);
      const onNavigateToFile = jest.fn();
      render(<MetadataPanel metadata={md2Metadata} parsedFile={parsedMd2} hasFile={hasFile} onNavigateToFile={onNavigateToFile} />);

      expect(screen.getByText(/models\/missing\/skin\.pcx \(missing\)/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /models\/missing\/skin\.pcx/i })).not.toBeInTheDocument();
    });
  });

  describe('WAV details', () => {
    it('shows WAV audio details', () => {
      const wavMetadata: FileMetadata = { ...mockMetadata, path: 'sound/test.wav', name: 'test.wav', extension: 'wav', fileType: 'wav' };
      const parsedWav: ParsedFile = {
        type: 'wav',
        audio: {
          channels: 1,
          sampleRate: 22050,
          bitsPerSample: 16,
          samples: new Int16Array(22050),
        },
      };
      render(<MetadataPanel metadata={wavMetadata} parsedFile={parsedWav} />);
      expect(screen.getByTestId('wav-details')).toBeInTheDocument();
      expect(screen.getByText('22050 Hz')).toBeInTheDocument();
    });
  });

  describe('Text details', () => {
    it('shows text file details', () => {
      const txtMetadata: FileMetadata = { ...mockMetadata, path: 'readme.txt', name: 'readme.txt', extension: 'txt', fileType: 'txt' };
      const parsedTxt: ParsedFile = {
        type: 'txt',
        content: 'Hello\nWorld\nTest',
      };
      render(<MetadataPanel metadata={txtMetadata} parsedFile={parsedTxt} />);
      expect(screen.getByTestId('txt-details')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // lines
    });
  });
});
