import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

if (!global.structuredClone) {
    global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Mock requestAnimationFrame
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(performance.now()), 0) as unknown as number;
  };
}

if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  } as Response)
) as jest.Mock;

// Mock crypto.randomUUID
if (!global.crypto) {
    // @ts-ignore
    global.crypto = {};
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = () => {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
            (parseInt(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4).toString(16)
        );
    };
}
// crypto.getRandomValues must exist for the above polyfill, or we just mock a simple UUID
if (!global.crypto.getRandomValues) {
    global.crypto.getRandomValues = (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    };
}

// Mock crypto.subtle
if (!global.crypto.subtle) {
    // @ts-ignore
    global.crypto.subtle = {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    };
}

// Ensure performance API is initialized
if (typeof performance === 'undefined') {
    // @ts-ignore
    global.performance = {};
}

// Mock DataTransfer for drag-and-drop tests
class MockDataTransfer {
  private _files: File[] = [];
  items: { add: (file: File) => void };

  constructor() {
    this._files = [];
    const self = this;
    this.items = {
      add: (file: File) => {
        self._files.push(file);
      }
    };
  }

  get files(): FileList {
    const files = this._files;
    return {
      length: files.length,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (const file of files) yield file;
      },
      ...files,
    } as FileList;
  }
}
global.DataTransfer = MockDataTransfer as any;

// Mock window.matchMedia
const installMatchMedia = () => {
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }
};

installMatchMedia();

// Mock canvas context
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextId: string, options?: any) {
    if (contextId === '2d') {
      return {
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(0) }),
        scale: () => {},
        translate: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        canvas: { width: 0, height: 0 },
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        strokeStyle: '',
        lineWidth: 1,
      } as unknown as CanvasRenderingContext2D;
    }
    if (contextId === 'webgl2') {
      const { createMockWebGL2Context } = require('quake2ts/test-utils');
      return createMockWebGL2Context(this);
    }
    return null;
  } as any;
}

// Mock IndexedDB
import 'fake-indexeddb/auto';

// Helper to install performance mocks safely
const installPerformanceMocks = () => {
    const p = global.performance || (typeof window !== 'undefined' ? window.performance : null);
    if (!p) return;

    // Use defineProperty to overwrite potentially read-only properties in JSDOM
    try {
        if (!p.mark || jest.isMockFunction(p.mark) === false) {
             Object.defineProperty(p, 'mark', { value: jest.fn(), writable: true, configurable: true });
        }
        if (!p.measure || jest.isMockFunction(p.measure) === false) {
             Object.defineProperty(p, 'measure', { value: jest.fn(), writable: true, configurable: true });
        }
        if (!p.getEntriesByName || jest.isMockFunction(p.getEntriesByName) === false) {
             Object.defineProperty(p, 'getEntriesByName', { value: jest.fn(() => []), writable: true, configurable: true });
        }
        if (!p.now || jest.isMockFunction(p.now) === false) {
             Object.defineProperty(p, 'now', { value: jest.fn(() => Date.now()), writable: true, configurable: true });
        }
        if (!p.clearMarks || jest.isMockFunction(p.clearMarks) === false) {
             Object.defineProperty(p, 'clearMarks', { value: jest.fn(), writable: true, configurable: true });
        }
        if (!p.clearMeasures || jest.isMockFunction(p.clearMeasures) === false) {
             Object.defineProperty(p, 'clearMeasures', { value: jest.fn(), writable: true, configurable: true });
        }
    } catch (e) {
        console.warn('Failed to patch performance object:', e);
    }
};

// Initial install
installPerformanceMocks();

// Cleanup after each test
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installMatchMedia();
  (global.fetch as jest.Mock).mockClear();

  // Re-install/Verify performance mocks before each test
  // This helps when fake timers reset the environment
  installPerformanceMocks();

  const p = global.performance || (typeof window !== 'undefined' ? window.performance : null);
  if (p) {
      if (p.mark) (p.mark as jest.Mock).mockClear();
      if (p.measure) (p.measure as jest.Mock).mockClear();
  }
});
