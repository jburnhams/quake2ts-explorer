import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import 'vitest-canvas-mock';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Sync setup
if (typeof window !== 'undefined') {

    // Mock localStorage if it doesn't exist or if methods are missing
    if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
        const localStorageMock = (function() {
            let store: Record<string, string> = {};
            return {
                getItem: function(key: string) {
                    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
                },
                setItem: function(key: string, value: string) {
                    store[key] = String(value);
                },
                removeItem: function(key: string) {
                    delete store[key];
                },
                clear: function() {
                    store = {};
                },
                key: function(index: number) {
                    return Object.keys(store)[index] || null;
                },
                get length() {
                    return Object.keys(store).length;
                }
            };
        })();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
    }

    // Mock sessionStorage similarly
    if (!window.sessionStorage || typeof window.sessionStorage.getItem !== 'function') {
      const sessionStorageMock = (function() {
          let store: Record<string, string> = {};
          return {
              getItem: function(key: string) {
                  return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
              },
              setItem: function(key: string, value: string) {
                  store[key] = String(value);
              },
              removeItem: function(key: string) {
                  delete store[key];
              },
              clear: function() {
                  store = {};
              },
              key: function(index: number) {
                  return Object.keys(store)[index] || null;
              },
              get length() {
                  return Object.keys(store).length;
              }
          };
      })();
      Object.defineProperty(window, 'sessionStorage', {
          value: sessionStorageMock
      });
  }

    afterEach(() => {
        cleanup();
        if (window.localStorage && typeof window.localStorage.clear === 'function') {
          window.localStorage.clear();
        }
        if (window.sessionStorage && typeof window.sessionStorage.clear === 'function') {
          window.sessionStorage.clear();
        }
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
