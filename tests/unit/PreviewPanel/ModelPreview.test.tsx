import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../../src/components/PreviewPanel';
import type { ParsedFile, PakService } from '../../../src/services/pakService';

jest.mock('../../../src/components/UniversalViewer/UniversalViewer', () => ({
  UniversalViewer: () => <div data-testid="universal-viewer" />,
}));

// SpriteViewer is still imported
jest.mock('../../../src/components/SpriteViewer', () => ({
    SpriteViewer: () => <div data-testid="sprite-viewer" />,
}));

describe('Model Preview', () => {
  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
  } as unknown as PakService;

  it('renders UniversalViewer for MD2', () => {
    const parsedMd2: ParsedFile = {
      type: 'md2',
      model: { skins: [], header: {} } as any,
      animations: [{ name: 'idle', firstFrame: 0, lastFrame: 39, fps: 9 }] as any,
    };
    render(
      <PreviewPanel
        parsedFile={parsedMd2}
        filePath="models/test.md2"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();
  });

  it('renders UniversalViewer for MD3', () => {
    const parsedMd3: ParsedFile = {
      type: 'md3',
      model: {
        header: { numFrames: 5, numSurfaces: 2, numTags: 1 },
        frames: [],
        tags: [],
        surfaces: [],
      } as any,
    };
    render(
      <PreviewPanel
        parsedFile={parsedMd3}
        filePath="models/test.md3"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();
  });

  it('renders UniversalViewer for BSP', () => {
    const parsedBsp: ParsedFile = {
      type: 'bsp',
      map: { models: [] } as any,
    };
    render(
      <PreviewPanel
        parsedFile={parsedBsp}
        filePath="maps/test.bsp"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();
  });

  it('renders UniversalViewer for DM2', () => {
      const parsedDm2: ParsedFile = {
          type: 'dm2',
          data: new Uint8Array(),
      };
      render(
          <PreviewPanel
            parsedFile={parsedDm2}
            filePath="demos/test.dm2"
            pakService={mockPakService}
          />
      );
      expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();
  });
});
