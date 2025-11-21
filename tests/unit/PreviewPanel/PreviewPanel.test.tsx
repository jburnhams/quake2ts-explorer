import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile } from '@/src/services/pakService';

jest.mock('@/src/hooks/usePakExplorer', () => ({
  usePakExplorer: () => ({
    pakService: {
      hasFile: jest.fn(),
      readFile: jest.fn(),
    },
  }),
}));

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
});
