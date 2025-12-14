import { renderHook, act, waitFor } from '@testing-library/react';
import { usePakExplorer } from '../../../src/hooks/usePakExplorer';
import { indexedDBService } from '../../../src/services/indexedDBService';
import { PakService, getPakService } from '../../../src/services/pakService';

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

// Mock fetch for built-in paks
global.fetch = jest.fn();

describe('usePakExplorer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
        });

        mockPakServiceMethods.loadPakFile.mockResolvedValue({});
    });

    it('initializes with default state', async () => {
        const { result } = renderHook(() => usePakExplorer());

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
});
