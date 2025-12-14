import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TextureAtlas, TextureAtlasProps } from '@/src/components/TextureAtlas';
import { AssetCrossRefService } from '@/src/services/assetCrossRefService';
import { pakService } from '@/src/services/pakService';

// Mock services
jest.mock('@/src/services/assetCrossRefService');
jest.mock('@/src/services/pakService', () => ({
  pakService: {
    getVfs: jest.fn(),
  },
}));

describe('TextureAtlas', () => {
  const mockProps: TextureAtlasProps = {
    rgba: new Uint8Array([255, 0, 0, 255]),
    width: 1,
    height: 1,
    format: 'tga',
    name: 'test.tga',
  };

  const mockFindTextureUsage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (pakService.getVfs as jest.Mock).mockReturnValue({});
    (AssetCrossRefService as jest.Mock).mockImplementation(() => ({
      findTextureUsage: mockFindTextureUsage,
    }));
  });

  it('renders correctly', () => {
    render(<TextureAtlas {...mockProps} />);
    expect(screen.getByTestId('texture-atlas')).toBeInTheDocument();
    expect(screen.getByText('test.tga')).toBeInTheDocument();
  });

  it('handles usage scanning', async () => {
    mockFindTextureUsage.mockResolvedValue([
      { type: 'model', path: 'models/test.md2', details: 'Ref' }
    ]);

    render(<TextureAtlas {...mockProps} />);

    const scanButton = screen.getByText('Find Usage');
    fireEvent.click(scanButton);

    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(AssetCrossRefService).toHaveBeenCalled();
    expect(mockFindTextureUsage).toHaveBeenCalledWith('test.tga');

    await waitFor(() => {
      expect(screen.getByText('Usage References (1)')).toBeInTheDocument();
    });

    expect(screen.getByText('MODEL')).toBeInTheDocument();
    expect(screen.getByText('models/test.md2')).toBeInTheDocument();
  });

  it('handles scan errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFindTextureUsage.mockRejectedValue(new Error('Failed'));

    render(<TextureAtlas {...mockProps} />);

    fireEvent.click(screen.getByText('Find Usage'));

    await waitFor(() => {
      expect(screen.getByText('Find Usage')).toBeInTheDocument(); // reverts button text
    });

    expect(consoleSpy).toHaveBeenCalledWith('Scan failed', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('handles empty results', async () => {
    mockFindTextureUsage.mockResolvedValue([]);

    render(<TextureAtlas {...mockProps} />);

    fireEvent.click(screen.getByText('Find Usage'));

    await waitFor(() => {
        expect(screen.getByText('No references found.')).toBeInTheDocument();
    });
  });

  it('resets state on prop change', async () => {
    mockFindTextureUsage.mockResolvedValue([
        { type: 'model', path: 'models/test.md2' }
    ]);

    const { rerender } = render(<TextureAtlas {...mockProps} />);

    // Perform scan
    fireEvent.click(screen.getByText('Find Usage'));
    await waitFor(() => {
        expect(screen.getByText('models/test.md2')).toBeInTheDocument();
    });

    // Change prop
    rerender(<TextureAtlas {...mockProps} name="other.tga" />);

    // Usage list should disappear
    expect(screen.queryByText('models/test.md2')).not.toBeInTheDocument();
    expect(screen.queryByText('Usage References (1)')).not.toBeInTheDocument();
  });
});
