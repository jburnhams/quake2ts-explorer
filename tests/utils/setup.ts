import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

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

// Mock window.matchMedia for components that use responsive design
const installMatchMedia = () => {
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
};

installMatchMedia();

// Mock canvas context for PreviewPanel tests
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
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
  return null;
} as any;

// Mock IndexedDB
if (typeof global.indexedDB === 'undefined') {
  const mockIDBRequest = {
    result: null,
    error: null,
    source: null,
    transaction: null,
    readyState: 'done',
    onsuccess: null as ((ev: Event) => any) | null,
    onerror: null as ((ev: Event) => any) | null,
  };

  const mockTransaction = {
    objectStore: () => ({
      index: () => ({
        get: () => {
           const req = { ...mockIDBRequest };
           setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
           return req;
        }
      }),
      put: () => {
           const req = { ...mockIDBRequest };
           setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
           return req;
      },
      getAll: () => {
           const req = { ...mockIDBRequest, result: [] };
           setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
           return req;
      },
      delete: () => {
           const req = { ...mockIDBRequest };
           setTimeout(() => req.onsuccess && req.onsuccess({ target: req } as any), 0);
           return req;
      }
    }),
  };

  const mockIndexedDB = {
    open: () => {
      const request: any = { ...mockIDBRequest };
      request.result = {
        objectStoreNames: { contains: () => false },
        createObjectStore: () => ({ createIndex: () => {} }),
        transaction: () => mockTransaction,
      };
      setTimeout(() => request.onsuccess && request.onsuccess({ target: request } as any), 0);
      return request;
    },
  };

  // Define on both global and window to be safe
  Object.defineProperty(global, 'indexedDB', {
    value: mockIndexedDB,
    writable: true
  });
  if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'indexedDB', {
        value: mockIndexedDB,
        writable: true
      });
  }
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installMatchMedia();
  (global.fetch as jest.Mock).mockClear();
});
