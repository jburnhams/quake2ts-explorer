import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextureAtlas, TextureAtlasProps } from '../../src/components/TextureAtlas';

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('TextureAtlas', () => {
  const mockRgba = new Uint8Array(64 * 64 * 4).fill(255); // White 64x64 texture
  const defaultProps: TextureAtlasProps = {
    rgba: mockRgba,
    width: 64,
    height: 64,
    format: 'pcx',
    name: 'test.pcx',
  };

  beforeEach(() => {
    // Mock canvas functions
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: () => ({
        data: new Uint8ClampedArray(64 * 64 * 4),
      }),
      putImageData: jest.fn(),
    } as any);

    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['mock-blob'], { type: 'image/png' }));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global.URL.createObjectURL as jest.Mock).mockClear();
    (global.URL.revokeObjectURL as jest.Mock).mockClear();
  });

  it('renders correctly', () => {
    render(<TextureAtlas {...defaultProps} />);
    expect(screen.getByTestId('texture-atlas')).toBeInTheDocument();
    expect(screen.getByTestId('atlas-canvas')).toBeInTheDocument();
    expect(screen.getByText(/64 x 64/)).toBeInTheDocument();
    expect(screen.getByText('PCX')).toBeInTheDocument();
    expect(screen.getByText('test.pcx')).toBeInTheDocument();
  });

  it('renders mipmap levels when provided', () => {
    const mipmaps = [
      { width: 64, height: 64, rgba: new Uint8Array(0) },
      { width: 32, height: 32, rgba: new Uint8Array(0) },
      { width: 16, height: 16, rgba: new Uint8Array(0) },
      { width: 8, height: 8, rgba: new Uint8Array(0) },
    ];
    render(<TextureAtlas {...defaultProps} mipmaps={mipmaps} />);
    expect(screen.getByText('Mip levels:')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('handles zoom controls', () => {
    render(<TextureAtlas {...defaultProps} />);
    const zoomIn = screen.getByLabelText('Zoom In');
    const zoomOut = screen.getByLabelText('Zoom Out');

    // Initial state
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Zoom in
    fireEvent.click(zoomIn);
    expect(screen.getByText('200%')).toBeInTheDocument();

    // Zoom out
    fireEvent.click(zoomOut);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows grid at high zoom', () => {
    render(<TextureAtlas {...defaultProps} />);
    const zoomIn = screen.getByLabelText('Zoom In');

    // Zoom to 400%
    fireEvent.click(zoomIn); // 200%
    fireEvent.click(zoomIn); // 400%

    expect(screen.getByTestId('pixel-grid')).toBeInTheDocument();
  });

  it('renders palette for 8-bit textures', () => {
    const palette = new Uint8Array(768).fill(100);
    render(<TextureAtlas {...defaultProps} palette={palette} />);

    expect(screen.getByTestId('palette-grid')).toBeInTheDocument();
    // 256 swatches
    expect(screen.getAllByTestId(/swatch-/)).toHaveLength(256);
  });

  it('displays color info when palette swatch is clicked', () => {
    const palette = new Uint8Array(768);
    // Set color at index 0 to Red
    palette[0] = 255;
    palette[1] = 0;
    palette[2] = 0;

    render(<TextureAtlas {...defaultProps} palette={palette} />);

    const swatch = screen.getByTestId('swatch-0');
    fireEvent.click(swatch);

    expect(screen.getByTestId('palette-info')).toBeInTheDocument();
    expect(screen.getByText('Index: 0')).toBeInTheDocument();
    expect(screen.getByText('R: 255')).toBeInTheDocument();
  });

  it('exports PNG', async () => {
    render(<TextureAtlas {...defaultProps} />);
    const exportBtn = screen.getByText('Export PNG');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('exports Palette', async () => {
    const palette = new Uint8Array(768).fill(128);
    render(<TextureAtlas {...defaultProps} palette={palette} />);

    const exportBtn = screen.getByText('Export Palette');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('exports Mipmaps', async () => {
    const mipmaps = [
      { width: 64, height: 64, rgba: new Uint8Array(16384) }, // 64*64*4
      { width: 32, height: 32, rgba: new Uint8Array(4096) },
    ];
    render(<TextureAtlas {...defaultProps} mipmaps={mipmaps} />);

    const exportBtn = screen.getByText('Export Mipmaps');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      // It should create 2 canvases and call toBlob on them
      // Since we mocked HTMLCanvasElement.prototype.toBlob globally, it should be called.
      // But notice we create new canvas elements in handleExportMipmaps using document.createElement('canvas')
      // JSDOM should handle this.
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });
  });
});
