import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../../src/components/PreviewPanel';
import type { ParsedFile, PakService } from '../../../src/services/pakService';

describe('Text Preview', () => {
  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
  } as unknown as PakService;

  it('renders text content', () => {
    const parsedTxt: ParsedFile = {
      type: 'txt',
      content: 'Hello World\nLine 2',
    };
    render(
      <PreviewPanel
        parsedFile={parsedTxt}
        filePath="readme.txt"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('text-preview')).toBeInTheDocument();
    expect(screen.getByText(/Hello World/)).toBeInTheDocument();
  });
});
