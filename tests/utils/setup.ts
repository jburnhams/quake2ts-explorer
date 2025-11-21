import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

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
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as any;

// Cleanup after each test
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installMatchMedia();
});
