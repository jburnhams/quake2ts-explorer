import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../../src/components/PreviewPanel';
import type { ParsedFile, PakService } from '../../../src/services/pakService';

describe('Image Preview', () => {
  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
  } as unknown as PakService;

  it('renders canvas for PCX files', () => {
    const parsedPcx: ParsedFile = {
      type: 'pcx',
      image: { width: 64, height: 64, bitsPerPixel: 8, palette: new Uint8Array(768), data: new Uint8Array(64 * 64) },
      rgba: new Uint8Array(64 * 64 * 4),
      width: 64,
      height: 64,
    };
    render(
      <PreviewPanel
        parsedFile={parsedPcx}
        filePath="pics/test.pcx"
        pakService={mockPakService}
      />
    );
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
    render(
      <PreviewPanel
        parsedFile={parsedPcx}
        filePath="pics/test.pcx"
        pakService={mockPakService}
      />
    );
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
    render(
      <PreviewPanel
        parsedFile={parsedWal}
        filePath="textures/test.wal"
        pakService={mockPakService}
      />
    );
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
    render(
      <PreviewPanel
        parsedFile={parsedWal}
        filePath="textures/test.wal"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('wal-no-palette')).toBeInTheDocument();
    expect(screen.getByText(/palette/i)).toBeInTheDocument();
  });

  it('scales small images up', () => {
    const parsedPcx: ParsedFile = {
      type: 'pcx',
      image: { width: 32, height: 32, bitsPerPixel: 8, palette: new Uint8Array(768), data: new Uint8Array(32 * 32) },
      rgba: new Uint8Array(32 * 32 * 4),
      width: 32,
      height: 32,
    };
    render(
      <PreviewPanel
        parsedFile={parsedPcx}
        filePath="pics/small.pcx"
        pakService={mockPakService}
      />
    );
    expect(screen.getByText(/4x zoom/)).toBeInTheDocument();
  });

  it('does not show zoom for large images', () => {
    const parsedPcx: ParsedFile = {
      type: 'pcx',
      image: { width: 512, height: 512, bitsPerPixel: 8, palette: new Uint8Array(768), data: new Uint8Array(512 * 512) },
      rgba: new Uint8Array(512 * 512 * 4),
      width: 512,
      height: 512,
    };
    render(
      <PreviewPanel
        parsedFile={parsedPcx}
        filePath="pics/large.pcx"
        pakService={mockPakService}
      />
    );
    expect(screen.queryByText(/zoom/)).not.toBeInTheDocument();
  });
});
