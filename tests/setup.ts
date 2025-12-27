import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import 'vitest-canvas-mock';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Sync setup
if (typeof window !== 'undefined') {
    afterEach(() => {
        cleanup();
    });

    // Mock URL.createObjectURL since it's not in JSDOM/Node
    if (typeof global.URL.createObjectURL === 'undefined') {
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();
    }

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));

    // Mock scrollIntoView
    if (typeof Element !== 'undefined') {
        Element.prototype.scrollIntoView = vi.fn();

        // Mock pointer capture methods
        Element.prototype.setPointerCapture = vi.fn();
        Element.prototype.releasePointerCapture = vi.fn();
        Element.prototype.hasPointerCapture = vi.fn();
    }

    // Mock DataTransfer
    if (typeof global.DataTransfer === 'undefined') {
      class MockDataTransfer {
        dropEffect = 'none';
        effectAllowed = 'none';
        files = { length: 0, item: () => null } as unknown as FileList;
        items = { add: () => {}, remove: () => {}, clear: () => {}, length: 0 } as unknown as DataTransferItemList;
        types = [];
        setData = vi.fn();
        getData = vi.fn();
        clearData = vi.fn();
        setDragImage = vi.fn();
      }
      global.DataTransfer = MockDataTransfer as any;
    }
}
