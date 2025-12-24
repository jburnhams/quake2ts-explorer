import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { TextureAtlas } from '../../../src/components/TextureAtlas';
import { AssetCrossRefService } from '../../../src/services/assetCrossRefService';
import { pakService } from '../../../src/services/pakService';
import { thumbnailService } from '../../../src/services/thumbnailService';
import { Md2Model, Md3Model } from 'quake2ts/engine';

// Mock dependencies
vi.mock('../../../src/services/assetCrossRefService');
vi.mock('../../../src/services/pakService');
vi.mock('../../../src/services/thumbnailService', () => ({
  thumbnailService: {
    getThumbnail: vi.fn(),
    saveThumbnail: vi.fn(),
    generateThumbnail: vi.fn()
  }
}));

// Mock HTMLCanvasElement.getContext
const mockContext = {
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(100),
    width: 10,
    height: 10
  })),
  putImageData: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  setLineDash: vi.fn(),
  strokeStyle: '',
  lineWidth: 1
};

HTMLCanvasElement.prototype.getContext = vi.fn((contextId) => {
  if (contextId === '2d') {
    return mockContext as any;
  }
  return null;
});

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(new Blob(['test'])));

describe('TextureAtlas', () => {
  const mockRgba = new Uint8Array(100);
  const defaultProps = {
    rgba: mockRgba,
    width: 10,
    height: 10,
    format: 'pcx' as const,
    name: 'test.pcx'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<TextureAtlas {...defaultProps} />);
    expect(screen.getByText('10 x 10')).toBeInTheDocument();
    expect(screen.getByText('test.pcx')).toBeInTheDocument();
  });

  it('handles zoom controls', () => {
    render(<TextureAtlas {...defaultProps} />);

    const zoomIn = screen.getByLabelText('Zoom In');
    const zoomOut = screen.getByLabelText('Zoom Out');

    fireEvent.click(zoomIn);
    expect(screen.getByText('200%')).toBeInTheDocument();

    fireEvent.click(zoomOut);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('scans for usage and handles model selection', async () => {
    const mockFindTextureUsage = vi.fn().mockResolvedValue([
      { type: 'model', path: 'models/test.md2', details: 'Ref: skin' }
    ]);

    (AssetCrossRefService as vi.Mock).mockImplementation(() => ({
      findTextureUsage: mockFindTextureUsage
    }));

    // Mock pakService.parseFile for UV extraction
    (pakService.parseFile as vi.Mock).mockResolvedValue({
        type: 'md2',
        model: {
            header: { skinWidth: 100, skinHeight: 100 },
            texCoords: [{s: 0, t: 0}, {s: 50, t: 50}, {s: 100, t: 0}],
            triangles: [{ texCoordIndices: [0, 1, 2], vertexIndices: [0, 1, 2] }],
            frames: [],
            skins: [],
            glCommands: []
        }
    });

    render(<TextureAtlas {...defaultProps} />);

    fireEvent.click(screen.getByText('Find Usage'));

    expect(screen.getByText('Scanning...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('models/test.md2')).toBeInTheDocument();
    });

    // Select the usage
    fireEvent.click(screen.getByText('models/test.md2'));

    // Verify UV controls appear
    expect(screen.getByText('Show UVs')).toBeInTheDocument();

    // Check Show UVs checkbox (it defaults to true on selection in our impl)
    // Wait, the impl says:
    // const handleUsageClick = (usage: AssetUsage) => {
    //   if (usage.type === 'model') {
    //       setSelectedUsage(usage);
    //       setShowUVs(true);
    //   }
    // };
    // So it should be checked.

    // Verify canvas draw calls
    await waitFor(() => {
        expect(pakService.parseFile).toHaveBeenCalledWith('models/test.md2');
        expect(mockContext.stroke).toHaveBeenCalled();
    });
  });

  it('displays palette when provided', () => {
    const palette = new Uint8Array(768); // 256 * 3
    render(<TextureAtlas {...defaultProps} palette={palette} />);

    expect(screen.getByTestId('palette-grid')).toBeInTheDocument();
  });

  it('caches thumbnail on load', async () => {
    (thumbnailService.getThumbnail as vi.Mock).mockResolvedValue(undefined);
    (thumbnailService.generateThumbnail as vi.Mock).mockResolvedValue(new Blob(['thumb']));

    render(<TextureAtlas {...defaultProps} />);

    await waitFor(() => {
        expect(thumbnailService.getThumbnail).toHaveBeenCalledWith('texture:test.pcx');
        expect(thumbnailService.generateThumbnail).toHaveBeenCalled();
        expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith('texture:test.pcx', expect.any(Blob));
    });
  });
});
