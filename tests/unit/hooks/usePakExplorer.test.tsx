import { renderHook, act, waitFor } from '@testing-library/react';
import { usePakExplorer } from '../../../src/hooks/usePakExplorer';
import { indexedDBService } from '../../../src/services/indexedDBService';
import { PakService } from '../../../src/services/pakService';
import { createGameSimulation } from '../../../src/services/gameService';
import { createGameLoop } from '../../../src/utils/gameLoop';
import { initInputController, cleanupInputController, generateUserCommand } from '../../../src/services/inputService';

// Setup mock methods holder
const mockPakServiceMethods = {
    buildFileTree: jest.fn(),
    getMountedPaks: jest.fn(),
    listDirectory: jest.fn(),
    loadPakFile: jest.fn(),
    loadPakFromBuffer: jest.fn(),
    getFileMetadata: jest.fn(),
    parseFile: jest.fn(),
    hasFile: jest.fn(),
    unloadPak: jest.fn(),
    vfs: {},
};

// Mock dependencies
jest.mock('../../../src/services/indexedDBService', () => ({
  indexedDBService: {
    getPaks: jest.fn().mockResolvedValue([]),
    savePak: jest.fn().mockResolvedValue('mock-pak-id'),
    deletePak: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('../../../src/services/pakService', () => {
    const PakServiceMock = jest.fn().mockImplementation(() => {
        // Reset mocks for new instance if needed, or share them.
        mockPakServiceMethods.buildFileTree.mockReturnValue({ name: 'root', children: [] });
        mockPakServiceMethods.getMountedPaks.mockReturnValue([]);
        mockPakServiceMethods.listDirectory.mockReturnValue({ files: [], directories: [] });
        mockPakServiceMethods.loadPakFile.mockResolvedValue({});
        mockPakServiceMethods.loadPakFromBuffer.mockResolvedValue({});
        mockPakServiceMethods.hasFile.mockReturnValue(false);

        return mockPakServiceMethods;
    });

    // Mock static method
    (PakServiceMock as any).getVfsPath = jest.fn((path: string) => {
        if (path.includes(':')) {
            const parts = path.split(':');
            return parts.slice(1).join(':');
        }
        return path;
    });

    return {
        PakService: PakServiceMock,
        getPakService: jest.fn(),
    };
});

// Mock GameService
jest.mock('../../../src/services/gameService', () => ({
    createGameSimulation: jest.fn().mockResolvedValue({
        start: jest.fn(),
        shutdown: jest.fn(),
        tick: jest.fn(),
        getSnapshot: jest.fn().mockReturnValue({ time: 123 }),
        getConfigStrings: jest.fn().mockReturnValue(new Map())
    })
}));

// Mock GameLoop
jest.mock('../../../src/utils/gameLoop', () => ({
    createGameLoop: jest.fn().mockReturnValue({
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn()
    })
}));

// Mock InputService
jest.mock('../../../src/services/inputService', () => ({
    initInputController: jest.fn(),
    cleanupInputController: jest.fn(),
    generateUserCommand: jest.fn().mockReturnValue({})
}));


// Mock fetch for built-in paks
global.fetch = jest.fn();

describe('usePakExplorer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup successful fetch default to avoid init errors in unrelated tests
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        mockPakServiceMethods.loadPakFile.mockResolvedValue({});
    });

    it('initializes with default state', async () => {
        const { result } = renderHook(() => usePakExplorer());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await waitFor(() => {
             expect(result.current.loading).toBe(false);
        });

        expect(result.current.pakCount).toBe(0);
        expect(result.current.fileCount).toBe(0);
        expect(result.current.gameMode).toBe('browser');
    });

    it('loads paks from IndexedDB on init', async () => {
        const mockPaks = [{ id: '1', name: 'stored.pak', blob: new Blob(['']) }];
        (indexedDBService.getPaks as jest.Mock).mockResolvedValue(mockPaks);

        const { result } = renderHook(() => usePakExplorer());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(mockPakServiceMethods.loadPakFile).toHaveBeenCalled();
    });

    it('handles file selection', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const file = new File([''], 'test.pak');
        const fileList = {
            item: (index: number) => (index === 0 ? file : null),
            length: 1,
            [Symbol.iterator]: function* () { yield file; }
        } as unknown as FileList;

        await act(async () => {
            await result.current.handleFileSelect(fileList);
        });

        expect(indexedDBService.savePak).toHaveBeenCalledWith(file);
        expect(mockPakServiceMethods.loadPakFile).toHaveBeenCalled();
    });

    it('handles tree selection', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        mockPakServiceMethods.getFileMetadata.mockReturnValue({ name: 'test.txt' });
        mockPakServiceMethods.parseFile.mockResolvedValue({ type: 'txt', content: 'hello' });

        await act(async () => {
            await result.current.handleTreeSelect('test.txt');
        });

        expect(result.current.selectedPath).toBe('test.txt');
        expect(result.current.metadata).toEqual({ name: 'test.txt' });
        expect(result.current.parsedFile).toEqual({ type: 'txt', content: 'hello' });
    });

    it('removes a pak', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.removePak('pak-id');
        });

        expect(indexedDBService.deletePak).toHaveBeenCalledWith('pak-id');
        expect(mockPakServiceMethods.unloadPak).toHaveBeenCalledWith('pak-id');
    });

    it('switches view mode', async () => {
         const { result } = renderHook(() => usePakExplorer());
         await waitFor(() => expect(result.current.loading).toBe(false));

         act(() => {
             result.current.setViewMode('by-pak');
         });

         expect(result.current.viewMode).toBe('by-pak');
         expect(mockPakServiceMethods.buildFileTree).toHaveBeenCalledWith('by-pak');
    });

    it('handles load error safely', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (indexedDBService.getPaks as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const { result } = renderHook(() => usePakExplorer());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Failed to initialize application data');
        consoleErrorSpy.mockRestore();
    });

    it('ignores non-pak files', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const file = new File([''], 'test.txt');
        const fileList = {
            item: (index: number) => (index === 0 ? file : null),
            length: 1,
            [Symbol.iterator]: function* () { yield file; }
        } as unknown as FileList;

        await act(async () => {
            await result.current.handleFileSelect(fileList);
        });

        expect(indexedDBService.savePak).not.toHaveBeenCalled();
    });

    it('aborts loading on unmount', async () => {
        // Mock fetch to hang so we can unmount while pending
        (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

        const { unmount } = renderHook(() => usePakExplorer());
        unmount();
        // If logic is correct, no error logged/thrown
    });

    // --- New Tests for Game Mode ---

    it('starts game mode successfully and executes loop', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.startGameMode('demo1');
        });

        // Ensure async tasks complete
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(createGameSimulation).toHaveBeenCalled();
        expect(initInputController).toHaveBeenCalled();
        expect(createGameLoop).toHaveBeenCalled();
        expect(result.current.gameMode).toBe('game');

        // Check loop callbacks
        const calls = (createGameLoop as jest.Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [simulate, render] = calls[calls.length - 1]; // Use last call

        // Mock tick
        const mockTick = (await createGameSimulation(null as any, '')).tick;

        // Run simulation step
        act(() => {
            simulate({ deltaMs: 16 });
        });
        expect(generateUserCommand).toHaveBeenCalled();
        expect(mockTick).toHaveBeenCalled();

        // Run render step
        act(() => {
            render(0.5);
        });
        expect(result.current.gameStateSnapshot).toEqual({
            playerState: undefined,
            configstrings: new Map()
        });
    });

    it('handles game mode start failure', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (createGameSimulation as jest.Mock).mockRejectedValue(new Error('Game init failed'));

        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Clear any previous errors from init
        act(() => { result.current.dismissError(); });

        await act(async () => {
            await result.current.startGameMode('demo1');
        });

        expect(result.current.error).toBe('Game init failed');
        expect(result.current.gameMode).toBe('browser');
        consoleErrorSpy.mockRestore();
    });

    it('stops game mode cleanly', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Start then stop
        await act(async () => {
            await result.current.startGameMode('demo1');
        });

        act(() => {
            result.current.stopGameMode();
        });

        expect(result.current.gameMode).toBe('browser');
        expect(cleanupInputController).toHaveBeenCalled();
    });

    it('toggles pause state', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.pauseGame();
        });
        expect(result.current.isPaused).toBe(true);

        act(() => {
            result.current.resumeGame();
        });
        expect(result.current.isPaused).toBe(false);

        act(() => {
            result.current.togglePause();
        });
        expect(result.current.isPaused).toBe(true);
    });

    // --- New Tests for Built-in Paks ---

    it('loads built-in paks successfully', async () => {
        // Mock fetch for HEAD and GET requests
        (global.fetch as jest.Mock).mockImplementation((url) => {
            if (url === 'pak.pak' || url === 'pak0.pak') {
                return Promise.resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
                });
            }
            return Promise.resolve({ ok: false });
        });

        const { result } = renderHook(() => usePakExplorer());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        // Expect calls for pak.pak and pak0.pak
        expect(mockPakServiceMethods.loadPakFromBuffer).toHaveBeenCalledTimes(2);
        expect(mockPakServiceMethods.loadPakFromBuffer).toHaveBeenCalledWith('pak.pak', expect.any(ArrayBuffer), undefined, false);
        expect(mockPakServiceMethods.loadPakFromBuffer).toHaveBeenCalledWith('pak0.pak', expect.any(ArrayBuffer), undefined, false);
    });

    it('loadFromUrl handles successful fetch', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
        });

        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.loadFromUrl('http://example.com/test.pak');
        });

        expect(mockPakServiceMethods.loadPakFromBuffer).toHaveBeenCalledWith('test.pak', expect.any(ArrayBuffer), undefined, false);
    });

    it('loadFromUrl handles fetch error', async () => {
         (global.fetch as jest.Mock).mockResolvedValue({
             ok: false,
             statusText: 'Not Found'
         });

         const { result } = renderHook(() => usePakExplorer());
         await waitFor(() => expect(result.current.loading).toBe(false));

         await act(async () => {
             await result.current.loadFromUrl('http://example.com/bad.pak');
         });

         expect(result.current.error).toContain('Failed to fetch');
    });

    it('dismisses error', async () => {
        const { result } = renderHook(() => usePakExplorer());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            // Manually set error via a failed op first? or just rely on state setter being exposed?
            // Since we can't set error directly, simulate a failure.
        });

        // Let's use loadFromUrl to cause error
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false, statusText: 'Err' });
        await act(async () => {
            await result.current.loadFromUrl('bad');
        });
        expect(result.current.error).toBeTruthy();

        act(() => {
            result.current.dismissError();
        });
        expect(result.current.error).toBeNull();
    });
});
