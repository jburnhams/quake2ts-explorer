import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CacheSettingsTab } from '@/src/components/settings/CacheSettings';
import { cacheService, CACHE_STORES } from '@/src/services/cacheService';

// Mock dependencies
jest.mock('@/src/services/cacheService', () => ({
  cacheService: {
    getStats: jest.fn(),
    getStorageEstimate: jest.fn(),
    clear: jest.fn(),
    clearAll: jest.fn(),
    export: jest.fn()
  },
  CACHE_STORES: {
      PAK_INDEX: 'pak-index',
      THUMBNAILS: 'thumbnails',
      ASSET_METADATA: 'asset-metadata',
      DEMO_INDEX: 'demo-index'
  }
}));

// Mock Blob and URL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

describe('CacheSettingsTab', () => {
  const mockStats = {
    [CACHE_STORES.PAK_INDEX]: { count: 10 },
    [CACHE_STORES.THUMBNAILS]: { count: 20 },
    [CACHE_STORES.ASSET_METADATA]: { count: 30 },
    [CACHE_STORES.DEMO_INDEX]: { count: 40 }
  };
  const mockEstimate = { usage: 1024 * 1024 * 50, quota: 1024 * 1024 * 1024 };

  beforeEach(() => {
    (cacheService.getStats as jest.Mock).mockResolvedValue(mockStats);
    (cacheService.getStorageEstimate as jest.Mock).mockResolvedValue(mockEstimate);
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    (global.URL.createObjectURL as jest.Mock).mockClear();
    (global.URL.revokeObjectURL as jest.Mock).mockClear();
  });

  it('renders loading state initially', async () => {
    // Delay resolution
    (cacheService.getStats as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<CacheSettingsTab />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders stats after loading', async () => {
    render(<CacheSettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('50.0 MB / 1.0 GB')).toBeInTheDocument();
    });

    expect(screen.getByText('Items: 10')).toBeInTheDocument();
    expect(screen.getByText('Items: 20')).toBeInTheDocument();
  });

  it('handles clear cache', async () => {
    render(<CacheSettingsTab />);
    await waitFor(() => screen.getByText('Items: 10'));

    const clearBtn = screen.getByTestId(`clear-${CACHE_STORES.PAK_INDEX}`);
    fireEvent.click(clearBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(cacheService.clear).toHaveBeenCalledWith(CACHE_STORES.PAK_INDEX);

    await waitFor(() => expect(cacheService.getStats).toHaveBeenCalledTimes(2)); // Initial load + after clear
  });

  it('handles clear all caches', async () => {
    render(<CacheSettingsTab />);
    await waitFor(() => screen.getByText('Items: 10'));

    const clearAllBtn = screen.getByTestId('clear-all-button');
    fireEvent.click(clearAllBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(cacheService.clearAll).toHaveBeenCalled();

    await waitFor(() => expect(cacheService.getStats).toHaveBeenCalledTimes(2));
  });

  it('handles export', async () => {
    (cacheService.export as jest.Mock).mockResolvedValue([{ key: 'test', data: 'data' }]);
    render(<CacheSettingsTab />);
    await waitFor(() => screen.getByText('Items: 10'));

    const exportBtn = screen.getByTestId(`export-${CACHE_STORES.PAK_INDEX}`);
    fireEvent.click(exportBtn);

    expect(cacheService.export).toHaveBeenCalledWith(CACHE_STORES.PAK_INDEX);
    await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
  });

  it('handles error loading stats', async () => {
    (cacheService.getStats as jest.Mock).mockRejectedValue(new Error('Load failed'));
    render(<CacheSettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('Load failed')).toBeInTheDocument();
    });
  });
});
