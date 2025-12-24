import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../src/App';
import { networkService } from '../../../src/services/networkService';
import { usePakExplorer } from '../../../src/hooks/usePakExplorer';

// Mock dependencies
vi.mock('../../../src/services/networkService');
vi.mock('../../../src/hooks/usePakExplorer');
vi.mock('../../../src/components/UniversalViewer/UniversalViewer', () => ({
  UniversalViewer: () => <div data-testid="universal-viewer">Viewer</div>
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ServerBrowser Integration', () => {
  const mockConnect = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    (networkService.connect as vi.Mock).mockImplementation(mockConnect);
    (usePakExplorer as vi.Mock).mockReturnValue({
      pakService: {},
      fileTree: { type: 'dir', name: 'root', path: '', children: [] },
      selectedPath: null,
      metadata: null,
      parsedFile: null,
      pakCount: 1,
      fileCount: 10,
      loading: false,
      error: null,
      gameMode: 'browser',
      isPaused: false,
      gameStateSnapshot: null,
      viewMode: 'merged',
      handleFileSelect: vi.fn(),
      handleTreeSelect: vi.fn(),
      hasFile: vi.fn(),
      dismissError: vi.fn(),
      loadFromUrl: vi.fn(),
      startGameMode: vi.fn(),
      stopGameMode: vi.fn(),
      togglePause: vi.fn(),
      pauseGame: vi.fn(),
      resumeGame: vi.fn(),
      removePak: vi.fn(),
      setViewMode: vi.fn(),
    });
  });

  it('opens server browser and connects to a server', async () => {
    await act(async () => {
      render(<App />);
    });

    // 1. Check if "Multiplayer" button exists in Toolbar
    const multiplayerBtn = screen.getByTestId('open-server-browser-button');
    expect(multiplayerBtn).toBeInTheDocument();

    // 2. Click it to open Server Browser
    await act(async () => {
      fireEvent.click(multiplayerBtn);
    });

    // 3. Verify Server Browser is visible
    expect(screen.getByTestId('server-browser')).toBeInTheDocument();

    // 4. Enter a manual address
    const input = screen.getByTestId('manual-address-input');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'ws://integration-test.com' } });
    });

    // 5. Click Connect
    const connectBtn = screen.getByTestId('connect-button');
    await act(async () => {
      fireEvent.click(connectBtn);
    });

    // 6. Verify networkService.connect was called
    expect(mockConnect).toHaveBeenCalledWith('ws://integration-test.com');

    // 7. Verify Server Browser closes (it should be removed from DOM)
    expect(screen.queryByTestId('server-browser')).not.toBeInTheDocument();
  });
});
