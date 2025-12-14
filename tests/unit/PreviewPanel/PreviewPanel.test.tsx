import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile, PakService } from '@/src/services/pakService';

describe('PreviewPanel Component', () => {
  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
    getPalette: jest.fn().mockReturnValue(null),
  } as unknown as PakService;

  it('shows empty state when no file selected', () => {
    render(
      <PreviewPanel
        parsedFile={null}
        filePath={null}
        pakService={mockPakService}
      />
    );
    expect(screen.getByText('Select a file to preview')).toBeInTheDocument();
  });

  it('shows file path in header', () => {
    const parsedTxt: ParsedFile = { type: 'txt', content: 'test content' };
    render(
      <PreviewPanel
        parsedFile={parsedTxt}
        filePath="readme.txt"
        pakService={mockPakService}
      />
    );
    expect(screen.getByText('readme.txt')).toBeInTheDocument();
  });

  it('renders TGA image preview', () => {
    const parsedTga: ParsedFile = {
        type: 'tga',
        rgba: new Uint8Array(4),
        width: 1,
        height: 1,
        image: {} as any
    };
    render(
      <PreviewPanel
        parsedFile={parsedTga}
        filePath="test.tga"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('texture-atlas')).toBeInTheDocument();
  });

  it('renders WAL texture preview with mipmaps', () => {
    const parsedWal: ParsedFile = {
      type: 'wal',
      texture: {} as any,
      rgba: new Uint8Array(4),
      width: 1,
      height: 1,
      mipmaps: [{ width: 1, height: 1, rgba: new Uint8Array(4) }]
    };
    render(
      <PreviewPanel
        parsedFile={parsedWal}
        filePath="test.wal"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('texture-atlas')).toBeInTheDocument();
    expect(screen.getByText('Mip levels:')).toBeInTheDocument();
  });

  it('renders SpriteViewer for sp2 file', () => {
    const parsedSprite: ParsedFile = {
      type: 'sp2',
      model: { numFrames: 0, frames: [] } as any
    };
    const { container } = render(
      <PreviewPanel
        parsedFile={parsedSprite}
        filePath="model.sp2"
        pakService={mockPakService}
      />
    );
    expect(container.querySelector('.sprite-viewer')).toBeInTheDocument();
  });
});
