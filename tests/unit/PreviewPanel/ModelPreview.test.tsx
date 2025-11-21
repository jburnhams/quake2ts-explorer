import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile } from '@/src/services/pakService';
import { Md2Model, Md2Animation } from 'quake2ts';

jest.mock('@/src/components/Md2Viewer', () => ({
  Md2Viewer: () => <div data-testid="md2-viewer" />,
}));

describe('Model Preview', () => {
  it('renders model preview for MD2', () => {
    const parsedMd2: ParsedFile = {
      type: 'md2',
      model: { skins: [] } as Md2Model,
      animations: [{ name: 'idle', firstFrame: 0, lastFrame: 39, fps: 9 }] as Md2Animation[],
    };
    render(<PreviewPanel parsedFile={parsedMd2} filePath="models/test.md2" />);
    expect(screen.getByTestId('md2-viewer')).toBeInTheDocument();
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
