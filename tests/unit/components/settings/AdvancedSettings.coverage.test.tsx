import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedSettingsTab } from '@/src/components/settings/AdvancedSettings';
import { AdvancedSettings } from '@/src/types/settings';
import { cacheService } from '@/src/services/cacheService';

// Mock cacheService
vi.mock('@/src/services/cacheService', () => ({
  cacheService: {
    clearAll: vi.fn(),
    close: vi.fn(),
  },
}));

describe('AdvancedSettingsTab', () => {
  const mockSettings: AdvancedSettings = {
    developerMode: false,
    showFps: false,
    verboseLogging: false,
    cacheSizeLimit: 512,
    experimentalFeatures: false,
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    (cacheService.clearAll as vi.Mock).mockClear();
    (cacheService.close as vi.Mock).mockClear();

    // Mock window methods
    global.alert = vi.fn();
    global.confirm = vi.fn();
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { reload: vi.fn() };

    // Mock indexedDB
    const mockIndexedDB = {
        deleteDatabase: vi.fn().mockImplementation(() => {
            return {
                set onerror(cb) {},
                set onsuccess(cb: any) { cb(); },
                set onblocked(cb) {}
            };
        })
    };
    // @ts-ignore
    global.indexedDB = mockIndexedDB;
  });

  it('renders all settings controls', () => {
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    expect(screen.getByText('Developer Mode')).toBeInTheDocument();
    expect(screen.getByText('Verbose Logging')).toBeInTheDocument();
    expect(screen.getByText('Experimental Features')).toBeInTheDocument();
    expect(screen.getByText('Cache Size Limit (MB)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Cache' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear All Data & Reset' })).toBeInTheDocument();
  });

  it('updates developer mode', () => {
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(mockOnChange).toHaveBeenCalledWith({ developerMode: true });
  });

  it('updates verbose logging', () => {
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(mockOnChange).toHaveBeenCalledWith({ verboseLogging: true });
  });

  it('updates experimental features', () => {
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);
    expect(mockOnChange).toHaveBeenCalledWith({ experimentalFeatures: true });
  });

  it('updates cache size limit', () => {
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '1024' } });
    expect(mockOnChange).toHaveBeenCalledWith({ cacheSizeLimit: 1024 });
  });

  it('clears cache successfully', async () => {
    (cacheService.clearAll as vi.Mock).mockResolvedValue(undefined);
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const clearCacheBtn = screen.getByRole('button', { name: 'Clear Cache' });
    fireEvent.click(clearCacheBtn);

    await waitFor(() => {
        expect(cacheService.clearAll).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith('Cache cleared successfully.');
    });
  });

  it('handles clear cache failure', async () => {
    (cacheService.clearAll as vi.Mock).mockRejectedValue(new Error('Fail'));
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const clearCacheBtn = screen.getByRole('button', { name: 'Clear Cache' });
    fireEvent.click(clearCacheBtn);

    await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to clear cache.');
    });
  });

  it('clears all data when confirmed', async () => {
    (global.confirm as vi.Mock).mockReturnValue(true);
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const clearAllBtn = screen.getByRole('button', { name: 'Clear All Data & Reset' });
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
        expect(global.indexedDB.deleteDatabase).toHaveBeenCalled();
        expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('does not clear data when cancelled', async () => {
    (global.confirm as vi.Mock).mockReturnValue(false);
    render(<AdvancedSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const clearAllBtn = screen.getByRole('button', { name: 'Clear All Data & Reset' });
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
        expect(global.indexedDB.deleteDatabase).not.toHaveBeenCalled();
    });
  });
});
