import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import App from '../../src/App';
import { server } from './mocks/storageServer';
import { http, HttpResponse } from 'msw';
import { STORAGE_API_URL } from '../../src/services/authService';
import { pakService, PakService } from '../../src/services/pakService';
import { PakArchive } from '@quake2ts/engine';

// Mock dependencies
vi.mock('../../src/services/workerService', () => ({
  workerService: {
    executePakParserTask: vi.fn(),
    executeAssetProcessorTask: vi.fn(),
  }
}));

vi.mock('../../src/services/cacheService', () => ({
    cacheService: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
    },
    CACHE_STORES: { PAK_INDEX: 'pak-index', ASSET_METADATA: 'asset-metadata' }
}));

describe('Storage Upload Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
      server.resetHandlers();
      vi.clearAllMocks();
      vi.restoreAllMocks(); // Important to restore prototypes
  });
  afterAll(() => server.close());

  it('uploads files when Store button is clicked', async () => {
    // 1. Setup Mock Pak
    const mockPak = {
        name: 'test.pak',
        isUser: true,
        priority: 100,
        id: 'pak-1',
        archive: {
            listEntries: () => ['file1.txt', 'models/test.md2'],
            name: 'test.pak',
            entries: new Map([
                ['file1.txt', { name: 'file1.txt', size: 1, offset: 0, length: 1 }],
                ['models/test.md2', { name: 'models/test.md2', size: 1, offset: 0, length: 1 }]
            ])
        } as unknown as PakArchive
    };

    // Spy on the prototype because usePakExplorer creates a NEW instance
    vi.spyOn(PakService.prototype, 'getMountedPaks').mockReturnValue([mockPak]);
    vi.spyOn(PakService.prototype, 'readFile').mockResolvedValue(new Uint8Array([1, 2, 3]));
    // Also mock loadPakFile/loadPakFromBuffer to avoid real processing during init
    vi.spyOn(PakService.prototype, 'loadPakFile').mockResolvedValue(mockPak.archive);
    vi.spyOn(PakService.prototype, 'loadPakFromBuffer').mockResolvedValue(mockPak.archive);
    // Mock buildFileTree to avoid errors
    vi.spyOn(PakService.prototype, 'buildFileTree').mockReturnValue({
        name: 'root', path: '', isDirectory: true, children: []
    });
    vi.spyOn(PakService.prototype, 'listDirectory').mockReturnValue({ files: [], directories: [] });


    // 2. Render App
    await act(async () => {
        render(<App />);
    });

    // 3. Ensure we are logged in (server mock provides session)
    // Wait for auth check to complete and UI to load
    await waitFor(() => expect(screen.queryByTestId('loading-banner')).not.toBeInTheDocument());

    // 4. Verify Store Button exists and click it
    const storeButton = screen.getByTestId('store-files-button');
    expect(storeButton).toBeInTheDocument();

    // Wait for the button to become enabled (it might depend on async auth or pak state update)
    await waitFor(() => expect(storeButton).not.toBeDisabled(), { timeout: 3000 });

    await act(async () => {
        fireEvent.click(storeButton);
    });

    // 5. Verify Modal appears
    expect(screen.getByTestId('storage-upload-modal')).toBeInTheDocument();
    expect(screen.getByText('Uploading to Storage')).toBeInTheDocument();

    // 6. Verify Progress and Status Updates
    await waitFor(() => {
        expect(screen.getByText('Upload complete!')).toBeInTheDocument();
    });

    // 7. Close Modal
    const closeButton = screen.getByTestId('close-upload-modal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('storage-upload-modal')).not.toBeInTheDocument();
  });
});
