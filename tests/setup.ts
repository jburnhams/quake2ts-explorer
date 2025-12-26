import { afterEach, vi } from 'vitest';

(async () => {
    if (typeof window !== 'undefined') {
        await import('@testing-library/jest-dom');
        await import('vitest-canvas-mock');
        const { cleanup } = await import('@testing-library/react');

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
    }
})();
