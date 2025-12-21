
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import * as fs from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/src/services/workerService', () => ({
    workerService: {
        executePakParserTask: () => Promise.reject(new Error('Worker not available in JSDOM')),
        executeAssetProcessorTask: () => Promise.reject(new Error('Worker not available in JSDOM'))
    }
}));

// Mock react-virtualized-auto-sizer to provide dimensions
jest.mock('react-virtualized-auto-sizer', () => {
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
global.URL.createObjectURL = jest.fn(() => 'blob:mock');
global.URL.revokeObjectURL = jest.fn();

describe('FileTree Loading Integration', () => {
    const pakPath = path.resolve(__dirname, '../../public/pak.pak');

    it('should load pak.pak and display contents in sidebar', async () => {
        // Ensure skipAuth is set
        window.history.pushState({}, 'Test', '/?skipAuth=true');

        // Read real file
        if (!fs.existsSync(pakPath)) {
            console.warn('public/pak.pak not found, skipping test (make sure to run from repo root)');
            return;
        }
        const pakBuffer = fs.readFileSync(pakPath);

        global.fetch = jest.fn((input: RequestInfo | URL) => {
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
        }) as jest.Mock;

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
    }, 60000);
});
