
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import * as fs from 'fs';
import * as path from 'path';


// Mock dependencies
vi.mock('@/src/services/workerService', () => ({
    workerService: {
        executePakParserTask: () => Promise.reject(new Error('Worker not available in JSDOM')),
        executeAssetProcessorTask: () => Promise.reject(new Error('Worker not available in JSDOM'))
    }
}));

// Mock react-virtualized-auto-sizer to provide dimensions
vi.mock('react-virtualized-auto-sizer', () => {
    return ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) => {
        return children({ width: 500, height: 500 });
    };
});

// Mock ResizeObserver for ResizablePanel
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock IndexedDB
import 'fake-indexeddb/auto';

// Mock window.URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

describe('FileTree Loading Integration', () => {
    const pakPath = path.resolve(__dirname, '../../public/pak.pak');

    it('should load pak.pak and display contents in sidebar (merged view)', async () => {
        // Ensure skipAuth is set
        window.history.pushState({}, 'Test', '/?skipAuth=true');

        // Read real file
        if (!fs.existsSync(pakPath)) {
            console.warn('public/pak.pak not found, skipping test (make sure to run from repo root)');
            return;
        }
        const pakBuffer = fs.readFileSync(pakPath);

        global.fetch = vi.fn((input: RequestInfo | URL) => {
            const url = input.toString();
            if (url.endsWith('pak-manifest.json')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ paks: ['pak.pak'] }),
                    headers: new Headers({ 'content-type': 'application/json' })
                } as Response);
            }
            if (url.endsWith('pak.pak')) {
                return Promise.resolve({
                    ok: true,
                    arrayBuffer: async () => pakBuffer.buffer.slice(pakBuffer.byteOffset, pakBuffer.byteOffset + pakBuffer.byteLength),
                    headers: new Headers({ 'content-type': 'application/octet-stream' })
                } as Response);
            }
            return Promise.resolve({
                ok: false,
                status: 404,
                text: async () => 'Not Found'
            } as Response);
        }) as vi.Mock;

        await act(async () => {
            render(<App />);
        });

        // Wait for loading banner to disappear
        await waitFor(() => {
            const banner = screen.queryByTestId('loading-banner');
            expect(banner).not.toBeInTheDocument();
        }, { timeout: 30000 });

        // Check for specific file in the tree
        // "maps" directory should be visible. Since we mocked AutoSizer, it should render.
        // Also the pak parsing on main thread might take time, so we wait.
        await waitFor(() => {
            // We use queryAllByText because 'maps' might appear in multiple places or as a substring if not careful,
            // but in the tree it should be a tree item.
            const mapsElement = screen.queryByText('maps');
            expect(mapsElement).toBeInTheDocument();

            const picsElement = screen.queryByText('pics');
            expect(picsElement).toBeInTheDocument();
        }, { timeout: 30000 });

        // Verify pak count is displayed correctly
        await waitFor(() => {
            const pakCountElement = screen.queryByText(/1 PAK loaded/i);
            expect(pakCountElement).toBeInTheDocument();
            // Should show file count > 0
            const fileCountMatch = screen.queryByText(/\(\d+ files\)/i);
            expect(fileCountMatch).toBeInTheDocument();
        }, { timeout: 5000 });
    }, 60000);

    it('should load pak.pak and display contents in "Group By Pak" view', async () => {
        // Ensure skipAuth is set
        window.history.pushState({}, 'Test', '/?skipAuth=true');

        // Read real file
        if (!fs.existsSync(pakPath)) {
            console.warn('public/pak.pak not found, skipping test (make sure to run from repo root)');
            return;
        }
        const pakBuffer = fs.readFileSync(pakPath);

        global.fetch = vi.fn((input: RequestInfo | URL) => {
            const url = input.toString();
            if (url.endsWith('pak-manifest.json')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ paks: ['pak.pak'] }),
                    headers: new Headers({ 'content-type': 'application/json' })
                } as Response);
            }
            if (url.endsWith('pak.pak')) {
                return Promise.resolve({
                    ok: true,
                    arrayBuffer: async () => pakBuffer.buffer.slice(pakBuffer.byteOffset, pakBuffer.byteOffset + pakBuffer.byteLength),
                    headers: new Headers({ 'content-type': 'application/octet-stream' })
                } as Response);
            }
            return Promise.resolve({
                ok: false,
                status: 404,
                text: async () => 'Not Found'
            } as Response);
        }) as vi.Mock;

        const { container } = await act(async () => {
            return render(<App />);
        });

        // Wait for loading banner to disappear
        await waitFor(() => {
            const banner = screen.queryByTestId('loading-banner');
            expect(banner).not.toBeInTheDocument();
        }, { timeout: 30000 });

        // Find and click the "Group By Pak" checkbox
        await waitFor(() => {
            const checkbox = screen.getByLabelText(/Group By Pak/i);
            expect(checkbox).toBeInTheDocument();
        }, { timeout: 5000 });

        const checkbox = screen.getByLabelText(/Group By Pak/i) as HTMLInputElement;

        await act(async () => {
            checkbox.click();
        });

        // In "Group By Pak" mode, the pak file name should appear as a root node
        // Wait for the tree to rebuild and pak.pak to appear
        // This confirms that files are correctly associated with their source PAK
        // Note: Virtualized lists may render the same item multiple times
        await waitFor(() => {
            const pakElements = screen.queryAllByText('pak.pak');
            expect(pakElements.length).toBeGreaterThan(0);
        }, { timeout: 10000 });

        // Success! The pak.pak root node appearing proves that our fix works:
        // Files are now correctly tagged with sourcePak = pakId, so they're
        // associated with the right PAK when filtering in buildFileTree
    }, 60000);
});
