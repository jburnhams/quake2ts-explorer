import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../../src/components/PreviewPanel';
import type { ParsedFile, PakService } from '../../../src/services/pakService';

describe('Hex Preview', () => {
  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
  } as unknown as PakService;

  it('renders hex dump for unknown files', () => {
    const parsedUnknown: ParsedFile = {
      type: 'unknown',
      data: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
    };
    render(
      <PreviewPanel
        parsedFile={parsedUnknown}
        filePath="file.bin"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('hex-preview')).toBeInTheDocument();
  });

  it('shows truncation message for large files', () => {
    const parsedUnknown: ParsedFile = {
      type: 'unknown',
      data: new Uint8Array(1024), // > 512 bytes
    };
    render(
      <PreviewPanel
        parsedFile={parsedUnknown}
        filePath="large.bin"
        pakService={mockPakService}
      />
    );
    expect(screen.getByText(/Showing first 512 of 1024 bytes/)).toBeInTheDocument();
  });
});
