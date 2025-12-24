import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import { server } from './mocks/storageServer';
import { http, HttpResponse } from 'msw';
import { STORAGE_API_URL } from '../../src/services/authService';
import { pakService } from '../../src/services/pakService';
import { PakArchive } from 'quake2ts/engine';

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

// Mock PakService.getMountedPaks/readFile to control the file flow
vi.spyOn(pakService, 'getMountedPaks').mockReturnValue([]);

describe('Storage Upload Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
      server.resetHandlers();
      vi.clearAllMocks();
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
            name: 'test.pak'
        } as unknown as PakArchive
    };

    // @ts-ignore
    vi.spyOn(pakService, 'getMountedPaks').mockReturnValue([mockPak]);
    vi.spyOn(pakService, 'readFile').mockResolvedValue(new Uint8Array([1, 2, 3]));

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
    expect(storeButton).not.toBeDisabled();

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
