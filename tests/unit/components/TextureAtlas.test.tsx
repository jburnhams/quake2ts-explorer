
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { TextureAtlas } from '../../../src/components/TextureAtlas';
import { AssetCrossRefService } from '../../../src/services/assetCrossRefService';
import { pakService } from '../../../src/services/pakService';
import { thumbnailService } from '../../../src/services/thumbnailService';
import { Md2Model, Md3Model } from 'quake2ts/engine';

// Mock dependencies
jest.mock('../../../src/services/assetCrossRefService');
jest.mock('../../../src/services/pakService');
jest.mock('../../../src/services/thumbnailService', () => ({
  thumbnailService: {
    getThumbnail: jest.fn(),
    saveThumbnail: jest.fn(),
    generateThumbnail: jest.fn()
  }
}));

// Mock HTMLCanvasElement.getContext
const mockContext = {
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(100),
    width: 10,
    height: 10
  })),
  putImageData: jest.fn(),
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  clearRect: jest.fn(),
  setLineDash: jest.fn(),
  strokeStyle: '',
  lineWidth: 1
};

HTMLCanvasElement.prototype.getContext = jest.fn((contextId) => {
  if (contextId === '2d') {
    return mockContext as any;
  }
  return null;
});

HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => callback(new Blob(['test'])));

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
    jest.clearAllMocks();
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
    const mockFindTextureUsage = jest.fn().mockResolvedValue([
      { type: 'model', path: 'models/test.md2', details: 'Ref: skin' }
    ]);

    (AssetCrossRefService as jest.Mock).mockImplementation(() => ({
      findTextureUsage: mockFindTextureUsage
    }));

    // Mock pakService.parseFile for UV extraction
    (pakService.parseFile as jest.Mock).mockResolvedValue({
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
    (thumbnailService.getThumbnail as jest.Mock).mockResolvedValue(undefined);
    (thumbnailService.generateThumbnail as jest.Mock).mockResolvedValue(new Blob(['thumb']));

    render(<TextureAtlas {...defaultProps} />);

    await waitFor(() => {
        expect(thumbnailService.getThumbnail).toHaveBeenCalledWith('texture:test.pcx');
        expect(thumbnailService.generateThumbnail).toHaveBeenCalled();
        expect(thumbnailService.saveThumbnail).toHaveBeenCalledWith('texture:test.pcx', expect.any(Blob));
    });
  });
});
