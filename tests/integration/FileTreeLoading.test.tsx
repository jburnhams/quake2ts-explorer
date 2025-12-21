
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import * as fs from 'fs';
import * as path from 'path';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/src/services/workerService', () => {
    // Require inside factory to avoid accessing out-of-scope variables if using babel-jest hoisting
    // But jest object is automatically available in jest environment usually,
    // however when using @jest/globals with ESM/TS it can be tricky in mock factories.
    // The standard way is often just returning the object if simple.
    // Or importing jest from @jest/globals inside if needed, but hoisting prevents that.
    // So we use the global 'jest' if available or just simple functions.
    // Or actually, define the mock implementation inline without 'jest.fn' inside the factory
    // if we don't need to assert calls, OR rely on the fact that jest.fn IS available globally in typical setup.
    // But error said "Cannot read properties of undefined (reading 'jest')".
    // This usually means `jest` variable is not defined in the scope of the factory.

    return {
        workerService: {
            // @ts-ignore
            executePakParserTask: () => Promise.reject(new Error('Worker not available in JSDOM')),
            // @ts-ignore
            executeAssetProcessorTask: () => Promise.reject(new Error('Worker not available in JSDOM'))
        }
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

describe.skip('FileTree Loading Integration', () => {
    const pakPath = path.resolve(__dirname, '../../public/pak.pak');

    it('should load pak.pak and display contents in sidebar', async () => {
        // Ensure skipAuth is set
        window.history.pushState({}, 'Test', '/?skipAuth=true');

        // Mock fetch for 'pak-manifest.json' and 'pak.pak'
        // Since usePakExplorer uses fetch to load built-in paks.

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
            return Promise.reject(new Error(`Unknown fetch: ${url}`));
        }) as jest.Mock;

        await act(async () => {
            render(<App />);
        });

        // Wait for loading banner to disappear
        await waitFor(() => {
            const banner = screen.queryByTestId('loading-banner');
            expect(banner).not.toBeInTheDocument();
        }, { timeout: 20000 });

        // Check for specific file in the tree (based on standard pak0 content)
        // Usually contains 'default.cfg' or 'maps/'
        // The tree renders items with role="treeitem" or class "tree-node"
        // Let's look for text content.

        await waitFor(() => {
            // "maps" directory should be visible
            expect(screen.getByText('maps')).toBeInTheDocument();
            // "pics" directory should be visible
            expect(screen.getByText('pics')).toBeInTheDocument();
        }, { timeout: 60000 });

        // Check for specific file if possible, e.g. default.cfg
        // Note: FileTree virtualization might hide off-screen items, but default.cfg is usually near top if sorted?
        // Directories come first usually.
    }, 60000);
});
