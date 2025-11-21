import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile } from '@/src/services/pakService';

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
