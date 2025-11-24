import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile, PakService } from '@/src/services/pakService';

describe('PreviewPanel Component', () => {
  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
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
    expect(screen.getByTestId('image-preview')).toBeInTheDocument();
  });
});
