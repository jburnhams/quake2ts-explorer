import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextureAtlas, TextureAtlasProps } from '../../src/components/TextureAtlas';

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
    // Mock canvasgetContext
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: () => ({
        data: new Uint8ClampedArray(64 * 64 * 4),
      }),
      putImageData: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
    render(<TextureAtlas {...defaultProps} mipmaps={4} />);
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
});
